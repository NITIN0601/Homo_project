"""
FastAPI Server: Classical Homeopathy Voice & EHR Engine
Modular Vertical Slice Architecture (Production & Multi-Worker Ready)
Features:
  • Self-Hosted Supabase / PostgreSQL Local Storage Integration
  • Google Gemini 2.5 Flash Free AI Parsing Loop
  • Anti-Spam Cryptographic Hash Validation (prevents duplicate camera uploads)
  • Mobile Restrictive View (drops local audio and image paths for Wi-Fi mobile clients)
  • 1-2 Hour audio streaming with SHA-256 integrity and HMAC-SHA256 watermarks
  • 100+ Concurrent User Concurrency Isolation
"""

import logging
import traceback
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from core.audit import AuditTraceMiddleware, record_audit_entry
from core.config import get_supabase_rest_url, is_mock_enabled, settings
from core.dependencies import RateLimitExceeded, limiter, rate_limit_handler
from fastapi import APIRouter, FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes.auth import router as auth_router
from routes.billing import router as billing_router
from routes.clinical_records import router as clinical_router
from routes.communications import router as communications_router
from routes.dispensary import router as dispensary_router
from routes.hospital import router as hospital_router
from routes.scheduling import router as scheduling_router
from routes.telemetry import record_crash_report
from routes.telemetry import router as telemetry_router
from schemas.telemetry import scrub_phi_pii
from services.supabase_service import (
    check_supabase_health,
    clear_admin_alerts,
    get_admin_alerts,
    get_sync_status,
    reconcile_offline_data,
)
from services.supabase_service import (
    sync_appointment_to_supabase as sync_appointment_to_supabase,  # Exported for test patching parity
)
from shared.http_pool import close_client, get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("main")

_startup_complete = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _startup_complete
    logger.info("Initializing Multi-Tenant EHR Healthcare Platform Engine...")
    settings.validate_production()
    await get_client()
    logger.info("Database URL: %s", settings.SUPABASE_REST_URL)
    logger.info("Mock Mode: %s", is_mock_enabled())
    try:
        reconcile_res = await reconcile_offline_data()
        logger.info("Startup offline data reconciliation: %s", reconcile_res)
    except Exception as exc:
        logger.warning("Supabase reconciliation deferred: %s", exc)
    _startup_complete = True
    yield
    await close_client()
    logger.info("Shutting down EHR Platform Engine cleanly.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Classical Homeopathy AI Scribe, Patient Records & High-Concurrency Dispensary Engine",
    version="2.0.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)


@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    """
    Catches all unhandled server exceptions, strips any PHI/PII, and logs to
    disk telemetry and forensic audit trail without leaking sensitive patient data.
    """
    if isinstance(exc, HTTPException):
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    incident_id = f"inc-be-{uuid.uuid4().hex[:10]}"
    tb = traceback.format_exc()
    sanitized_tb = scrub_phi_pii(tb)
    sanitized_msg = scrub_phi_pii(str(exc))
    clean_path = scrub_phi_pii(request.url.path)

    report_data = {
        "incident_id": incident_id,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "error_name": type(exc).__name__,
        "error_message": sanitized_msg,
        "stack_trace": sanitized_tb,
        "component_stack": None,
        "url": clean_path,
        "route": clean_path,
        "device": {
            "screen_width": 0,
            "screen_height": 0,
            "user_agent": scrub_phi_pii(request.headers.get("user-agent", "server")),
            "language": scrub_phi_pii(request.headers.get("accept-language", "en")),
            "platform": "backend-python",
            "online": True,
        },
        "location": {
            "timezone": "UTC",
            "locale": "en-US",
        },
        "source": f"backend_unhandled:{request.method}:{clean_path}",
        "user_action": "server_unhandled_exception",
    }

    record_crash_report(report_data)
    record_audit_entry(
        {
            "action": "SERVER_UNHANDLED_EXCEPTION",
            "incident_id": incident_id,
            "error_name": type(exc).__name__,
            "route": clean_path,
            "method": request.method,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )

    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected server error occurred.",
            "incident_id": incident_id,
            "message": "This issue has been safely recorded for our engineering team without storing any personal or clinical information.",
        },
    )


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Forensic Audit & Traceability Middleware
app.add_middleware(AuditTraceMiddleware)

# Core System & Sync Router
system_router = APIRouter(tags=["System Health & Sync"])


@system_router.get("/health/ready", summary="Readiness probe — returns 200 only after reconciliation")
async def readiness_probe():
    if not _startup_complete:
        raise HTTPException(status_code=503, detail="Server is initializing")
    return {"status": "ready"}


@system_router.get("/health")
async def health_check():
    gemini_ready = bool(settings.GEMINI_API_KEY)
    return {
        "status": "healthy",
        "service": "Classical Homeopathy Voice & EHR Engine",
        "architecture": "Vertical Slice (v2.0)",
        "pydantic_version": "v2",
        "audio_storage_active": True,
        "forensic_watermark_engine": "HMAC-SHA256 Active",
        "use_mock_data": is_mock_enabled(),
        "gemini_configured": gemini_ready,
        "supabase_endpoint": get_supabase_rest_url(),
    }


@system_router.get("/config/status")
async def get_config_status():
    return {
        "use_mock_data": is_mock_enabled(),
        "gemini_api_key_configured": bool(settings.GEMINI_API_KEY),
        "groq_api_key_configured": bool(settings.GROQ_API_KEY),
        "openai_api_key_configured": bool(settings.OPENAI_API_KEY),
        "anthropic_api_key_configured": bool(settings.ANTHROPIC_API_KEY),
        "supabase_rest_url": get_supabase_rest_url(),
        "voicestudio_url": settings.VOICESTUDIO_URL,
    }


@system_router.get("/sync/status", summary="Get data synchronization status and health metrics")
async def sync_status_endpoint():
    health = await check_supabase_health()
    status_info = get_sync_status()
    return {
        "supabase": health,
        "sync": status_info,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@system_router.post("/sync/reconcile", summary="Trigger manual reconciliation between local disk and Supabase")
async def sync_reconcile_endpoint():
    return await reconcile_offline_data()


@system_router.get("/admin/alerts", summary="Get recent administrative alerts")
async def admin_alerts_endpoint(limit: int = Query(50, ge=1, le=100)):
    alerts = get_admin_alerts(limit=limit)
    return {
        "count": len(alerts),
        "alerts": alerts,
    }


@system_router.delete("/admin/alerts", summary="Clear administrative alerts")
async def clear_admin_alerts_endpoint():
    clear_admin_alerts()
    return {"success": True, "message": "Admin alerts cleared"}


# Master API Router assembling all vertical slices
api_router = APIRouter()
api_router.include_router(system_router)
api_router.include_router(auth_router)
api_router.include_router(scheduling_router)
api_router.include_router(clinical_router)
api_router.include_router(dispensary_router)
api_router.include_router(billing_router)
api_router.include_router(communications_router)
api_router.include_router(hospital_router)
api_router.include_router(telemetry_router)

# Mount Clean API Routers (/api/v1 primary + root /api parity)
app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
