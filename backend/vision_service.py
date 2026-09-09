"""Reusable onion vision-analysis service with a configurable AI provider."""
import asyncio
import base64
import io
import json
import logging
import os
import re
import uuid
from typing import Any, Dict, List

import numpy as np
from PIL import Image, ImageOps

logger = logging.getLogger("onionai.vision")

LABELS = ["good", "damaged", "rotten", "sprouted", "undersized", "oversized"]
DEFECT_LABELS = ("damaged", "rotten", "sprouted")
SIZE_LABELS = ("undersized", "oversized")
MAX_IMAGE_BYTES = 8 * 1024 * 1024
ALLOWED_FORMATS = {"JPEG", "PNG", "WEBP"}
DEFAULT_MODELS = {"openai": "gpt-5.4", "gemini": "gemini-3.1-pro-preview"}

SYSTEM_PROMPT = (
    "You are an expert agricultural produce inspector specialising in onion quality grading at "
    "procurement centres. You analyse photographs of onions and return strict JSON only, never prose."
)
USER_PROMPT = (
    "Inspect this photograph carefully like a procurement-centre grader. Detect every clearly visible individual onion "
    "(ignore partially hidden onions at the edges). For each onion return a tight bounding box normalised to the image as "
    "[x, y, width, height] with values between 0 and 1, and classify it into exactly ONE label using these rules in order:\n"
    "1. rotten: black/grey soft mould, decay, wet, sunken or oozing patches, collapsed neck\n"
    "2. sprouted: a green or white shoot clearly emerging from the neck\n"
    "3. damaged: cuts, bruises, cracks, deep splits, peeled or missing outer skin exposing flesh, mechanical injury. "
    "Do NOT count normal loose papery skin or dust as damage\n"
    "4. undersized: clearly small relative to the other onions in the frame or a visible reference (roughly under 40mm)\n"
    "5. oversized: clearly jumbo relative to the others (roughly over 80mm)\n"
    "6. good: clean, firm, intact dry skin, well-cured neck, normal market size\n"
    "Be conservative: only assign a defect when the evidence is clearly visible; if unsure between good and a defect prefer good "
    "but lower the confidence. In a dense pile, sample the clearly distinguishable onions (up to 40). "
    "If no onions are present set is_onion_image to false and return an empty list.\n"
    'Respond ONLY with JSON in this exact shape: {"is_onion_image": true, "onions": [{"box": [0.1, 0.2, 0.3, 0.3], '
    '"label": "good", "confidence": 0.92}], "notes": "one short sentence about lighting, framing and visible quality"}'
)


class ImageValidationError(ValueError):
    pass


# ---------------------------------------------------------------- image utils
def decode_image(data: str) -> Image.Image:
    raw = data.split(",", 1)[1] if data.startswith("data:") else data
    try:
        blob = base64.b64decode(raw)
    except Exception:
        raise ImageValidationError("Image data is not valid base64")
    if len(blob) > MAX_IMAGE_BYTES:
        raise ImageValidationError("Each image must be smaller than 8MB")
    try:
        probe = Image.open(io.BytesIO(blob))
        probe.verify()
        img = Image.open(io.BytesIO(blob))
        fmt = img.format
        img = ImageOps.exif_transpose(img).convert("RGB")
    except Exception:
        raise ImageValidationError("Unsupported or corrupted image file")
    if fmt not in ALLOWED_FORMATS:
        raise ImageValidationError(f"Only JPEG, PNG or WEBP images are accepted (received {fmt})")
    if img.width < 64 or img.height < 64:
        raise ImageValidationError("Image is too small to analyse (minimum 64x64 pixels)")
    return img


def to_jpeg_b64(img: Image.Image, max_side: int, quality: int) -> str:
    im = img.copy()
    im.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=quality, optimize=True)
    return base64.b64encode(buf.getvalue()).decode("ascii")


# ------------------------------------------------------------ local provider
def _rgb_to_hsv(arr: np.ndarray):
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mx = arr.max(-1)
    mn = arr.min(-1)
    d = mx - mn
    safe_d = np.where(d == 0, 1, d)
    h = np.zeros_like(mx)
    is_r = (mx == r) & (d > 0)
    is_g = (mx == g) & (d > 0) & ~is_r
    is_b = (mx == b) & (d > 0) & ~is_r & ~is_g
    h = np.where(is_r, ((g - b) / safe_d) % 6, h)
    h = np.where(is_g, ((b - r) / safe_d) + 2, h)
    h = np.where(is_b, ((r - g) / safe_d) + 4, h)
    h = h / 6.0
    s = np.where(mx > 0, d / np.where(mx == 0, 1, mx), 0)
    return h, s, mx


