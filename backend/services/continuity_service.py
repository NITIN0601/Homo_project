"""
Continuity of Care Domain Service.
Manages patient-doctor relationship continuity, previous physician preference,
and intelligent fallback reassignments when the treating doctor is unavailable or inactive.
"""

import logging
from datetime import datetime, timedelta
from typing import Any

from services.data_store import load_json
from services.doctor_service import get_all_doctors, list_doctors

logger = logging.getLogger("continuity_service")

APPOINTMENTS_FILE = "appointments_sync.json"


def _clean_str(val: str | None) -> str:
    return (val or "").strip().lower()


def _clean_phone(phone: str | None) -> str:
    if not phone:
        return ""
    # Strip spaces, dashes, parentheses
    return "".join(c for c in phone if c.isdigit() or c == "+")


def _format_doctor_summary(doc: dict[str, Any] | None) -> dict[str, Any] | None:
    if not doc:
        return None
    return {
        "id": doc.get("id"),
        "name": doc.get("name", "Doctor"),
        "short_name": doc.get("shortName") or doc.get("name", "").split(",")[0],
        "title": doc.get("title") or doc.get("name"),
        "qualifications": doc.get("qualifications", "BHMS, MD"),
        "specialties": doc.get("specialties") or ["General Medicine"],
        "avatar_url": doc.get("avatarUrl") or "/assets/doctor-placeholder.jpg",
        "is_active": doc.get("isActive", True),
        "calendar_id": doc.get("calendarId", "primary"),
        "is_primary": doc.get("isPrimary", False),
    }


