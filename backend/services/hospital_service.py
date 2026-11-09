"""
Hospital & Clinic Tenant Service.
Provides multi-hospital tenant resolution, branding management, and profile metadata.
Prioritizes backend/data/hospitals.json with seamless future PostgreSQL / Supabase bridging.
"""

import logging
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

    target_id = (hospital_id or getattr(settings, "DEFAULT_HOSPITAL_ID", "agastya")).strip().lower()

    # Match by exact id or slug
    for h in hospitals:
        if h.get("id", "").lower() == target_id or h.get("slug", "").lower() == target_id:
            return h

    # Match by domain or subdomains
    for h in hospitals:
        if h.get("domain", "").lower() == target_id:
            return h
        if target_id in [sub.lower() for sub in h.get("subdomains", [])]:
            return h

    # Fallback to first active hospital or the first available
    active = [h for h in hospitals if h.get("isActive", True)]
    return active[0] if active else hospitals[0]


def get_hospital_by_domain(domain: str) -> dict[str, Any] | None:
    """Finds hospital associated with a custom domain or host subdomain."""
    if not domain:
        return None
    clean_domain = domain.strip().lower()
    for h in get_all_hospitals():
        if h.get("domain", "").lower() == clean_domain:
            return h
        for sub in h.get("subdomains", []):
            if f"{sub}." in clean_domain or clean_domain == sub:
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

    return get_hospital(getattr(settings, "DEFAULT_HOSPITAL_ID", "agastya"))


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


def _fallback_hospital() -> dict[str, Any]:
    """Safety fallback hospital entity if store is completely empty."""
    return {
        "id": "agastya",
        "slug": "agastya",
        "name": getattr(settings, "CLINIC_NAME", "Agastya Classical Homeopathy Clinic"),
        "shortName": getattr(settings, "CLINIC_NAME", "Agastya Clinic"),
        "contact": {
            "phone": getattr(settings, "CLINIC_PHONE", "+91 98450 12345"),
            "email": getattr(settings, "CLINIC_ADMIN_EMAIL", "admin@agastyahomoeo.com"),
            "address": {
                "street": getattr(settings, "CLINIC_ADDRESS", "Malleshwaram"),
                "city": "Bengaluru",
                "country": "India",
            },
        },
        "logistics": {
            "defaultCourier": getattr(settings, "DEFAULT_COURIER_PARTNER", "BlueDart Express 🚚"),
        },
        "branding": {
            "primaryColor": "#1b4332",
        },
        "isActive": True,
    }

