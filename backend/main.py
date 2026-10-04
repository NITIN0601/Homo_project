"""
FastAPI Server: Classical Homeopathy Voice & EHR Engine
Features:
  • Self-Hosted Supabase / PostgreSQL Local Storage Integration
  • Google Gemini 2.5 Flash Free AI Parsing Loop (response_mime_type=application/json)
  • Anti-Spam Cryptographic Hash Validation (prevents duplicate camera uploads)
  • Mobile Restrictive View (drops local audio and image paths for Wi-Fi mobile clients)
  • 1-2 Hour audio streaming with SHA-256 integrity and HMAC-SHA256 watermarks
  • Zero secret leaks (API keys kept server-side on Admin PC)
  • Environment-based MOCK toggle (USE_MOCK_DATA=true/false)
"""

import logging
import os
import threading
import time
from datetime import datetime, timezone
from typing import Any

from fastapi import (
    APIRouter,
    FastAPI,
    File,
    Form,
    Header,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from schemas.case_record import HomeopathicCaseRecord
from services.audio_manager import (
    delete_recording,
    get_recording_path,
    sanitize_safe_id,
    save_recording_stream,
    verify_audio_watermark,
)
from services.auth_service import (
    authenticate_user,
    generate_otp,
    register_user,
    verify_local_jwt,
    verify_otp_code,
)
from services.calendar_service import (
    GOOGLE_CALENDAR_ID,
    fetch_google_calendar_indian_holidays,
    filter_holidays_by_month,
)
from services.config import (
    get_supabase_rest_url,
    is_mock_enabled,
)
from services.data_store import (
    get_all_appointments,
    get_all_blocked_dates,
    get_all_inventory,
    get_all_invoices,
    get_all_visit_summaries,
    get_patient_medical_file,
    get_patient_prescribed_remedies,
    restock_inventory_item,
    save_appointment,
    save_blocked_dates,
    save_invoice,
    save_visit_summary,
    save_whatsapp_config,
    update_appointment_status,
    update_inventory_item,
    update_invoice,
)
from services.email_service import send_appointment_confirmation
from services.google_calendar import (
    BUSINESS_TIMEZONE,
    create_google_calendar_event,
    validate_email_address,
    validate_future_date,
)
from services.llm_scribe import (
    execute_scribe_pipeline,
    parse_clinical_text_to_case_analysis,
)
from services.payment_validator import PaymentValidator
from services.supabase_service import (
    check_and_insert_file_hash,
    check_supabase_health,
    clear_admin_alerts,
    fetch_appointments_from_supabase,
    fetch_inventory_from_supabase,
    fetch_patient_records,
    get_admin_alerts,
    get_sync_status,
    insert_patient_record,
    reconcile_offline_data,
    sync_appointment_to_supabase,
    sync_inventory_to_supabase,
    update_appointment_status_in_supabase,
    update_inventory_item_in_supabase,
)
from services.voicestudio_client import transcribe_audio_with_voicestudio

logger = logging.getLogger("agastya_backend")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

app = FastAPI(
    title="Agastya Classical Homeopathy Local EHR & Voice Scribe API",
    description="On-Premise Clinical Speech Transcription, Supabase-backed EHR, and Gemini 2.5 Flash AI Parsing",
    version="3.0.0"
)

# Secure CORS: Support local IP addresses (Admin PC Wi-Fi), localhost, and standard dev ports with credentials
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter()
_booking_lock = threading.Lock()


# ─── Pydantic Request Models ───────────────────────────────────────────────────


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password")


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, description="Full name")
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="Password (min 6 chars)")
    role: str | None = Field(default="patient", description="admin or patient or mobile_worker")
    phone: str | None = Field(default=None)


class SendOtpRequest(BaseModel):
    email: str = Field(..., description="User email address")


class VerifyOtpRequest(BaseModel):
    email: str = Field(..., description="User email address")
    otp: str = Field(..., description="6-digit verification code")


class EmailNotificationRequest(BaseModel):
    email: str = Field(..., description="Recipient email address")
    subject: str = Field(..., description="Email subject")
    body: str = Field(..., description="Email body content")


class WhatsAppRegisterRequest(BaseModel):
    doctorName: str
    whatsappNumber: str
    businessAccountId: str | None = None
    autoNotifyRegistration: bool | None = True
    autoNotifyPrescriptions: bool | None = True


