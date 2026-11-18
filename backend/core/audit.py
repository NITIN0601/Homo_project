"""
HIPAA-Compliant Audit Logging, Session Traceability & Alerting Engine.
Logs every clinical request, patient data query, and administrative transaction.
Assigns unique Trace IDs and Conversation/Session IDs for forensic traceability.
"""

import json
import logging
import logging.handlers
import threading
import time
import uuid
from collections.abc import Callable
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from core.config import settings

logger = logging.getLogger("audit")

AUDIT_DIR = Path(__file__).resolve().parent.parent / "data"
AUDIT_DIR.mkdir(parents=True, exist_ok=True)
AUDIT_LOG_FILE = AUDIT_DIR / "audit_traces.jsonl"

_AUDIT_WRITE_LOCK = threading.Lock()  # in-process guard

# Event / Callback pattern to break circular import with services.supabase_service
_alert_callback: Callable[[dict[str, Any]], None] | None = None


def register_alert_callback(cb: Callable[[dict[str, Any]], None]) -> None:
    """Registers an administrative alert callback (e.g. Supabase alert dispatch)."""
    global _alert_callback
    _alert_callback = cb


def trigger_admin_alert(component: str, message: str, details: dict[str, Any] | None = None) -> None:
    """Dispatches admin alert to registered callback or falls back safely."""
    alert_payload = {
        "component": component,
        "message": message,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    if _alert_callback is not None:
        try:
            _alert_callback(alert_payload)
            return
        except Exception as err:
            logger.error(f"Alert callback dispatch failure: {err}")
    # Late import fallback if callback not registered
    try:
        from services.supabase_service import add_admin_alert

        add_admin_alert(component=component, message=message, details=details or {})
    except Exception:
        pass


_audit_logger = logging.getLogger("ehr.audit")
_audit_logger.setLevel(logging.INFO)
if not _audit_logger.handlers:
    # Retain up to 100 backup rotations of 20MB each for enterprise HIPAA audit compliance
    _audit_handler = logging.handlers.RotatingFileHandler(
        filename=str(AUDIT_LOG_FILE),
        maxBytes=20_000_000,
        backupCount=100,
        encoding="utf-8",
    )
    _audit_handler.setFormatter(logging.Formatter("%(message)s"))
    _audit_logger.addHandler(_audit_handler)


def record_audit_entry(entry: dict[str, Any]) -> None:
    """Thread-safe, rotation-aware audit entry writer."""
    try:
        line = json.dumps(entry, default=str)
        with _AUDIT_WRITE_LOCK:
            _audit_logger.info(line)
    except Exception as exc:
        logger.error(f"Failed writing audit entry: {exc}")


def record_clinical_audit_event(
    action: str,
    resource_type: str,
    resource_id: str,
    actor: str,
    hospital_id: str = "default",
    details: dict[str, Any] | None = None,
) -> None:
    """
    HIPAA § 164.312(b) Discrete Clinical Audit Event Logger:
    Logs discrete clinical actions (e.g. EHR view, prescription modification, invoice changes).
    """
    event = {
        "action": action,
        "resource_type": resource_type,
        "resource_id": resource_id,
        "actor": actor,
        "hospital_id": hospital_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "details": details or {},
    }
    record_audit_entry(event)


class AuditTraceMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        trace_id = request.headers.get("X-Trace-ID") or f"trc-{uuid.uuid4().hex[:12]}"
        session_id = request.headers.get("X-Session-ID") or request.headers.get("X-Conversation-ID") or "sess-anonymous"
        hospital_id = (
            request.headers.get("X-Hospital-ID")
            or request.headers.get("X-Tenant-ID")
            or getattr(settings, "DEFAULT_HOSPITAL_ID", "default")
        )
        request.state.hospital_id = hospital_id
        request.state.trace_id = trace_id
        start_time = time.perf_counter()

        # Capture client identity
        auth_header = request.headers.get("Authorization", "")
        user_id = "anonymous"
        user_role = "public"
        if auth_header.startswith("Bearer "):
            try:
                from core.security import verify_access_token

                token = auth_header.split("Bearer ", 1)[1].strip()
                payload = verify_access_token(token)
                if payload:
                    user_id = payload.get("sub") or payload.get("id") or payload.get("email") or "authenticated"
                    user_role = payload.get("role") or "patient"
            except Exception:
                pass

        try:
            response = await call_next(request)
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            # Record audit trace
            entry = {
                "trace_id": trace_id,
                "session_id": session_id,
                "hospital_id": hospital_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "user_id": user_id,
                "user_role": user_role,
                "client_ip": request.client.host if request.client else "unknown",
            }
            record_audit_entry(entry)

            # Trigger real-time administrator alert for PHI access violations or server errors
            if response.status_code == 403:
                trigger_admin_alert(
                    component="phi_security_guard",
                    message=f"Unauthorized PHI access attempt: {request.method} {request.url.path} by user {user_id} (hospital {hospital_id})",
                    details={
                        "trace_id": trace_id,
                        "session_id": session_id,
                        "hospital_id": hospital_id,
                        "ip": entry["client_ip"],
                    },
                )
            elif response.status_code >= 500:
                trigger_admin_alert(
                    component="system_error",
                    message=f"Internal error on {request.method} {request.url.path} (status {response.status_code})",
                    details={"trace_id": trace_id, "session_id": session_id, "hospital_id": hospital_id},
                )

            # Attach trace & tenant headers to client response
            response.headers["X-Trace-ID"] = trace_id
            response.headers["X-Session-ID"] = session_id
            response.headers["X-Hospital-ID"] = hospital_id
            if settings.IS_PRODUCTION:
                response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
            return response

        except Exception as exc:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            entry = {
                "trace_id": trace_id,
                "session_id": session_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "method": request.method,
                "path": request.url.path,
                "status_code": 500,
                "duration_ms": duration_ms,
                "user_id": user_id,
                "user_role": user_role,
                "error": str(exc),
                "client_ip": request.client.host if request.client else "unknown",
            }
            record_audit_entry(entry)
            trigger_admin_alert(
                component="unhandled_exception",
                message=f"Critical exception on {request.method} {request.url.path}: {exc}",
                details={"trace_id": trace_id, "error": str(exc)},
            )
            raise exc
