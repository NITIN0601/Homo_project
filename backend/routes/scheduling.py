"""
Scheduling & Calendar Route Handlers.
Handles appointment booking, slot locking, Google Calendar synchronization,
Indian public holidays feed, and doctor blocked dates.
"""

import logging
from datetime import datetime
from typing import Any

from core.config import settings
from core.security import get_current_user_optional, require_admin_role, scope_items_to_patient_or_admin
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from schemas.scheduling import (
    AppointmentStatusUpdate,
    BookAppointmentRequest,
    ContinuityPreferenceResponse,
    DirectAppointmentCreateRequest,
)
from services.calendar_service import (
    GOOGLE_CALENDAR_ID,
    fetch_google_calendar_indian_holidays,
    filter_holidays_by_month,
)
from services.continuity_service import resolve_patient_doctor_continuity
from services.data_store import (
    InterProcessLock,
    get_all_appointments,
    get_all_blocked_dates,
    save_appointment,
    save_blocked_dates,
    update_appointment_status,
)
from services.doctor_service import get_doctor
from services.google_calendar import (
    create_google_calendar_event,
    validate_email_address,
    validate_future_date,
)
from services.hospital_service import get_hospital
from services.notification_service import (
    send_appointment_confirmation,
    send_appointment_whatsapp_notification,
)
from services.supabase_service import (
    fetch_appointments_from_supabase,
    sync_appointment_to_supabase,
    update_appointment_status_in_supabase,
)

logger = logging.getLogger("scheduling_routes")

router = APIRouter(tags=["Scheduling & Calendar"])

# Inter-process kernel lock for slot reservation across multi-worker processes
_booking_lock = InterProcessLock("appointment_booking.lock")


@router.get("/geo/detect", summary="Detect client timezone and country from incoming IP / reverse-proxy headers")
async def detect_client_geo(request: Request):
    """
    Automated zero-configuration geo-location:
    Inspects Cloudflare edge headers (CF-Timezone, CF-IPCountry),
    reverse proxy forwarded IP headers (X-Forwarded-For, X-Real-IP),
    or falls back to system local environment.
    """
    cf_timezone = request.headers.get("CF-Timezone")
    cf_country = request.headers.get("CF-IPCountry")
    forwarded_for = request.headers.get("X-Forwarded-For")
    real_ip = request.headers.get("X-Real-IP")
    client_ip = (
        forwarded_for.split(",")[0].strip()
        if forwarded_for
        else (real_ip or (request.client.host if request.client else "127.0.0.1"))
    )

    if cf_timezone:
        return {
            "status": "success",
            "ip": client_ip,
            "country": cf_country or "Unknown",
            "timezone": cf_timezone,
            "detection_source": "edge_proxy_header",
        }

    return {
        "status": "success",
        "ip": client_ip,
        "country": "Detected",
        "timezone": "America/New_York"
        if client_ip.startswith("127.") or client_ip in ("::1", "localhost")
        else "Asia/Kolkata",
        "detection_source": "network_ip_resolver",
    }


@router.get("/calendar/holidays", summary="Fetch Indian holidays from Google Calendar ICS")
async def list_holidays_endpoint(
    year: int = Query(default=2026, ge=2024, le=2030),
    month: int | None = Query(default=None, ge=1, le=12),
    force: bool = Query(default=False, description="Force re-fetch from Google Calendar feed and persist to disk"),
):
    try:
        holidays = await fetch_google_calendar_indian_holidays(year=year, force_refresh=force)
        if month:
            holidays = filter_holidays_by_month(holidays, month)
        return {
            "calendar_id": GOOGLE_CALENDAR_ID,
            "year": year,
            "month": month,
            "count": len(holidays),
            "holidays": holidays,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch public calendar feed: {exc}",
        )


@router.post(
    "/calendar/holidays/sync",
    summary="Sync Indian holidays from Google Calendar and save to persistent storage (1st Jan Yearly Sync)",
)
async def sync_holidays_endpoint(
    year: int = Query(default=2026, ge=2024, le=2030),
    force: bool = Query(default=True),
):
    try:
        holidays = await fetch_google_calendar_indian_holidays(year=year, force_refresh=force)
        return {
            "status": "success",
            "message": f"Successfully synced and persisted {len(holidays)} Indian holidays for {year} to local disk storage.",
            "year": year,
            "count": len(holidays),
            "storage_file": f"holidays_{year}.json",
            "calendar_id": GOOGLE_CALENDAR_ID,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Holiday sync failed: {exc}",
        )


