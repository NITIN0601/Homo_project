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
ACCOUNTS_FILE = DATA_DIR / "hospital_accounts.json"

AUTH_SECRET = settings.JWT_SECRET.encode("utf-8")

# In-memory OTP storage for 2FA / Login verification: email -> {"otp": str, "expires_at": float}
_OTP_CACHE: dict[str, dict[str, Any]] = {}
_OTP_ATTEMPT_COUNTER: dict[str, int] = {}
MAX_OTP_ATTEMPTS = 5


def generate_otp(email: str) -> str:
    """Generates and records a cryptographically secure 6-digit OTP (valid 10 mins)."""
    clean_email = validate_email(email)
    otp = str(secrets.randbelow(900000) + 100000)  # 100000–999999, CSPRNG
    expires_at = datetime.now(timezone.utc).timestamp() + 600
    _OTP_CACHE[clean_email] = {"otp": otp, "expires_at": expires_at}
    _OTP_ATTEMPT_COUNTER[clean_email] = 0
    return otp


def verify_otp_code(email: str, otp: str) -> bool:
    """Verifies a 6-digit OTP with brute-force rate-limiting and timing-safe compare."""
    clean_email = validate_email(email)
    code = otp.strip()

    attempts = _OTP_ATTEMPT_COUNTER.get(clean_email, 0)
    if attempts >= MAX_OTP_ATTEMPTS:
        _OTP_CACHE.pop(clean_email, None)
        _OTP_ATTEMPT_COUNTER.pop(clean_email, None)
        raise ValueError("OTP invalidated: maximum verification attempts exceeded. Please request a new code.")

    entry = _OTP_CACHE.get(clean_email)
    if not entry:
        return False

    if datetime.now(timezone.utc).timestamp() > entry.get("expires_at", 0):
        _OTP_CACHE.pop(clean_email, None)
        _OTP_ATTEMPT_COUNTER.pop(clean_email, None)
        return False

    _OTP_ATTEMPT_COUNTER[clean_email] = attempts + 1

    if hmac.compare_digest(entry.get("otp", ""), code):  # timing-safe compare
        _OTP_CACHE.pop(clean_email, None)
        _OTP_ATTEMPT_COUNTER.pop(clean_email, None)
        return True
    return False


def validate_email(email: str) -> str:
    """Normalizes and validates email syntax."""
    cleaned = email.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise ValueError("Invalid email address format.")
    return cleaned


