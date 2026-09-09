import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request

from database import db

ALGO = "HS256"
PUBLIC_FIELDS = ("id", "name", "email", "role", "organization", "phone", "created_at")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False


def create_token(user: dict) -> str:
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "role": user["role"],
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=ALGO)


def public_user(doc: dict) -> dict:
    return {k: doc.get(k) for k in PUBLIC_FIELDS}


async def get_current_user(request: Request) -> dict:
    header = request.headers.get("Authorization", "")
    token = header[7:] if header.startswith("Bearer ") else request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Please log in to continue")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Your session has expired. Please log in again")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Invalid token type")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Account not found")
    return user


def require_role(*roles: str):
    async def dependency(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Your account role is not allowed to perform this action")
        return user

    return dependency


async def check_lockout(identifier: str) -> None:
    doc = await db.login_attempts.find_one({"identifier": identifier})
    if not doc or doc.get("count", 0) < 5:
        return
    last = datetime.fromisoformat(doc["last_at"])
    if datetime.now(timezone.utc) - last < timedelta(minutes=15):
        raise HTTPException(status_code=429, detail="Too many failed attempts. Please try again in 15 minutes")
    await db.login_attempts.delete_one({"identifier": identifier})


async def record_failure(identifier: str) -> None:
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {"$inc": {"count": 1}, "$set": {"last_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


async def clear_failures(identifier: str) -> None:
    await db.login_attempts.delete_one({"identifier": identifier})