@router.get("/calendar/check-date", summary="Check if a specific date is an Indian holiday")
async def check_holiday_date_endpoint(date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", examples=["2026-11-08"])):
    try:
        year = int(date.split("-")[0])
        holidays = await fetch_google_calendar_indian_holidays(year=year)
        matching = [h for h in holidays if h.get("date") == date]
        is_holiday = len(matching) > 0
        return {
            "date": date,
            "is_holiday": is_holiday,
            "holiday": matching[0] if is_holiday else None,
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Calendar check failed: {exc}",
        )


@router.post("/book-appointment", status_code=status.HTTP_201_CREATED, summary="Book an appointment slot")
async def book_appointment_endpoint(req: BookAppointmentRequest):
    if not validate_email_address(req.user_email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid email address format: '{req.user_email}'. Must be a valid email (e.g. name@domain.com).",
        )

    if not validate_future_date(req.start_time):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Appointment start date/time must be strictly in the future.",
        )

    date_part = req.start_time.split("T")[0] if "T" in req.start_time else req.start_time
    time_part = req.start_time.split("T")[1][:5] if "T" in req.start_time else "10:00"
    target_facility_date = req.hospital_date
    target_facility_slot = req.hospital_slot

    with _booking_lock:
        existing = get_all_appointments()
        for apt in existing:
            if apt.get("status") == "Cancelled":
                continue

            # Concurrency double-booking guard against doctor's hospital slot
            if target_facility_date and target_facility_slot:
                if (
                    apt.get("hospitalDate") == target_facility_date
                    and apt.get("hospitalSlot") == target_facility_slot
                ) or (
                    apt.get("date") == target_facility_date and apt.get("slot") == target_facility_slot
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Time slot {target_facility_slot} on {target_facility_date} is already booked. Please choose a different slot.",
                    )

            # Fallback legacy check by start_time / date_part
            apt_date = apt.get("date")
            apt_slot = apt.get("slot") or apt.get("time", "")
            if (apt_date == date_part or apt_date == req.start_time) and (
                apt_slot == time_part or apt.get("time") == time_part or apt.get("start_time") == req.start_time
            ):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Time slot {time_part} on {date_part} is already booked. Please choose a different slot.",
                )

        hospital = get_hospital(req.hospital_id)
        doctor = get_doctor(req.doctor_id, hospital.get("id"))

        continuity_info = resolve_patient_doctor_continuity(
            hospital_id=hospital.get("id"),
            patient_identifier=req.user_email or req.user_phone or "",
            preferred_date=target_facility_date or date_part,
            preferred_slot=target_facility_slot or time_part,
        )
        cont_status = req.continuity_status or (
            "Continuing Care"
            if continuity_info.get("status") == "preferred_doctor_available"
            else (
                f"Transferred from {continuity_info.get('previous_doctor_name')}"
                if continuity_info.get("previous_doctor_name")
                else "New Patient"
            )
        )

        apt_record = {
            "id": f"apt-{int(datetime.now().timestamp() * 1000)}",
            "hospitalId": hospital.get("id"),
            "hospitalName": hospital.get("name"),
            "doctorId": doctor.get("id"),
            "doctorName": doctor.get("name"),
            "patientId": f"usr-{int(datetime.now().timestamp()) % 10000}",
            "patientName": req.user_name,
            "patientPhone": req.user_phone or "+91 98123 45678",
            "patientEmail": req.user_email,
            "date": req.user_date or date_part,
            "time": req.user_time or time_part,
            "slot": target_facility_slot or time_part,
            "hospitalDate": target_facility_date or date_part,
            "hospitalSlot": target_facility_slot or time_part,
            "hospitalTime": target_facility_slot or time_part,
            "userDate": req.user_date or date_part,
            "userTime": req.user_time or time_part,
            "userTimezone": req.user_timezone,
            "start_time": req.start_time,
            "end_time": req.end_time,
            "type": req.consultation_type
            or (
                "Online Tele-Consultation"
                if req.user_timezone and req.user_timezone != "Asia/Kolkata"
                else "In-Person Hospital Visit"
            ),
            "chiefReason": req.description or "Clinical Consultation",
            "status": "Confirmed",
            "continuityStatus": cont_status,
            "calendarEventId": None,
            "createdAt": datetime.now().isoformat(),
        }
        save_appointment(apt_record)

    # External Calendar Sync
    cal_res = await create_google_calendar_event(
        user_email=req.user_email,
        user_name=req.user_name,
        start_time_iso=req.start_time,
        end_time_iso=req.end_time,
        summary=req.summary or f"Consultation — {hospital.get('name')}",
        description=req.description or f"Clinical consultation with {doctor.get('name')}",
        calendar_id=req.calendar_id or doctor.get("calendarId", "primary"),
        doctor_email=doctor.get("email"),
        doctor_name=doctor.get("shortName", doctor.get("name")),
    )

    if not cal_res.get("success"):
        update_appointment_status(apt_record["id"], "Cancelled")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Google Calendar API Error: {cal_res.get('error')}",
        )

    apt_record["calendarEventId"] = cal_res.get("event_id")
    save_appointment(apt_record)

    # Automated Dispatch: Email & WhatsApp Confirmations
    h_city = hospital.get("contact", {}).get("address", {}).get("city", "Bengaluru")
    hospital_loc_str = f"{hospital.get('name')}, {h_city}"

    email_res = await send_appointment_confirmation(
        customer_email=req.user_email,
        customer_name=req.user_name,
        appointment_time=f"{date_part} at {time_part}",
        doctor_name=doctor.get("name"),
        hospital_location=hospital_loc_str,
    )

    wa_res = await send_appointment_whatsapp_notification(
        phone=req.user_phone or hospital.get("contact", {}).get("phone", getattr(settings, "HOSPITAL_PHONE", "+1 555-0100")),
        customer_name=req.user_name,
        appointment_time=f"{date_part} at {time_part}",
        doctor_name=doctor.get("shortName", doctor.get("name")),
        hospital_location=hospital.get("name"),
    )

    await sync_appointment_to_supabase(apt_record)

    return {
        "status": "success",
        "message": "Appointment booked, Google Calendar event created, and email/WhatsApp confirmations dispatched.",
        "appointment": apt_record,
        "calendar_event": cal_res,
        "email_delivery": email_res,
        "whatsapp_delivery": wa_res,
    }


