import os
import uuid
from datetime import datetime, timedelta, timezone

from auth import hash_password, verify_password
from database import db
from vision_service import LABELS, overall_status

DEMO_INSPECTIONS = {
    "ON-2026-001": [
        (1, "CAMERA", {"good": 84, "undersized": 6, "oversized": 3, "damaged": 4, "rotten": 2, "sprouted": 1}, 5),
        (2, "CAMERA", {"good": 82, "undersized": 7, "oversized": 3, "damaged": 4, "rotten": 3, "sprouted": 1}, 4),
        (3, "IMAGE_UPLOAD", {"good": 78, "undersized": 7, "oversized": 3, "damaged": 5, "rotten": 5, "sprouted": 2}, 2),
    ],
    "ON-2026-002": [
        (1, "CAMERA", {"good": 88, "undersized": 5, "oversized": 2, "damaged": 3, "rotten": 1, "sprouted": 1}, 8),
        (2, "IMAGE_UPLOAD", {"good": 87, "undersized": 5, "oversized": 2, "damaged": 3, "rotten": 2, "sprouted": 1}, 6),
    ],
    "ON-2026-003": [],
}


def _metrics(counts: dict) -> dict:
    total = sum(counts.values())
    pct = {k: round(counts.get(k, 0) / total * 100, 1) for k in LABELS}
    grade_a = pct["good"]
    urs = round(pct["undersized"] + pct["oversized"], 1)
    defective = round(pct["damaged"] + pct["rotten"] + pct["sprouted"], 1)
    return {
        "total_detected": total,
        "images_analyzed": 3,
        "counts": {k: counts.get(k, 0) for k in LABELS},
        "percentages": pct,
        "grade_a": grade_a,
        "urs": urs,
        "defective": defective,
        "good_quality": round(100 - defective, 1),
        "overall_status": overall_status(grade_a, defective, total),
    }


async def _ensure_user(email: str, password: str, name: str, role: str, organization: str) -> dict:
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing is None:
        user = {
            "id": str(uuid.uuid4()),
            "name": name,
            "email": email,
            "password_hash": hash_password(password),
            "role": role,
            "organization": organization,
            "is_demo": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(dict(user))
        return user
    if not verify_password(password, existing["password_hash"]):
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(password)}})
    return existing