def _components(mask: np.ndarray) -> List[List[tuple]]:
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    comps = []
    for y in range(h):
        for x in range(w):
            if mask[y, x] and not seen[y, x]:
                stack = [(y, x)]
                seen[y, x] = True
                pts = []
                while stack:
                    cy, cx = stack.pop()
                    pts.append((cy, cx))
                    for ny, nx in ((cy - 1, cx), (cy + 1, cx), (cy, cx - 1), (cy, cx + 1)):
                        if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True
                            stack.append((ny, nx))
                comps.append(pts)
    return comps


def _classify(h, s, v, ys, xs, allow_size: bool, area: int, median_area: float) -> str:
    H, W = v.shape
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    vals = v[ys, xs]
    dark_ratio = float((vals < 0.28).mean())
    pad_y, pad_x = int((y1 - y0) * 0.25) + 1, int((x1 - x0) * 0.25) + 1
    ry0, ry1 = max(0, y0 - pad_y), min(H, y1 + pad_y + 1)
    rx0, rx1 = max(0, x0 - pad_x), min(W, x1 + pad_x + 1)
    rh, rs, rv = h[ry0:ry1, rx0:rx1], s[ry0:ry1, rx0:rx1], v[ry0:ry1, rx0:rx1]
    green_ratio = float(((rh > 0.2) & (rh < 0.45) & (rs > 0.3) & (rv > 0.2)).mean())
    texture = float(vals.std())
    if dark_ratio > 0.20:
        return "rotten"
    if green_ratio > 0.05:
        return "sprouted"
    if texture > 0.21:
        return "damaged"
    if allow_size and area < 0.45 * median_area:
        return "undersized"
    if allow_size and area > 2.2 * median_area:
        return "oversized"
    return "good"


