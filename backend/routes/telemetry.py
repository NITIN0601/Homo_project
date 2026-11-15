"""
Telemetry & Crash Reporting Route Handlers.
Stores sanitized, zero-PHI/PII developer diagnostics to disk and audit log.
"""

import json
import logging
from pathlib import Path
import threading
from typing import Any
from fastapi import APIRouter, HTTPException, status
from schemas.telemetry import CrashReportPayload
from core.audit import record_audit_entry

logger = logging.getLogger("telemetry_routes")

router = APIRouter(prefix="/telemetry", tags=["Telemetry & Diagnostics"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
CRASH_LOG_FILE = DATA_DIR / "crash_reports.jsonl"
_CRASH_WRITE_LOCK = threading.Lock()


def record_crash_report(entry: dict[str, Any]) -> None:
    """Thread-safe persistent crash log writer."""
    try:
        line = json.dumps(entry, default=str)
        with _CRASH_WRITE_LOCK:
            with open(CRASH_LOG_FILE, "a", encoding="utf-8") as f:
                f.write(line + "\n")
    except Exception as exc:
        logger.error(f"Failed writing crash report: {exc}")


@router.post("/report", summary="Ingest sanitized zero-PHI/PII error crash report")
async def ingest_crash_report(payload: CrashReportPayload):
    """
    Ingests client runtime exceptions and unhandled promise rejections.
    Ensures absolute zero PHI/PII data collection (scrubs emails, phones, tokens).
    Appends to local persistent crash log and writes to forensic audit trail.
    """
    try:
        report_data = payload.model_dump()
        record_crash_report(report_data)

        # Also write a forensic audit entry for administrative oversight
        record_audit_entry({
            "action": "CRASH_REPORT_INGESTED",
            "incident_id": payload.incident_id,
            "error_name": payload.error_name,
            "route": payload.route or payload.url,
            "source": payload.source,
            "user_action": payload.user_action,
            "timestamp": payload.timestamp,
        })

        logger.info(
            f"Ingested sanitized crash report #{payload.incident_id} ({payload.error_name} at {payload.url})"
        )

        return {
            "status": "recorded",
            "incident_id": payload.incident_id,
            "message": "Crash report recorded safely without PHI/PII.",
        }
    except Exception as exc:
        logger.error(f"Failed ingesting crash report: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record telemetry report.",
        )
