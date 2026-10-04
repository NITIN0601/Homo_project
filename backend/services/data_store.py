"""
Local data persistence store for clinic appointments, invoices, blocked dates, and visit summaries.
Synchronizes with shared dev-cache so Frontend (Vite) and Backend (FastAPI) share identical state.
"""

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("data_store")

ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CACHE_DIR = ROOT_DIR / "node_modules" / ".cache"

# Ensure primary persistent data directory exists
BACKEND_DATA_DIR.mkdir(parents=True, exist_ok=True)
try:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    pass


def _get_primary_path(filename: str) -> Path:
    """Primary Source of Truth (SSOT) on-prem disk store."""
    return BACKEND_DATA_DIR / filename


def _get_cache_mirror_path(filename: str) -> Path:
    """Secondary dev-cache mirror for Vite HMR server."""
    return CACHE_DIR / filename


def load_json(filename: str, default: Any = None) -> Any:
    """
    Loads JSON data prioritizing backend/data as SSOT.
    Gracefully migrates from legacy node_modules/.cache if present.
    """
    primary_path = _get_primary_path(filename)
    cache_path = _get_cache_mirror_path(filename)

    # 1. Check primary SSOT store first
    if primary_path.exists():
        try:
            with open(primary_path, encoding="utf-8") as f:
                return json.load(f)
        except Exception as exc:
            logger.error(f"Error loading primary data store {primary_path}: {exc}")

    # 2. Migration fallback: Check legacy cache mirror if primary didn't exist
    if cache_path.exists():
        try:
            with open(cache_path, encoding="utf-8") as f:
                data = json.load(f)
            # Migrate to primary SSOT
            save_json(filename, data)
            return data
        except Exception as exc:
            logger.error(f"Error loading cache mirror {cache_path}: {exc}")

    fallback_val = default if default is not None else []
    # Seed default into primary store if neither existed
    if default is not None:
        save_json(filename, fallback_val)
    return fallback_val


