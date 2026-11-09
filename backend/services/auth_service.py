"""
Authentication Service for Local Clinic EHR.
Provides secure password hashing (PBKDF2-SHA256), email validation,
and JWT session token management for small business on-premise operations.
"""

import hmac
import secrets
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from core.config import settings
from core.security import (
    EMAIL_REGEX,
    create_access_token,
    hash_password,
    verify_access_token,
    verify_password,
)
from services.data_store import load_json, save_json

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
ACCOUNTS_FILE = DATA_DIR / "clinic_accounts.json"

AUTH_SECRET = settings.JWT_SECRET.encode("utf-8")

# In-memory OTP storage for 2FA / Login verification: email -> {"otp": str, "expires_at": float}
_OTP_CACHE: dict[str, dict[str, Any]] = {}


def generate_otp(email: str) -> str:
    """Generates and records a cryptographically secure 6-digit OTP (valid 10 mins)."""
    clean_email = validate_email(email)
    otp = str(secrets.randbelow(900000) + 100000)  # 100000–999999, CSPRNG
    expires_at = datetime.now(timezone.utc).timestamp() + 600
    _OTP_CACHE[clean_email] = {"otp": otp, "expires_at": expires_at}
    return otp


def verify_otp_code(email: str, otp: str) -> bool:
    """Verifies a 6-digit OTP. Demo bypass only allowed in mock/dev mode, never in production."""
    clean_email = validate_email(email)
    code = otp.strip()

    is_mock = settings.USE_MOCK_DATA or not settings.IS_PRODUCTION
    if not settings.IS_PRODUCTION and is_mock and code == "123456":
        return True

    entry = _OTP_CACHE.get(clean_email)
    if not entry:
        return False
    if datetime.now(timezone.utc).timestamp() > entry.get("expires_at", 0):
        _OTP_CACHE.pop(clean_email, None)
        return False
    if hmac.compare_digest(entry.get("otp", ""), code):  # timing-safe compare
        _OTP_CACHE.pop(clean_email, None)
        return True
    return False


def validate_email(email: str) -> str:
    """Normalizes and validates email syntax."""
    cleaned = email.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError("Invalid email address format.")
    return cleaned


def _load_accounts() -> dict[str, Any]:
    accounts = load_json("clinic_accounts.json", default=None)
    if accounts is not None:
        return accounts

    # Seed default clinic admin and demo patient for first launch
    admin_hash, admin_salt = hash_password("admin123")
    patient_hash, patient_salt = hash_password("patient123")
    initial_accounts = {
        settings.CLINIC_ADMIN_EMAIL: {
            "id": "usr-admin-001",
            "name": settings.DOCTOR_NAME,
            "email": settings.CLINIC_ADMIN_EMAIL,
            "role": "admin",
            "phone": settings.CLINIC_PHONE,
            "hash": admin_hash,
            "salt": admin_salt,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        f"admin@{settings.CLINIC_DOMAIN}": {
            "id": "usr-admin-001",
            "name": settings.DOCTOR_NAME,
            "email": f"admin@{settings.CLINIC_DOMAIN}",
            "role": "admin",
            "phone": settings.CLINIC_PHONE,
            "hash": admin_hash,
            "salt": admin_salt,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        f"john@{settings.CLINIC_DOMAIN}": {
            "id": "usr-001",
            "name": "John Doe",
            "email": f"john@{settings.CLINIC_DOMAIN}",
            "role": "patient",
            "phone": "+91 98765 43210",
            "hash": patient_hash,
            "salt": patient_salt,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    }
    save_json("clinic_accounts.json", initial_accounts)
    return initial_accounts


def _save_accounts(accounts: dict[str, Any]) -> None:
    """Atomically persists accounts file using the shared SSOT data store."""
    save_json("clinic_accounts.json", accounts)


def generate_local_jwt(payload: dict[str, Any], expires_days: int = 7) -> str:
    """Generates an HMAC-SHA256 signed JSON Web Token via core security SSOT."""
    return create_access_token(payload, expires_days=expires_days)


def verify_local_jwt(token: str) -> dict[str, Any] | None:
    """Verifies HMAC signature and expiration of local JWT using core security SSOT."""
    return verify_access_token(token)


def register_user(
    name: str,
    email: str,
    password: str,
    role: str = "patient",
    phone: str | None = None,
    first_name: str | None = None,
    middle_name: str | None = None,
    last_name: str | None = None,
) -> tuple[dict[str, Any], str]:
    """Registers a new clinic user with validated email, split name breakdown, and salted PBKDF2 hash."""
    clean_email = validate_email(email)
    if not name or len(name.strip()) < 2:
        raise ValueError("Name must be at least 2 characters.")

    accounts = _load_accounts()
    if clean_email in accounts:
        raise ValueError("An account with this email already exists.")

    # Split name into first_name, middle_name, last_name if not explicitly provided
    fn = (first_name or "").strip()
    mn = (middle_name or "").strip()
    ln = (last_name or "").strip()
    if not fn or not ln:
        parts = [p for p in name.strip().split() if p]
        if len(parts) == 1:
            fn = fn or parts[0]
        elif len(parts) == 2:
            fn = fn or parts[0]
            ln = ln or parts[1]
        elif len(parts) > 2:
            fn = fn or parts[0]
            mn = mn or " ".join(parts[1:-1])
            ln = ln or parts[-1]

    pwd_hash, salt = hash_password(password)
    user_id = f"usr-{uuid.uuid4().hex[:8]}"

    new_profile = {
        "id": user_id,
        "name": name.strip(),
        "first_name": fn,
        "middle_name": mn,
        "last_name": ln,
        "email": clean_email,
        "role": role if role in ("admin", "patient", "mobile_worker") else "patient",
        "phone": phone or "+91 98765 00000",
        "hash": pwd_hash,
        "salt": salt,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    accounts[clean_email] = new_profile
    _save_accounts(accounts)

    user_view = {
        "id": user_id,
        "name": new_profile["name"],
        "first_name": fn,
        "middle_name": mn,
        "last_name": ln,
        "email": clean_email,
        "role": new_profile["role"],
        "phone": new_profile["phone"]
    }
    token = generate_local_jwt(user_view)
    return user_view, token


def authenticate_user(email: str, password: str) -> tuple[dict[str, Any], str]:
    """Authenticates email and password, returning profile and signed JWT token."""
    clean_email = validate_email(email)
    accounts = _load_accounts()

    account = accounts.get(clean_email)
    if not account:
        raise ValueError("Invalid email or password.")

    if not verify_password(password, account["hash"], account["salt"]):
        raise ValueError("Invalid email or password.")

    user_view = {
        "id": account["id"],
        "name": account["name"],
        "email": account["email"],
        "role": account["role"],
        "phone": account.get("phone", "")
    }
    token = generate_local_jwt(user_view)
    return user_view, token
