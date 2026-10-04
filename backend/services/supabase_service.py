"""
Local Self-Hosted Supabase Service Client for On-Premise Clinic.
Communicates with the local Docker Compose PostgREST endpoint (port 54321)
with robust local disk fallback, reconciliation against split-brain persistence,
and active administrator alerting on network connection drops and malformed queries.
"""

import json
import logging
import os
import uuid
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import httpx

# Ensure environment configuration is initialized
try:
    from services.config import (
        get_supabase_anon_key,
        get_supabase_rest_url,
        get_supabase_service_key,
    )
except ImportError:
    def get_supabase_rest_url() -> str:
        return os.getenv("SUPABASE_REST_URL", "http://127.0.0.1:54321/rest/v1")
    def get_supabase_anon_key() -> str:
        return os.getenv("SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy")
    def get_supabase_service_key() -> str:
        return os.getenv("SUPABASE_SERVICE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy_service")

logger = logging.getLogger("supabase_service")

# Local fallback data store if Supabase container is launching or offline
FALLBACK_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "supabase_fallback"
FALLBACK_DATA_DIR.mkdir(parents=True, exist_ok=True)
RECORDS_FILE = FALLBACK_DATA_DIR / "patient_records.json"
HASHES_FILE = FALLBACK_DATA_DIR / "uploaded_file_hashes.json"

# In-Memory Administrative Alert Registry (tracks query errors & drops)
_ADMIN_ALERTS: list[dict[str, Any]] = []
_MAX_ALERTS = 100
_LAST_RECONCILIATION_TIME: str | None = None


def record_admin_alert(
    level: str,
    component: str,
    message: str,
    details: dict[str, Any] | None = None
) -> dict[str, Any]:
    """
    Registers an actionable system alert for clinic administrators.
    Never swallows errors silently; logs them with full context and preserves audit history.
    """
    alert = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": level.upper(),  # "INFO", "WARNING", "ERROR", "CRITICAL"
        "component": component,
        "message": message,
        "details": details or {}
    }
    _ADMIN_ALERTS.insert(0, alert)
    if len(_ADMIN_ALERTS) > _MAX_ALERTS:
        _ADMIN_ALERTS.pop()

    log_msg = f"[{component}] {message}"
    if details:
        log_msg += f" | Details: {details}"

    if level.upper() in ("ERROR", "CRITICAL"):
        logger.error(log_msg)
    elif level.upper() == "WARNING":
        logger.warning(log_msg)
    else:
        logger.info(log_msg)

    return alert


def get_admin_alerts(limit: int = 50) -> list[dict[str, Any]]:
    """Retrieves recent alerts for administrator review."""
    return _ADMIN_ALERTS[:limit]


def clear_admin_alerts() -> None:
    """Clears administrative alerts."""
    _ADMIN_ALERTS.clear()


def get_rest_url() -> str:
    return get_supabase_rest_url()


def get_headers(use_service_role: bool = False) -> dict[str, str]:
    key = get_supabase_service_key() if use_service_role else get_supabase_anon_key()
    return {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }


