"""
Hospital & Clinic Tenant Service.
Provides multi-hospital tenant resolution, branding management, and profile metadata.
Prioritizes backend/data/hospitals.json with seamless future PostgreSQL / Supabase bridging.
"""

import logging
from datetime import datetime, timezone
from typing import Any

from core.config import settings
from services.data_store import load_json, save_json

logger = logging.getLogger("hospital_service")

HOSPITALS_FILE = "hospitals.json"


def get_all_hospitals() -> list[dict[str, Any]]:
    """Retrieves all hospital tenants from the persistent store."""
    return load_json(HOSPITALS_FILE, default=[])


def list_hospitals(active_only: bool = True) -> list[dict[str, Any]]:
    """Returns all available hospitals, optionally filtering by active state."""
    hospitals = get_all_hospitals()
    if active_only:
        return [h for h in hospitals if h.get("isActive", True)]
    return hospitals


def get_hospital(hospital_id: str | None = None) -> dict[str, Any]:
    """
    Retrieves hospital entity by ID or slug.
    If hospital_id is omitted or not found, falls back to the configured DEFAULT_HOSPITAL_ID
    or the first active hospital in the registry.
    """
    hospitals = get_all_hospitals()
    if not hospitals:
        return _fallback_hospital()

    target_id = (hospital_id or getattr(settings, "DEFAULT_HOSPITAL_ID", "default")).strip().lower()

    # Match by exact id or slug
    for h in hospitals:
        if h.get("id", "").lower() == target_id or h.get("slug", "").lower() == target_id:
            return h

    # Match by domain or subdomains
    for h in hospitals:
        if (h.get("domain") or "").lower() == target_id:
            return h
        if target_id in [(sub or "").lower() for sub in (h.get("subdomains") or [])]:
            return h

    # Fallback to first active hospital or the first available
    active = [h for h in hospitals if h.get("isActive", True)]
    return active[0] if active else hospitals[0]


def get_hospital_by_domain(domain: str) -> dict[str, Any] | None:
    """Finds hospital associated with a custom domain or host subdomain."""
    if not domain:
        return None
    clean_domain = domain.strip().lower().split(":")[0]
    for h in get_all_hospitals():
        h_domain = (h.get("domain") or "").lower()
        if h_domain == clean_domain:
            return h
        for sub in h.get("subdomains") or []:
            if f"{sub}." in clean_domain or clean_domain == str(sub).lower():
                return h
    return None


def resolve_hospital(hospital_id: str | None = None, headers: dict[str, Any] | None = None) -> dict[str, Any]:
    """
    Resolves active hospital tenant according to precedence:
      1. Explicit hospital_id parameter (query or body)
      2. 'X-Tenant-ID' or 'X-Hospital-ID' HTTP header
      3. Host header domain/subdomain lookup
      4. Default configured hospital tenant (SSOT)
    """
    if hospital_id:
        return get_hospital(hospital_id)

    if headers:
        header_tenant = headers.get("x-tenant-id") or headers.get("X-Tenant-ID") or headers.get("x-hospital-id")
        if header_tenant:
            return get_hospital(header_tenant)

        host = headers.get("host", "")
        if host:
            matched = get_hospital_by_domain(host)
            if matched:
                return matched

    return get_hospital(getattr(settings, "DEFAULT_HOSPITAL_ID", "default"))


def save_hospital(hospital_data: dict[str, Any]) -> dict[str, Any]:
    """Creates or updates a hospital tenant profile."""
    hospitals = get_all_hospitals()
    h_id = hospital_data.get("id")
    if not h_id:
        raise ValueError("Hospital record must contain an 'id'")

    idx = next((i for i, h in enumerate(hospitals) if h.get("id") == h_id), None)
    if idx is not None:
        hospitals[idx] = {**hospitals[idx], **hospital_data}
    else:
        hospitals.append(hospital_data)

    save_json(HOSPITALS_FILE, hospitals)
    return hospital_data