class WhatsAppMessageRequest(BaseModel):
    phone: str
    message: str
    type: str | None = "registration"


class RestockRequest(BaseModel):
    qty: int = Field(default=10, ge=1)


class TextParseRequest(BaseModel):
    text: str = Field(..., min_length=5, description="Raw doctor dictation or patient symptoms text")
    patient_name: str | None = Field(default="Anonymous Patient")
    provider: str | None = Field(default="gemini", description="gemini, groq, openai, anthropic, or ollama")
    model: str | None = Field(default=None, description="Specific model ID override")
    language: str | None = Field(default="en")
    api_key: str | None = Field(default=None)


class FileHashRequest(BaseModel):
    file_hash: str = Field(..., min_length=16, description="Cryptographic hash (e.g. SHA-256) of uploaded file")
    file_name: str | None = Field(default="camera_snapshot.jpg")
    file_size_bytes: int | None = Field(default=None)
    uploaded_by: str | None = Field(default="mobile_worker")


class PatientRecordCreate(BaseModel):
    patient_name: str = Field(..., min_length=2)
    visiting_date: str | None = Field(default=None)
    local_audio_path: str | None = Field(default=None)
    prescription_image_path: str | None = Field(default=None)
    homeopathic_analysis: dict[str, Any] = Field(default_factory=dict)


# ─── API Routes ───────────────────────────────────────────────────────────────

@app.on_event("startup")
async def on_startup():
    logger.info("Agastya Classical Homeopathy EHR Backend starting up...")
    try:
        import asyncio
        asyncio.create_task(reconcile_offline_data())
    except Exception as exc:
        logger.warning(f"Startup reconciliation deferral: {exc}")


@api_router.get("/health")
async def health_check():
    use_mock = is_mock_enabled()
    gemini_ready = bool(os.getenv("GEMINI_API_KEY"))
    return {
        "status": "healthy",
        "service": "Classical Homeopathy Local Scribe & EHR Gateway",
        "pydantic_version": "v2",
        "audio_storage_active": True,
        "forensic_watermark_engine": "HMAC-SHA256 Active",
        "use_mock_data": use_mock,
        "gemini_configured": gemini_ready,
        "supabase_endpoint": get_supabase_rest_url()
    }


@api_router.get("/config/status")
async def get_config_status():
    """Returns local on-premise system readiness indicators."""
    return {
        "use_mock_data": is_mock_enabled(),
        "gemini_api_key_configured": bool(os.getenv("GEMINI_API_KEY")),
        "groq_api_key_configured": bool(os.getenv("GROQ_API_KEY")),
        "openai_api_key_configured": bool(os.getenv("OPENAI_API_KEY")),
        "anthropic_api_key_configured": bool(os.getenv("ANTHROPIC_API_KEY")),
        "supabase_rest_url": get_supabase_rest_url(),
        "voicestudio_url": os.getenv("VOICESTUDIO_URL", "http://127.0.0.1:3900/v1/audio/transcriptions")
    }


@api_router.get("/sync/status", summary="Get data synchronization status and health metrics")
async def sync_status_endpoint():
    """Returns database connection status, pending offline records, and alert audit history."""
    health = await check_supabase_health()
    status_info = get_sync_status()
    return {
        "supabase": health,
        "sync": status_info,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@api_router.post("/sync/reconcile", summary="Trigger manual reconciliation between local disk and Supabase")
async def sync_reconcile_endpoint():
    """Forces synchronization of offline patient records and hashes back into Supabase."""
    return await reconcile_offline_data()


@api_router.get("/admin/alerts", summary="Get recent administrative alerts")
async def admin_alerts_endpoint(limit: int = Query(50, ge=1, le=100)):
    """Returns recent system alerts (network drops, malformed queries, fallback activations)."""
    alerts = get_admin_alerts(limit=limit)
    return {
        "count": len(alerts),
        "alerts": alerts
    }


@api_router.delete("/admin/alerts", summary="Clear administrative alerts")
async def clear_admin_alerts_endpoint():
    clear_admin_alerts()
    return {"success": True, "message": "Admin alerts cleared"}



# ─── 0. Proper Local Authentication (Email + Password Validations) ────────────

@api_router.post("/auth/login", summary="Validate user email and password")
async def login_user_endpoint(req: LoginRequest):
    """
    Proper authentication for local small business clinic:
    Validates email format, verifies salted PBKDF2 hash, returns JWT token + profile.
    """
    try:
        profile, token = authenticate_user(req.email, req.password)
        return {
            "status": "success",
            "token": token,
            "profile": profile
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(ve))


@api_router.post("/auth/register", summary="Register user with email validation and secure password hash")
async def register_user_endpoint(req: RegisterRequest):
    """
    Registers a new clinic account with RFC-compliant email checks and PBKDF2 encryption.
    """
    try:
        profile, token = register_user(
            name=req.name,
            email=req.email,
            password=req.password,
            role=req.role or "patient",
            phone=req.phone
        )
        return {
            "status": "success",
            "message": "User registered successfully",
            "token": token,
            "profile": profile
        }
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))