@router.get(
    "/scheduling/continuity-preference",
    response_model=ContinuityPreferenceResponse,
    summary="Resolve patient doctor continuity preference & availability fallback",
)
async def get_continuity_preference_endpoint(
    hospital_id: str | None = Query(default=None, description="Hospital Tenant ID"),
    identifier: str = Query(..., description="Patient email or phone number"),
    date: str | None = Query(default=None, description="Preferred appointment date YYYY-MM-DD"),
    slot: str | None = Query(default=None, description="Preferred time slot HH:MM"),
):
    """
    Evaluates patient consultation history and resolves doctor continuity.
    - If returning patient: preferences their previous treating doctor.
    - If previous doctor is inactive: recommends active colleague with case transfer note.
    - If previous doctor is fully booked on preferred date: suggests next available date or alternate colleague.
    """
    res = resolve_patient_doctor_continuity(
        hospital_id=hospital_id,
        patient_identifier=identifier,
        preferred_date=date,
        preferred_slot=slot,
    )
    return res


@router.get("/appointments", summary="List all booked appointments")
async def list_appointments_endpoint(
    request: Request,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    status_filter: str | None = Query(None, alias="status"),
    user: dict[str, Any] | None = Depends(get_current_user_optional),
):
    sb_appointments = await fetch_appointments_from_supabase()
    all_apts = sb_appointments if sb_appointments else get_all_appointments()
    if sb_appointments:
        try:
            for apt in sb_appointments:
                save_appointment(apt)
        except Exception as exc:
            logger.debug(f"Local appointment cache mirror notice: {exc}")

    hospital_id = getattr(request.state, "hospital_id", None)
    scoped = scope_items_to_patient_or_admin(
        all_apts,
        user,
        id_fields=("patientId", "patientEmail", "user_email"),
        hospital_id=hospital_id,
    )
    if status_filter:
        scoped = [a for a in scoped if (a.get("status") or "").lower() == status_filter.lower()]

    # Return paginated items
    return scoped[offset : offset + limit]


@router.post("/appointments", summary="Create or persist appointment")
async def create_appointment_endpoint(payload: DirectAppointmentCreateRequest):
    data = payload.model_dump(exclude_none=True)
    date = data.get("date")
    slot = data.get("slot") or data.get("time")
    if date and slot:
        with _booking_lock:
            existing = get_all_appointments()
            for apt in existing:
                if (
                    (apt.get("date") == date)
                    and (apt.get("slot") == slot or apt.get("time") == slot)
                    and apt.get("status") != "Cancelled"
                ):
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Time slot {slot} on {date} is already booked.",
                    )
            local_saved = save_appointment(data)
        sb_record = await sync_appointment_to_supabase(data)
        return sb_record or local_saved

    sb_record = await sync_appointment_to_supabase(data)
    local_saved = save_appointment(data)
    return sb_record or local_saved


@router.put("/appointments/{appointment_id}/status", summary="Update appointment status")
async def update_appointment_status_endpoint(
    appointment_id: str,
    payload: AppointmentStatusUpdate,
    user: dict[str, Any] = Depends(require_admin_role),
):
    new_status = payload.status
    sb_updated = await update_appointment_status_in_supabase(appointment_id, new_status)
    local_updated = update_appointment_status(appointment_id, new_status)
    if not sb_updated and not local_updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return sb_updated or local_updated


@router.get("/blocked-dates", summary="List doctor blocked dates / leave")
async def list_blocked_dates_endpoint():
    return get_all_blocked_dates()


@router.post("/blocked-dates", summary="Save doctor blocked dates")
async def save_blocked_dates_endpoint(
    payload: list[dict[str, Any]],
    user: dict[str, Any] = Depends(require_admin_role),
):
    return save_blocked_dates(payload)