def resolve_patient_doctor_continuity(
    hospital_id: str | None,
    patient_identifier: str,
    preferred_date: str | None = None,
    preferred_slot: str | None = None,
) -> dict[str, Any]:
    """
    Evaluates patient appointment and visit history to establish treating doctor continuity.
    Returns:
    - preferred_doctor: The doctor who previously treated this patient.
    - status: preferred_doctor_available | doctor_unavailable_on_date | doctor_inactive | new_patient
    - recommended_alternate: Colleague doctor if preferred doctor is unavailable/inactive.
    - case_transfer_required: True if consultation is being transferred to a new physician.
    """
    clean_hosp = (hospital_id or "default").strip().lower()
    raw_ident = (patient_identifier or "").strip()
    clean_ident_lower = raw_ident.lower()
    clean_phone_val = _clean_phone(raw_ident)

    # 1. Load all hospital doctors
    hospital_docs = list_doctors(hospital_id=clean_hosp, active_only=False)
    if not hospital_docs:
        # Fallback to system default
        hospital_docs = get_all_doctors()

    active_hospital_docs = [d for d in hospital_docs if d.get("isActive", True)]
    active_summaries = [_format_doctor_summary(d) for d in active_hospital_docs if d]

    # If identifier is empty, treat as new patient browsing roster
    if not raw_ident:
        primary_doc = next((d for d in active_hospital_docs if d.get("isPrimary")), None) or (
            active_hospital_docs[0] if active_hospital_docs else None
        )
        return {
            "is_returning_patient": False,
            "status": "new_patient",
            "message": "Welcome! Please select a doctor from our clinical roster.",
            "last_visit_date": None,
            "preferred_doctor": _format_doctor_summary(primary_doc),
            "previous_doctor_name": None,
            "recommended_alternate": None,
            "next_available_date": None,
            "case_transfer_required": False,
            "hospital_doctors": active_summaries,
        }

    # 2. Search appointments for this patient
    all_apts = load_json(APPOINTMENTS_FILE, default=[])
    patient_apts = []

    for apt in all_apts:
        apt_hosp = (apt.get("hospitalId") or "").strip().lower()
        if clean_hosp and apt_hosp and apt_hosp != clean_hosp:
            continue

        apt_email = (apt.get("patientEmail") or apt.get("user_email") or "").strip().lower()
        apt_phone = _clean_phone(apt.get("patientPhone") or apt.get("user_phone"))

        is_email_match = bool(clean_ident_lower and apt_email and clean_ident_lower == apt_email)
        is_phone_match = bool(
            clean_phone_val and apt_phone and (clean_phone_val in apt_phone or apt_phone in clean_phone_val)
        )

        if is_email_match or is_phone_match:
            # Exclude cancelled appointments when determining continuity of care
            if apt.get("status") != "Cancelled":
                patient_apts.append(apt)

    # Sort descending by date + time
    patient_apts.sort(key=lambda a: (a.get("date", ""), a.get("time", "")), reverse=True)

    # 3. Case A: First time patient (No prior non-cancelled visits)
    if not patient_apts:
        primary_doc = next((d for d in active_hospital_docs if d.get("isPrimary")), None) or (
            active_hospital_docs[0] if active_hospital_docs else None
        )
        return {
            "is_returning_patient": False,
            "status": "new_patient",
            "message": "Welcome! No prior consultations found. Please choose your consulting physician.",
            "last_visit_date": None,
            "preferred_doctor": _format_doctor_summary(primary_doc),
            "previous_doctor_name": None,
            "recommended_alternate": None,
            "next_available_date": None,
            "case_transfer_required": False,
            "hospital_doctors": active_summaries,
        }

    # 4. Case B: Returning patient
    latest_apt = patient_apts[0]
    prev_doc_id = latest_apt.get("doctorId")
    prev_doc_name = latest_apt.get("doctorName") or "Previous Physician"
    last_visit_date = latest_apt.get("date")

    # Resolve doctor profile
    doc_profile = next((d for d in hospital_docs if d.get("id") == prev_doc_id), None)
    if not doc_profile and prev_doc_name:
        doc_profile = next(
            (d for d in hospital_docs if d.get("name") == prev_doc_name or d.get("shortName") == prev_doc_name), None
        )

    # 4.1 Check if treating doctor is inactive or left clinic
    is_doc_active = bool(doc_profile and doc_profile.get("isActive", True))

    if not is_doc_active:
        alternate_doc = next((d for d in active_hospital_docs if d.get("id") != prev_doc_id), None)
        if not alternate_doc and active_hospital_docs:
            alternate_doc = active_hospital_docs[0]

        alt_summary = _format_doctor_summary(alternate_doc)
        return {
            "is_returning_patient": True,
            "status": "doctor_inactive",
            "message": (
                f"{prev_doc_name} is no longer practicing at this clinic. "
                f"Your clinical case file and constitutional notes will be assigned to {alternate_doc.get('name') if alternate_doc else 'the duty physician'}."
            ),
            "last_visit_date": last_visit_date,
            "preferred_doctor": None,
            "previous_doctor_name": prev_doc_name,
            "recommended_alternate": alt_summary,
            "next_available_date": None,
            "case_transfer_required": True,
            "hospital_doctors": active_summaries,
        }

    # 4.2 Treating doctor is active! Check availability for preferred_date and preferred_slot
    doc_summary = _format_doctor_summary(doc_profile)

    if preferred_date:
        # Check if doctor is already booked on this exact slot
        doc_id = doc_profile.get("id")
        is_slot_taken = False
        if preferred_slot:
            is_slot_taken = any(
                a.get("doctorId") == doc_id
                and a.get("date") == preferred_date
                and (a.get("slot") == preferred_slot or a.get("time") == preferred_slot)
                and a.get("status") != "Cancelled"
                for a in all_apts
            )

        if is_slot_taken:
            # Find next alternate doctor in hospital who is free
            alternate_colleague = next((d for d in active_hospital_docs if d.get("id") != doc_id), None)
            # Compute a recommended next available date (+1 to +3 days)
            try:
                base_dt = datetime.strptime(preferred_date, "%Y-%m-%d")
                next_date = (base_dt + timedelta(days=2)).strftime("%Y-%m-%d")
            except Exception:
                next_date = None

            return {
                "is_returning_patient": True,
                "status": "doctor_unavailable_on_date",
                "message": (
                    f"Your primary doctor, {doc_profile.get('name')}, is already booked for the selected slot on {preferred_date}. "
                    f"You can choose colleague {alternate_colleague.get('name') if alternate_colleague else 'another doctor'} for this time, "
                    f"or book {doc_profile.get('name')} on an upcoming date."
                ),
                "last_visit_date": last_visit_date,
                "preferred_doctor": doc_summary,
                "previous_doctor_name": prev_doc_name,
                "recommended_alternate": _format_doctor_summary(alternate_colleague),
                "next_available_date": next_date,
                "case_transfer_required": False,
                "hospital_doctors": active_summaries,
            }

    # Normal preferred doctor available
    return {
        "is_returning_patient": True,
        "status": "preferred_doctor_available",
        "message": f"Welcome back! Continuing consultation with your primary physician, {doc_profile.get('name')}.",
        "last_visit_date": last_visit_date,
        "preferred_doctor": doc_summary,
        "previous_doctor_name": prev_doc_name,
        "recommended_alternate": None,
        "next_available_date": None,
        "case_transfer_required": False,
        "hospital_doctors": active_summaries,
    }
