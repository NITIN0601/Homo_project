"""
Authentication Route Handlers.
Handles user registration, login, JWT token issuance, and OTP verification.
"""

from core.config import settings
from core.security import create_access_token, require_admin_role, revoke_token, verify_access_token
from fastapi import APIRouter, Depends, Header, HTTPException, status
from schemas.auth import (
    AcceptGoogleInviteRequest,
    GoogleAuthRequest,
    InviteUserRequest,
    LoginRequest,
    RegisterRequest,
    SendOtpRequest,
    VerifyInviteRequest,
    VerifyOtpRequest,
)
from services.auth_service import (
    accept_user_invite,
    accept_user_invite_with_google,
    authenticate_or_register_google_user,
    authenticate_user,
    create_user_invite,
    generate_otp,
    register_user,
    verify_otp_code,
)
from services.hospital_service import get_hospital
from services.notification_service import send_user_invite_notification

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
        if profile.get("role") not in ("admin", "super_admin"):
            hospital = get_hospital(profile.get("hospital_id"))
            facility_type = hospital.get("facilityType", "hospital")
            facility_label = "Clinic" if facility_type == "clinic" else "Hospital"
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access Denied: This portal requires verified {facility_label.lower()} administrative credentials.",
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
    Authenticates or provisions user via Google Identity without requiring password creation.
    Admin privileges are strictly granted ONLY to pre-authorized hospital doctor emails.
    """
    try:
        profile, token, assigned_role = authenticate_or_register_google_user(
            email=req.email,
            name=req.name,
            portal_intent=req.portal_intent,
            hospital_id=req.hospital_id,
            id_token=req.id_token,
        )
        return {
            "status": "success",
            "role": assigned_role,
            "token": token,
            "profile": profile,
        }
    except ValueError as ve:
        err_msg = str(ve)
        status_code = status.HTTP_403_FORBIDDEN if "Access Denied" in err_msg else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=err_msg)


@router.post("/register", summary="Register user with email validation and secure password hash")
async def register_user_endpoint(req: RegisterRequest):
    """
    Registers a new patient account with RFC-compliant email checks and PBKDF2 encryption.
    STRICT SECURITY: Public registration is strictly forbidden from creating administrative or super_admin accounts.
    """
    if req.role and req.role.strip().lower() in ("admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security Violation: Administrative accounts cannot be registered publicly. They must be provisioned internally.",
        )

    try:
        h_id = req.hospital_id or getattr(settings, "DEFAULT_HOSPITAL_ID", "default")
        profile, token = register_user(
            name=req.name,
            first_name=req.first_name,
            middle_name=req.middle_name,
            last_name=req.last_name,
            email=req.email,
            password=req.password,
            role="patient",
            phone=req.phone,
            hospital_id=h_id,
        )
        hospital = get_hospital(h_id)
        h_name = hospital.get("name", settings.HOSPITAL_NAME)
        facility_type = hospital.get("facilityType", "hospital")
        facility_label = "Clinic" if facility_type == "clinic" else "Hospital"
        return {
            "status": "success",
            "message": f"Welcome to {h_name}. Your {facility_label.lower()} patient account has been registered successfully.",
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


@router.post("/invite", summary="Generate onboarding invite link (Admin only)")
async def invite_user_endpoint(
    req: InviteUserRequest,
    current_user: dict = Depends(require_admin_role),
):
    """Admin / Super Admin: Creates secure onboarding invite token for doctors, staff, or patients."""
    try:
        hospital = get_hospital(req.hospital_id)
        h_name = hospital.get("name", settings.HOSPITAL_NAME)
        facility_type = hospital.get("facilityType", "hospital")
        facility_label = "Clinic" if facility_type == "clinic" else "Hospital"

        invite = create_user_invite(
            email=req.email,
            name=req.name,
            role=req.role,
            hospital_id=req.hospital_id,
            phone=req.phone,
            created_by=current_user.get("email", "admin"),
        )
        invite_url = f"{settings.FRONTEND_URL}/join?token={invite['token']}"
        invite["invite_url"] = invite_url

        # Dispatches tenant-customized dynamic email and SMS / WhatsApp notifications
        delivery_res = await send_user_invite_notification(
            email=req.email,
            name=req.name,
            role=req.role,
            hospital_id=req.hospital_id,
            invite_url=invite_url,
            phone=req.phone,
            custom_message=req.custom_message,
            send_email=req.send_email if hasattr(req, "send_email") else req.send_notification,
            send_sms=req.send_sms if hasattr(req, "send_sms") else bool(req.phone),
        )

        return {
            "status": "success",
            "message": f"Invitation for {req.name} to join {h_name} ({facility_label}) dispatched successfully.",
            "invite": invite,
            "invite_url": invite_url,
            "delivery": delivery_res,
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/accept-invite", summary="Accept invite and establish credentials")
async def accept_invite_endpoint(req: VerifyInviteRequest):
    """Claims an invite token, registers user password, and returns authenticated JWT session."""
    try:
        profile, token = accept_user_invite(token=req.token, password=req.password)
        hospital = get_hospital(profile.get("hospital_id"))
        h_name = hospital.get("name", settings.HOSPITAL_NAME)
        return {
            "status": "success",
            "message": f"Invite accepted. Welcome to {h_name}!",
            "token": token,
            "profile": profile,
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/accept-invite-google", summary="Accept invite instantly using Google Authentication (Passwordless)")
async def accept_invite_google_endpoint(req: AcceptGoogleInviteRequest):
    """Claims an invite token via Google OAuth with zero password creation."""
    try:
        profile, token = accept_user_invite_with_google(
            token=req.token,
            email=req.email,
            name=req.name,
        )
        hospital = get_hospital(profile.get("hospital_id"))
        h_name = hospital.get("name", settings.HOSPITAL_NAME)
        return {
            "status": "success",
            "message": f"Invite claimed with Google. Welcome to {h_name}!",
            "token": token,
            "profile": profile,
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@router.post("/logout", summary="Logout current session and revoke access token")
async def logout_endpoint(authorization: str | None = Header(None)):
    """Revokes the current bearer token by invalidating its JTI in the token blocklist."""
    if not authorization or not authorization.startswith("Bearer "):
        return {"status": "success", "message": "Logged out"}
    token = authorization.split("Bearer ", 1)[1].strip()
    payload = verify_access_token(token)
    if payload:
        jti = payload.get("jti")
        exp = payload.get("exp")
        if jti:
            revoke_token(jti, exp)
    return {"status": "success", "message": "Token revoked successfully"}


@router.post("/refresh", summary="Refresh active JWT session and rotate token")
async def refresh_token_endpoint(authorization: str | None = Header(None)):
    """
    Refreshes an active JWT session.
    Validates current token, issues a fresh rotated token, and invalidates the previous token's JTI.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Bearer authorization header.",
        )
    token = authorization.split("Bearer ", 1)[1].strip()
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or revoked access token.",
        )

    # Invalidate the previous token via token rotation
    old_jti = payload.get("jti")
    old_exp = payload.get("exp")
    if old_jti:
        revoke_token(old_jti, old_exp)

    # Issue a fresh token retaining user claims
    clean_claims = {k: v for k, v in payload.items() if k not in ("exp", "jti", "iss", "aud")}
    new_token = create_access_token(clean_claims)
    return {
        "status": "success",
        "token": new_token,
        "token_type": "Bearer",
    }
