"""
Scheduling & Calendar Route Handlers.
Handles appointment booking, slot locking, Google Calendar synchronization,
Indian public holidays feed, and doctor blocked dates.
"""

import logging
import threading
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from core.config import settings
from core.security import get_current_user_optional, scope_items_to_patient_or_admin
from schemas.scheduling import BookAppointmentRequest
from services.calendar_service import (
    GOOGLE_CALENDAR_ID,
    fetch_google_calendar_indian_holidays,
    filter_holidays_by_month,
)
from services.data_store import (
    get_all_appointments,
    get_all_blocked_dates,
    save_appointment,
    save_blocked_dates,
    update_appointment_status,
)
from services.doctor_service import get_doctor
from services.hospital_service import get_hospital
from services.google_calendar import (
    create_google_calendar_event,
    validate_email_address,
    validate_future_date,
)
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

# Concurrency lock for slot reservation
_booking_lock = threading.Lock()


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


@router.post("/calendar/holidays/sync", summary="Sync Indian holidays from Google Calendar and save to persistent storage (1st Jan Yearly Sync)")
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
async def check_holiday_date_endpoint(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$", examples=["2026-11-08"])
):
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
                    detail=f"Time slot {time_part} on {date_part} is already booked. Please choose a different slot.",
                )

        hospital = get_hospital(req.hospital_id)
        doctor = get_doctor(req.doctor_id, hospital.get("id"))

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
    clinic_loc_str = f"{hospital.get('name')}, {h_city}"

    email_res = await send_appointment_confirmation(
        customer_email=req.user_email,
        customer_name=req.user_name,
        appointment_time=f"{date_part} at {time_part}",
        doctor_name=doctor.get("name"),
        clinic_location=clinic_loc_str,
    )

    wa_res = await send_appointment_whatsapp_notification(
        phone=req.user_phone or hospital.get("contact", {}).get("phone", settings.CLINIC_PHONE),
        customer_name=req.user_name,
        appointment_time=f"{date_part} at {time_part}",
        doctor_name=doctor.get("shortName", doctor.get("name")),
        clinic_location=hospital.get("name"),
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


@router.get("/appointments", summary="List all booked appointments")
async def list_appointments_endpoint(user: dict[str, Any] | None = Depends(get_current_user_optional)):
    sb_appointments = await fetch_appointments_from_supabase()
    all_apts = sb_appointments if sb_appointments else get_all_appointments()
    if sb_appointments:
        try:
            for apt in sb_appointments:
                save_appointment(apt)
        except Exception as exc:
            logger.debug(f"Local appointment cache mirror notice: {exc}")

    return scope_items_to_patient_or_admin(
        all_apts,
        user,
        id_fields=("patientId", "patientEmail", "user_email"),
    )


@router.post("/appointments", summary="Create or persist appointment")
async def create_appointment_endpoint(payload: dict[str, Any]):
    date = payload.get("date")
    slot = payload.get("slot") or payload.get("time")
    if date and slot:
        with _booking_lock:
            existing = get_all_appointments()
            for apt in existing:
                if (apt.get("date") == date) and (apt.get("slot") == slot or apt.get("time") == slot) and apt.get("status") != "Cancelled":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Time slot {slot} on {date} is already booked.",
                    )
            local_saved = save_appointment(payload)
        sb_record = await sync_appointment_to_supabase(payload)
        return sb_record or local_saved

    sb_record = await sync_appointment_to_supabase(payload)
    local_saved = save_appointment(payload)
    return sb_record or local_saved


@router.put("/appointments/{appointment_id}/status", summary="Update appointment status")
async def update_appointment_status_endpoint(appointment_id: str, payload: dict[str, Any]):
    new_status = payload.get("status", "Confirmed")
    sb_updated = await update_appointment_status_in_supabase(appointment_id, new_status)
    local_updated = update_appointment_status(appointment_id, new_status)
    if not sb_updated and not local_updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return sb_updated or local_updated


@router.get("/blocked-dates", summary="List doctor blocked dates / leave")
async def list_blocked_dates_endpoint():
    return get_all_blocked_dates()


@router.post("/blocked-dates", summary="Save doctor blocked dates")
async def save_blocked_dates_endpoint(payload: list[dict[str, Any]]):
    return save_blocked_dates(payload)