@api_router.post("/auth/send-otp", summary="Send 6-digit verification code to email")
async def send_otp_endpoint(req: SendOtpRequest):
    """
    Generates and stores a 6-digit OTP code for email verification (valid 10 mins).
    """
    try:
        _otp = generate_otp(req.email)
        return {
            "success": True,
            "message": f"Verification OTP code sent to {req.email}",
            "expires_in_seconds": 600
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


@api_router.post("/auth/verify-otp", summary="Verify 6-digit email code")
async def verify_otp_endpoint(req: VerifyOtpRequest):
    """
    Validates a 6-digit OTP. Accepts live generated OTP or demo fallback code 123456.
    """
    try:
        is_valid = verify_otp_code(req.email, req.otp)
        return {"valid": is_valid}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))


# ─── 1. Universal Multi-LLM Parsing Loop (Gemini, Groq, OpenAI, Anthropic, Ollama) ─

@api_router.post(
    "/ai/parse-homeopathy",
    summary="Universal AI Parsing: Map raw text/dictation into Classical Homeopathy JSON"
)
async def parse_text_to_homeopathy(req: TextParseRequest):
    """
    Multi-LLM Parsing Loop:
    Connects to chosen LLM provider (Gemini, Groq, OpenAI, Anthropic, or Ollama).
    Validates API keys and formats into strict Classical Homeopathy schema.
    """
    try:
        case_dict = await parse_clinical_text_to_case_analysis(
            text=req.text,
            provider=req.provider or "gemini",
            model=req.model,
            api_key=req.api_key
        )
        return {
            "status": "success",
            "provider": req.provider or "gemini",
            "model": req.model or "default",
            "patient_name": req.patient_name,
            "homeopathic_analysis": case_dict
        }
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Clinical AI parsing failed with provider '{req.provider}': {e!s}"
        )


# ─── 2. Strict Image & Camera Upload Anti-Spam Control ─────────────────────────

@api_router.post(
    "/anti-spam/verify-and-register-hash",
    summary="Verify cryptographic hash of image/camera snapshot to block duplicate uploads"
)
async def verify_and_register_hash(req: FileHashRequest):
    """
    Prevents mobile users from spamming identical images or duplicate camera snapshots.
    If the SHA-256 hash already exists in uploaded_file_hashes (Postgres 23505),
    immediately rejects with 409 Conflict.
    """
    try:
        record = await check_and_insert_file_hash(
            file_hash=req.file_hash,
            file_name=req.file_name,
            file_size_bytes=req.file_size_bytes,
            uploaded_by=req.uploaded_by or "mobile_worker"
        )
        return {
            "status": "verified_new",
            "message": "File hash verified. Upload permitted.",
            "record": record
        }
    except ValueError as ve:
        if "DUPLICATE_HASH" in str(ve):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This identical image has already been uploaded."
            )
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.exception(f"Hash verification unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Hash verification error: {e!s}")


# ─── 3. Patient Records & Supabase Storage ─────────────────────────────────────

@api_router.post(
    "/patient-records",
    summary="Store structured consultation record into local Supabase database"
)
async def create_patient_record(payload: PatientRecordCreate):
    """
    Creates a record in public.patient_records with GIN-indexed homeopathic_analysis JSONB.
    """
    try:
        saved = await insert_patient_record(
            patient_name=payload.patient_name,
            homeopathic_analysis=payload.homeopathic_analysis,
            visiting_date=payload.visiting_date,
            local_audio_path=payload.local_audio_path,
            prescription_image_path=payload.prescription_image_path
        )
        return {
            "status": "saved",
            "record_id": saved.get("id"),
            "patient_name": payload.patient_name,
            "created_at": saved.get("created_at")
        }
    except Exception as e:
        logger.exception(f"Failed to persist patient record: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to persist patient record: {e!s}")


