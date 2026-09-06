from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

import logging  # noqa: E402
import os  # noqa: E402
import uuid  # noqa: E402
from datetime import datetime, timedelta, timezone  # noqa: E402
from typing import Optional  # noqa: E402

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response  # noqa: E402
from pymongo import ReturnDocument  # noqa: E402
from starlette.middleware.cors import CORSMiddleware  # noqa: E402

from auth import (  # noqa: E402
    check_lockout,
    clear_failures,
    create_token,
    get_current_user,
    hash_password,
    public_user,
    record_failure,
    require_role,
    verify_password,
)
from database import client, db  # noqa: E402
from models import (  # noqa: E402
    AnalyzeIn,
    BatchCreate,
    BatchUpdate,
    DispatchVerifyIn,
    InspectionCreate,
    LoginIn,
    ProfileUpdate,
    RegisterIn,
    StorageNoteIn,
    VerifyInspectionIn,
)
from report_pdf import build_pdf  # noqa: E402
from seed import seed_demo_data  # noqa: E402
from vision_service import ImageValidationError, analyze_images, decode_image, provider_config, to_jpeg_b64  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("onionai")

app = FastAPI(title="ONIONAI API", version="1.0.0")
api = APIRouter(prefix="/api")

NO_ID = {"_id": 0}
NO_IMAGES = {"_id": 0, "images": 0}
DISPATCH_LABELS = {
    "APPROVED": "Approved for Dispatch",
    "REINSPECTION_REQUIRED": "Requires Reinspection",
    "DISPATCHED": "Dispatched",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


def snapshot_of(insp: dict) -> dict:
    return {
        "grade_a": insp["grade_a"],
        "urs": insp["urs"],
        "defective": insp["defective"],
        "good_quality": insp["good_quality"],
        "status": insp["overall_status"],
        "inspected_at": insp["created_at"],
        "source": insp["source"],
        "inspection_id": insp["id"],
        "inspection_day": insp["inspection_day"],
    }


def trend_of(first: Optional[dict], latest: Optional[dict]) -> Optional[str]:
    if not first or not latest or first["inspection_id"] == latest["inspection_id"]:
        return None
    drop = first["grade_a"] - latest["grade_a"]
    rise = latest["defective"] - first["defective"]
    if drop >= 3 or rise >= 3:
        return "declining"
    if drop <= -3:
        return "improving"
    return "stable"


async def next_batch_id() -> str:
    year = datetime.now(timezone.utc).year
    while True:
        doc = await db.counters.find_one_and_update(
            {"_id": f"batch-{year}"}, {"$inc": {"seq": 1}}, upsert=True, return_document=ReturnDocument.AFTER
        )
        code = f"ON-{year}-{doc['seq']:03d}"
        if not await db.batches.find_one({"batch_id": code}):
            return code


async def get_batch_or_404(batch_id: str, user: dict) -> dict:
    batch = await db.batches.find_one({"batch_id": batch_id.upper().strip()}, NO_ID)
    if not batch:
        raise HTTPException(status_code=404, detail=f"Batch {batch_id} was not found")
    if user["role"] == "farmer" and batch["supplier_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="This batch belongs to another supplier")
    if user["role"] == "buyer" and batch.get("inspection_count", 0) == 0:
        raise HTTPException(status_code=403, detail="This batch has no quality records available yet")
    return batch


def batches_query(user: dict) -> dict:
    if user["role"] == "farmer":
        return {"supplier_id": user["id"]}
    return {"inspection_count": {"$gt": 0}}


# ------------------------------------------------------------------- auth
@api.post("/auth/register")
async def register(body: RegisterIn):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="An account with this email already exists")
    user = {
        "id": new_id(),
        "name": body.name.strip(),
        "email": email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "organization": (body.organization or "").strip(),
        "is_demo": False,
        "created_at": now_iso(),
    }
    await db.users.insert_one(dict(user))
    return {"token": create_token(user), "user": public_user(user)}


@api.post("/auth/login")
async def login(body: LoginIn, request: Request):
    email = body.email.lower()
    identifier = f"{request.client.host if request.client else 'unknown'}:{email}"
    await check_lockout(identifier)
    user = await db.users.find_one({"email": email}, NO_ID)
    if not user or not verify_password(body.password, user["password_hash"]):
        await record_failure(identifier)
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    await clear_failures(identifier)
    return {"token": create_token(user), "user": public_user(user)}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return public_user(user)


@api.put("/auth/profile")
async def update_profile(body: ProfileUpdate, user: dict = Depends(get_current_user)):
    changes = {k: v.strip() for k, v in body.model_dump(exclude_none=True).items()}
    if changes:
        await db.users.update_one({"id": user["id"]}, {"$set": changes})
    updated = await db.users.find_one({"id": user["id"]}, NO_ID)
    return public_user(updated)


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/system/ai-status")
async def ai_status(user: dict = Depends(get_current_user)):
    cfg = provider_config()
    return {"provider": cfg["provider"], "model": cfg["model"], "connected": cfg["connected"]}


# ---------------------------------------------------------------- batches
@api.post("/batches", status_code=201)
async def create_batch(body: BatchCreate, user: dict = Depends(require_role("farmer"))):
    ts = now_iso()
    batch = {
        "id": new_id(),
        "batch_id": await next_batch_id(),
        "supplier_id": user["id"],
        **body.model_dump(),
        "status": "CREATED",
        "is_demo": False,
        "inspection_count": 0,
        "storage_days": 0,
        "latest": None,
        "first": None,
        "quality_trend": None,
        "verification_id": None,
        "dispatched_at": None,
        "created_at": ts,
        "updated_at": ts,
    }
    batch["inspection_date"] = batch["inspection_date"] or ts[:10]
    await db.batches.insert_one(dict(batch))
    return batch


@api.get("/batches")
async def list_batches(status: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = batches_query(user)
    if status:
        query["status"] = status
    return await db.batches.find(query, NO_ID).sort("created_at", -1).to_list(500)


@api.get("/batches/{batch_id}")
async def get_batch(batch_id: str, user: dict = Depends(get_current_user)):
    batch = await get_batch_or_404(batch_id, user)
    inspections = await db.inspections.find({"batch_id": batch["batch_id"]}, NO_IMAGES).sort("created_at", -1).to_list(2)
    dispatch = await db.dispatch_verifications.find_one({"batch_id": batch["batch_id"]}, NO_ID, sort=[("verified_at", -1)])
    return {
        **batch,
        "latest_inspection": inspections[0] if inspections else None,
        "previous_inspection": inspections[1] if len(inspections) > 1 else None,
        "dispatch_verification": dispatch,
    }


@api.put("/batches/{batch_id}")
async def update_batch(batch_id: str, body: BatchUpdate, user: dict = Depends(require_role("farmer"))):
    batch = await get_batch_or_404(batch_id, user)
    changes = body.model_dump(exclude_none=True)
    changes["updated_at"] = now_iso()
    await db.batches.update_one({"batch_id": batch["batch_id"]}, {"$set": changes})
    return await db.batches.find_one({"batch_id": batch["batch_id"]}, NO_ID)


@api.get("/batches/{batch_id}/passport")
async def batch_passport(batch_id: str, user: dict = Depends(get_current_user)):
    batch = await get_batch_or_404(batch_id, user)
    inspections = await db.inspections.find({"batch_id": batch["batch_id"]}, NO_IMAGES).sort("created_at", 1).to_list(200)
    notes = await db.storage_records.find({"batch_id": batch["batch_id"], "type": "NOTE"}, NO_ID).to_list(200)
    dispatches = await db.dispatch_verifications.find({"batch_id": batch["batch_id"]}, NO_ID).to_list(50)

    events = [
        {
            "type": "BATCH_CREATED",
            "title": "Batch Created",
            "detail": f"{batch['quantity']} {batch['unit']} of {batch['variety']} registered at {batch['procurement_center']}",
            "at": batch["created_at"],
            "tone": "neutral",
        }
    ]
    prev = None
    for insp in inspections:
        events.append(
            {
                "type": "INSPECTION",
                "title": f"Day {insp['inspection_day']} Inspection",
                "detail": f"Grade A {insp['grade_a']}% · URS {insp['urs']}% · Defective {insp['defective']}%",
                "at": insp["created_at"],
                "status": insp["overall_status"],
                "source": insp["source"],
                "inspection_id": insp["id"],
                "tone": "good" if insp["overall_status"] == "PASS" else ("warn" if insp["overall_status"] == "REVIEW REQUIRED" else "bad"),
            }
        )
        if prev:
            delta = round(insp["grade_a"] - prev["grade_a"], 1)
            word = "dropped" if delta < 0 else ("rose" if delta > 0 else "held steady")
            events.append(
                {
                    "type": "QUALITY_CHANGE",
                    "title": "Quality Change",
                    "detail": f"Grade A {word}{'' if delta == 0 else f' by {abs(delta)} points'} since Day {prev['inspection_day']}",
                    "at": insp["created_at"],
                    "tone": "bad" if delta < 0 else ("good" if delta > 0 else "neutral"),
                }
            )
        prev = insp
    for note in notes:
        events.append({"type": "STORAGE_NOTE", "title": f"Storage Note · Day {note['day']}", "detail": note["notes"], "at": note["created_at"], "tone": "neutral"})
    for dv in dispatches:
        events.append(
            {
                "type": "DISPATCH_VERIFICATION",
                "title": "Pre-Dispatch Verification",
                "detail": f"{DISPATCH_LABELS.get(dv['status'], dv['status'])}" + (f" — {dv['remarks']}" if dv.get("remarks") else ""),
                "at": dv["verified_at"],
                "tone": "good" if dv["status"] == "APPROVED" else "warn",
            }
        )
    if batch.get("dispatched_at"):
        events.append({"type": "DISPATCHED", "title": "Dispatched", "detail": "Batch left storage with verified digital quality record", "at": batch["dispatched_at"], "tone": "good"})
    events.sort(key=lambda e: e["at"])
    return {"batch": batch, "timeline": events, "inspections": inspections}


# ------------------------------------------------------------ inspections
@api.post("/inspections/analyze")
async def analyze_inspection(body: AnalyzeIn, user: dict = Depends(require_role("farmer"))):
    images = []
    for idx, data in enumerate(body.images):
        try:
            images.append(decode_image(data))
        except ImageValidationError as exc:
            raise HTTPException(status_code=400, detail=f"Image {idx + 1}: {exc}")
    try:
        result = await analyze_images(images)
    except Exception as exc:  # provider-level failure
        logger.exception("Vision analysis failed")
        raise HTTPException(status_code=502, detail=f"Quality analysis failed: {exc}")
    per_image = result.pop("per_image")
    stored = [{"data": to_jpeg_b64(img, 720, 70), "detections": info["onions"], "notes": info.get("notes", "")} for img, info in zip(images, per_image)]
    ts = datetime.now(timezone.utc)
    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "source": body.source,
        "images": stored,
        **result,
        "created_at": ts.isoformat(),
        "expires_at": ts + timedelta(minutes=45),
    }
    await db.pending_analyses.insert_one(dict(doc))
    doc.pop("expires_at")
    return {"analysis_id": doc.pop("id"), **doc}


@api.post("/inspections", status_code=201)
async def save_inspection(body: InspectionCreate, user: dict = Depends(require_role("farmer"))):
    pending = await db.pending_analyses.find_one({"id": body.analysis_id, "user_id": user["id"]}, NO_ID)
    if not pending:
        raise HTTPException(status_code=404, detail="Analysis not found or expired. Please analyse the images again")
    batch = await get_batch_or_404(body.batch_id, user)
    if batch["status"] == "DISPATCHED":
        raise HTTPException(status_code=400, detail="This batch has already been dispatched")
    day = body.inspection_day or (batch.get("storage_days", 0) + 1)
    ts = now_iso()
    insp = {
        "id": new_id(),
        "batch_id": batch["batch_id"],
        "batch_ref": batch["id"],
        "supplier_id": user["id"],
        "inspection_day": day,
        "source": pending["source"],
        "images": pending["images"],
        "total_detected": pending["total_detected"],
        "images_analyzed": pending["images_analyzed"],
        "counts": pending["counts"],
        "percentages": pending["percentages"],
        "grade_a": pending["grade_a"],
        "urs": pending["urs"],
        "defective": pending["defective"],
        "good_quality": pending["good_quality"],
        "overall_status": pending["overall_status"],
        "ai_summary": pending["ai_summary"],
        "ai_provider": pending["ai_provider"],
        "ai_model": pending["ai_model"],
        "verification_status": "PENDING",
        "verified_by": None,
        "verified_by_name": None,
        "verified_at": None,
        "verification_remarks": "",
        "notes": body.notes or "",
        "is_demo": False,
        "created_at": ts,
    }
    await db.inspections.insert_one(dict(insp))
    await db.storage_records.insert_one(
        {
            "id": new_id(),
            "batch_id": batch["batch_id"],
            "batch_ref": batch["id"],
            "day": day,
            "inspection_id": insp["id"],
            "type": "INSPECTION",
            "quality_percentage": insp["good_quality"],
            "defect_percentage": insp["defective"],
            "grade_a": insp["grade_a"],
            "urs": insp["urs"],
            "status": insp["overall_status"],
            "notes": body.notes or f"Day {day} quality check ({pending['source'].replace('_', ' ').title()})",
            "is_demo": False,
            "created_at": ts,
        }
    )
    latest = snapshot_of(insp)
    first = batch.get("first") or latest
    await db.batches.update_one(
        {"batch_id": batch["batch_id"]},
        {
            "$set": {
                "latest": latest,
                "first": first,
                "quality_trend": trend_of(first, latest),
                "status": "INSPECTED",
                "inspection_count": batch.get("inspection_count", 0) + 1,
                "storage_days": max(batch.get("storage_days", 0), day),
                "verification_id": batch.get("verification_id") or f"OAI-{uuid.uuid4().hex[:8].upper()}",
                "updated_at": ts,
            }
        },
    )
    await db.pending_analyses.delete_one({"id": body.analysis_id})
    insp.pop("images")
    return insp


@api.get("/inspections/one/{inspection_id}")
async def get_inspection(inspection_id: str, user: dict = Depends(get_current_user)):
    insp = await db.inspections.find_one({"id": inspection_id}, NO_ID)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    batch = await get_batch_or_404(insp["batch_id"], user)
    return {**insp, "batch": {k: batch.get(k) for k in ("batch_id", "variety", "quantity", "unit", "supplier_name", "procurement_center", "status", "verification_id")}}


@api.get("/inspections/{batch_id}")
async def list_inspections(batch_id: str, user: dict = Depends(get_current_user)):
    batch = await get_batch_or_404(batch_id, user)
    return await db.inspections.find({"batch_id": batch["batch_id"]}, NO_IMAGES).sort("created_at", 1).to_list(200)


@api.put("/inspections/{inspection_id}/verify")
async def verify_inspection(inspection_id: str, body: VerifyInspectionIn, user: dict = Depends(require_role("farmer"))):
    insp = await db.inspections.find_one({"id": inspection_id}, NO_IMAGES)
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")
    await get_batch_or_404(insp["batch_id"], user)
    changes = {
        "verification_status": body.status,
        "verified_by": user["id"],
        "verified_by_name": user["name"],
        "verified_at": now_iso(),
        "verification_remarks": body.remarks or "",
    }
    await db.inspections.update_one({"id": inspection_id}, {"$set": changes})
    return {**insp, **changes}


# ---------------------------------------------------------------- storage
def storage_alert(batch: dict, records: list) -> Optional[dict]:
    insp = [r for r in records if r["type"] == "INSPECTION"]
    if len(insp) < 2:
        return None
    first, last = insp[0], insp[-1]
    drop = round(first["grade_a"] - last["grade_a"], 1)
    rise = round(last["defect_percentage"] - first["defect_percentage"], 1)
    if drop >= 3 or rise >= 3:
        return {
            "severity": "high" if (drop >= 6 or rise >= 6) else "medium",
            "message": "Quality is declining during storage. Consider reinspection before dispatch.",
            "detail": f"Grade A fell {drop} points and defects rose {rise} points between Day {first['day']} and Day {last['day']}.",
        }
    return None


@api.get("/storage/{batch_id}")
async def get_storage(batch_id: str, user: dict = Depends(get_current_user)):
    batch = await get_batch_or_404(batch_id, user)
    records = await db.storage_records.find({"batch_id": batch["batch_id"]}, NO_ID).sort([("day", 1), ("created_at", 1)]).to_list(500)
    created = datetime.fromisoformat(batch["created_at"])
    duration = max(batch.get("storage_days", 0), (datetime.now(timezone.utc) - created).days + 1)
    trend = [
        {
            "label": f"Day {r['day']}",
            "day": r["day"],
            "grade_a": r["grade_a"],
            "urs": r["urs"],
            "defective": r["defect_percentage"],
            "good_quality": r["quality_percentage"],
            "status": r.get("status"),
            "date": r["created_at"],
        }
        for r in records
        if r["type"] == "INSPECTION"
    ]
    return {
        "batch": batch,
        "records": records,
        "trend": trend,
        "storage_duration_days": duration,
        "quality_trend": batch.get("quality_trend"),
        "alert": storage_alert(batch, records),
        "latest": batch.get("latest"),
    }


@api.post("/storage/{batch_id}", status_code=201)
async def add_storage_note(batch_id: str, body: StorageNoteIn, user: dict = Depends(require_role("farmer"))):
    batch = await get_batch_or_404(batch_id, user)
    latest = batch.get("latest") or {}
    day = body.day or max(batch.get("storage_days", 0), 1)
    record = {
        "id": new_id(),
        "batch_id": batch["batch_id"],
        "batch_ref": batch["id"],
        "day": day,
        "inspection_id": latest.get("inspection_id"),
        "type": "NOTE",
        "quality_percentage": latest.get("good_quality"),
        "defect_percentage": latest.get("defective"),
        "grade_a": latest.get("grade_a"),
        "urs": latest.get("urs"),
        "status": latest.get("status"),
        "notes": body.notes.strip(),
        "is_demo": False,
        "created_at": now_iso(),
    }
    await db.storage_records.insert_one(dict(record))
    await db.batches.update_one({"batch_id": batch["batch_id"]}, {"$set": {"storage_days": max(batch.get("storage_days", 0), day), "updated_at": record["created_at"]}})
    return record


# --------------------------------------------------------------- dispatch
@api.get("/dispatch/{batch_id}")
async def get_dispatch(batch_id: str, user: dict = Depends(get_current_user)):
    batch = await get_batch_or_404(batch_id, user)
    history = await db.dispatch_verifications.find({"batch_id": batch["batch_id"]}, NO_ID).sort("verified_at", -1).to_list(50)
    return {"batch": batch, "latest": history[0] if history else None, "history": history}


@api.post("/dispatch/{batch_id}/verify", status_code=201)
async def verify_dispatch(batch_id: str, body: DispatchVerifyIn, user: dict = Depends(require_role("farmer"))):
    batch = await get_batch_or_404(batch_id, user)
    if not batch.get("latest"):
        raise HTTPException(status_code=400, detail="Inspect this batch at least once before dispatch verification")
    if batch["status"] == "DISPATCHED":
        raise HTTPException(status_code=400, detail="This batch has already been dispatched")
    ts = now_iso()
    record = {
        "id": new_id(),
        "batch_id": batch["batch_id"],
        "batch_ref": batch["id"],
        "status": body.status,
        "verified_by": user["id"],
        "verified_by_name": user["name"],
        "verified_at": ts,
        "remarks": (body.remarks or "").strip(),
        "snapshot": batch["latest"],
        "is_demo": False,
    }
    await db.dispatch_verifications.insert_one(dict(record))
    new_status = "DISPATCH_APPROVED" if body.status == "APPROVED" else "REINSPECTION_REQUIRED"
    await db.batches.update_one({"batch_id": batch["batch_id"]}, {"$set": {"status": new_status, "updated_at": ts}})
    return {**record, "batch_status": new_status}


@api.post("/dispatch/{batch_id}/complete")
async def complete_dispatch(batch_id: str, user: dict = Depends(require_role("farmer"))):
    batch = await get_batch_or_404(batch_id, user)
    if batch["status"] != "DISPATCH_APPROVED":
        raise HTTPException(status_code=400, detail="Approve the batch for dispatch before marking it dispatched")
    ts = now_iso()
    await db.batches.update_one({"batch_id": batch["batch_id"]}, {"$set": {"status": "DISPATCHED", "dispatched_at": ts, "updated_at": ts}})
    return {"batch_id": batch["batch_id"], "status": "DISPATCHED", "dispatched_at": ts}


# ---------------------------------------------------------------- reports
async def build_report_data(batch: dict) -> dict:
    inspections = await db.inspections.find({"batch_id": batch["batch_id"]}, NO_IMAGES).sort("created_at", 1).to_list(200)
    if not inspections:
        raise HTTPException(status_code=404, detail="No inspection has been completed for this batch yet")
    latest = inspections[-1]
    records = await db.storage_records.find({"batch_id": batch["batch_id"], "type": "INSPECTION"}, NO_ID).sort("day", 1).to_list(200)
    dispatch = await db.dispatch_verifications.find_one({"batch_id": batch["batch_id"]}, NO_ID, sort=[("verified_at", -1)])
    created = datetime.fromisoformat(batch["created_at"])
    duration = max(batch.get("storage_days", 0), (datetime.now(timezone.utc) - created).days + 1)
    dispatch_info = None
    if batch["status"] == "DISPATCHED":
        dispatch_info = {"status": "DISPATCHED", "label": "Dispatched", "at": batch.get("dispatched_at"), "remarks": dispatch.get("remarks") if dispatch else ""}
    elif dispatch:
        dispatch_info = {"status": dispatch["status"], "label": DISPATCH_LABELS[dispatch["status"]], "at": dispatch["verified_at"], "remarks": dispatch.get("remarks", ""), "verified_by_name": dispatch.get("verified_by_name")}
    return {
        "brand": "ONIONAI",
        "tagline": "Smart Quality. Trusted Trade.",
        "verification_id": batch["verification_id"],
        "batch_id": batch["batch_id"],
        "supplier": batch["supplier_name"],
        "procurement_center": batch["procurement_center"],
        "variety": batch["variety"],
        "quantity": batch["quantity"],
        "unit": batch["unit"],
        "storage_location": batch.get("storage_location", ""),
        "batch_status": batch["status"],
        "inspection_date": latest["created_at"],
        "inspection_source": latest["source"],
        "inspection_day": latest["inspection_day"],
        "inspection_count": len(inspections),
        "inspection_id": latest["id"],
        "total_detected": latest["total_detected"],
        "images_analyzed": latest.get("images_analyzed", 0),
        "grade_a": latest["grade_a"],
        "urs": latest["urs"],
        "good_quality": latest["good_quality"],
        "defective": latest["defective"],
        "percentages": latest["percentages"],
        "counts": latest["counts"],
        "overall_status": latest["overall_status"],
        "ai_summary": latest["ai_summary"],
        "ai_provider": latest.get("ai_provider"),
        "ai_model": latest.get("ai_model"),
        "human_verification": {
            "status": latest.get("verification_status", "PENDING"),
            "verified_by_name": latest.get("verified_by_name"),
            "verified_at": latest.get("verified_at"),
            "remarks": latest.get("verification_remarks", ""),
        },
        "storage_history": [
            {"day": r["day"], "date": r["created_at"], "grade_a": r["grade_a"], "urs": r["urs"], "quality_percentage": r["quality_percentage"], "defect_percentage": r["defect_percentage"], "status": r.get("status")}
            for r in records
        ],
        "storage_duration_days": duration,
        "quality_trend": batch.get("quality_trend"),
        "dispatch": dispatch_info,
        "generated_at": now_iso(),
        "batch_created_at": batch["created_at"],
    }


async def get_report(batch: dict) -> dict:
    data = await build_report_data(batch)
    report = {"id": new_id(), "batch_id": batch["batch_id"], "batch_ref": batch["id"], "verification_id": batch["verification_id"], "generated_at": data["generated_at"], "report_data": data}
    await db.reports.update_one({"batch_id": batch["batch_id"]}, {"$set": {k: v for k, v in report.items() if k != "id"}, "$setOnInsert": {"id": report["id"]}}, upsert=True)
    return data


@api.get("/reports")
async def list_reports(user: dict = Depends(get_current_user)):
    query = {**batches_query(user), "inspection_count": {"$gt": 0}}
    batches = await db.batches.find(query, NO_ID).sort("updated_at", -1).to_list(500)
    return [
        {
            "batch_id": b["batch_id"],
            "verification_id": b.get("verification_id"),
            "variety": b["variety"],
            "quantity": b["quantity"],
            "unit": b["unit"],
            "supplier_name": b["supplier_name"],
            "procurement_center": b["procurement_center"],
            "status": b["status"],
            "latest": b.get("latest"),
            "inspection_count": b.get("inspection_count", 0),
            "updated_at": b["updated_at"],
        }
        for b in batches
    ]


@api.get("/reports/{batch_id}")
async def report_json(batch_id: str, user: dict = Depends(get_current_user)):
    batch = await get_batch_or_404(batch_id, user)
    return await get_report(batch)


@api.get("/reports/{batch_id}/pdf")
async def report_pdf(batch_id: str, user: dict = Depends(get_current_user)):
    batch = await get_batch_or_404(batch_id, user)
    data = await get_report(batch)
    pdf = build_pdf(data)
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition": f'attachment; filename="ONIONAI-{batch["batch_id"]}-quality-report.pdf"'})


# ------------------------------------------------------------ verification
@api.get("/verify/{code}")
async def verify_public(code: str):
    key = code.strip().upper()
    batch = await db.batches.find_one({"$or": [{"batch_id": key}, {"verification_id": key}]}, NO_ID)
    if not batch or batch.get("inspection_count", 0) == 0:
        raise HTTPException(status_code=404, detail="No verified quality record found for this ID")
    data = await build_report_data(batch)
    for field in ("counts", "inspection_id", "ai_model"):
        data.pop(field, None)
    return {"verified": True, **data}


# --------------------------------------------------------------- dashboard
@api.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    batches = await db.batches.find(batches_query(user), NO_ID).sort("created_at", -1).to_list(1000)
    codes = [b["batch_id"] for b in batches]
    inspected = [b for b in batches if b.get("latest")]

    def avg(key: str) -> float:
        return round(sum(b["latest"][key] for b in inspected) / len(inspected), 1) if inspected else 0.0

    pending = [b for b in batches if b["status"] in ("CREATED", "REINSPECTION_REQUIRED")]
    alerts = []
    for b in batches:
        if b.get("quality_trend") == "declining":
            drop = round(b["first"]["grade_a"] - b["latest"]["grade_a"], 1)
            alerts.append({"batch_id": b["batch_id"], "variety": b["variety"], "message": "Quality is declining during storage. Consider reinspection before dispatch.", "grade_a_drop": drop, "severity": "high" if drop >= 6 else "medium"})
        elif b["status"] == "REINSPECTION_REQUIRED":
            alerts.append({"batch_id": b["batch_id"], "variety": b["variety"], "message": "Reinspection required before this batch can be dispatched.", "grade_a_drop": 0, "severity": "medium"})

    recent_inspections = await db.inspections.find({"batch_id": {"$in": codes}}, NO_IMAGES).sort("created_at", -1).to_list(12)
    trend_source = list(reversed(recent_inspections))
    quality_trend = [{"label": f"{i['batch_id'][-3:]} · D{i['inspection_day']}", "batch_id": i["batch_id"], "grade_a": i["grade_a"], "defective": i["defective"], "date": i["created_at"]} for i in trend_source]

    records = await db.storage_records.find({"batch_id": {"$in": codes}, "type": "INSPECTION"}, NO_ID).to_list(5000)
    by_day: dict = {}
    for r in records:
        by_day.setdefault(r["day"], []).append(r)
    storage_trend = [
        {"label": f"Day {day}", "day": day, "grade_a": round(sum(r["grade_a"] for r in rs) / len(rs), 1), "defective": round(sum(r["defect_percentage"] for r in rs) / len(rs), 1), "batches": len(rs)}
        for day, rs in sorted(by_day.items())
    ]

    return {
        "totals": {
            "total_batches": len(batches),
            "inspected_batches": len(inspected),
            "good_quality": avg("good_quality"),
            "grade_a": avg("grade_a"),
            "urs": avg("urs"),
            "defective": avg("defective"),
            "storage_alerts": len(alerts),
            "pending_inspections": len(pending),
        },
        "recent_batches": batches[:6],
        "quality_trend": quality_trend,
        "storage_trend": storage_trend,
        "recent_inspections": recent_inspections[:5],
        "alerts": alerts,
    }


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.batches.create_index("batch_id", unique=True)
    await db.batches.create_index("supplier_id")
    await db.inspections.create_index([("batch_id", 1), ("created_at", 1)])
    await db.storage_records.create_index([("batch_id", 1), ("day", 1)])
    await db.login_attempts.create_index("identifier")
    await db.pending_analyses.create_index("expires_at", expireAfterSeconds=0)
    await seed_demo_data()
    logger.info("ONIONAI ready · AI provider: %s", provider_config()["provider"])


@app.on_event("shutdown")
async def on_shutdown():
    client.close()
