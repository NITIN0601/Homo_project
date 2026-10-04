"""
Authentication Service for Local Clinic EHR.
Provides secure password hashing (PBKDF2-SHA256), email validation,
and JWT session token management for small business on-premise operations.
"""

import base64
import hashlib
import hmac
import json
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
ACCOUNTS_FILE = DATA_DIR / "clinic_accounts.json"

AUTH_SECRET = os.getenv("JWT_SECRET", "agastya-local-jwt-secret-key-2026-secure-auth").encode("utf-8")
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

# In-memory OTP storage for 2FA / Login verification: email -> {"otp": str, "expires_at": float}
_OTP_CACHE: dict[str, dict[str, Any]] = {}


def generate_otp(email: str) -> str:
    """Generates and records a 6-digit OTP for email verification (valid 10 mins)."""
    clean_email = validate_email(email)
    import random
    otp = f"{random.randint(100000, 999999)}"
    expires_at = datetime.now(timezone.utc).timestamp() + 600
    _OTP_CACHE[clean_email] = {"otp": otp, "expires_at": expires_at}
    return otp


def verify_otp_code(email: str, otp: str) -> bool:
    """Verifies a 6-digit OTP. Accepts simulated demo code '123456' or live generated OTP."""
    clean_email = validate_email(email)
    code = otp.strip()
    if code == "123456":
        return True
    entry = _OTP_CACHE.get(clean_email)
    if not entry:
        return False
    if datetime.now(timezone.utc).timestamp() > entry.get("expires_at", 0):
        _OTP_CACHE.pop(clean_email, None)
        return False
    if entry.get("otp") == code:
        _OTP_CACHE.pop(clean_email, None)
        return True
    return False


def validate_email(email: str) -> str:
    """Normalizes and validates email syntax."""
    cleaned = email.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError("Invalid email address format.")
    return cleaned


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    """Hashes password with PBKDF2-HMAC-SHA256 and a 16-byte random salt."""
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")
    salt_hex = salt or os.urandom(16).hex()
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt_hex.encode("utf-8"),
        iterations=100000
    ).hex()
    return pwd_hash, salt_hex


def verify_password(password: str, stored_hash: str, stored_salt: str) -> bool:
    """Timing-attack safe password verification."""
    computed_hash, _ = hash_password(password, stored_salt)
    return hmac.compare_digest(computed_hash, stored_hash)


def _load_accounts() -> dict[str, Any]:
    if not ACCOUNTS_FILE.exists():
        # Seed default clinic admin and demo patient for first launch
        admin_hash, admin_salt = hash_password("admin123")
        patient_hash, patient_salt = hash_password("patient123")
        initial_accounts = {
            "vaishnavikshetty@gmail.com": {
                "id": "usr-admin-001",
                "name": "Dr. Bramarambha K",
                "email": "vaishnavikshetty@gmail.com",
                "role": "admin",
                "phone": "+91 70195 76255",
                "hash": admin_hash,
                "salt": admin_salt,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            "admin@agastyahomoeo.com": {
                "id": "usr-admin-001",
                "name": "Dr. Bramarambha K",
                "email": "admin@agastyahomoeo.com",
                "role": "admin",
                "phone": "+91 70195 76255",
                "hash": admin_hash,
                "salt": admin_salt,
                "created_at": datetime.now(timezone.utc).isoformat()
            },
            "john@agastyahomoeo.com": {
                "id": "usr-001",
                "name": "John Doe",
                "email": "john@agastyahomoeo.com",
                "role": "patient",
                "phone": "+91 98765 43210",
                "hash": patient_hash,
                "salt": patient_salt,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
        }
        with open(ACCOUNTS_FILE, "w", encoding="utf-8") as f:
            json.dump(initial_accounts, f, indent=2)
        return initial_accounts

    try:
        with open(ACCOUNTS_FILE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _save_accounts(accounts: dict[str, Any]) -> None:
    with open(ACCOUNTS_FILE, "w", encoding="utf-8") as f:
        json.dump(accounts, f, indent=2)


def generate_local_jwt(payload: dict[str, Any], expires_days: int = 7) -> str:
    """Generates an HMAC-SHA256 signed JSON Web Token without external server requirements."""
    header = {"alg": "HS256", "typ": "JWT"}
    exp = int((datetime.now(timezone.utc) + timedelta(days=expires_days)).timestamp())
    body = {**payload, "exp": exp}

    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")

    h_b64 = b64url(json.dumps(header).encode("utf-8"))
    p_b64 = b64url(json.dumps(body).encode("utf-8"))
    sig_raw = f"{h_b64}.{p_b64}".encode()
    sig = b64url(hmac.new(AUTH_SECRET, sig_raw, hashlib.sha256).digest())

    return f"{h_b64}.{p_b64}.{sig}"


def verify_local_jwt(token: str) -> dict[str, Any] | None:
    """Verifies HMAC signature and expiration of local JWT."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        h_b64, p_b64, sig = parts
        sig_raw = f"{h_b64}.{p_b64}".encode()

        expected_sig = base64.urlsafe_b64encode(
            hmac.new(AUTH_SECRET, sig_raw, hashlib.sha256).digest()
        ).decode("utf-8").rstrip("=")

        if not hmac.compare_digest(sig, expected_sig):
            return None

        # Decode payload
        padding = "=" * (4 - (len(p_b64) % 4))
        body_bytes = base64.urlsafe_b64decode(p_b64 + padding)
        payload = json.loads(body_bytes.decode("utf-8"))

        if payload.get("exp", 0) < int(datetime.now(timezone.utc).timestamp()):
            return None

        return payload
    except Exception:
        return None


def register_user(
    name: str,
    email: str,
    password: str,
    role: str = "patient",
    phone: str | None = None
) -> tuple[dict[str, Any], str]:
    """Registers a new clinic user with validated email and salted PBKDF2 hash."""
    clean_email = validate_email(email)
    if not name or len(name.strip()) < 2:
        raise ValueError("Name must be at least 2 characters.")

    accounts = _load_accounts()
    if clean_email in accounts:
        raise ValueError("An account with this email already exists.")

    pwd_hash, salt = hash_password(password)
    user_id = f"usr-{uuid.uuid4().hex[:8]}"

    new_profile = {
        "id": user_id,
        "name": name.strip(),
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