def _load_fallback(file_path: Path) -> list[dict[str, Any]]:
    if not file_path.exists():
        return []
    try:
        with open(file_path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        record_admin_alert(
            level="ERROR",
            component="fallback_storage",
            message=f"Corrupt or unreadable fallback file: {file_path.name}",
            details={"error": str(exc), "path": str(file_path)}
        )
        return []


def _save_fallback(file_path: Path, data: list[dict[str, Any]]) -> None:
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as exc:
        record_admin_alert(
            level="CRITICAL",
            component="fallback_storage",
            message=f"Failed to persist fallback file: {file_path.name}",
            details={"error": str(exc), "path": str(file_path)}
        )


async def check_supabase_health() -> dict[str, Any]:
    """Probes Supabase PostgREST endpoint to detect online/offline status."""
    url = f"{get_rest_url()}/"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(url, headers=get_headers())
            is_online = res.status_code in (200, 404, 301, 302)
            return {
                "online": is_online,
                "status_code": res.status_code,
                "endpoint": get_rest_url()
            }
    except Exception as exc:
        return {
            "online": False,
            "error": str(exc),
            "endpoint": get_rest_url()
        }


# ─── Anti-Spam Cryptographic Hash Validation ──────────────────────────────────

async def check_and_insert_file_hash(
    file_hash: str,
    file_name: str | None = None,
    file_size_bytes: int | None = None,
    uploaded_by: str = "mobile_worker"
) -> dict[str, Any]:
    """
    Checks if an image/snapshot SHA-256 hash already exists.
    If it exists (Postgres unique constraint 23505), raises a ValueError(DUPLICATE_HASH).
    If new, inserts into uploaded_file_hashes and returns the record.
    """
    url = f"{get_rest_url()}/uploaded_file_hashes"
    payload = {
        "file_hash": file_hash,
        "file_name": file_name,
        "file_size_bytes": file_size_bytes,
        "uploaded_by": uploaded_by
    }

    synced_to_supabase = False
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.post(url, json=payload, headers=get_headers())
            if res.status_code in (200, 201):
                records = res.json()
                synced_to_supabase = True
                result = records[0] if isinstance(records, list) and records else payload
                # Also record locally with _synced=True
                _record_hash_locally(result, synced=True)
                return result
            elif res.status_code == 409 or "23505" in res.text or "duplicate" in res.text.lower():
                raise ValueError("DUPLICATE_HASH: This identical image has already been uploaded.")
            else:
                record_admin_alert(
                    level="ERROR",
                    component="supabase_anti_spam",
                    message=f"Supabase returned HTTP {res.status_code} during hash registration",
                    details={"status_code": res.status_code, "body": res.text[:200], "hash": file_hash}
                )
    except ValueError:
        raise
    except httpx.RequestError as exc:
        record_admin_alert(
            level="WARNING",
            component="supabase_connection",
            message=f"Supabase unreachable during hash verification: {exc}. Using local fallback.",
            details={"error": str(exc), "hash": file_hash}
        )

    # Local Fallback check
    hashes = _load_fallback(HASHES_FILE)
    for h in hashes:
        if h.get("file_hash") == file_hash:
            raise ValueError("DUPLICATE_HASH: This identical image has already been uploaded.")

    new_entry = {
        "id": str(uuid.uuid4()),
        "file_hash": file_hash,
        "file_name": file_name,
        "file_size_bytes": file_size_bytes,
        "uploaded_by": uploaded_by,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "_synced": synced_to_supabase,
    }
    hashes.append(new_entry)
    _save_fallback(HASHES_FILE, hashes)
    return new_entry


def _record_hash_locally(record: dict[str, Any], synced: bool = True) -> None:
    hashes = _load_fallback(HASHES_FILE)
    file_hash = record.get("file_hash")
    existing = next((h for h in hashes if h.get("file_hash") == file_hash), None)
    if existing:
        existing["_synced"] = synced
    else:
        entry = dict(record)
        entry["_synced"] = synced
        hashes.append(entry)
    _save_fallback(HASHES_FILE, hashes)


# ─── Patient EHR Records ──────────────────────────────────────────────────────

async def insert_patient_record(
    patient_name: str,
    homeopathic_analysis: dict[str, Any],
    visiting_date: str | None = None,
    local_audio_path: str | None = None,
    prescription_image_path: str | None = None
) -> dict[str, Any]:
    """
    Inserts a consultation record into public.patient_records.
    GIN index on homeopathic_analysis will index the JSONB payload.
    Synchronizes across both Supabase and on-prem local fallback store.
    """
    record_id = str(uuid.uuid4())
    v_date = visiting_date or str(date.today())
    payload = {
        "id": record_id,
        "patient_name": patient_name,
        "visiting_date": v_date,
        "local_audio_path": local_audio_path,
        "prescription_image_path": prescription_image_path,
        "homeopathic_analysis": homeopathic_analysis,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    url = f"{get_rest_url()}/patient_records"
    synced_to_supabase = False

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.post(url, json=payload, headers=get_headers(use_service_role=True))
            if res.status_code in (200, 201):
                records = res.json()
                synced_to_supabase = True
                if isinstance(records, list) and records:
                    payload = records[0]
            else:
                record_admin_alert(
                    level="ERROR",
                    component="supabase_ehr",
                    message=f"Supabase returned HTTP {res.status_code} during patient record insert",
                    details={"status_code": res.status_code, "body": res.text[:200], "patient_name": patient_name}
                )
    except httpx.RequestError as exc:
        record_admin_alert(
            level="WARNING",
            component="supabase_connection",
            message=f"Supabase connection dropped/offline during patient record insert: {exc}. Persisting to local fallback.",
            details={"error": str(exc), "patient_name": patient_name}
        )

    # Local fallback storage with explicit sync tracking (SSOT)
    local_record = dict(payload)
    local_record["_synced"] = synced_to_supabase
    local_record["synced_at"] = datetime.now(timezone.utc).isoformat() if synced_to_supabase else None

    records = _load_fallback(RECORDS_FILE)
    # Check if existing by ID
    existing_idx = next((i for i, r in enumerate(records) if r.get("id") == record_id), None)
    if existing_idx is not None:
        records[existing_idx] = local_record
    else:
        records.insert(0, local_record)
    _save_fallback(RECORDS_FILE, records)

    return payload


async def fetch_patient_records(is_mobile_view: bool = False) -> list[dict[str, Any]]:
    """
    Fetches records, reconciling split-brain between live Supabase and local fallback.
    If is_mobile_view is True, drops raw local_audio_path and prescription_image_path.
    """
    target = "mobile_patient_view" if is_mobile_view else "patient_records"
    url = f"{get_rest_url()}/{target}?select=*&order=created_at.desc"

    supabase_online = False
    supabase_records: list[dict[str, Any]] = []

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get(url, headers=get_headers(use_service_role=not is_mobile_view))
            if res.status_code == 200:
                supabase_records = res.json()
                supabase_online = True
            else:
                record_admin_alert(
                    level="ERROR",
                    component="supabase_ehr",
                    message=f"Supabase query returned HTTP {res.status_code}",
                    details={"status_code": res.status_code, "body": res.text[:200]}
                )
    except httpx.RequestError as exc:
        record_admin_alert(
            level="WARNING",
            component="supabase_connection",
            message=f"Supabase connection dropped or unavailable: {exc}. Serving patient records from local fallback.",
            details={"error": str(exc)}
        )

    fallback_records = _load_fallback(RECORDS_FILE)

    if supabase_online:
        # Reconcile split-brain: Check if any fallback records were created offline and are missing from Supabase
        supabase_ids = {r.get("id") for r in supabase_records if r.get("id")}
        un_synced_fallback = [r for r in fallback_records if r.get("id") not in supabase_ids]

        if un_synced_fallback:
            logger.info("Found %d offline records not yet in Supabase. Merging to prevent split-brain.", len(un_synced_fallback))
            # Merge to return complete dataset
            combined = list(un_synced_fallback) + list(supabase_records)
        else:
            combined = supabase_records
    else:
        combined = fallback_records

    if is_mobile_view:
        # Strip local file paths to enforce mobile security
        sanitized = []
        for r in combined:
            item = dict(r)
            item.pop("local_audio_path", None)
            item.pop("prescription_image_path", None)
            item.pop("_synced", None)
            sanitized.append(item)
        return sanitized

    # Clean internal metadata flags from public return
    cleaned = []
    for r in combined:
        item = dict(r)
        item.pop("_synced", None)
        cleaned.append(item)
    return cleaned


# ─── Supabase Appointments Integration ────────────────────────────────────────

async def sync_appointment_to_supabase(appointment: dict[str, Any]) -> dict[str, Any] | None:
    """
    Saves or syncs an appointment to public.appointments table in Supabase.
    Logs actionable errors on network failure rather than silently swallowing.
    """
    url = f"{get_rest_url()}/appointments"
    payload = {
        "patient_name": appointment.get("patientName", "Patient"),
        "patient_email": appointment.get("patientEmail", "patient@agastyahomoeo.com"),
        "patient_phone": appointment.get("patientPhone", "+91 98765 43210"),
        "start_time": appointment.get("createdAt") or datetime.now(timezone.utc).isoformat(),
        "end_time": datetime.now(timezone.utc).isoformat(),
        "doctor_title": appointment.get("doctorName", "Dr. Bramarambha K, MD (Homoeopathy)"),
        "status": appointment.get("status", "Confirmed").lower(),
        "calendar_sync_requested": True,
    }

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.post(url, json=payload, headers=get_headers())
            if res.status_code in (200, 201):
                records = res.json()
                return records[0] if isinstance(records, list) and records else payload
            else:
                record_admin_alert(
                    level="ERROR",
                    component="supabase_appointments",
                    message=f"Supabase appointment sync returned HTTP {res.status_code}",
                    details={"status_code": res.status_code, "body": res.text[:200], "patient": payload["patient_name"]}
                )
    except httpx.RequestError as exc:
        record_admin_alert(
            level="WARNING",
            component="supabase_connection",
            message=f"Supabase appointment sync connection dropped: {exc}",
            details={"error": str(exc), "patient": payload["patient_name"]}
        )
    except Exception as exc:
        record_admin_alert(
            level="ERROR",
            component="supabase_appointments",
            message=f"Unexpected error syncing appointment: {exc}",
            details={"error": str(exc)}
        )
    return None


def format_supabase_appointment(item: dict[str, Any]) -> dict[str, Any]:
    """Formats Supabase appointments record into camelCase clinic format."""
    st = item.get("start_time", "")
    date_val = "Today"
    time_val = "10:00 AM"
    slot_val = "10:00"
    if "T" in str(st):
        parts = st.split("T")
        date_val = parts[0]
        time_part = parts[1][:5]
        slot_val = time_part
        try:
            h, m = int(time_part.split(":")[0]), int(time_part.split(":")[1])
            period = "AM" if h < 12 else "PM"
            h_12 = h % 12 or 12
            time_val = f"{h_12:02d}:{m:02d} {period}"
        except Exception:
            time_val = time_part

    return {
        "id": str(item.get("id")),
        "patientId": item.get("patient_id") or f"usr-{str(item.get('id'))[:6]}",
        "patientName": item.get("patient_name", "Patient"),
        "patientPhone": item.get("patient_phone", "+91 98765 43210"),
        "patientEmail": item.get("patient_email", "patient@agastyahomoeo.com"),
        "date": item.get("date") or date_val,
        "time": item.get("time") or time_val,
        "slot": item.get("slot") or slot_val,
        "type": item.get("type", "In-Person Clinic Visit"),
        "chiefReason": item.get("chief_reason", "Clinical Consultation"),
        "status": (item.get("status") or "Confirmed").capitalize(),
        "doctorName": item.get("doctor_title", "Dr. Bramarambha K, MD (Homoeopathy)"),
        "createdAt": item.get("created_at") or st,
    }


def format_supabase_inventory(item: dict[str, Any]) -> dict[str, Any]:
    """Formats Supabase inventory table record into camelCase medicine item."""
    return {
        "id": str(item.get("id")),
        "name": item.get("name"),
        "potency": item.get("potency", "30C"),
        "formulation": item.get("formulation", "Globules"),
        "priceINR": float(item.get("price_inr") or item.get("priceINR", 180)),
        "category": item.get("category", "Classical Homeopathy"),
        "stockQty": int(item.get("stock_qty") or item.get("stockQty", 50)),
        "reorderQty": int(item.get("reorder_qty") or item.get("reorderQty", 10)),
        "supplier": item.get("supplier", "SBL Pvt Ltd"),
        "lastRestocked": str(item.get("last_restocked") or item.get("lastRestocked", "")),
        "expiryDate": str(item.get("expiry_date") or item.get("expiryDate", "")),
        "batchNumber": item.get("batch_number") or item.get("batchNumber", ""),
        "isActive": bool(item.get("is_active", True) if item.get("is_active") is not None else item.get("isActive", True)),
    }


async def fetch_appointments_from_supabase() -> list[dict[str, Any]]:
    """Fetches appointments list from Supabase as Priority 1."""
    url = f"{get_rest_url()}/appointments?select=*&order=created_at.desc"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(url, headers=get_headers())
            if res.status_code == 200:
                raw_list = res.json()
                if isinstance(raw_list, list) and raw_list:
                    return [format_supabase_appointment(a) for a in raw_list]
            else:
                record_admin_alert(
                    level="ERROR",
                    component="supabase_appointments",
                    message=f"Failed to fetch appointments from Supabase: HTTP {res.status_code}",
                    details={"status_code": res.status_code, "body": res.text[:200]}
                )
    except httpx.RequestError as exc:
        record_admin_alert(
            level="WARNING",
            component="supabase_connection",
            message=f"Supabase connection dropped while fetching appointments: {exc}",
            details={"error": str(exc)}
        )
    except Exception as exc:
        record_admin_alert(
            level="ERROR",
            component="supabase_appointments",
            message=f"Unexpected error fetching appointments: {exc}",
            details={"error": str(exc)}
        )
    return []


async def update_appointment_status_in_supabase(appointment_id: str, new_status: str) -> dict[str, Any] | None:
    """Updates appointment status in Supabase as Priority 1."""
    url = f"{get_rest_url()}/appointments?id=eq.{appointment_id}"
    payload = {"status": new_status.lower()}
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.patch(url, json=payload, headers=get_headers())
            if res.status_code in (200, 204):
                if res.text:
                    records = res.json()
                    return format_supabase_appointment(records[0]) if isinstance(records, list) and records else None
                return {"id": appointment_id, "status": new_status}
            else:
                record_admin_alert(
                    level="ERROR",
                    component="supabase_appointments",
                    message=f"Failed to update appointment {appointment_id} in Supabase: HTTP {res.status_code}",
                    details={"status_code": res.status_code, "body": res.text[:200]}
                )
    except Exception as exc:
        record_admin_alert(
            level="WARNING",
            component="supabase_connection",
            message=f"Supabase update appointment status failed: {exc}",
            details={"error": str(exc), "appointment_id": appointment_id}
        )
    return None


# ─── Supabase Dispensary Inventory Integration (Priority 1) ───────────────────

async def fetch_inventory_from_supabase() -> list[dict[str, Any]]:
    """Fetches dispensary inventory from Supabase as Priority 1."""
    url = f"{get_rest_url()}/inventory?select=*&order=id.asc"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.get(url, headers=get_headers())
            if res.status_code == 200:
                raw_items = res.json()
                if isinstance(raw_items, list) and raw_items:
                    return [format_supabase_inventory(i) for i in raw_items]
            else:
                record_admin_alert(
                    level="ERROR",
                    component="supabase_inventory",
                    message=f"Failed to fetch inventory from Supabase: HTTP {res.status_code}",
                    details={"status_code": res.status_code, "body": res.text[:200]}
                )
    except httpx.RequestError as exc:
        record_admin_alert(
            level="WARNING",
            component="supabase_connection",
            message=f"Supabase connection dropped while fetching inventory: {exc}",
            details={"error": str(exc)}
        )
    except Exception as exc:
        record_admin_alert(
            level="ERROR",
            component="supabase_inventory",
            message=f"Unexpected error fetching inventory from Supabase: {exc}",
            details={"error": str(exc)}
        )
    return []


async def sync_inventory_to_supabase(item: dict[str, Any]) -> dict[str, Any] | None:
    """Saves or updates inventory item in Supabase public.inventory table."""
    url = f"{get_rest_url()}/inventory"
    payload = {
        "id": item.get("id"),
        "name": item.get("name"),
        "potency": item.get("potency", "30C"),
        "formulation": item.get("formulation", "Globules"),
        "price_inr": item.get("priceINR", item.get("price_inr", 180)),
        "category": item.get("category", "Classical Homeopathy"),
        "stock_qty": item.get("stockQty", item.get("stock_qty", 50)),
        "reorder_qty": item.get("reorderQty", item.get("reorder_qty", 10)),
        "supplier": item.get("supplier", "SBL Pvt Ltd"),
        "batch_number": item.get("batchNumber", item.get("batch_number", f"BTH-{item.get('id', 'MED').upper()}")),
        "is_active": item.get("isActive", item.get("is_active", True)),
    }

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.post(url, json=payload, headers=get_headers())
            if res.status_code in (200, 201):
                return payload
            else:
                record_admin_alert(
                    level="ERROR",
                    component="supabase_inventory",
                    message=f"Supabase inventory sync failed with HTTP {res.status_code}",
                    details={"status_code": res.status_code, "body": res.text[:200], "item_id": item.get("id")}
                )
    except httpx.RequestError as exc:
        record_admin_alert(
            level="WARNING",
            component="supabase_connection",
            message=f"Supabase inventory sync connection dropped: {exc}",
            details={"error": str(exc), "item_id": item.get("id")}
        )
    except Exception as exc:
        record_admin_alert(
            level="ERROR",
            component="supabase_inventory",
            message=f"Unexpected error syncing inventory: {exc}",
            details={"error": str(exc), "item_id": item.get("id")}
        )
    return None


async def update_inventory_item_in_supabase(item_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    """Updates an inventory item in Supabase as Priority 1."""
    url = f"{get_rest_url()}/inventory?id=eq.{item_id}"
    payload: dict[str, Any] = {}
    if "name" in updates:
        payload["name"] = updates["name"]
    if "potency" in updates:
        payload["potency"] = updates["potency"]
    if "formulation" in updates:
        payload["formulation"] = updates["formulation"]
    if "priceINR" in updates or "price_inr" in updates:
        payload["price_inr"] = updates.get("priceINR", updates.get("price_inr"))
    if "stockQty" in updates or "stock_qty" in updates:
        payload["stock_qty"] = updates.get("stockQty", updates.get("stock_qty"))
    if "reorderQty" in updates or "reorder_qty" in updates:
        payload["reorder_qty"] = updates.get("reorderQty", updates.get("reorder_qty"))
    if "category" in updates:
        payload["category"] = updates["category"]
    if "supplier" in updates:
        payload["supplier"] = updates["supplier"]
    if "isActive" in updates or "is_active" in updates:
        payload["is_active"] = updates.get("isActive", updates.get("is_active"))

    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            res = await client.patch(url, json=payload, headers=get_headers())
            if res.status_code in (200, 204):
                if res.text:
                    records = res.json()
                    return format_supabase_inventory(records[0]) if isinstance(records, list) and records else None
                return payload
            else:
                record_admin_alert(
                    level="ERROR",
                    component="supabase_inventory",
                    message=f"Failed to update inventory item {item_id} in Supabase: HTTP {res.status_code}",
                    details={"status_code": res.status_code, "body": res.text[:200]}
                )
    except Exception as exc:
        record_admin_alert(
            level="WARNING",
            component="supabase_connection",
            message=f"Supabase update inventory failed: {exc}",
            details={"error": str(exc), "item_id": item_id}
        )
    return None



# ─── Automated Reconciliation Engine (Split-Brain Prevention) ─────────────────

async def reconcile_offline_data() -> dict[str, Any]:
    """
    Reconciles all un-synced fallback records and hashes with Supabase when Supabase comes online.
    Solves split-brain persistence by guaranteeing eventual consistency.
    """
    global _LAST_RECONCILIATION_TIME
    health = await check_supabase_health()
    if not health.get("online"):
        return {
            "status": "deferred",
            "message": "Supabase container is currently offline or unreachable. Reconciliation deferred.",
            "health": health
        }

    records_synced = 0
    hashes_synced = 0
    errors: list[str] = []

    # 1. Reconcile Patient Records
    records = _load_fallback(RECORDS_FILE)
    records_updated = False
    for r in records:
        if not r.get("_synced", False):
            payload = {k: v for k, v in r.items() if not k.startswith("_")}
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.post(
                        f"{get_rest_url()}/patient_records",
                        json=payload,
                        headers=get_headers(use_service_role=True)
                    )
                    if res.status_code in (200, 201, 409):
                        r["_synced"] = True
                        r["synced_at"] = datetime.now(timezone.utc).isoformat()
                        records_synced += 1
                        records_updated = True
                    else:
                        errors.append(f"Record {r.get('id')}: HTTP {res.status_code}")
            except Exception as exc:
                errors.append(f"Record {r.get('id')}: {exc!s}")

    if records_updated:
        _save_fallback(RECORDS_FILE, records)

    # 2. Reconcile File Hashes
    hashes = _load_fallback(HASHES_FILE)
    hashes_updated = False
    for h in hashes:
        if not h.get("_synced", False):
            payload = {
                "file_hash": h.get("file_hash"),
                "file_name": h.get("file_name"),
                "file_size_bytes": h.get("file_size_bytes"),
                "uploaded_by": h.get("uploaded_by")
            }
            try:
                async with httpx.AsyncClient(timeout=4.0) as client:
                    res = await client.post(
                        f"{get_rest_url()}/uploaded_file_hashes",
                        json=payload,
                        headers=get_headers()
                    )
                    if res.status_code in (200, 201, 409) or "23505" in res.text:
                        h["_synced"] = True
                        h["synced_at"] = datetime.now(timezone.utc).isoformat()
                        hashes_synced += 1
                        hashes_updated = True
                    else:
                        errors.append(f"Hash {h.get('file_hash')}: HTTP {res.status_code}")
            except Exception as exc:
                errors.append(f"Hash {h.get('file_hash')}: {exc!s}")

    if hashes_updated:
        _save_fallback(HASHES_FILE, hashes)

    _LAST_RECONCILIATION_TIME = datetime.now(timezone.utc).isoformat()

    record_admin_alert(
        level="INFO",
        component="reconciliation_engine",
        message=f"Reconciliation cycle executed: {records_synced} records and {hashes_synced} hashes reconciled with Supabase.",
        details={"records_synced": records_synced, "hashes_synced": hashes_synced, "errors": errors}
    )

    return {
        "status": "success",
        "records_synced": records_synced,
        "hashes_synced": hashes_synced,
        "errors": errors,
        "reconciled_at": _LAST_RECONCILIATION_TIME
    }


def get_sync_status() -> dict[str, Any]:
    """Provides current synchronization and health status indicators for administrators."""
    records = _load_fallback(RECORDS_FILE)
    hashes = _load_fallback(HASHES_FILE)

    pending_records = sum(1 for r in records if not r.get("_synced", False))
    pending_hashes = sum(1 for h in hashes if not h.get("_synced", False))

    return {
        "endpoint": get_rest_url(),
        "total_fallback_records": len(records),
        "pending_sync_records": pending_records,
        "total_fallback_hashes": len(hashes),
        "pending_sync_hashes": pending_hashes,
        "last_reconciliation_time": _LAST_RECONCILIATION_TIME,
        "active_alerts_count": len(_ADMIN_ALERTS),
        "recent_alerts": _ADMIN_ALERTS[:5]
    }
