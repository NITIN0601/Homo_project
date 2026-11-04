"""
Local data persistence store for clinic appointments, invoices, blocked dates, and visit summaries.
Synchronizes with shared dev-cache so Frontend (Vite) and Backend (FastAPI) share identical state.
"""

import fcntl
import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any

from core.config import settings

logger = logging.getLogger("data_store")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Ensure primary persistent data directory exists
BACKEND_DATA_DIR.mkdir(parents=True, exist_ok=True)


def _get_primary_path(filename: str) -> Path:
    """Primary Source of Truth (SSOT) on-prem disk store."""
    return BACKEND_DATA_DIR / filename


def load_json(filename: str, default: Any = None) -> Any:
    """
    Loads JSON data prioritizing backend/data as SSOT.
    Protected with shared file lock to prevent reading mid-write.
    """
    primary_path = _get_primary_path(filename)

    if primary_path.exists():
        try:
            with open(primary_path, "r", encoding="utf-8") as f:
                try:
                    fcntl.flock(f.fileno(), fcntl.LOCK_SH)
                    return json.load(f)
                finally:
                    try:
                        fcntl.flock(f.fileno(), fcntl.LOCK_UN)
                    except OSError:
                        pass
        except Exception as exc:
            logger.error(f"Error loading primary data store {primary_path}: {exc}")

    fallback_val = default if default is not None else []
    if default is not None:
        save_json(filename, fallback_val)
    return fallback_val


def save_json(filename: str, data: Any) -> None:
    """
    Persists JSON data to primary backend/data store atomically.
    Uses tempfile + atomic rename (os.replace) with exclusive file lock
    to prevent file corruption under concurrent parallel access.
    """
    primary_path = _get_primary_path(filename)
    dir_name = primary_path.parent
    try:
        # Atomic write pattern: write to temporary file in the same directory, then rename
        with tempfile.NamedTemporaryFile("w", dir=dir_name, delete=False, encoding="utf-8") as tf:
            temp_name = tf.name
            try:
                fcntl.flock(tf.fileno(), fcntl.LOCK_EX)
                json.dump(data, tf, indent=2, default=str)
                tf.flush()
                os.fsync(tf.fileno())
            finally:
                try:
                    fcntl.flock(tf.fileno(), fcntl.LOCK_UN)
                except OSError:
                    pass
        os.replace(temp_name, str(primary_path))
    except Exception as exc:
        logger.error(f"CRITICAL: Failed saving primary data store {primary_path}: {exc}")
        if "temp_name" in locals() and os.path.exists(temp_name):
            try:
                os.remove(temp_name)
            except OSError:
                pass



# ─── Appointments Store ───────────────────────────────────────────────────────

APPOINTMENTS_FILE = "appointments_sync.json"


def get_all_appointments() -> list[dict[str, Any]]:
    return load_json(APPOINTMENTS_FILE, default=[])


def save_appointment(appointment: dict[str, Any]) -> list[dict[str, Any]]:
    current = get_all_appointments()
    # Check if exists to update
    existing_idx = next((i for i, a in enumerate(current) if a.get("id") == appointment.get("id")), None)
    if existing_idx is not None:
        current[existing_idx] = {**current[existing_idx], **appointment}
    else:
        current.insert(0, appointment)
    save_json(APPOINTMENTS_FILE, current)
    return current


def update_appointment_status(appointment_id: str, new_status: str) -> dict[str, Any] | None:
    current = get_all_appointments()
    target = next((a for a in current if a.get("id") == appointment_id), None)
    if target:
        target["status"] = new_status
        save_json(APPOINTMENTS_FILE, current)
        return target
    return None


# ─── Consultation Invoices Store ──────────────────────────────────────────────

INVOICES_FILE = "invoices_sync.json"


def get_all_invoices() -> list[dict[str, Any]]:
    return load_json(INVOICES_FILE, default=[])


def save_invoice(invoice: dict[str, Any]) -> list[dict[str, Any]]:
    current = get_all_invoices()
    existing_idx = next((i for i, inv in enumerate(current) if inv.get("id") == invoice.get("id")), None)
    if existing_idx is not None:
        current[existing_idx] = {**current[existing_idx], **invoice}
    else:
        current.insert(0, invoice)
    save_json(INVOICES_FILE, current)
    return current


