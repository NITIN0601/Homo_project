"""
Authentication Route Handlers.
Handles user registration, login, JWT token issuance, and OTP verification.
"""

from core.config import settings
from fastapi import APIRouter, HTTPException, status
from schemas.auth import (
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    SendOtpRequest,
    VerifyOtpRequest,
)
from services.auth_service import (
    authenticate_user,
    generate_local_jwt,
    generate_otp,
    register_user,
    verify_otp_code,
)

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])


@router.post("/login", summary="Validate user email and password")
async def login_user_endpoint(req: LoginRequest):
    """
    Validates email format, verifies salted PBKDF2 hash, returns JWT token + profile.
    """
    try:
        profile, token = authenticate_user(req.email, req.password)
        return {
            "status": "success",
            "token": token,
            "profile": profile,
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(ve))


@router.post("/admin-login", summary="Dedicated Doctor Practice Console Administrator Login")
async def admin_login_endpoint(req: LoginRequest):
    """
    Authenticates doctor / administrative staff only. Prevents patients from accessing Practice Console.
    """
    try:
        profile, token = authenticate_user(req.email, req.password)
        if profile.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access Denied: This portal requires verified doctor administrative credentials.",
            )
        return {
            "status": "success",
            "portal": "admin_console",
            "token": token,
            "profile": profile,
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(ve))


@router.post("/google", summary="Google OAuth Authentication (Scoped for Admin vs Patient)")
async def google_auth_endpoint(req: GoogleAuthRequest):
    """
    Authenticates or provisions user via Google Identity.
    Admin privileges are strictly granted ONLY to pre-authorized clinic doctor emails.
    """
    authorized_admin_emails = set(settings.AUTHORIZED_ADMIN_EMAILS)
    is_authorized_admin = req.email.strip().lower() in authorized_admin_emails

    if req.portal_intent == "admin" and not is_authorized_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access Denied: Your Google account is not recognized as a registered clinic administrator.",
        )

    assigned_role = "admin" if is_authorized_admin else "patient"

    profile = {
        "id": "usr-admin-001" if assigned_role == "admin" else f"usr-g-{int(hash(req.email) % 100000)}",
        "name": req.name,
        "initials": "".join([n[0] for n in req.name.split()[:2]]).upper() or "GU",
        "email": req.email.strip().lower(),
        "role": assigned_role,
        "phone": settings.CLINIC_PHONE if assigned_role == "admin" else "",
        "provider": "google",
    }
    token = generate_local_jwt(profile)
    return {
        "status": "success",
        "role": assigned_role,
        "token": token,
        "profile": profile,
    }


@router.post("/register", summary="Register user with email validation and secure password hash")
async def register_user_endpoint(req: RegisterRequest):
    """
    Registers a new patient account with RFC-compliant email checks and PBKDF2 encryption.
    STRICT SECURITY: Public registration is strictly forbidden from creating administrative accounts.
    """
    if req.role and req.role.strip().lower() == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security Violation: Administrative accounts cannot be registered publicly. They must be provisioned internally.",
        )

    try:
        profile, token = register_user(
            name=req.name,
            first_name=req.first_name,
            middle_name=req.middle_name,
            last_name=req.last_name,
            email=req.email,
            password=req.password,
            role="patient",
            phone=req.phone,
        )
        return {
            "status": "success",
            "message": "Patient registered successfully",
            "token": token,
            "profile": profile,
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@router.post("/send-otp", summary="Send 6-digit verification code to email")
async def send_otp_endpoint(req: SendOtpRequest):
    """
    Generates and records a 6-digit OTP code for email verification (valid 10 mins).
    """
    try:
        _otp = generate_otp(req.email)
        return {
            "success": True,
            "message": f"Verification OTP code sent to {req.email}",
            "expires_in_seconds": 600,
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/verify-otp", summary="Verify 6-digit email code")
async def verify_otp_endpoint(req: VerifyOtpRequest):
    """
    Validates a 6-digit OTP. Accepts live generated OTP or demo fallback code 123456.
    """
    try:
        is_valid = verify_otp_code(req.email, req.otp)
        return {"valid": is_valid}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