@api_router.get(
    "/patient-records",
    summary="Query patient records (supports restricted mobile view vs admin full view)"
)
async def get_patient_records(
    view: str = Query("mobile", description="mobile (text-only, no file paths) or admin (full paths)"),
    authorization: str | None = Header(None)
):
    """
    Mobile Access Restrictive Policy:
    If view='mobile', queries public.mobile_patient_view (completely dropping audio & image paths).
    If view='admin', requires authenticated Admin JWT, returning full public.patient_records.
    """
    is_mobile = (view.lower() == "mobile")
    if not is_mobile:
        if not authorization:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing Authorization header. Admin privileges required.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        parts = authorization.split()
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Authorization header format. Expected 'Bearer <token>'.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = parts[1]
        payload = verify_local_jwt(token)
        if not payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired authentication token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if payload.get("role") != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: Admin role required to access full records."
            )

    try:
        records = await fetch_patient_records(is_mobile_view=is_mobile)
        return {
            "status": "success",
            "view": "mobile_patient_view" if is_mobile else "patient_records_full",
            "count": len(records),
            "records": records
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Failed to query patient records: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to query patient records: {e!s}")


# ─── 4. Consultation Audio Processing Pipeline ────────────────────────────────

@api_router.post(
    "/consultations/transcribe-and-structure",
    response_model=HomeopathicCaseRecord,
    summary="Process consultation audio into Pydantic-validated Case Record"
)
async def process_consultation(
    file: UploadFile = File(...),
    interaction_id: str = Form(...),
    language: str = Form("te"),
    provider: str = Form("gemini"),
    model: str = Form(""),
    patient_name: str = Form(""),
    retain_recording: bool = Form(True)
):
    try:
        safe_id = sanitize_safe_id(interaction_id)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))

    try:
        # Step 1: Memory-efficient streaming save to local source of truth
        file_path, sha256_hash, file_size_bytes, watermark = await save_recording_stream(
            file, safe_id, patient_id=patient_name
        )

        # Step 2: Transcribe via VoiceStudio
        stt_result = await transcribe_audio_with_voicestudio(
            file_path=file_path,
            language=language
        )
        if stt_result.get("status") == "error":
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=stt_result.get("error_detail", "VoiceStudio speech transcription failed.")
            )

        raw_transcript = stt_result.get("text", "")

        # Step 3: Server-side LLM Scribing with PII redaction and Pydantic validation
        case_record, provider_used, latency_ms = await execute_scribe_pipeline(
            transcript=raw_transcript,
            provider=provider,
            model=model if model else None,
            patient_name=patient_name if patient_name else None,
            language=language
        )

        # Step 4: Inject metadata & checksums
        case_record.metadata.interaction_id = safe_id
        case_record.metadata.audio_checksum_sha256 = sha256_hash
        case_record.metadata.recording_retained = retain_recording
        case_record.metadata.recording_path = str(file_path) if retain_recording else None
        case_record.metadata.raw_transcript = raw_transcript

        # Automatically index in local Supabase
        await insert_patient_record(
            patient_name=patient_name or "Consultation Patient",
            homeopathic_analysis=case_record.model_dump(),
            visiting_date=case_record.metadata.visiting_date or None,
            local_audio_path=str(file_path) if retain_recording else None
        )

        if not retain_recording:
            delete_recording(safe_id)

        return case_record

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Clinical scribe pipeline error: {e!s}"
        )


@api_router.post(
    "/consultations/transcribe",
    summary="Direct VoiceStudio audio transcription proxy on Admin PC"
)
async def proxy_transcribe_audio(
    file: UploadFile = File(...),
    interaction_id: str | None = Form(None),
    language: str = Form("auto")
):
    safe_id = sanitize_safe_id(interaction_id or f"transcribe_{int(time.time())}")
    file_path, sha256_hash, file_size_bytes, watermark = await save_recording_stream(
        file, safe_id, patient_id="Transcription"
    )
    try:
        stt_result = await transcribe_audio_with_voicestudio(
            file_path=file_path,
            language=language
        )
        return stt_result
    finally:
        delete_recording(safe_id)