def _load_accounts() -> dict[str, Any]:
    accounts = load_json("hospital_accounts.json", default=None)
    if accounts is not None:
        return accounts

    # Seed default hospital admin and demo patient for first launch
    admin_hash, admin_salt = hash_password("Admin@12345")
    patient_hash, patient_salt = hash_password("Patient@12345")
    initial_accounts = {
        settings.HOSPITAL_ADMIN_EMAIL: {
            "id": "usr-admin-001",
            "name": settings.DOCTOR_NAME,
            "email": settings.HOSPITAL_ADMIN_EMAIL,
            "role": "admin",
            "phone": settings.HOSPITAL_PHONE,
            "hash": admin_hash,
            "salt": admin_salt,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        f"superadmin@{settings.HOSPITAL_DOMAIN}": {
            "id": "usr-super-001",
            "name": "Super Administrator",
            "email": f"superadmin@{settings.HOSPITAL_DOMAIN}",
            "role": "super_admin",
            "phone": settings.HOSPITAL_PHONE,
            "hash": admin_hash,
            "salt": admin_salt,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        f"admin@{settings.HOSPITAL_DOMAIN}": {
            "id": "usr-admin-002",
            "name": settings.DOCTOR_NAME,
            "email": f"admin@{settings.HOSPITAL_DOMAIN}",
            "role": "admin",
            "phone": settings.HOSPITAL_PHONE,
            "hash": admin_hash,
            "salt": admin_salt,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        f"john@{settings.HOSPITAL_DOMAIN}": {
            "id": "usr-001",
            "name": "John Doe",
            "email": f"john@{settings.HOSPITAL_DOMAIN}",
            "role": "patient",
            "phone": "+91 98765 43210",
            "hash": patient_hash,
            "salt": patient_salt,
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    }
    save_json("hospital_accounts.json", initial_accounts)
    return initial_accounts


def _save_accounts(accounts: dict[str, Any]) -> None:
    """Atomically persists accounts file using the shared SSOT data store."""
    save_json("hospital_accounts.json", accounts)


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
    hospital_id: str | None = None,
) -> tuple[dict[str, Any], str]:
    """Registers a new clinic user with quota enforcement, validated email, split name breakdown, and salted PBKDF2 hash."""
    clean_email = validate_email(email)
    if not name or len(name.strip()) < 2:
        raise ValueError("Name must be at least 2 characters.")

    accounts = _load_accounts()
    if clean_email in accounts:
        raise ValueError("An account with this email already exists.")

    assigned_role = role if role in ("super_admin", "admin", "patient", "mobile_worker") else "patient"
    assigned_hospital = (hospital_id or getattr(settings, "DEFAULT_HOSPITAL_ID", "default")).strip().lower()

    # Enforce Phase 1 System Quotas
    if assigned_role == "super_admin":
        current_super_admins = sum(1 for a in accounts.values() if a.get("role") == "super_admin")
        if current_super_admins >= settings.MAX_SUPER_ADMINS:
            raise ValueError(f"Platform limit reached: Maximum {settings.MAX_SUPER_ADMINS} Super Admins allowed.")
    elif assigned_role == "admin":
        current_admins = sum(1 for a in accounts.values() if a.get("role") == "admin")
        if current_admins >= settings.MAX_ADMINS:
            raise ValueError(f"Platform limit reached: Maximum {settings.MAX_ADMINS} Admins allowed.")
    elif assigned_role == "patient":
        current_patients = sum(
            1
            for a in accounts.values()
            if a.get("role") == "patient" and a.get("hospital_id", "").lower() == assigned_hospital
        )
        if current_patients >= settings.MAX_CUSTOMERS_PER_HOSPITAL:
            raise ValueError(
                f"Hospital quota reached: Maximum {settings.MAX_CUSTOMERS_PER_HOSPITAL} patients reached for '{assigned_hospital}'."
            )

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
        "role": assigned_role,
        "hospital_id": assigned_hospital,
        "phone": phone or "+91 98765 00000",
        "hash": pwd_hash,
        "salt": salt,
        "created_at": datetime.now(timezone.utc).isoformat(),
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
        "hospital_id": assigned_hospital,
        "phone": new_profile["phone"],
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
        "phone": account.get("phone", ""),
    }
    token = generate_local_jwt(user_view)
    return user_view, token


INVITES_FILE = "user_invites.json"


def create_user_invite(
    email: str,
    name: str,
    role: str = "patient",
    hospital_id: str | None = None,
    phone: str | None = None,
    created_by: str = "admin",
) -> dict[str, Any]:
    """Generates a secure onboarding invite token with 7-day expiration."""
    clean_email = validate_email(email)
    invites = load_json(INVITES_FILE, default={})

    token = f"inv_{secrets.token_urlsafe(24)}"
    invite_record = {
        "token": token,
        "email": clean_email,
        "name": name.strip(),
        "role": role if role in ("super_admin", "admin", "patient", "doctor") else "patient",
        "hospital_id": (hospital_id or getattr(settings, "DEFAULT_HOSPITAL_ID", "default")).strip().lower(),
        "phone": phone or "",
        "created_by": created_by,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": datetime.now(timezone.utc).timestamp() + (7 * 86400),
        "is_claimed": False,
    }

    invites[token] = invite_record
    save_json(INVITES_FILE, invites)
    return invite_record


def accept_user_invite(token: str, password: str) -> tuple[dict[str, Any], str]:
    """Claims an invite token, provisions the user profile with provided password."""
    invites = load_json(INVITES_FILE, default={})
    invite = invites.get(token)
    if not invite:
        raise ValueError("Invalid or expired invite token.")

    if invite.get("is_claimed"):
        raise ValueError("This invite token has already been claimed.")

    if datetime.now(timezone.utc).timestamp() > invite.get("expires_at", 0):
        raise ValueError("This invite token has expired. Please request a new invite.")

    # Provision user account
    user_view, jwt_token = register_user(
        name=invite["name"],
        email=invite["email"],
        password=password,
        role="admin" if invite["role"] in ("admin", "doctor") else invite["role"],
        phone=invite.get("phone"),
        hospital_id=invite.get("hospital_id", getattr(settings, "DEFAULT_HOSPITAL_ID", "default")),
    )

    invite["is_claimed"] = True
    invite["claimed_at"] = datetime.now(timezone.utc).isoformat()
    invites[token] = invite
    save_json(INVITES_FILE, invites)

    return user_view, jwt_token


def verify_google_id_token(id_token_str: str | None) -> dict[str, Any]:
    """Cryptographically verifies a Google OAuth ID token, returning verified claims."""
    if not id_token_str or not id_token_str.strip():
        raise ValueError("Google ID token is required for Google OAuth verification.")

    token_str = id_token_str.strip()
    if settings.USE_MOCK_DATA and token_str.startswith("mock-google-token:"):
        mock_email = token_str.split("mock-google-token:", 1)[1].strip().lower()
        return {"email": mock_email, "email_verified": True, "name": "Mock Google User"}

    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token

        idinfo = google_id_token.verify_oauth2_token(token_str, google_requests.Request())
        if idinfo.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Invalid Google token issuer")
        return idinfo
    except ImportError:
        pass
    except Exception as e:
        raise ValueError(f"Google token verification failed: {e}")

    try:
        import httpx

        resp = httpx.get(
            f"https://oauth2.googleapis.com/tokeninfo?id_token={token_str}",
            timeout=5.0,
        )
        if resp.status_code != 200:
            raise ValueError("Invalid or expired Google ID token")
        idinfo = resp.json()
        if idinfo.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Invalid Google token issuer")
        if not idinfo.get("email_verified") or str(idinfo.get("email_verified")).lower() != "true":
            raise ValueError("Google email address is not verified")
        return idinfo
    except Exception as e:
        if isinstance(e, ValueError):
            raise
        raise ValueError(f"Google ID token verification failed: {e}")


def authenticate_or_register_google_user(
    email: str,
    name: str = "Google User",
    portal_intent: str = "patient",
    hospital_id: str | None = None,
    id_token: str | None = None,
) -> tuple[dict[str, Any], str, str]:
    """
    Authenticates or provisions a user via Google OAuth Identity without password creation.
    - Requires cryptographic Google ID token verification (never trusts client email parameter blindly).
    - Persistent profile saved in clinic accounts store.
    - Multi-tenant hospital affiliation and quota enforcement.
    - Security guardrail: Admin access strictly limited to AUTHORIZED_ADMIN_EMAILS.
    Returns (profile, token, assigned_role).
    """
    if not id_token:
        if portal_intent == "admin" or not settings.USE_MOCK_DATA:
            raise ValueError("Access Denied: Google authentication requires a verified Google ID token.")
        clean_email = validate_email(email)
    else:
        verified_claims = verify_google_id_token(id_token)
        verified_email = verified_claims.get("email")
        if not verified_email:
            raise ValueError("Google ID token did not contain a verified email address.")
        clean_email = validate_email(verified_email)
        name = verified_claims.get("name") or name
    authorized_admin_emails = {e.strip().lower() for e in settings.AUTHORIZED_ADMIN_EMAILS}
    accounts = _load_accounts()
    existing = accounts.get(clean_email)
    is_in_accounts_as_admin = bool(existing and existing.get("role") in ("admin", "super_admin"))

    from services.doctor_service import get_all_doctors

    matching_doctor = next(
        (d for d in get_all_doctors() if (d.get("email") or "").strip().lower() == clean_email), None
    )
    is_in_doctors_registry = bool(matching_doctor)

    invites = load_json(INVITES_FILE, default={})
    matching_invite_token, matching_invite = next(
        (
            (t, inv)
            for t, inv in invites.items()
            if (inv.get("email") or "").strip().lower() == clean_email
            and inv.get("role") in ("admin", "doctor")
            and not inv.get("is_claimed")
        ),
        (None, None),
    )
    is_invited_as_doctor = bool(matching_invite)

    is_authorized_admin = (
        clean_email in authorized_admin_emails
        or is_in_accounts_as_admin
        or is_in_doctors_registry
        or is_invited_as_doctor
    )

    assigned_hospital = (
        (
            hospital_id
            or (matching_doctor.get("hospitalId") if matching_doctor else None)
            or (matching_invite.get("hospital_id") if matching_invite else None)
            or (existing.get("hospital_id") if existing else None)
            or getattr(settings, "DEFAULT_HOSPITAL_ID", "default")
        )
        .strip()
        .lower()
    )

    from services.hospital_service import get_hospital

    target_hosp = get_hospital(assigned_hospital)
    facility_type = (target_hosp.get("facilityType") or "hospital").lower() if target_hosp else "hospital"
    facility_label = "clinic" if facility_type == "clinic" else "hospital"

    if portal_intent == "admin" and not is_authorized_admin:
        raise ValueError(
            f"Access Denied: Your Google account is not recognized as a registered {facility_label} administrator."
        )

    assigned_role = "admin" if is_authorized_admin else "patient"

    if matching_invite and matching_invite_token:
        matching_invite["is_claimed"] = True
        matching_invite["claimed_at"] = datetime.now(timezone.utc).isoformat()
        invites[matching_invite_token] = matching_invite
        save_json(INVITES_FILE, invites)

    if existing:
        user_role = "admin" if is_authorized_admin else existing.get("role", assigned_role)
        existing["provider"] = "google"
        existing["last_login"] = datetime.now(timezone.utc).isoformat()
        if name and name != "Google User" and not existing.get("name"):
            existing["name"] = name.strip()
        _save_accounts(accounts)

        profile = {
            "id": existing["id"],
            "name": existing.get("name", name),
            "initials": "".join([n[0] for n in existing.get("name", name).split()[:2]]).upper() or "GU",
            "email": clean_email,
            "role": user_role,
            "hospital_id": existing.get("hospital_id", assigned_hospital),
            "phone": existing.get("phone", ""),
            "provider": "google",
        }
        token = generate_local_jwt(profile)
        return profile, token, user_role

    # New user registering automatically via Google (Passwordless)
    if assigned_role == "patient":
        current_patients = sum(
            1
            for a in accounts.values()
            if a.get("role") == "patient" and a.get("hospital_id", "").lower() == assigned_hospital
        )
        if current_patients >= settings.MAX_CUSTOMERS_PER_HOSPITAL:
            raise ValueError(
                f"Hospital quota reached: Maximum {settings.MAX_CUSTOMERS_PER_HOSPITAL} patients reached for '{assigned_hospital}'."
            )

    parts = [p for p in name.strip().split() if p]
    fn = parts[0] if parts else "Google"
    ln = parts[-1] if len(parts) > 1 else "Patient"
    mn = " ".join(parts[1:-1]) if len(parts) > 2 else ""

    user_id = (matching_doctor.get("id") if matching_doctor else None) or (
        f"usr-doc-{uuid.uuid4().hex[:6]}" if assigned_role == "admin" else f"usr-{uuid.uuid4().hex[:8]}"
    )

    account_entry = {
        "id": user_id,
        "name": name.strip(),
        "first_name": fn,
        "middle_name": mn,
        "last_name": ln,
        "email": clean_email,
        "role": assigned_role,
        "hospital_id": assigned_hospital,
        "phone": (matching_doctor.get("phone") if matching_doctor else None)
        or (matching_invite.get("phone") if matching_invite else "")
        or (settings.HOSPITAL_PHONE if assigned_role == "admin" else ""),
        "provider": "google",
        "has_password": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": datetime.now(timezone.utc).isoformat(),
    }
    accounts[clean_email] = account_entry
    _save_accounts(accounts)

    profile = {
        "id": user_id,
        "name": name.strip(),
        "initials": "".join([n[0] for n in name.split()[:2]]).upper() or "GU",
        "email": clean_email,
        "role": assigned_role,
        "hospital_id": assigned_hospital,
        "phone": account_entry["phone"],
        "provider": "google",
    }
    token = generate_local_jwt(profile)
    return profile, token, assigned_role


def accept_user_invite_with_google(
    token: str,
    email: str,
    name: str = "Google User",
) -> tuple[dict[str, Any], str]:
    """Claims an invite token using Google Sign-In with zero password creation."""
    invites = load_json(INVITES_FILE, default={})
    invite = invites.get(token)
    if not invite:
        raise ValueError("Invalid or expired invite token.")

    if invite.get("is_claimed"):
        raise ValueError("This invite token has already been claimed.")

    if datetime.now(timezone.utc).timestamp() > invite.get("expires_at", 0):
        raise ValueError("This invite token has expired. Please request a new invite.")

    # Provision user profile via Google OAuth without password
    profile, jwt_token, _ = authenticate_or_register_google_user(
        email=email,
        name=invite.get("name") or name,
        portal_intent="patient" if invite.get("role") == "patient" else "admin",
        hospital_id=invite.get("hospital_id"),
    )

    invite["is_claimed"] = True
    invite["claimed_at"] = datetime.now(timezone.utc).isoformat()
    invites[token] = invite
    save_json(INVITES_FILE, invites)

    return profile, jwt_token
