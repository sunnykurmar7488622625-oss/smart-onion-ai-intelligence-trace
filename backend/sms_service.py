"""SMS alert service: Twilio when configured via env, otherwise a clearly labelled MOCKED sender."""
import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone

from database import db

logger = logging.getLogger("onionai.sms")


def sms_config() -> dict:
    sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    from_number = os.environ.get("TWILIO_FROM_NUMBER", "")
    connected = bool(sid and token and from_number)
    return {"provider": "twilio" if connected else "mock", "connected": connected, "from_number": from_number or None}


def _twilio_send(sid: str, token: str, from_number: str, to: str, body: str) -> str:
    from twilio.rest import Client

    message = Client(sid, token).messages.create(to=to, from_=from_number, body=body)
    return message.sid


async def send_sms(user: dict, batch_id: str, message: str, kind: str = "DECLINE_ALERT") -> dict:
    cfg = sms_config()
    phone = (user.get("phone") or "").strip()
    record = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "batch_id": batch_id,
        "phone": phone,
        "message": message,
        "kind": kind,
        "provider": cfg["provider"],
        "status": "MOCKED",
        "provider_sid": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if not phone:
        record["status"] = "NO_PHONE"
    elif cfg["connected"]:
        try:
            record["provider_sid"] = await asyncio.to_thread(
                _twilio_send, os.environ["TWILIO_ACCOUNT_SID"], os.environ["TWILIO_AUTH_TOKEN"], os.environ["TWILIO_FROM_NUMBER"], phone, message
            )
            record["status"] = "SENT"
        except Exception as exc:
            record["status"] = "FAILED"
            record["error"] = str(exc)[:300]
            logger.warning("Twilio SMS failed for %s: %s", phone, exc)
    else:
        logger.info("[MOCK SMS] to %s: %s", phone, message)
    await db.sms_alerts.insert_one(dict(record))
    return record