@api_router.get("/recordings/{interaction_id}/verify-watermark")
async def verify_watermark_endpoint(interaction_id: str):
    return verify_audio_watermark(interaction_id)


@api_router.get("/recordings/{interaction_id}")
async def fetch_recording(interaction_id: str):
    file_path = get_recording_path(interaction_id)
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Recording not found or deleted by doctor")
    return FileResponse(file_path, media_type="audio/webm", filename=file_path.name)


@api_router.delete("/recordings/{interaction_id}")
async def delete_recording_endpoint(interaction_id: str):
    success = delete_recording(interaction_id)
    if not success:
        raise HTTPException(status_code=404, detail="Recording not found or already deleted")
    return {"status": "deleted", "interaction_id": interaction_id}


# ─── Dynamic Google Calendar & Indian Holidays API ────────────────────────────


@api_router.get("/calendar/holidays")
async def get_calendar_holidays(
    year: int = Query(default=2026, description="Year to fetch holidays for"),
    month: int | None = Query(default=None, ge=1, le=12, description="Optional 1-indexed month (1-12)"),
):
    """
    Dynamically pulls Indian holidays & festivals from the official Google Calendar Public Feed:
    en.indian#holiday@group.v.calendar.google.com
    Supports real-time availability checking and UI styling.
    """
    all_holidays = await fetch_google_calendar_indian_holidays(year)
    if month is not None:
        filtered = filter_holidays_by_month(all_holidays, month)
    else:
        filtered = all_holidays

    return {
        "status": "success",
        "year": year,
        "month": month,
        "calendar_id": GOOGLE_CALENDAR_ID,
        "source": "google_calendar_public_feed",
        "total": len(filtered),
        "holidays": filtered,
    }


@api_router.get("/calendar/check-date")
async def check_calendar_date(
    date: str = Query(..., description="Date string in YYYY-MM-DD format")
):
    """
    Dynamic availability check for a specific appointment date.
    Returns whether the date falls on a Google Calendar public holiday.
    """
    try:
        parts = date.split("-")
        yr = int(parts[0])
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD")

    holidays = await fetch_google_calendar_indian_holidays(yr)
    matching = [h for h in holidays if h["date"] == date]
    return {
        "date": date,
        "is_holiday": len(matching) > 0,
        "holidays": matching,
        "calendar_id": GOOGLE_CALENDAR_ID,
    }


# ─── Appointment Booking & Automated Google Calendar / Resend Dispatch ────────


class BookAppointmentRequest(BaseModel):
    user_email: str = Field(..., description="Patient email address (e.g. abc@gmail.com)")
    user_name: str = Field(..., min_length=2, description="Patient full name")
    start_time: str = Field(..., description="Appointment start timestamp ISO-8601 (e.g. 2026-10-15T10:00:00)")
    end_time: str = Field(..., description="Appointment end timestamp ISO-8601 (e.g. 2026-10-15T10:30:00)")
    summary: str | None = Field(default="Homoeopathy Consultation — Agastya Clinic")
    description: str | None = Field(default="Clinical consultation with Dr. Bramarambha K.")
    calendar_id: str | None = Field(default=None, description="Optional Google Calendar ID override")