async def seed_demo_data() -> None:
    owner_email = os.environ.get("OWNER_EMAIL", "owner@onionai.demo").lower()
    owner = await _ensure_user(owner_email, os.environ.get("OWNER_PASSWORD", "Onion@2026"), "Sunny Kumar", "farmer", "Sunny Kumar Farms, Nashik")
    await _ensure_user(
        os.environ.get("DEMO_BUYER_EMAIL", "buyer@onionai.demo").lower(),
        os.environ.get("DEMO_BUYER_PASSWORD", "Buyer@2026"),
        "Priya Traders",
        "buyer",
        "Priya Agro Traders, Mumbai",
    )

    if await db.batches.find_one({"batch_id": "ON-2026-001"}):
        return

    now = datetime.now(timezone.utc)
    batches = [
        {
            "batch_id": "ON-2026-001",
            "variety": "Nashik Red",
            "quantity": 5000,
            "unit": "kg",
            "procurement_center": "Lasalgaon APMC Procurement Center",
            "storage_location": "Cold Storage Unit B-4, Lasalgaon",
            "notes": "Harvested after monsoon; stored in ventilated crates.",
            "created_days_ago": 6,
        },
        {
            "batch_id": "ON-2026-002",
            "variety": "Bellary Red",
            "quantity": 2.5,
            "unit": "tonnes",
            "procurement_center": "Kurnool Procurement Center",
            "storage_location": "Warehouse 2, Kurnool Mandi",
            "notes": "Contract lot for export buyer.",
            "created_days_ago": 9,
        },
        {
            "batch_id": "ON-2026-003",
            "variety": "Pusa White Flat",
            "quantity": 1200,
            "unit": "kg",
            "procurement_center": "Pune Market Yard Procurement Center",
            "storage_location": "Farm shed, Fursungi",
            "notes": "Awaiting first inspection.",
            "created_days_ago": 1,
        },
    ]

    for spec in batches:
        created = now - timedelta(days=spec.pop("created_days_ago"))
        inspections = DEMO_INSPECTIONS[spec["batch_id"]]
        batch = {
            "id": str(uuid.uuid4()),
            **spec,
            "supplier_id": owner["id"],
            "supplier_name": "Sunny Kumar Farms",
            "inspection_date": created.date().isoformat(),
            "status": "CREATED",
            "is_demo": True,
            "inspection_count": 0,
            "storage_days": 0,
            "latest": None,
            "first": None,
            "quality_trend": None,
            "verification_id": None,
            "dispatched_at": None,
            "created_at": created.isoformat(),
            "updated_at": created.isoformat(),
        }
        if inspections:
            batch["verification_id"] = f"OAI-{uuid.uuid4().hex[:8].upper()}"
        for day, source, counts, days_ago in inspections:
            m = _metrics(counts)
            at = (now - timedelta(days=days_ago)).isoformat()
            summary = (
                f"Analysed {m['total_detected']} onions across 3 images. {m['grade_a']}% meet Grade A standard, "
                f"{m['urs']}% are under/over-sized (URS) and {m['defective']}% show defects. Overall assessment: "
                f"{m['overall_status'].title()}."
            )
            insp = {
                "id": str(uuid.uuid4()),
                "batch_id": batch["batch_id"],
                "batch_ref": batch["id"],
                "supplier_id": owner["id"],
                "inspection_day": day,
                "source": source,
                "images": [],
                **m,
                "ai_summary": summary,
                "ai_provider": "demo-seed",
                "ai_model": "demo",
                "verification_status": "VERIFIED" if day == 1 else "PENDING",
                "verified_by": owner["id"] if day == 1 else None,
                "verified_by_name": owner["name"] if day == 1 else None,
                "verified_at": at if day == 1 else None,
                "verification_remarks": "Checked manually at procurement center." if day == 1 else "",
                "notes": "Demo inspection record",
                "is_demo": True,
                "created_at": at,
            }
            await db.inspections.insert_one(dict(insp))
            await db.storage_records.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "batch_id": batch["batch_id"],
                    "batch_ref": batch["id"],
                    "day": day,
                    "inspection_id": insp["id"],
                    "type": "INSPECTION",
                    "quality_percentage": m["good_quality"],
                    "defect_percentage": m["defective"],
                    "grade_a": m["grade_a"],
                    "urs": m["urs"],
                    "status": m["overall_status"],
                    "notes": f"Day {day} quality check ({source.replace('_', ' ').title()})",
                    "is_demo": True,
                    "created_at": at,
                }
            )
            snapshot = {
                "grade_a": m["grade_a"],
                "urs": m["urs"],
                "defective": m["defective"],
                "good_quality": m["good_quality"],
                "status": m["overall_status"],
                "inspected_at": at,
                "source": source,
                "inspection_id": insp["id"],
                "inspection_day": day,
            }
            batch["first"] = batch["first"] or snapshot
            batch["latest"] = snapshot
            batch["inspection_count"] += 1
            batch["storage_days"] = day
            batch["status"] = "INSPECTED"
            batch["updated_at"] = at
        if batch["first"] and batch["latest"]:
            drop = batch["first"]["grade_a"] - batch["latest"]["grade_a"]
            rise = batch["latest"]["defective"] - batch["first"]["defective"]
            batch["quality_trend"] = "declining" if (drop >= 3 or rise >= 3) else ("improving" if drop <= -3 else "stable")
        if spec["batch_id"] == "ON-2026-002":
            at = (now - timedelta(days=5)).isoformat()
            await db.dispatch_verifications.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "batch_id": batch["batch_id"],
                    "batch_ref": batch["id"],
                    "status": "APPROVED",
                    "verified_by": owner["id"],
                    "verified_by_name": owner["name"],
                    "verified_at": at,
                    "remarks": "Quality stable across storage days. Cleared for buyer pickup.",
                    "snapshot": batch["latest"],
                    "is_demo": True,
                }
            )
            batch["status"] = "DISPATCH_APPROVED"
            batch["updated_at"] = at
        await db.batches.insert_one(dict(batch))

    await db.counters.update_one({"_id": f"batch-{now.year}"}, {"$max": {"seq": 3}}, upsert=True)