def create_hospital(data: dict[str, Any]) -> dict[str, Any]:
    """Dynamically creates a new hospital tenant with standardized structure."""
    h_id = data.get("id", "").strip().lower()
    if not h_id:
        raise ValueError("Hospital 'id' slug is required.")

    hospitals = get_all_hospitals()
    if any(h.get("id", "").lower() == h_id for h in hospitals):
        raise ValueError(f"Hospital with id '{h_id}' already exists.")

    default_features = {
        "enableECommerce": True,
        "enableVoiceStudio": True,
        "enablePrescriptionScan": True,
        "enableOnlinePayments": True,
        "enableTelemedicine": True,
        "enableGoogleReviews": True,
        "enableInventoryManagement": True,
        "enableInvoicing": True,
        "enableExportAudit": True,
    }

    record = {
        "id": h_id,
        "slug": h_id,
        "name": data.get("name", "New Healthcare Center"),
        "facilityType": data.get("facility_type") or data.get("facilityType") or "hospital",
        "shortName": data.get("short_name") or data.get("name", "New Hospital"),
        "tagline": data.get("tagline", "Quality patient-first healthcare"),
        "domain": data.get("domain", f"{h_id}.org"),
        "subdomains": [h_id, "hospital", "clinic", "ehr"],
        "currency": data.get("currency") or "INR",
        "currencySymbol": data.get("currencySymbol") or "₹",
        "hours": data.get("hours"),
        "legal": data.get("legal") or {
            "termsConditionsText": data.get("terms_conditions_text"),
            "privacyPolicyText": data.get("privacy_policy_text"),
            "emergencyNotice": data.get("emergency_notice"),
        },
        "contact": {
            "phone": data.get("phone", "+91 98450 12345"),
            "phoneDisplay": data.get("phone", "+91 98450 12345"),
            "email": data.get("email", f"admin@{h_id}.org"),
            "emergencyPhone": data.get("phone", "+91 98450 12345"),
            "address": {
                "street": data.get("street", "123 Healthcare Way"),
                "city": data.get("city", "Bengaluru"),
                "state": data.get("state", "Karnataka"),
                "country": data.get("country", "India"),
            },
        },
        "branding": {
            "primaryColor": data.get("primary_color", "#0d9488"),
            "primaryDarkColor": data.get("primary_dark_color", "#115e59"),
            "accentColor": data.get("accent_color", "#14b8a6"),
            "neutralBg": "#fafaf9",
            "cardRadius": "1.25rem",
            "buttonRadius": "0.75rem",
            "logoUrl": data.get("logo_url") or data.get("logoUrl") or "/generic-hospital-logo.svg",
            "bannerUrl": data.get("banner_url") or data.get("bannerUrl") or "/assets/banner.jpg",
            "aboutHospitalText": data.get("about_hospital_text")
            or data.get("aboutHospitalText")
            or f"{data.get('name', 'Hospital')} provides comprehensive patient care.",
        },
        "features": {**default_features, **(data.get("features") or {})},
        "deployment": data.get("deployment") or {
            "backendUrl": data.get("backend_url", ""),
            "frontendUrl": data.get("frontend_url", ""),
            "deploymentStatus": data.get("deployment_status", "draft"),
            "deploymentVersion": data.get("deployment_version", "v1.0.0"),
            "lastDeployedAt": data.get("last_deployed_at"),
            "supportedBrowsers": data.get("supported_browsers")
            or ["Chrome >= 110", "Safari >= 16", "Firefox >= 115", "Edge >= 110"],
            "supportedDevices": data.get("supported_devices")
            or [
                "Desktop (macOS / Windows / Linux)",
                "Tablet (iPad / Android Tablet)",
                "Mobile (iOS / Android)",
            ],
        },
        "llmConfig": data.get("llmConfig") or {
            "provider": data.get("llm_provider", "gemini"),
            "modelId": data.get("llm_model_id", "gemini-1.5-flash"),
            "apiKey": data.get("llm_api_key", ""),
            "endpointUrl": data.get("llm_endpoint_url", ""),
        },
        "paymentGateway": data.get("paymentGateway") or {
            "provider": data.get("payment_provider", "upi"),
            "merchantId": data.get("payment_merchant_id", ""),
            "apiKey": data.get("payment_api_key", ""),
            "accountEmail": data.get("payment_account_email", ""),
            "upiId": data.get("payment_upi_id", ""),
        },
        "googleIntegration": data.get("googleIntegration") or {
            "clientId": data.get("google_client_id", ""),
            "calendarId": data.get("google_calendar_id", "primary"),
            "serviceAccountEmail": data.get("google_service_account_email", ""),
        },
        "socialMedia": data.get("socialMedia") or {
            "whatsapp": {
                "enabled": True,
                "businessAccountId": "",
                "phoneNumberId": "",
                "apiToken": "",
                "displayNumber": data.get("phone", "+91 98450 12345"),
                "customGreeting": f"Namaste! Welcome to {data.get('name', 'our healthcare facility')}.",
                "chatUrl": f"https://wa.me/{''.join(filter(str.isdigit, data.get('phone', '')))}",
            },
            "instagram": {
                "enabled": True,
                "handle": "",
                "profileUrl": "",
                "accountId": "",
                "accessToken": "",
                "autoReplyEnabled": False,
                "directBookingEnabled": True,
            },
            "facebook": {"enabled": False, "pageUrl": "", "pageId": "", "accessToken": ""},
            "youtube": {"enabled": False, "channelUrl": "", "channelName": ""},
            "linkedin": {"enabled": False, "companyUrl": "", "companyName": ""},
        },
        "isActive": True,
    }
    return save_hospital(record)