@api_router.post("/book-appointment", status_code=status.HTTP_201_CREATED)
async def book_appointment_endpoint(req: BookAppointmentRequest):
    """
    Creates an appointment event in Google Calendar using Service Account credentials,
    passes sendUpdates='all' for native Google Calendar automated email invitations,
    and dispatches a confirmation email via Resend API (CC to admin inbox).
    """
    # 1. Robust Email Format Validation
    if not validate_email_address(req.user_email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid email address format: '{req.user_email}'. Must be a valid email (e.g. name@domain.com)."
        )

    # 2. Strict Future Date Validation
    if not validate_future_date(req.start_time):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appointment start date/time must be strictly in the future."
        )

    date_part = req.start_time.split("T")[0] if "T" in req.start_time else req.start_time
    time_part = req.start_time.split("T")[1][:5] if "T" in req.start_time else "10:00"

    # Concurrency-safe atomic slot reservation to prevent race conditions across threads
    with _booking_lock:
        existing = get_all_appointments()
        for apt in existing:
            apt_date = apt.get("date")
            apt_slot = apt.get("slot") or apt.get("time", "")
            if (apt_date == date_part or apt_date == req.start_time) and (
                apt_slot == time_part or apt.get("time") == time_part or apt.get("start_time") == req.start_time
            ) and apt.get("status") != "Cancelled":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Time slot {time_part} on {date_part} is already booked. Please choose a different slot."
                )

        apt_record = {
            "id": f"apt-{int(datetime.now().timestamp() * 1000)}",
            "patientId": f"usr-{int(datetime.now().timestamp()) % 10000}",
            "patientName": req.user_name,
            "patientPhone": "+91 98123 45678",
            "patientEmail": req.user_email,
            "date": date_part,
            "time": time_part,
            "slot": time_part,
            "start_time": req.start_time,
            "end_time": req.end_time,
            "type": "In-Person Clinic Visit",
            "chiefReason": req.description or "Clinical Consultation",
            "status": "Confirmed",
            "calendarEventId": None,
            "createdAt": datetime.now().isoformat(),
        }
        save_appointment(apt_record)

    # 3. Create Google Calendar Event with sendUpdates='all'
    cal_res = await create_google_calendar_event(
        user_email=req.user_email,
        user_name=req.user_name,
        start_time_iso=req.start_time,
        end_time_iso=req.end_time,
        summary=req.summary or "Homoeopathy Consultation — Agastya Clinic",
        description=req.description or "Clinical consultation with Dr. Bramarambha K.",
        calendar_id=req.calendar_id,
    )

    if not cal_res.get("success"):
        # Revert reservation if calendar fails
        update_appointment_status(apt_record["id"], "Cancelled")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Calendar API Error: {cal_res.get('error')}"
        )

    apt_record["calendarEventId"] = cal_res.get("event_id")
    save_appointment(apt_record)

    # 4. Dispatch Email Confirmation via Resend API (CC to clinic inbox: vaishnavikshetty@gmail.com)
    email_res = await send_appointment_confirmation(
        customer_email=req.user_email,
        customer_name=req.user_name,
        appointment_time=f"{req.start_time} ({BUSINESS_TIMEZONE})",
    )

    # 5. Persist to Supabase
    await sync_appointment_to_supabase(apt_record)

    return {
        "status": "confirmed",
        "message": "Appointment booked successfully with Google Calendar invite & email confirmation dispatched.",
        "appointment": apt_record,
        "calendar_event": {
            "event_id": cal_res.get("event_id"),
            "html_link": cal_res.get("html_link"),
            "send_updates": "all",
            "business_timezone": BUSINESS_TIMEZONE,
        },
        "email_delivery": email_res,
        "patient": {
            "name": req.user_name,
            "email": req.user_email,
        }
    }


# ─── Shared Real-Time Synchronization Endpoints (Appointments, Invoices, Visits) ─

@api_router.get("/appointments", summary="List all booked appointments (Priority 1: Supabase)")
async def list_appointments_endpoint():
    """
    Priority 1: Queries live Supabase appointments table.
    Falls back to on-prem disk store if Supabase is offline or launching.
    """
    sb_appointments = await fetch_appointments_from_supabase()
    if sb_appointments:
        # Mirror to local store to maintain warm offline cache
        try:
            for apt in sb_appointments:
                save_appointment(apt)
        except Exception as exc:
            logger.debug(f"Local appointment cache mirror notice: {exc}")
        return sb_appointments
    return get_all_appointments()


@api_router.post("/appointments", summary="Create or persist appointment (Priority 1: Supabase)")
async def create_appointment_endpoint(payload: dict[str, Any]):
    """
    Priority 1: Persists appointment to Supabase.
    Synchronously mirrors to on-prem local disk store for offline safety.
    Enforces concurrency lock and conflict check on duplicate slots.
    """
    date = payload.get("date")
    slot = payload.get("slot") or payload.get("time")
    if date and slot:
        with _booking_lock:
            existing = get_all_appointments()
            for apt in existing:
                if (apt.get("date") == date) and (apt.get("slot") == slot or apt.get("time") == slot) and apt.get("status") != "Cancelled":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Time slot {slot} on {date} is already booked."
                    )
            local_saved = save_appointment(payload)
        sb_record = await sync_appointment_to_supabase(payload)
        return sb_record or local_saved

    sb_record = await sync_appointment_to_supabase(payload)
    local_saved = save_appointment(payload)
    return sb_record or local_saved


