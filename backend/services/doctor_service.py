"""
Doctor & Practitioner Domain Service.
Manages multi-doctor roster, qualifications, credentials, and schedule ownership.
Supports 1 to N doctors per hospital with dynamic practitioner resolution.
"""

import logging
from typing import Any

from core.config import settings
from services.data_store import load_json, save_json

logger = logging.getLogger("doctor_service")

DOCTORS_FILE = "doctors.json"


def get_all_doctors() -> list[dict[str, Any]]:
    """Retrieves all doctor records from the persistent store."""
    return load_json(DOCTORS_FILE, default=[])


def list_doctors(hospital_id: str | None = None, active_only: bool = True) -> list[dict[str, Any]]:
    """
    Returns list of doctors, optionally scoped to a specific hospital or active state.
    """
    doctors = get_all_doctors()
    if hospital_id:
        h_id = hospital_id.strip().lower()
        doctors = [d for d in doctors if d.get("hospitalId", "").lower() == h_id]
    if active_only:
        doctors = [d for d in doctors if d.get("isActive", True)]
    return doctors


def get_primary_doctor(hospital_id: str | None = None) -> dict[str, Any]:
    """
    Returns the primary physician for the specified hospital.
    Falls back to the first active doctor or standard fallback.
    """
    doctors = list_doctors(hospital_id=hospital_id, active_only=True)
    if not doctors:
        # Fallback to any active doctor across system
        all_active = [d for d in get_all_doctors() if d.get("isActive", True)]
        if all_active:
            return all_active[0]
        return _fallback_doctor()

    # Find doctor marked with isPrimary: true
    for d in doctors:
        if d.get("isPrimary", False):
            return d

    return doctors[0]


def get_doctor(doctor_id: str | None = None, hospital_id: str | None = None) -> dict[str, Any]:
    """
    Retrieves doctor entity by ID.
    If doctor_id is omitted or not found, resolves the primary doctor for the given hospital.
    """
    if not doctor_id:
        return get_primary_doctor(hospital_id)

    target_id = doctor_id.strip().lower()
    for d in get_all_doctors():
        if d.get("id", "").lower() == target_id:
            return d
        # Match by license or name query
        if d.get("licenseId", "").lower() == target_id:
            return d

    logger.warning(f"Doctor '{doctor_id}' not found in registry. Falling back to primary doctor for hospital '{hospital_id}'.")
    return get_primary_doctor(hospital_id)


def save_doctor(doctor_data: dict[str, Any]) -> dict[str, Any]:
    """Creates or updates a doctor profile in the roster."""
    doctors = get_all_doctors()
    doc_id = doctor_data.get("id")
    if not doc_id:
        raise ValueError("Doctor record must contain an 'id'")

    idx = next((i for i, d in enumerate(doctors) if d.get("id") == doc_id), None)
    if idx is not None:
        doctors[idx] = {**doctors[idx], **doctor_data}
    else:
        doctors.append(doctor_data)

    save_json(DOCTORS_FILE, doctors)
    return doctor_data


def create_doctor(data: dict[str, Any]) -> dict[str, Any]:
    """Dynamically creates a new doctor in the roster."""
    hospital_id = data.get("hospital_id") or data.get("hospitalId")
    if not hospital_id:
        raise ValueError("hospital_id is required to create a doctor.")

    import uuid
    doc_id = data.get("id") or f"doc-{uuid.uuid4().hex[:6]}"
    record = {
        "id": doc_id,
        "hospitalId": hospital_id.strip().lower(),
        "name": data.get("name", "Dr. Practitioner"),
        "shortName": data.get("short_name") or data.get("name", "Dr. Practitioner").split(",")[0],
        "title": data.get("title") or data.get("name", "Doctor of Medicine"),
        "regNo": data.get("reg_no") or f"REG-{uuid.uuid4().hex[:6].upper()}",
        "licenseId": data.get("license_id") or f"LIC-{doc_id.upper()}",
        "email": data.get("email", f"{doc_id}@clinic.org"),
        "phone": data.get("phone", "+91 98450 12345"),
        "experienceYears": data.get("experience_years", 5),
        "qualifications": data.get("qualifications", "BHMS, MD"),
        "specialties": data.get("specialties") or ["General Practice"],
        "calendarId": "primary",
        "avatarUrl": data.get("avatar_url") or "/assets/doctor-placeholder.jpg",
        "bio": data.get("bio") or "Dedicated medical professional providing personalized healthcare.",
        "isPrimary": bool(data.get("is_primary", False)),
        "isActive": True,
    }
    return save_doctor(record)


def _fallback_doctor() -> dict[str, Any]:
    """Safety fallback doctor entity if store is completely empty."""
    return {
        "id": getattr(settings, "DEFAULT_DOCTOR_ID", "doc-001"),
        "hospitalId": getattr(settings, "DEFAULT_HOSPITAL_ID", "agastya"),
        "name": getattr(settings, "DOCTOR_NAME", "Dr. Bramarambha K, MD (Homoeopathy)"),
        "shortName": getattr(settings, "DOCTOR_SHORT_NAME", "Dr. Bramarambha K"),
        "title": getattr(settings, "DOCTOR_NAME", "Dr. Bramarambha K, MD (Homoeopathy)"),
        "email": getattr(settings, "DOCTOR_EMAIL", "doctor@agastyahomoeo.com"),
        "phone": getattr(settings, "CLINIC_PHONE", "+91 98450 12345"),
        "specialties": ["Classical Homeopathy", "Chronic Pathology"],
        "calendarId": "primary",
        "isPrimary": True,
        "isActive": True,
    }

