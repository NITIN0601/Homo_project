"""
Security, Cryptography & RBAC Dependencies for FastAPI.
Provides role verification, password hashing, and token parsing.
"""

import base64
import hashlib
import hmac
import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Header, HTTPException, status
from core.config import settings

logger = logging.getLogger("security")

# SSOT for email validation across auth and calendar services
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def b64url_decode(s: str) -> bytes:
    padding = "=" * (4 - (len(s) % 4)) if len(s) % 4 != 0 else ""
    return base64.urlsafe_b64decode(s + padding)


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    if salt is None:
        import os
        salt = os.urandom(16).hex()
    pwd_bytes = password.encode("utf-8")
    salt_bytes = salt.encode("utf-8")
    key = hashlib.pbkdf2_hmac("sha256", pwd_bytes, salt_bytes, 100_000)
    return key.hex(), salt


def verify_password(password: str, stored_hash: str, stored_salt: str) -> bool:
    calc_hash, _ = hash_password(password, stored_salt)
    return hmac.compare_digest(calc_hash, stored_hash)


def create_access_token(payload: dict[str, Any], expires_days: int = settings.ACCESS_TOKEN_EXPIRE_DAYS) -> str:
    header = {"alg": settings.JWT_ALGORITHM, "typ": "JWT"}
    exp = datetime.now(timezone.utc) + timedelta(days=expires_days)
    body = {**payload, "exp": int(exp.timestamp())}

    h_b64 = b64url_encode(json.dumps(header).encode("utf-8"))
    p_b64 = b64url_encode(json.dumps(body).encode("utf-8"))
    sig_input = f"{h_b64}.{p_b64}".encode("utf-8")
    secret_bytes = settings.JWT_SECRET.encode("utf-8")

    sig = hmac.new(secret_bytes, sig_input, hashlib.sha256).digest()
    sig_b64 = b64url_encode(sig)
    return f"{h_b64}.{p_b64}.{sig_b64}"


def verify_access_token(token: str) -> dict[str, Any] | None:
    try:
        parts = token.strip().split(".")
        if len(parts) != 3:
            return None
        h_b64, p_b64, sig_b64 = parts
        sig_input = f"{h_b64}.{p_b64}".encode("utf-8")
        secret_bytes = settings.JWT_SECRET.encode("utf-8")

        expected_sig = hmac.new(secret_bytes, sig_input, hashlib.sha256).digest()
        actual_sig = b64url_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        body_bytes = b64url_decode(p_b64)
        payload = json.loads(body_bytes.decode("utf-8"))

        # Check expiration
        exp = payload.get("exp")
        if exp and datetime.now(timezone.utc).timestamp() > exp:
            return None

        return payload
    except Exception as exc:
        logger.debug(f"JWT verification failure: {exc}")
        return None


async def get_current_user_optional(authorization: str | None = Header(None)) -> dict[str, Any] | None:
    if not authorization:
        return None
    if not authorization.startswith("Bearer "):
        return None
    token = authorization.split("Bearer ", 1)[1].strip()
    return verify_access_token(token)


async def get_current_user(authorization: str | None = Header(None)) -> dict[str, Any]:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = authorization.split("Bearer ", 1)[1].strip()
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


async def require_admin_role(authorization: str | None = Header(None)) -> dict[str, Any]:
    user = await get_current_user(authorization)
    role = user.get("role")
    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required for this resource.",
        )
    return user


async def require_patient_or_admin(
    target_patient_id: str,
    authorization: str | None = Header(None),
) -> dict[str, Any]:
    """
    HIPAA / PHI Isolation Wall:
    Guarantees that a user can only access their own patient records,
    or that the caller possesses doctor/admin privileges.
    """
    user = await get_current_user(authorization)
    role = user.get("role", "patient")

    if role == "admin":
        return user

    user_id = user.get("sub") or user.get("id") or user.get("email")
    if user_id != target_patient_id and user.get("email") != target_patient_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: You cannot view or modify another patient's Protected Health Information (PHI).",
        )
    return user


def scope_items_to_patient_or_admin(
    items: list[dict[str, Any]],
    user: dict[str, Any] | None,
    id_fields: tuple[str, ...] = ("patientId", "patientEmail", "user_email"),
) -> list[dict[str, Any]]:
    """
    HIPAA / PHI Isolation SSOT Guard:
    - If user is admin (or unauthenticated demo/read mode without patient role), returns all items.
    - If user has 'patient' role, strictly returns only items whose ID fields match the user's identity.
    """
    if not user or user.get("role") != "patient":
        return items

    patient_ids = {
        val
        for val in (user.get("sub"), user.get("id"), user.get("email"))
        if val
    }

    return [
        item for item in items
        if any(item.get(field) in patient_ids for field in id_fields)
    ]


# Alias for backward compatibility
verify_local_jwt = verify_access_token