def update_invoice(invoice_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    current = get_all_invoices()
    target = next((inv for inv in current if inv.get("id") == invoice_id), None)
    if target:
        target.update(updates)
        save_json(INVOICES_FILE, current)
        return target
    return None


# ─── Blocked Dates Store ──────────────────────────────────────────────────────

BLOCKED_DATES_FILE = "calendar_sync.json"


def get_all_blocked_dates() -> list[dict[str, Any]]:
    return load_json(BLOCKED_DATES_FILE, default=[])


def save_blocked_dates(dates: list[dict[str, Any]]) -> list[dict[str, Any]]:
    save_json(BLOCKED_DATES_FILE, dates)
    return dates


# ─── Visit Summaries Store ────────────────────────────────────────────────────

VISIT_SUMMARIES_FILE = "visits_sync.json"


def get_all_visit_summaries() -> dict[str, Any]:
    return load_json(VISIT_SUMMARIES_FILE, default={})


def save_visit_summary(patient_id: str, visit_record: dict[str, Any]) -> dict[str, Any]:
    current = get_all_visit_summaries()
    patient_file = current.get(patient_id, {
        "patientId": patient_id,
        "patientName": visit_record.get("patientName", "Patient"),
        "visits": []
    })
    visits = patient_file.get("visits", [])
    visits.insert(0, visit_record)
    patient_file["visits"] = visits
    current[patient_id] = patient_file
    save_json(VISIT_SUMMARIES_FILE, current)
    return current


def get_patient_medical_file(patient_id: str) -> dict[str, Any] | None:
    summaries = get_all_visit_summaries()
    if patient_id in summaries:
        return summaries[patient_id]
    # Return placeholder patient record
    return {
        "patientId": patient_id,
        "patientName": f"Patient ({patient_id})",
        "visits": []
    }


def get_patient_prescribed_remedies(patient_id: str) -> list[dict[str, Any]]:
    patient_file = get_patient_medical_file(patient_id)
    if not patient_file or not patient_file.get("visits"):
        return []
    remedies = []
    seen = set()
    for v in patient_file.get("visits", []):
        for rem in v.get("prescribedRemedies", []):
            med_id = rem.get("medicineId") or rem.get("id") or rem.get("medicineName")
            if med_id not in seen:
                seen.add(med_id)
                remedies.append(rem)
    return remedies


# ─── Inventory Store ─────────────────────────────────────────────────────────

INVENTORY_FILE = "inventory_sync.json"


def get_all_inventory() -> list[dict[str, Any]]:
    return load_json(INVENTORY_FILE, default=[])


def update_inventory_item(item_id: str, updates: dict[str, Any]) -> dict[str, Any] | None:
    current = get_all_inventory()
    target = next((item for item in current if item.get("id") == item_id), None)
    if target:
        target.update(updates)
        save_json(INVENTORY_FILE, current)
        return target
    # If not found, add it
    new_item = {"id": item_id, **updates}
    current.append(new_item)
    save_json(INVENTORY_FILE, current)
    return new_item


def restock_inventory_item(item_id: str, qty: int) -> dict[str, Any] | None:
    current = get_all_inventory()
    target = next((item for item in current if item.get("id") == item_id), None)
    if target:
        target["stockQty"] = target.get("stockQty", 0) + qty
        save_json(INVENTORY_FILE, current)
        return target
    return None


# ─── WhatsApp Settings Store ──────────────────────────────────────────────────

WHATSAPP_CONFIG_FILE = "whatsapp_settings.json"


def get_whatsapp_config() -> dict[str, Any]:
    return load_json(WHATSAPP_CONFIG_FILE, default={
        "doctorName": settings.DOCTOR_SHORT_NAME,
        "whatsappNumber": settings.CLINIC_PHONE,
        "autoNotifyRegistration": True,
        "autoNotifyPrescriptions": True,
    })


def save_whatsapp_config(config: dict[str, Any]) -> dict[str, Any]:
    save_json(WHATSAPP_CONFIG_FILE, config)
    return config