def analyze_local(img: Image.Image) -> Dict[str, Any]:
    """Deterministic colour/texture image processing. Used when no AI key is configured."""
    im = img.copy()
    im.thumbnail((160, 160))
    arr = np.asarray(im).astype(np.float32) / 255.0
    h, s, v = _rgb_to_hsv(arr)
    H, W = v.shape
    onion_mask = (s > 0.22) & (v > 0.18) & ((h < 0.13) | (h > 0.78))
    comps = [c for c in _components(onion_mask) if len(c) >= 0.006 * onion_mask.size]
    if not comps:
        return {"is_onion_image": False, "onions": [], "notes": "No onion-coloured regions were detected."}

    largest = max(len(c) for c in comps)
    onions: List[Dict[str, Any]] = []
    if largest > 0.35 * onion_mask.size:
        pts = max(comps, key=len)
        ys = np.array([p[0] for p in pts])
        xs = np.array([p[1] for p in pts])
        y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
        grid = 5
        cell_h, cell_w = max(1, (y1 - y0 + 1) // grid), max(1, (x1 - x0 + 1) // grid)
        for gy in range(grid):
            for gx in range(grid):
                cy0, cx0 = y0 + gy * cell_h, x0 + gx * cell_w
                cy1, cx1 = min(y1 + 1, cy0 + cell_h), min(x1 + 1, cx0 + cell_w)
                cell = onion_mask[cy0:cy1, cx0:cx1]
                if cell.size == 0 or cell.mean() < 0.45:
                    continue
                cys, cxs = np.nonzero(cell)
                label = _classify(h, s, v, cys + cy0, cxs + cx0, False, 0, 1)
                onions.append(
                    {
                        "box": [round(cx0 / W, 4), round(cy0 / H, 4), round((cx1 - cx0) / W, 4), round((cy1 - cy0) / H, 4)],
                        "label": label,
                        "confidence": 0.6,
                    }
                )
        notes = f"Dense pile detected; analysed {len(onions)} sample regions using colour and texture processing."
    else:
        areas = np.array([len(c) for c in comps], dtype=float)
        median_area = float(np.median(areas))
        allow_size = len(comps) >= 3
        for pts in comps:
            ys = np.array([p[0] for p in pts])
            xs = np.array([p[1] for p in pts])
            y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
            label = _classify(h, s, v, ys, xs, allow_size, len(pts), median_area)
            conf = round(min(0.9, 0.55 + 0.35 * min(1.0, len(pts) / (0.05 * onion_mask.size))), 2)
            onions.append(
                {
                    "box": [round(x0 / W, 4), round(y0 / H, 4), round((x1 - x0 + 1) / W, 4), round((y1 - y0 + 1) / H, 4)],
                    "label": label,
                    "confidence": conf,
                }
            )
        notes = f"Colour and texture processing detected {len(onions)} onion-like regions."
    return {"is_onion_image": True, "onions": onions, "notes": notes}


# -------------------------------------------------------------- LLM provider
def _parse_llm_json(text: str) -> Dict[str, Any]:
    cleaned = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object in model response")
    data = json.loads(cleaned[start : end + 1])
    onions = []
    for o in data.get("onions", []) or []:
        label = str(o.get("label", "")).lower().strip()
        if label not in LABELS:
            continue
        box = o.get("box") or [0, 0, 1, 1]
        if len(box) != 4:
            continue
        box = [round(min(1.0, max(0.0, float(b))), 4) for b in box]
        conf = float(o.get("confidence", 0.7))
        onions.append({"box": box, "label": label, "confidence": round(min(1.0, max(0.0, conf)), 2)})
    return {
        "is_onion_image": bool(data.get("is_onion_image", bool(onions))),
        "onions": onions,
        "notes": str(data.get("notes", ""))[:300],
    }


async def analyze_llm(img: Image.Image, provider: str, model: str, api_key: str) -> Dict[str, Any]:
    from emergentintegrations.llm.chat import ImageContent, LlmChat, UserMessage

    chat = LlmChat(api_key=api_key, session_id=f"onion-{uuid.uuid4()}", system_message=SYSTEM_PROMPT).with_model(
        provider, model
    )
    message = UserMessage(text=USER_PROMPT, file_contents=[ImageContent(image_base64=to_jpeg_b64(img, 1280, 90))])
    text = await chat.send_message(message)
    return _parse_llm_json(text)


# ------------------------------------------------------------- orchestration
def provider_config() -> Dict[str, Any]:
    provider = (os.environ.get("AI_PROVIDER") or "local").lower()
    api_key = os.environ.get("EMERGENT_LLM_KEY") or ""
    if provider not in DEFAULT_MODELS or not api_key:
        return {"provider": "local", "model": "colour-texture-v1", "api_key": "", "connected": False}
    model = os.environ.get("AI_MODEL") or DEFAULT_MODELS[provider]
    return {"provider": provider, "model": model, "api_key": api_key, "connected": True}


def overall_status(grade_a: float, defective: float, total: int) -> str:
    if total == 0:
        return "REVIEW REQUIRED"
    if defective <= 10 and grade_a >= 70:
        return "PASS"
    if defective <= 20 and grade_a >= 50:
        return "REVIEW REQUIRED"
    return "LOW QUALITY"


def compute_metrics(per_image: List[Dict[str, Any]], provider_used: str, model: str) -> Dict[str, Any]:
    counts = {label: 0 for label in LABELS}
    for item in per_image:
        for onion in item["onions"]:
            counts[onion["label"]] += 1
    total = sum(counts.values())
    pct = {label: (round(counts[label] / total * 100, 1) if total else 0.0) for label in LABELS}
    grade_a = pct["good"]
    urs = round(pct["undersized"] + pct["oversized"], 1)
    defective = round(pct["damaged"] + pct["rotten"] + pct["sprouted"], 1)
    good_quality = round(100 - defective, 1) if total else 0.0
    status = overall_status(grade_a, defective, total)

    if total == 0:
        summary = (
            "No onions could be detected in the submitted image(s). Retake the photo with onions clearly visible, "
            "good lighting and a plain background."
        )
    else:
        summary = (
            f"Analysed {total} onion{'s' if total != 1 else ''} across {len(per_image)} image"
            f"{'s' if len(per_image) != 1 else ''}. {grade_a}% meet Grade A standard, {urs}% are under/over-sized (URS) "
            f"and {defective}% show defects"
        )
        if defective > 0:
            top = max(DEFECT_LABELS, key=lambda l: counts[l])
            summary += f", mainly {top}"
        summary += f". Overall assessment: {status.title()}."
    notes = [i.get("notes") for i in per_image if i.get("notes")]
    if notes:
        summary += " " + " ".join(notes[:2])

    return {
        "total_detected": total,
        "images_analyzed": len(per_image),
        "counts": counts,
        "percentages": pct,
        "grade_a": grade_a,
        "urs": urs,
        "defective": defective,
        "good_quality": good_quality,
        "overall_status": status,
        "ai_summary": summary,
        "ai_provider": provider_used,
        "ai_model": model,
    }


async def analyze_images(images: List[Image.Image]) -> Dict[str, Any]:
    cfg = provider_config()
    per_image: List[Dict[str, Any]] = []
    provider_used = cfg["provider"]
    model = cfg["model"]

    if cfg["connected"]:
        results = await asyncio.gather(
            *[analyze_llm(img, cfg["provider"], cfg["model"], cfg["api_key"]) for img in images],
            return_exceptions=True,
        )
        for img, res in zip(images, results):
            if isinstance(res, Exception):
                logger.warning("AI provider failed, using local image processing: %s", res)
                local = analyze_local(img)
                local["notes"] = "AI provider unavailable for this image; local image processing used."
                per_image.append(local)
                provider_used = "local-fallback"
            else:
                per_image.append(res)
    else:
        per_image = [analyze_local(img) for img in images]

    metrics = compute_metrics(per_image, provider_used, model)
    metrics["per_image"] = per_image
    return metrics
