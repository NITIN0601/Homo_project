"""
Unified Multi-Tenant Onboarding Engine (Microservice Pattern).
Consolidates onboarding lifecycle across Hospital Facilities, Medical Practitioners, and Patients.

Stages:
1. Validation & Schema Normalization
2. Identity & Storage Provisioning (Tenancy Isolation)
3. Capability & Feature Governance (Doctor vs. Patient visibility)
4. Credential & Invite Generation (Google 1-Click + Password Token)
5. Transactional Notification Dispatch (Resend Email API)
6. Enterprise Audit Logging (HIPAA/ABDM trace)
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from core.audit import record_audit_entry
from core.config import settings
from core.currency_utils import infer_currency_from_country
from core.timezone_utils import infer_timezone_from_location
from services.auth_service import create_user_invite, register_user, validate_email
from services.doctor_service import create_doctor
from services.email_service import send_appointment_confirmation, send_doctor_onboarding_email
from services.hospital_service import create_hospital

logger = logging.getLogger("onboarding_service")

OnboardingTarget = Literal["hospital", "doctor", "patient"]


async def onboard(
    target: OnboardingTarget,
    payload: dict[str, Any],
    actor_email: str = "system",
) -> dict[str, Any]:
    """
    Unified onboarding dispatcher.
    Ensures DRY architecture: Hospital, Doctor, and Patient all reuse common
    identity provisioning, notification dispatch, and audit tracking.
    """
    if target == "hospital":
        return await _onboard_hospital(payload, actor_email)
    elif target == "doctor":
        return await _onboard_doctor(payload, actor_email)
    elif target == "patient":
        return await _onboard_patient(payload, actor_email)
    else:
        raise ValueError(f"Unsupported onboarding target: '{target}'")


async def _onboard_hospital(payload: dict[str, Any], actor_email: str) -> dict[str, Any]:
    """Provisions a new hospital facility with branding, legal policies, and lead doctor."""
    raw_slug = str(payload.get("id") or payload.get("slug") or payload.get("name", "hospital")).lower()
    clean_id = "".join(c for c in raw_slug.strip().replace(" ", "-") if c.isalnum() or c == "-")

    name = (payload.get("name") or "New Hospital Clinic").strip()
    primary_color = payload.get("primary_color") or payload.get("branding", {}).get("primaryColor") or "#0d9488"
    accent_color = payload.get("accent_color") or payload.get("branding", {}).get("accentColor") or "#14b8a6"

    # Default Feature Governance
    default_features = {
        "enableVoiceStudio": True,
        "enablePrescriptionScan": True,
        "enableTelemedicine": True,
        "enableRawCaseJson": True,
        "enableECommerce": True,
        "displayDoctorDetails": True,
        "enablePatientMedicalRecords": True,
        "enableBillingHistory": True,
        "enableFollowupFeedback": True,
        "enableOnlinePayments": True,
        "enableCustomerPayments": True,
        "enableGoogleReviews": True,
        "enableAgastyaBot": True,
        "enablePatientProfileEdit": True,
        "allowDoctorDirectContact": True,
        "allowDoctorCustomBio": True,
        "allowDoctorSpecialties": True,
    }
    features = {**default_features, **(payload.get("features") or {})}

    # Legal policies
    legal = {
        "termsConditionsText": payload.get("terms_conditions") or payload.get("legal", {}).get("termsConditionsText"),
        "privacyPolicyText": payload.get("privacy_policy") or payload.get("legal", {}).get("privacyPolicyText"),
        "emergencyNotice": payload.get("emergency_notice") or f"Emergency services at {name} should be contacted immediately by telephone in life-threatening scenarios.",
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
    }

    hospital_record = {
        "id": clean_id,
        "slug": clean_id,
        "name": name,
        "short_name": payload.get("short_name") or name.split()[0],
        "tagline": payload.get("tagline") or "Compassionate Healthcare with Clinical Precision",
        "phone": payload.get("phone", "+91 98450 00000"),
        "email": payload.get("email", f"admin@{clean_id}.ehr"),
        "street": payload.get("street", "123 Healthcare Blvd"),
        "city": payload.get("city", "Bengaluru"),
        "state": payload.get("state", "Karnataka"),
        "country": payload.get("country", "India"),
        "primary_color": primary_color,
        "accent_color": accent_color,
        "logo_url": payload.get("logo_url") or payload.get("branding", {}).get("logoUrl") or "/generic-clinic-logo.svg",
        "banner_url": payload.get("banner_url") or payload.get("branding", {}).get("bannerUrl") or "/assets/banner.jpg",
        "about_clinic_text": payload.get("about_clinic_text") or payload.get("branding", {}).get("aboutClinicText"),
    }

    # Location-based timezone inference: ensures zero ambiguity when entering operational hours
    country = hospital_record["country"]
    state = hospital_record["state"]
    city = hospital_record["city"]
    explicit_tz = payload.get("timezone")

    if not explicit_tz or (
        explicit_tz == "Asia/Kolkata"
        and country
        and country.strip().lower() not in ["india", "bharat", "in"]
    ):
        inferred = infer_timezone_from_location(country=country, state=state, city=city)
        facility_tz = inferred["timeZone"]
    else:
        facility_tz = explicit_tz

    # Location-based currency resolution: ensures local billing per country
    curr_info = infer_currency_from_country(country)
    facility_currency = payload.get("currency") or curr_info["code"]
    facility_symbol = payload.get("currency_symbol") or curr_info["symbol"]

    hospital_record["currency"] = facility_currency
    hospital_record["currencySymbol"] = facility_symbol
    hospital_record["hours"] = {
        "timezone": facility_tz,
        "morningDisplay": payload.get("morning_hours", "10:00 AM – 01:30 PM"),
        "eveningDisplay": payload.get("evening_hours", "05:00 PM – 08:30 PM"),
        "availableDays": payload.get("available_days", "Monday – Saturday"),
        "sundayPolicy": payload.get("sunday_policy", "Prior Appointment Only"),
    }
    hospital_record["features"] = features
    hospital_record["legal"] = legal

    created_hospital = create_hospital(hospital_record)

    # Lead Doctor Provisioning
    doc_email = payload.get("doctor_email")
    doctor_result = None
    invite_result = None
    email_delivery = None

    if doc_email:
        doc_payload = {
            "hospital_id": clean_id,
            "name": payload.get("doctor_name", "Dr. Lead Physician"),
            "email": doc_email.strip().lower(),
            "phone": payload.get("doctor_phone") or hospital_record["phone"],
            "title": payload.get("doctor_title") or f"{payload.get('doctor_name', 'Doctor')}, Consulting Physician",
            "qualifications": payload.get("doctor_qualifications", "MD, MBBS"),
            "experience_years": int(payload.get("doctor_experience_years") or 8),
            "reg_no": payload.get("doctor_reg_no") or f"MED-{clean_id.upper()}-{uuid.uuid4().hex[:4].upper()}",
            "specialties": payload.get("doctor_specialties") or ["General Medicine", "Holistic Health"],
            "bio": payload.get("doctor_bio") or f"Primary clinical consultant for {name}.",
            "consultation_fee": float(payload.get("doctor_consultation_fee") or 750.0),
            "availability": {
                "timezone": facility_tz,
                "days": payload.get("doctor_available_days", "Monday – Saturday"),
                "morning": payload.get("morning_hours", "10:00 AM – 01:30 PM"),
                "evening": payload.get("evening_hours", "05:00 PM – 08:30 PM"),
                "consultationFee": float(payload.get("doctor_consultation_fee") or 750.0),
            },
            "is_primary": True,
        }
        doctor_resp = await _onboard_doctor(doc_payload, actor_email=actor_email)
        doctor_result = doctor_resp.get("doctor")
        invite_result = doctor_resp.get("invite")
        email_delivery = doctor_resp.get("email_delivery")

    record_audit_entry({
        "event_type": "HOSPITAL_ONBOARDED",
        "actor": actor_email,
        "details": {"hospital_id": clean_id, "name": name, "has_doctor": bool(doctor_result)},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "status": "success",
        "target": "hospital",
        "hospital": created_hospital,
        "doctor": doctor_result,
        "invite": invite_result,
        "invite_url": invite_result.get("invite_url") if invite_result else None,
        "email_delivery": email_delivery,
    }


async def _onboard_doctor(payload: dict[str, Any], actor_email: str) -> dict[str, Any]:
    """Provisions a medical practitioner, grants Google OAuth eligibility, and sends activation email."""
    hospital_id = (payload.get("hospital_id") or payload.get("hospitalId") or "default").strip().lower()
    doc_email = validate_email(payload["email"])
    doc_name = payload.get("name", "Dr. Practitioner").strip()

    doc_id = payload.get("id") or f"doc-{hospital_id}-{uuid.uuid4().hex[:4]}"

    doc_record = {
        "id": doc_id,
        "hospitalId": hospital_id,
        "name": doc_name,
        "shortName": payload.get("short_name") or doc_name.split(",")[0],
        "title": payload.get("title") or f"{doc_name}, Consulting Physician",
        "regNo": payload.get("reg_no") or f"REG-{uuid.uuid4().hex[:6].upper()}",
        "licenseId": payload.get("license_id") or f"LIC-{doc_id.upper()}",
        "email": doc_email,
        "phone": payload.get("phone", "+91 98450 12345"),
        "experienceYears": int(payload.get("experience_years") or 5),
        "qualifications": payload.get("qualifications", "MBBS, MD"),
        "specialties": payload.get("specialties") if isinstance(payload.get("specialties"), list) else [s.strip() for s in str(payload.get("specialties", "")).split(",") if s.strip()],
        "calendarId": "primary",
        "avatarUrl": payload.get("avatar_url") or "/assets/doctor-placeholder.jpg",
        "bio": payload.get("bio") or "Dedicated medical professional providing personalized holistic healthcare.",
        "consultationFee": float(payload.get("consultation_fee") or payload.get("consultationFee") or 750.0),
        "availability": payload.get("availability") or {
            "days": payload.get("available_days", "Monday – Saturday"),
            "morningHours": payload.get("morning_hours", "10:00 AM – 01:30 PM"),
            "eveningHours": payload.get("evening_hours", "05:00 PM – 08:30 PM"),
            "consultationFee": float(payload.get("consultation_fee") or payload.get("consultationFee") or 750.0),
        },
        "isPrimary": bool(payload.get("is_primary", False)),
        "isActive": True,
        # Doctor-to-Patient Sharing Preferences
        "sharing_preferences": {
            "share_bio": payload.get("share_bio", True),
            "share_specialties": payload.get("share_specialties", True),
            "share_qualifications": payload.get("share_qualifications", True),
            "share_direct_phone": payload.get("share_direct_phone", False),
        },
    }

    saved_doc = create_doctor(doc_record)

    # Generate Doctor Activation Invite (Admin Role)
    invite = create_user_invite(
        email=doc_email,
        name=doc_name,
        role="admin",
        hospital_id=hospital_id,
        phone=doc_record["phone"],
        created_by=actor_email,
    )
    invite_url = f"{settings.FRONTEND_URL}/join?token={invite['token']}"
    invite["invite_url"] = invite_url

    # Dispatch Welcome & Credential Email via Resend
    from services.hospital_service import get_hospital
    hospital_data = get_hospital(hospital_id)
    hospital_name = hospital_data.get("name", "Medical Clinic")

    email_delivery = await send_doctor_onboarding_email(
        doctor_email=doc_email,
        doctor_name=doc_name,
        doctor_title=doc_record["title"],
        hospital_name=hospital_name,
        hospital_id=hospital_id,
        invite_url=invite_url,
        reg_no=doc_record["regNo"],
    )

    record_audit_entry({
        "event_type": "DOCTOR_ONBOARDED",
        "actor": actor_email,
        "details": {"doctor_id": doc_id, "email": doc_email, "hospital_id": hospital_id},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "status": "success",
        "target": "doctor",
        "doctor": saved_doc,
        "invite": invite,
        "invite_url": invite_url,
        "email_delivery": email_delivery,
    }


async def _onboard_patient(payload: dict[str, Any], actor_email: str) -> dict[str, Any]:
    """Provisions a patient profile, links to hospital/assigned doctor, and generates credentials."""
    patient_email = validate_email(payload["email"])
    patient_name = payload.get("name", "Patient").strip()
    hospital_id = (payload.get("hospital_id") or "default").strip().lower()
    assigned_doc_id = payload.get("assigned_doctor_id")

    # If password is provided, register directly; otherwise create invite or Google claim
    password = payload.get("password")
    if password:
        profile, token = register_user(
            name=patient_name,
            email=patient_email,
            password=password,
            role="patient",
            phone=payload.get("phone", ""),
            hospital_id=hospital_id,
        )
        invite = None
        invite_url = None
    else:
        invite = create_user_invite(
            email=patient_email,
            name=patient_name,
            role="patient",
            hospital_id=hospital_id,
            phone=payload.get("phone", ""),
            created_by=actor_email,
        )
        invite_url = f"{settings.FRONTEND_URL}/join?token={invite['token']}"
        invite["invite_url"] = invite_url
        profile = {
            "name": patient_name,
            "email": patient_email,
            "role": "patient",
            "hospital_id": hospital_id,
        }
        token = None

    # Send Welcome / Confirmation Email
    email_delivery = await send_appointment_confirmation(
        customer_email=patient_email,
        customer_name=patient_name,
        appointment_time="New Patient Registration",
        hospital_id=hospital_id,
        doctor_id=assigned_doc_id,
    )

    record_audit_entry({
        "event_type": "PATIENT_ONBOARDED",
        "actor": actor_email,
        "details": {"email": patient_email, "hospital_id": hospital_id, "assigned_doctor": assigned_doc_id},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "status": "success",
        "target": "patient",
        "profile": profile,
        "token": token,
        "invite": invite,
        "invite_url": invite_url,
        "email_delivery": email_delivery,
    }