def delete_hospital(hospital_id: str, soft_delete: bool = True) -> dict[str, Any] | None:
    """
    Deactivates or deletes a hospital tenant.
    Defaults to soft-delete (isActive=False) to prevent data orphanages across historical appointments.
    Cascades deactivation to all associated doctors.
    """
    hospitals = get_all_hospitals()
    target_id = hospital_id.strip().lower()
    idx = next((i for i, h in enumerate(hospitals) if h.get("id", "").lower() == target_id), None)
    if idx is None:
        return None

    target = hospitals[idx]
    if soft_delete:
        target["isActive"] = False
        target["deactivatedAt"] = datetime.now(timezone.utc).isoformat()
        hospitals[idx] = target
    else:
        target = hospitals.pop(idx)

    save_json(HOSPITALS_FILE, hospitals)

    # Cascade soft deactivation to associated doctors
    try:
        from services.doctor_service import DOCTORS_FILE, get_all_doctors

        doctors = get_all_doctors()
        updated = False
        for doc in doctors:
            if doc.get("hospitalId", "").lower() == target_id:
                if soft_delete:
                    doc["isActive"] = False
                    doc["deactivatedAt"] = datetime.now(timezone.utc).isoformat()
                updated = True
        if updated:
            if not soft_delete:
                doctors = [d for d in doctors if d.get("hospitalId", "").lower() != target_id]
            save_json(DOCTORS_FILE, doctors)
    except Exception as exc:
        logger.warning(f"Error cascading hospital deletion to doctors: {exc}")

    logger.info(f"Hospital '{hospital_id}' {'soft-deactivated' if soft_delete else 'permanently removed'}.")
    return target


def update_hospital_customization(hospital_id: str, updates: dict[str, Any]) -> dict[str, Any]:
    """
    Atomically updates hospital and clinic branding, contact info, and bio
    from the Admin Customization Tab, maintaining single source of truth across all sessions.
    """
    hospital = get_hospital(hospital_id)
    if not hospital:
        raise ValueError(f"Hospital '{hospital_id}' not found.")

    for field in (
        "name",
        "shortName",
        "tagline",
        "hours",
        "currency",
        "currencySymbol",
        "facilityType",
        "legal",
        "deployment",
        "llmConfig",
        "paymentGateway",
        "googleIntegration",
        "socialMedia",
    ):
        if field in updates:
            if isinstance(updates[field], dict) and isinstance(hospital.get(field), dict):
                hospital[field] = {**hospital[field], **updates[field]}
            else:
                hospital[field] = updates[field]

    if "contact" in updates and isinstance(updates["contact"], dict):
        hospital["contact"] = {**(hospital.get("contact") or {}), **updates["contact"]}

    if "branding" in updates and isinstance(updates["branding"], dict):
        hospital["branding"] = {**(hospital.get("branding") or {}), **updates["branding"]}

    if "doctor" in updates and isinstance(updates["doctor"], dict):
        hospital["doctor"] = {**(hospital.get("doctor") or {}), **updates["doctor"]}
        # Also sync to doctor registry if doctor id is provided
        doc_id = updates["doctor"].get("id")
        if doc_id:
            try:
                from services.doctor_service import get_doctor, save_doctor

                doc = get_doctor(doc_id, hospital_id=hospital_id)
                if doc:
                    doc.update(updates["doctor"])
                    doc["updatedAt"] = datetime.now(timezone.utc).isoformat()
                    save_doctor(doc)
            except Exception as exc:
                logger.warning(f"Could not auto-sync doctor record: {exc}")

    hospital["updatedAt"] = datetime.now(timezone.utc).isoformat()
    return save_hospital(hospital)


def _fallback_hospital() -> dict[str, Any]:
    """Safety fallback hospital entity if store is completely empty."""
    return {
        "id": "default",
        "slug": "default",
        "name": getattr(settings, "HOSPITAL_NAME", "General Healthcare Hospital"),
        "shortName": getattr(settings, "HOSPITAL_NAME", "General Hospital"),
        "contact": {
            "phone": getattr(settings, "HOSPITAL_PHONE", "+1 555-0100"),
            "email": getattr(settings, "HOSPITAL_ADMIN_EMAIL", "admin@example.com"),
            "address": {
                "street": getattr(settings, "HOSPITAL_ADDRESS", "100 Medical Center Way"),
                "city": "Metropolis",
                "country": "Country",
            },
        },
        "logistics": {
            "defaultCourier": getattr(settings, "DEFAULT_COURIER_PARTNER", "Standard Express 🚚"),
        },
        "branding": {
            "primaryColor": "#1b4332",
        },
        "isActive": True,
    }