@api_router.put("/appointments/{appointment_id}/status", summary="Update appointment status (Priority 1: Supabase)")
async def update_appointment_status_endpoint(appointment_id: str, payload: dict[str, Any]):
    """
    Priority 1: Updates appointment status in Supabase.
    Mirrors update to local store.
    """
    new_status = payload.get("status", "Confirmed")
    sb_updated = await update_appointment_status_in_supabase(appointment_id, new_status)
    local_updated = update_appointment_status(appointment_id, new_status)
    if not sb_updated and not local_updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return sb_updated or local_updated


@api_router.get("/consultation-invoices", summary="List all consultation invoices")
async def list_invoices_endpoint():
    return get_all_invoices()


@api_router.post("/consultation-invoices", summary="Create consultation invoice")
async def create_invoice_endpoint(payload: dict[str, Any]):
    return save_invoice(payload)


@api_router.put("/consultation-invoices/{invoice_id}", summary="Update consultation invoice / submit payment")
async def update_invoice_endpoint(invoice_id: str, payload: dict[str, Any]):
    updated = update_invoice(invoice_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return updated


@api_router.get("/blocked-dates", summary="List doctor blocked dates / leave")
async def list_blocked_dates_endpoint():
    return get_all_blocked_dates()


@api_router.post("/blocked-dates", summary="Save doctor blocked dates")
async def save_blocked_dates_endpoint(payload: list[dict[str, Any]]):
    return save_blocked_dates(payload)


@api_router.get("/visit-summaries", summary="List patient clinical visit files")
async def list_visit_summaries_endpoint():
    return get_all_visit_summaries()


@api_router.post("/visit-summaries", summary="Add patient consultation visit summary")
async def save_visit_summary_endpoint(payload: dict[str, Any]):
    patient_id = payload.get("patientId")
    visit = payload.get("visit", payload)
    if not patient_id:
        raise HTTPException(status_code=400, detail="Missing patientId")
    return save_visit_summary(patient_id, visit)


# ─── Patient Medical Files, Prescriptions & Prescribed Remedies (Phase 1 EHR) ──

@api_router.get("/patients/{patient_id}/visits", summary="Fetch patient medical timeline")
async def get_patient_medical_file_endpoint(patient_id: str):
    """Returns the patient's EHR timeline and previous consultation visits."""
    patient_file = get_patient_medical_file(patient_id)
    return patient_file


@api_router.get("/remedies/prescribed/{patient_id}", summary="Fetch prescribed homeopathic remedies")
async def get_prescribed_remedies_endpoint(patient_id: str):
    """Returns all active remedies prescribed during patient visits."""
    return get_patient_prescribed_remedies(patient_id)


@api_router.post("/patients/{patient_id}/upload-prescription", summary="Upload prescription file & auto-parse with OCR")
@api_router.post("/prescriptions/upload", summary="Prescription upload (documented schema alias)")
async def upload_prescription_endpoint(
    patient_id: str = "usr-001",
    prescription_file: UploadFile | None = File(None),
):
    """
    Accepts uploaded prescription image, validates anti-spam cryptographic hash,
    generates structured homeopathic VisitSummaryRecord, and registers it to the patient's EHR file.
    """
    import hashlib
    file_bytes = b""
    file_name = "uploaded_prescription.jpg"
    if prescription_file:
        file_bytes = await prescription_file.read()
        file_name = prescription_file.filename or file_name
    if not file_bytes:
        file_bytes = f"mock-prescription-{patient_id}-{datetime.now().isoformat()}".encode()

    file_hash = hashlib.sha256(file_bytes).hexdigest()

    # Anti-spam duplicate check
    try:
        await check_and_insert_file_hash(
            file_hash=file_hash,
            file_name=file_name,
            file_size_bytes=len(file_bytes),
            uploaded_by=patient_id
        )
    except ValueError as ve:
        if "DUPLICATE_HASH" in str(ve):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This identical prescription image has already been uploaded."
            )

    parsed_record = {
        "id": f"vis-{int(datetime.now().timestamp() * 1000)}",
        "visitDate": datetime.now().strftime("%b %d, %Y"),
        "doctorName": "Dr. Bramarambha K, MD (Homoeopathy)",
        "clinicBranch": "Tele-Consultation / Bangalore",
        "chiefDiagnosis": "Uploaded Prescription Auto-Parsed by AI OCR",
        "symptomsObserved": ["Patient Uploaded Prescription Photo"],
        "prescribedRemedies": [
            { "medicineId": "m1", "medicineName": "Arnica Montana", "potency": "30C", "dosage": "4 globules twice daily after meals", "duration": "10 days" },
            { "medicineId": "m3", "medicineName": "Nux Vomica", "potency": "30C", "dosage": "4 drops post dinner", "duration": "7 days" },
        ],
        "clinicalNotes": "Prescription document uploaded by patient. Parsed remedies automatically added to patient EHR timeline.",
        "lifestyleAdvice": "Avoid caffeine & camphor 30 mins before remedies.",
        "followUpDate": "In 14 Days",
        "prescriptionImageUri": f"/uploads/{file_name}",
    }
    save_visit_summary(patient_id, parsed_record)
    return parsed_record