def save_json(filename: str, data: Any) -> None:
    """
    Persists JSON data to primary backend/data store,
    and mirrors to node_modules/.cache for Vite dev server synchronization.
    """
    primary_path = _get_primary_path(filename)
    try:
        with open(primary_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, default=str)
    except Exception as exc:
        logger.error(f"CRITICAL: Failed saving primary data store {primary_path}: {exc}")

    # Mirror to dev cache if available
    try:
        if CACHE_DIR.exists():
            with open(_get_cache_mirror_path(filename), "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, default=str)
    except Exception as exc:
        logger.debug(f"Note: Could not mirror to dev cache ({exc}), primary store safe.")



# ─── Appointments Store ───────────────────────────────────────────────────────

DEFAULT_APPOINTMENTS = [
  {
    "id": "apt-101",
    "patientId": "usr-001",
    "patientName": "John Doe",
    "patientPhone": "+91 98123 45678",
    "patientEmail": "john@agastyahomoeo.com",
    "date": "Today",
    "time": "10:30 AM",
    "slot": "10:30",
    "type": "In-Person Clinic Visit",
    "chiefReason": "Chronic Dyspepsia & Post-Exertion Soreness",
    "status": "Confirmed",
  },
  {
    "id": "apt-102",
    "patientId": "usr-002",
    "patientName": "Priya Sharma",
    "patientPhone": "+91 99887 76655",
    "patientEmail": "priya@agastyahomoeo.com",
    "date": "Today",
    "time": "11:30 AM",
    "slot": "11:30",
    "type": "Online Tele-Consultation",
    "chiefReason": "Recurrent Migraine & Sleep Disturbance",
    "status": "Confirmed",
  },
  {
    "id": "apt-103",
    "patientId": "usr-003",
    "patientName": "Rajesh Varma",
    "patientPhone": "+91 98203 34567",
    "patientEmail": "rajesh@agastyahomoeo.com",
    "date": "Today",
    "time": "02:30 PM",
    "slot": "14:30",
    "type": "In-Person Clinic Visit",
    "chiefReason": "Allergic Rhinitis & Seasonal Sneezing Modalities",
    "status": "Confirmed",
  },
  {
    "id": "apt-104",
    "patientId": "usr-004",
    "patientName": "Sunita Rao",
    "patientPhone": "+91 98204 45678",
    "patientEmail": "sunita@agastyahomoeo.com",
    "date": "Today",
    "time": "04:15 PM",
    "slot": "16:15",
    "type": "Online Tele-Consultation",
    "chiefReason": "Cervical Spondylosis Stiffness with Weather Aggravation",
    "status": "Pending",
  },
  {
    "id": "apt-105",
    "patientId": "usr-005",
    "patientName": "Amit Patel",
    "patientPhone": "+91 98205 56789",
    "patientEmail": "amit@agastyahomoeo.com",
    "date": "Tomorrow",
    "time": "10:30 AM",
    "slot": "10:30",
    "type": "In-Person Clinic Visit",
    "chiefReason": "Eczematous Rash & Skin Itching at Night",
    "status": "Confirmed",
  },
]

APPOINTMENTS_FILE = "appointments_sync.json"


def get_all_appointments() -> list[dict[str, Any]]:
    return load_json(APPOINTMENTS_FILE, default=DEFAULT_APPOINTMENTS)


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

DEFAULT_INVOICES = [
    {
        "id": "INV-2026-101",
        "patientId": "usr-001",
        "patientName": "John Doe",
        "doctorName": "Dr. Bramarambha K, MD (Homoeopathy)",
        "visitDate": "2026-10-02",
        "amountINR": 750,
        "consultationType": "In-Person Clinic Visit",
        "notes": "Chronic constitutional assessment & acute dyspepsia remedy prescription",
        "status": "pending",
        "issuedAt": "2026-10-02 10:30 AM",
    },
    {
        "id": "INV-2026-102",
        "patientId": "usr-002",
        "patientName": "Priya Sharma",
        "doctorName": "Dr. Bramarambha K, MD (Homoeopathy)",
        "visitDate": "2026-09-28",
        "amountINR": 750,
        "consultationType": "Online Tele-Consultation",
        "notes": "Migraine follow-up review & totality potency adjustment",
        "status": "paid",
        "issuedAt": "2026-09-28 11:45 AM",
        "paidAt": "2026-09-28 12:10 PM",
        "paymentMethod": "upi",
        "transactionRef": "UPI-984210982-IN",
    },
]

INVOICES_FILE = "invoices_sync.json"


def get_all_invoices() -> list[dict[str, Any]]:
    return load_json(INVOICES_FILE, default=DEFAULT_INVOICES)


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


DEFAULT_VISIT_SUMMARIES = {
    "usr-001": {
        "patientId": "usr-001",
        "patientName": "John Doe",
        "age": 34,
        "gender": "Male",
        "bloodGroup": "O+",
        "knownAllergies": ["Dust Mites", "Penicillin"],
        "medicalHistory": ["Chronic Dyspepsia since 2024", "Trauma Soreness (Post-Sports)", "Constitutional Rash"],
        "visits": [
            {
                "id": "vis-101",
                "visitDate": "Sep 15, 2026",
                "doctorName": "Dr. Bramarambha K, MD (Homoeopathy)",
                "clinicBranch": "Tele-Consultation / Bangalore",
                "chiefDiagnosis": "Acute Dyspepsia with Post-Exercise Muscle Fatigue",
                "symptomsObserved": ["Bloating post meals", "Hamstring strain", "Acidity after coffee"],
                "prescribedRemedies": [
                    { "medicineId": "m1", "medicineName": "Arnica Montana", "potency": "30C", "dosage": "4 globules twice daily after meals", "duration": "10 days" },
                    { "medicineId": "m3", "medicineName": "Nux Vomica", "potency": "30C", "dosage": "4 drops post dinner", "duration": "7 days" },
                ],
                "clinicalNotes": "Patient reports improvement in indigestion. Prescribed Arnica 30C for muscular soreness post marathon training. Nux Vomica 30C added for hyperacidity.",
                "lifestyleAdvice": "Avoid caffeine after 6 PM. Drink warm water post meals.",
                "followUpDate": "Oct 15, 2026",
            }
        ]
    }
}


def get_all_visit_summaries() -> dict[str, Any]:
    return load_json(VISIT_SUMMARIES_FILE, default=DEFAULT_VISIT_SUMMARIES)


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

DEFAULT_INVENTORY = [
    {
        "id": "m1",
        "name": "Arnica Montana",
        "potency": "30C",
        "formulation": "Globules",
        "priceINR": 180,
        "category": "Classical Homeopathy",
        "stockQty": 45,
        "reorderQty": 10,
        "supplier": "SBL Pvt Ltd",
        "lastRestocked": "2026-09-20",
        "expiryDate": "2028-03-01",
        "batchNumber": "BTH-M1-2026",
        "isActive": True,
    },
    {
        "id": "m2",
        "name": "Belladonna",
        "potency": "200C",
        "formulation": "Dilution",
        "priceINR": 220,
        "category": "Classical Homeopathy",
        "stockQty": 12,
        "reorderQty": 10,
        "supplier": "Boiron India",
        "lastRestocked": "2026-09-20",
        "expiryDate": "2028-03-01",
        "batchNumber": "BTH-M2-2026",
        "isActive": True,
    },
    {
        "id": "m3",
        "name": "Nux Vomica",
        "potency": "30C",
        "formulation": "Dilution",
        "priceINR": 195,
        "category": "Classical Homeopathy",
        "stockQty": 88,
        "reorderQty": 10,
        "supplier": "Reckeweg India",
        "lastRestocked": "2026-09-20",
        "expiryDate": "2028-03-01",
        "batchNumber": "BTH-M3-2026",
        "isActive": True,
    },
    {
        "id": "m4",
        "name": "Bryonia Alba",
        "potency": "200C",
        "formulation": "Globules",
        "priceINR": 175,
        "category": "Classical Homeopathy",
        "stockQty": 5,
        "reorderQty": 10,
        "supplier": "SBL Pvt Ltd",
        "lastRestocked": "2026-09-20",
        "expiryDate": "2028-03-01",
        "batchNumber": "BTH-M4-2026",
        "isActive": True,
    },
    {
        "id": "m5",
        "name": "Rhus Toxicodendron",
        "potency": "30C",
        "formulation": "Dilution",
        "priceINR": 210,
        "category": "Classical Homeopathy",
        "stockQty": 30,
        "reorderQty": 10,
        "supplier": "Schwabe India",
        "lastRestocked": "2026-09-20",
        "expiryDate": "2028-03-01",
        "batchNumber": "BTH-M5-2026",
        "isActive": True,
    },
    {
        "id": "m6",
        "name": "Arsenicum Album",
        "potency": "200C",
        "formulation": "Globules",
        "priceINR": 240,
        "category": "Classical Homeopathy",
        "stockQty": 67,
        "reorderQty": 10,
        "supplier": "SBL Pvt Ltd",
        "lastRestocked": "2026-09-20",
        "expiryDate": "2028-03-01",
        "batchNumber": "BTH-M6-2026",
        "isActive": True,
    },
    {
        "id": "m7",
        "name": "Lycopodium Clavatum",
        "potency": "1M",
        "formulation": "Dilution",
        "priceINR": 290,
        "category": "Classical Homeopathy",
        "stockQty": 9,
        "reorderQty": 10,
        "supplier": "Reckeweg India",
        "lastRestocked": "2026-09-20",
        "expiryDate": "2028-03-01",
        "batchNumber": "BTH-M7-2026",
        "isActive": True,
    },
    {
        "id": "m8",
        "name": "Pulsatilla Nigricans",
        "potency": "30C",
        "formulation": "Globules",
        "priceINR": 185,
        "category": "Classical Homeopathy",
        "stockQty": 22,
        "reorderQty": 10,
        "supplier": "Schwabe India",
        "lastRestocked": "2026-09-20",
        "expiryDate": "2028-03-01",
        "batchNumber": "BTH-M8-2026",
        "isActive": True,
    },
]

INVENTORY_FILE = "inventory_sync.json"


def get_all_inventory() -> list[dict[str, Any]]:
    return load_json(INVENTORY_FILE, default=DEFAULT_INVENTORY)


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
        "doctorName": "Dr. Bramarambha K",
        "whatsappNumber": "+91 70195 76255",
        "autoNotifyRegistration": True,
        "autoNotifyPrescriptions": True,
    })


def save_whatsapp_config(config: dict[str, Any]) -> dict[str, Any]:
    save_json(WHATSAPP_CONFIG_FILE, config)
    return config