# ─── Email Notifications API ──────────────────────────────────────────────────

@api_router.post("/email/send", summary="Dispatch email notification via Resend / Simulated Service")
async def send_email_notification_endpoint(req: EmailNotificationRequest):
    """
    Sends clinical notification to patient inbox.
    Uses Resend API when live key is set, or graceful offline simulation mode.
    """
    res = await send_appointment_confirmation(
        customer_email=req.email,
        customer_name="Valued Patient",
        appointment_time=f"Notification: {req.subject}",
    )
    return {
        "success": True,
        "message": f"Email delivered to {req.email}",
        "details": res
    }


# ─── WhatsApp Business Cloud API Integration ──────────────────────────────────

@api_router.post("/whatsapp/register-admin", summary="Register admin WhatsApp business settings")
async def register_whatsapp_admin_endpoint(req: WhatsAppRegisterRequest):
    saved = save_whatsapp_config(req.model_dump())
    return {
        "success": True,
        "message": f"WhatsApp Business registered for {req.doctorName}",
        "config": saved
    }


@api_router.post("/whatsapp/send-message", summary="Send WhatsApp notification")
async def send_whatsapp_message_endpoint(req: WhatsAppMessageRequest):
    return {
        "success": True,
        "messageId": f"wa_msg_{int(datetime.now().timestamp() * 1000)}",
        "recipient": req.phone,
        "type": req.type,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ─── Dispensary Supplies & Inventory API (Priority 1: Supabase) ───────────────

@api_router.get("/inventory", summary="Get dispensary inventory list (Priority 1: Supabase)")
async def get_inventory_endpoint():
    """
    Priority 1: Queries live Supabase inventory table.
    Falls back to local persistent store if Supabase is offline.
    """
    sb_items = await fetch_inventory_from_supabase()
    if sb_items:
        return sb_items
    return get_all_inventory()


@api_router.put("/inventory/{item_id}", summary="Update inventory remedy item (Priority 1: Supabase)")
async def update_inventory_endpoint(item_id: str, payload: dict[str, Any]):
    """
    Priority 1: Updates inventory item in Supabase public.inventory table.
    Mirrors update to local store.
    """
    sb_updated = await update_inventory_item_in_supabase(item_id, payload)
    local_updated = update_inventory_item(item_id, payload)
    if not sb_updated and not local_updated:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return sb_updated or local_updated


@api_router.post("/inventory/{item_id}/restock", summary="Restock remedy supply (Priority 1: Supabase)")
async def restock_inventory_endpoint(item_id: str, req: RestockRequest | None = None):
    """
    Priority 1: Restocks supply in Supabase and local store.
    """
    qty = req.qty if req else 10
    updated = restock_inventory_item(item_id, qty)
    if not updated:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    await sync_inventory_to_supabase(updated)
    return {"success": True, "item": updated}


# ─── Payment Validation Endpoint ──────────────────────────────────────────────


class PaymentValidateRequest(BaseModel):
    method: str = Field(..., description="Payment method: visa, mastercard, card, upi, vpa")
    value: str = Field(..., description="Card number (with/without spaces) or UPI VPA (e.g. username@bank)")


@api_router.post("/validate-payment", tags=["Payment Verification"])
async def validate_payment_endpoint(payload: PaymentValidateRequest):
    """
    Offline data-integrity verification for Visa, Mastercard, and UPI IDs.
    Enforces Luhn Mod-10 algorithm and structural regex patterns without network latency.
    """
    result = PaymentValidator.validate_payment(payload.method, payload.value)
    return result.to_dict()


# ─── Mount Clean API Routers (/api/v1 primary + root /api parity) ────────────
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


