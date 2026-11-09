# Implementation Plan — Production-Ready Agastya EHR
**Version:** 2.0  
**Based on:** `CODE_AUDIT_AND_PRODUCTION_READINESS.md`  
**Goal:** A fully deployable, vertically-sliced, zero-hardcoding, production-grade clinic EHR  
**Last Updated:** November 9, 2026

---

## Table of Contents
1. [Guiding Principles](#1-guiding-principles)
2. [Phase Overview](#2-phase-overview)
3. [Phase 1 — Critical Hotfixes (Day 1–2)](#3-phase-1--critical-hotfixes-day-12)
4. [Phase 2 — SSOT & Zero-Hardcoding Refactor (Week 1)](#4-phase-2--ssot--zero-hardcoding-refactor-week-1)
5. [Phase 3 — Vertical Slice Architecture Migration (Week 2)](#5-phase-3--vertical-slice-architecture-migration-week-2)
6. [Phase 4 — Feature Enablement Sync Fix (Week 2)](#6-phase-4--feature-enablement-sync-fix-week-2)
7. [Phase 5 — Production Infrastructure (Week 3)](#7-phase-5--production-infrastructure-week-3)
8. [Phase 6 — Test Completion (Week 3–4)](#8-phase-6--test-completion-week-34)
9. [Phase 7 — Deployment Checklist (Week 4)](#9-phase-7--deployment-checklist-week-4)
10. [File Map — Before & After](#10-file-map--before--after)
11. [Environment Variables Master SSOT](#11-environment-variables-master-ssot)
12. [3rd-Party Connection Registry](#12-3rd-party-connection-registry)

---

## 1. Guiding Principles

| Principle | Rule |
|---|---|
| **Zero Hardcoding** | No secrets, URLs, emails, phone numbers, or credentials in source code — all from env vars resolved through `core/config.py` (backend) or `import.meta.env.*` → `src/config/` (frontend) |
| **Single Source of Truth (SSOT)** | Each concept has exactly one definition. All other places import, never re-define. |
| **Vertical Slice Deployment** | Each domain (auth, scheduling, clinical, billing, dispensary, communications, hospital) is a self-contained slice with its own router, service, schema, and test. No cross-slice direct imports. |
| **Feature Flags Are Live** | Admin feature toggles immediately propagate to customer view — no stale state, no hardcoded fallbacks |
| **Config → Env → Runtime** | Configuration flows: `.env` → `core/config.py` Settings class → imported by services. Never `os.getenv()` inside business logic. |

---

## 2. Phase Overview

```
Phase 1 ── Critical Security Hotfixes         Day 1–2      (5 fixes, ~2h)
Phase 2 ── SSOT & Zero-Hardcoding             Week 1       (backend + frontend config refactor)
Phase 3 ── Vertical Slice Architecture        Week 2       (backend restructure to slices/)
Phase 4 ── Feature Enablement Sync Fix        Week 2       (admin toggle → customer view live)
Phase 5 ── Production Infrastructure          Week 3       (rate limiting, pooling, logging)
Phase 6 ── Test Completion                    Week 3–4     (9 missing test suites)
Phase 7 ── Deployment                         Week 4       (Docker, env validation, go-live)
```

---

## 3. Phase 1 — Critical Hotfixes (Day 1–2)

> **These must be fixed before any further development.**

### 3.1 Fix OTP Security — `services/auth_service.py`

**Problem:** `random.randint` is predictable. Hardcoded bypass `123456` is always active.

**Implementation:**
```python
# backend/services/auth_service.py

import secrets  # replace: import random

def generate_otp(email: str) -> str:
    """Generates a cryptographically secure 6-digit OTP (valid 10 mins)."""
    clean_email = validate_email(email)
    otp = str(secrets.randbelow(900000) + 100000)   # 100000–999999, CSPRNG
    expires_at = datetime.now(timezone.utc).timestamp() + 600
    _OTP_CACHE[clean_email] = {"otp": otp, "expires_at": expires_at}
    return otp

def verify_otp_code(email: str, otp: str) -> bool:
    """Verifies a 6-digit OTP. Demo bypass only allowed in mock mode."""
    clean_email = validate_email(email)
    code = otp.strip()

    # Demo bypass: ONLY in explicit mock/dev mode, never in production
    if os.getenv("USE_MOCK_DATA", "false").lower() in ("true", "1") and code == "123456":
        return True

    entry = _OTP_CACHE.get(clean_email)
    if not entry:
        return False
    if datetime.now(timezone.utc).timestamp() > entry.get("expires_at", 0):
        _OTP_CACHE.pop(clean_email, None)
        return False
    if hmac.compare_digest(entry.get("otp", ""), code):   # timing-safe compare
        _OTP_CACHE.pop(clean_email, None)
        return True
    return False
```

### 3.2 JWT Secret Startup Guard — `core/config.py`

**Problem:** Default JWT secret allows token forgery if env var is not set.

**Implementation:**
```python
# backend/core/config.py — add to Settings.__post_init__ or use a module-level guard

import sys

class Settings:
    JWT_SECRET: str = os.getenv("JWT_SECRET", "")

    def __post_init__(self):
        # Validate at import time — crash fast rather than run insecurely
        _insecure_patterns = ["agastya-local", "dummy", "super-secret", "example", "changeme"]
        is_prod = os.getenv("APP_ENV", "development").lower() == "production"
        if is_prod and (
            not self.JWT_SECRET or
            any(p in self.JWT_SECRET.lower() for p in _insecure_patterns)
        ):
            sys.exit(
                "FATAL: JWT_SECRET must be a secure random value in production. "
                "Generate with: python -c \"import secrets; print(secrets.token_hex(64))\""
            )
```

### 3.3 Add File Lock to Audit Log — `core/audit.py`

**Problem:** Concurrent writes to `audit_traces.jsonl` can produce corrupted/interleaved entries.

**Implementation:**
```python
# backend/core/audit.py
import fcntl
import threading

_AUDIT_WRITE_LOCK = threading.Lock()   # in-process guard

def record_audit_entry(entry: dict[str, Any]) -> None:
    """Thread-safe append to audit_traces.jsonl with file lock."""
    try:
        line = json.dumps(entry, default=str)
        with _AUDIT_WRITE_LOCK:
            with open(AUDIT_LOG_FILE, "a", encoding="utf-8") as f:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                try:
                    f.write(line + "\n")
                    f.flush()
                finally:
                    fcntl.flock(f.fileno(), fcntl.LOCK_UN)
    except Exception as exc:
        logger.error("Failed writing audit entry: %s", exc)
```

### 3.4 Fix Duplicate-Module File — `routes/dispensary.py`

**Problem:** `dispensary.py` contains two concatenated modules with two `router` assignments. The second (communications) silently shadows the first.

**Implementation:**
- Confirm `backend/routes/communications.py` already exists as a separate file (it does).
- Delete the concatenated communications section from `backend/routes/dispensary.py` (everything after `# ─── Communications...`).
- Verify `routes/__init__.py` imports `communications_router` from `routes.communications` — it already does.

### 3.5 Fix `_save_accounts` File Lock — `services/auth_service.py`

**Problem:** Plain `open("w")` with no lock causes race condition under concurrent registration.

**Implementation:**
```python
# backend/services/auth_service.py
from services.data_store import save_json  # reuse the atomic writer

def _save_accounts(accounts: dict[str, Any]) -> None:
    """Atomically persists accounts file using the shared SSOT data store."""
    save_json("clinic_accounts.json", accounts)
```

### 3.6 Auto-fix 50 Ruff Violations

```bash
cd /path/to/Project_Suspense
backend/venv/bin/ruff check backend/ --fix
backend/venv/bin/ruff format backend/
# Remaining 6 manual: remove 2nd filter_holidays_by_month, remove dead imports
```

---

## 4. Phase 2 — SSOT & Zero-Hardcoding Refactor (Week 1)

### 4.1 Backend — Unified `core/config.py` as the Only Config SSOT

**Rule:** All env vars are read **once** in `core/config.py`. No `os.getenv()` calls anywhere else in the codebase.

**Current violation locations to fix:**
| File | Violation | Fix |
|---|---|---|
| `services/auth_service.py:8` | `AUTH_SECRET = os.getenv("JWT_SECRET", "...")` | Import `settings.JWT_SECRET` |
| `services/llm_scribe.py` | `os.getenv("GEMINI_API_KEY")` etc. in every function | Add to `Settings`, read from `settings` |
| `services/voicestudio_client.py` | Direct `os.getenv("VOICESTUDIO_URL")` | Add to `Settings.VOICESTUDIO_URL` |
| `main.py:health_check` | `os.getenv("GEMINI_API_KEY")` in route handler | Use `settings.GEMINI_API_KEY` |
| `services/calendar_service.py` | `os.getenv(...)` for calendar ID | Add to `Settings` |
| `routes/scheduling.py` | `settings.CLINIC_PHONE` used directly | Already correct — keep this pattern |

**Updated `core/config.py`:**
```python
"""
Central Configuration SSOT for Agastya EHR Backend.
ALL environment variables are defined and validated HERE.
No other file may call os.getenv() directly.
"""
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# ── Load .env hierarchy ──────────────────────────────────────────────────────
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
load_dotenv(ROOT_DIR / ".env", override=False)       # 1. root defaults
load_dotenv(BACKEND_DIR / ".env", override=True)     # 2. backend overrides

class Settings:
    # ── Environment Mode ─────────────────────────────────────────────────────
    APP_ENV: str               = os.getenv("APP_ENV", "development")  # "production" | "development"
    USE_MOCK_DATA: bool        = os.getenv("USE_MOCK_DATA", "false").lower() in ("true", "1")
    IS_PRODUCTION: bool        = APP_ENV.lower() == "production"

    # ── Project Identity ─────────────────────────────────────────────────────
    PROJECT_NAME: str          = os.getenv("PROJECT_NAME", "Agastya Classical Homeopathy Clinic Engine")
    API_V1_STR: str            = "/api/v1"

    # ── JWT / Auth ───────────────────────────────────────────────────────────
    JWT_SECRET: str            = os.getenv("JWT_SECRET", "")
    JWT_ALGORITHM: str         = "HS256"
    ACCESS_TOKEN_EXPIRE_DAYS: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_DAYS", "7"))

    # ── Supabase / PostgreSQL ─────────────────────────────────────────────────
    SUPABASE_REST_URL: str     = os.getenv("SUPABASE_REST_URL", "http://127.0.0.1:54321/rest/v1").rstrip("/")
    SUPABASE_ANON_KEY: str     = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_KEY: str  = os.getenv("SUPABASE_SERVICE_KEY", "")

    # ── Clinic Identity (all from env, zero hardcoding) ───────────────────────
    DEFAULT_HOSPITAL_ID: str   = os.getenv("DEFAULT_HOSPITAL_ID", "agastya")
    DEFAULT_DOCTOR_ID: str     = os.getenv("DEFAULT_DOCTOR_ID", "doc-001")
    CLINIC_NAME: str           = os.getenv("CLINIC_NAME", "Agastya Classical Homeopathy Clinic")
    CLINIC_DOMAIN: str         = os.getenv("CLINIC_DOMAIN", "agastyahomoeo.com")
    CLINIC_LOCATION: str       = os.getenv("CLINIC_LOCATION", "Bengaluru, India")
    CLINIC_ADDRESS: str        = os.getenv("CLINIC_ADDRESS", "")
    CLINIC_PHONE: str          = os.getenv("CLINIC_PHONE", "")
    CLINIC_ADMIN_EMAIL: str    = os.getenv("CLINIC_ADMIN_EMAIL", "")
    DOCTOR_NAME: str           = os.getenv("DOCTOR_NAME", "")
    DOCTOR_SHORT_NAME: str     = os.getenv("DOCTOR_SHORT_NAME", "")
    DOCTOR_EMAIL: str          = os.getenv("DOCTOR_EMAIL", "")
    DEFAULT_COURIER_PARTNER: str = os.getenv("DEFAULT_COURIER_PARTNER", "BlueDart Express")

    # ── Authorized Admin Emails ───────────────────────────────────────────────
    AUTHORIZED_ADMIN_EMAILS: list[str] = [
        e.strip().lower()
        for e in os.getenv("AUTHORIZED_ADMIN_EMAILS", "").split(",")
        if e.strip()
    ]

    # ── CORS (dynamic, comma-separated in env) ─────────────────────────────
    CORS_ORIGINS: list[str] = [
        o.strip()
        for o in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://localhost:5174,http://localhost:3000"
        ).split(",")
        if o.strip()
    ]

    # ── 3rd-Party API Keys (never hardcoded, always from env) ─────────────────
    GEMINI_API_KEY: str        = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY: str          = os.getenv("GROQ_API_KEY", "")
    OPENAI_API_KEY: str        = os.getenv("OPENAI_API_KEY", "")
    ANTHROPIC_API_KEY: str     = os.getenv("ANTHROPIC_API_KEY", "")
    OLLAMA_ENDPOINT: str       = os.getenv("OLLAMA_ENDPOINT", "http://127.0.0.1:11434")
    RESEND_API_KEY: str        = os.getenv("RESEND_API_KEY", "")
    GOOGLE_CALENDAR_ID: str    = os.getenv("GOOGLE_CALENDAR_ID", "en.indian#holiday@group.v.calendar.google.com")

    # ── Voice Studio / Transcription ─────────────────────────────────────────
    VOICESTUDIO_URL: str       = os.getenv("VOICESTUDIO_URL", "http://127.0.0.1:3900/v1/audio/transcriptions")

    # ── WhatsApp / Communications ────────────────────────────────────────────
    WHATSAPP_BUSINESS_PHONE: str = os.getenv("WHATSAPP_BUSINESS_PHONE", "")
    WHATSAPP_API_TOKEN: str    = os.getenv("WHATSAPP_API_TOKEN", "")

    # ── Rate Limiting ────────────────────────────────────────────────────────
    RATE_LIMIT_AUTH: str       = os.getenv("RATE_LIMIT_AUTH", "5/minute")
    RATE_LIMIT_AI: str         = os.getenv("RATE_LIMIT_AI", "10/minute")
    RATE_LIMIT_UPLOAD: str     = os.getenv("RATE_LIMIT_UPLOAD", "20/minute")

    # ── Startup Validation ───────────────────────────────────────────────────
    def validate_production(self) -> None:
        """Call during app lifespan. Raises RuntimeError for missing production config."""
        if not self.IS_PRODUCTION:
            return
        errors: list[str] = []
        _weak_jwt = ["agastya-local", "dummy", "super-secret", "example", "changeme", ""]
        if any(p in self.JWT_SECRET.lower() for p in _weak_jwt):
            errors.append("JWT_SECRET is missing or uses a weak/default value")
        if not self.SUPABASE_ANON_KEY or "dummy" in self.SUPABASE_ANON_KEY:
            errors.append("SUPABASE_ANON_KEY is missing or uses a placeholder value")
        if not self.AUTHORIZED_ADMIN_EMAILS:
            errors.append("AUTHORIZED_ADMIN_EMAILS must have at least one entry")
        if self.USE_MOCK_DATA:
            errors.append("USE_MOCK_DATA must be false in production")
        if errors:
            raise RuntimeError("Production config validation failed:\n" + "\n".join(f"  • {e}" for e in errors))


settings = Settings()

# Convenience getters (backward compatibility)
def get_supabase_rest_url() -> str:   return settings.SUPABASE_REST_URL
def get_supabase_anon_key() -> str:   return settings.SUPABASE_ANON_KEY
def get_supabase_service_key() -> str: return settings.SUPABASE_SERVICE_KEY
def is_mock_enabled() -> bool:        return settings.USE_MOCK_DATA
```

### 4.2 Backend — Remove All Duplicate Logic

**4.2.1 Merge JWT + hash logic into `core/security.py` only:**

In `services/auth_service.py`:
```python
# REMOVE these local re-implementations:
# - generate_local_jwt() → replace with: from core.security import create_access_token
# - hash_password()      → replace with: from core.security import hash_password
# - verify_password()    → replace with: from core.security import verify_password
# - AUTH_SECRET          → replace with: settings.JWT_SECRET.encode("utf-8") in core/security.py

# Keep in auth_service.py:
# - register_user()
# - authenticate_user()
# - generate_otp() / verify_otp_code()
# - _load_accounts() / _save_accounts()
```

**4.2.2 Move `save_order` into `data_store.py`:**

```python
# In backend/services/data_store.py — add:
ORDERS_FILE = "orders_sync.json"

def get_all_orders() -> list[dict[str, Any]]:
    return load_json(ORDERS_FILE, default=[])

def save_order(order: dict[str, Any]) -> list[dict[str, Any]]:
    current = get_all_orders()
    idx = next((i for i, o in enumerate(current) if o.get("id") == order.get("id")), -1)
    if idx >= 0:
        current[idx] = {**current[idx], **order}
    else:
        current.insert(0, order)
    save_json(ORDERS_FILE, current)
    return current
```

Then `routes/billing.py` imports from `data_store` and removes its local `save_order`.

**4.2.3 Remove `DummySettings` from `supabase_service.py`:**

The try/except import guard in `supabase_service.py` lines 17–28 must be replaced with a direct import:
```python
# REMOVE the try/except DummySettings block entirely.
# Replace with:
from core.config import settings, get_supabase_anon_key, get_supabase_rest_url, get_supabase_service_key
```

**4.2.4 Fix the double function definition in `calendar_service.py`:**

Delete the duplicate `filter_holidays_by_month` on line 289. Keep only the first definition.

### 4.3 Frontend — Zero Hardcoding in `src/config/`

**4.3.1 All environment values via `import.meta.env.*`:**

Create `frontend/.env.example`:
```bash
VITE_APP_ENV=production
VITE_USE_MOCK_DATA=false
VITE_BACKEND_URL=http://localhost:8000/api/v1
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_ANALYTICS_ID=
VITE_SENTRY_DSN=
```

Create `frontend/src/config/env.ts` (new file):
```typescript
/**
 * ─── Environment Configuration SSOT ─────────────────────────────────────────
 * All import.meta.env.VITE_* variables are accessed ONLY here.
 * No other file may read import.meta.env directly.
 */
export const ENV = {
  APP_ENV:          import.meta.env.VITE_APP_ENV ?? "development",
  IS_PRODUCTION:    (import.meta.env.VITE_APP_ENV ?? "development") === "production",
  USE_MOCK_DATA:    (import.meta.env.VITE_USE_MOCK_DATA ?? "true").toLowerCase() === "true",
  BACKEND_URL:      (import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, ""),
  SUPABASE_URL:     import.meta.env.VITE_SUPABASE_URL ?? "http://localhost:54321",
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "",
  GA_ID:            import.meta.env.VITE_GOOGLE_ANALYTICS_ID ?? "",
  SENTRY_DSN:       import.meta.env.VITE_SENTRY_DSN ?? "",
} as const;
```

Update `frontend/src/config/app.ts` to use `ENV`:
```typescript
import { ENV } from "./env";

export const USE_MOCK_DATA = ENV.USE_MOCK_DATA;

export const BACKEND = {
  ENABLED:  !ENV.USE_MOCK_DATA,
  BASE_URL: ENV.BACKEND_URL,
} as const;
```

**4.3.2 Merge the two `fetch` helpers in `api.ts`:**

```typescript
// src/services/api.ts — replace serverFetch and apiFetch with:
async function coreFetch<T>(base: string, path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

// Usage:
const serverFetch = <T>(path: string, opts?: RequestInit) =>
  coreFetch<T>("", path, opts);                 // relative (Vite proxy or nginx)
const apiFetch = <T>(path: string, opts?: RequestInit) =>
  coreFetch<T>(BACKEND.BASE_URL, path, opts);   // FastAPI backend
```

**4.3.3 Remove hardcoded demo token strings:**

```typescript
// In src/config/app.ts — add:
export const MOCK_TOKENS = {
  DEMO_JWT:    "demo-jwt-token-mock",
  DEMO_ADMIN:  "demo-admin-token-mock",
} as const;
```

Replace all `"demo-jwt-token-xyz"` etc. in `api.ts` with `MOCK_TOKENS.DEMO_JWT`.

---

## 5. Phase 3 — Vertical Slice Architecture Migration (Week 2)

### 5.1 Target Directory Structure

```
backend/
├── core/                         # Shared cross-slice infrastructure
│   ├── config.py                 # ← SSOT for all env vars (Phase 2)
│   ├── security.py               # ← JWT, RBAC, PHI guard
│   ├── audit.py                  # ← HIPAA audit middleware
│   ├── dependencies.py           # ← FastAPI shared Depends() functions
│   └── exceptions.py             # ← Custom exception classes
│
├── slices/                       # ← NEW: vertical domain slices
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── router.py             # ← moved from routes/auth.py
│   │   ├── service.py            # ← moved from services/auth_service.py
│   │   ├── schemas.py            # ← moved from schemas/auth.py
│   │   └── tests/
│   │       └── test_auth.py      # ← moved from test/test_auth.py
│   │
│   ├── scheduling/
│   │   ├── __init__.py
│   │   ├── router.py             # ← moved from routes/scheduling.py
│   │   ├── service.py            # ← (calendar + google_calendar + notification_service relevant parts)
│   │   ├── schemas.py            # ← moved from schemas/scheduling.py
│   │   └── tests/
│   │       └── test_scheduling.py
│   │
│   ├── clinical/
│   │   ├── __init__.py
│   │   ├── router.py             # ← moved from routes/clinical_records.py
│   │   ├── service.py            # ← (llm_scribe + audio_manager + jev_service)
│   │   ├── schemas.py            # ← merged from schemas/clinical.py + schemas/case_record.py
│   │   └── tests/
│   │       └── test_clinical.py
│   │
│   ├── billing/
│   │   ├── __init__.py
│   │   ├── router.py             # ← moved from routes/billing.py
│   │   ├── service.py            # ← (payment_validator extracted here)
│   │   ├── schemas.py            # ← moved from schemas/billing.py
│   │   └── tests/
│   │       └── test_billing.py
│   │
│   ├── dispensary/
│   │   ├── __init__.py
│   │   ├── router.py             # ← moved from routes/dispensary.py (clean version)
│   │   ├── service.py            # ← dispensary-specific service logic
│   │   ├── schemas.py            # ← moved from schemas/dispensary.py
│   │   └── tests/
│   │       └── test_dispensary.py
│   │
│   ├── communications/
│   │   ├── __init__.py
│   │   ├── router.py             # ← moved from routes/communications.py
│   │   ├── service.py            # ← (email_service + notification_service)
│   │   ├── schemas.py            # ← moved from schemas/communications.py
│   │   └── tests/
│   │       └── test_communications.py
│   │
│   └── hospital/
│       ├── __init__.py
│       ├── router.py             # ← moved from routes/hospital.py
│       ├── service.py            # ← (hospital_service + doctor_service)
│       ├── schemas.py            # ← (hospital response models)
│       └── tests/
│           └── test_hospital.py
│
├── shared/                       # ← NEW: shared utilities used by multiple slices
│   ├── data_store.py             # ← moved from services/data_store.py
│   ├── supabase.py               # ← moved from services/supabase_service.py
│   └── http_pool.py              # ← NEW: shared httpx client pool
│
├── main.py                       # ← Updated to import from slices/
├── requirements.txt
└── Dockerfile
```

### 5.2 Slice Router Registration Pattern

Each slice follows this exact pattern:

```python
# backend/slices/scheduling/router.py

"""
Scheduling Slice — Router
Owns: appointment booking, slot locking, holiday calendar, blocked dates.
No direct imports from other slices.
Cross-slice data: accessed via shared/data_store.py or shared/supabase.py
"""
from fastapi import APIRouter
from slices.scheduling.service import SchedulingService
from slices.scheduling.schemas import BookAppointmentRequest

router = APIRouter(prefix="/scheduling", tags=["Scheduling & Calendar"])
_svc = SchedulingService()

@router.post("/book-appointment", status_code=201)
async def book_appointment(req: BookAppointmentRequest):
    return await _svc.book(req)
```

### 5.3 `main.py` Slice Assembly

```python
# backend/main.py
from slices.auth.router         import router as auth_router
from slices.scheduling.router   import router as scheduling_router
from slices.clinical.router     import router as clinical_router
from slices.billing.router      import router as billing_router
from slices.dispensary.router   import router as dispensary_router
from slices.communications.router import router as communications_router
from slices.hospital.router     import router as hospital_router

api_router = APIRouter()
api_router.include_router(system_router)
api_router.include_router(auth_router)
api_router.include_router(scheduling_router)
api_router.include_router(clinical_router)
api_router.include_router(dispensary_router)
api_router.include_router(billing_router)
api_router.include_router(communications_router)
api_router.include_router(hospital_router)

app.include_router(api_router, prefix="/api/v1")
app.include_router(api_router, prefix="/api")   # backward-compat alias
```

### 5.4 Shared Data Store — `shared/data_store.py`

The existing `services/data_store.py` moves here with one addition:

```python
# backend/shared/data_store.py

# ADD: orders store (remove from routes/billing.py)
ORDERS_FILE = "orders_sync.json"

def get_all_orders() -> list[dict[str, Any]]:
    return load_json(ORDERS_FILE, default=[])

def save_order(order: dict[str, Any]) -> list[dict[str, Any]]:
    """Generic upsert for orders — reuses the atomic write pattern."""
    return _upsert(ORDERS_FILE, order)

def _upsert(filename: str, item: dict[str, Any]) -> list[dict[str, Any]]:
    """Generic atomic upsert by 'id' field. Avoids repeating the pattern in every service."""
    current = load_json(filename, default=[])
    idx = next((i for i, r in enumerate(current) if r.get("id") == item.get("id")), -1)
    if idx >= 0:
        current[idx] = {**current[idx], **item}
    else:
        current.insert(0, item)
    save_json(filename, current)
    return current
```

### 5.5 Shared HTTP Pool — `shared/http_pool.py`

```python
# backend/shared/http_pool.py
"""
Shared async HTTP client pool for all external service calls.
Prevents creating a new TCP connection per request (Supabase, LLM APIs, etc.)
"""
import httpx
from contextlib import asynccontextmanager

_client: httpx.AsyncClient | None = None

async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=45.0, write=10.0, pool=5.0),
            limits=httpx.Limits(max_connections=30, max_keepalive_connections=15),
        )
    return _client

async def close_client() -> None:
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None
```

Register in `main.py` lifespan:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Agastya EHR Engine...")
    settings.validate_production()       # Phase 2: startup guard
    await get_client()                   # Phase 3: warm the HTTP pool
    try:
        await reconcile_offline_data()
    except Exception as exc:
        logger.warning("Reconciliation deferred: %s", exc)
    yield
    await close_client()                 # Phase 3: drain on shutdown
    logger.info("Agastya EHR Engine shut down cleanly.")
```

---

## 6. Phase 4 — Feature Enablement Sync Fix (Week 2)

### 6.1 Root Cause Analysis

**Problem:** When admin saves feature toggles in `CustomizationTab`, the `ThemeProvider` context updates `localStorage` correctly. However components in the customer view read their own local copy of the feature flag at component mount time and do **not** re-render when the saved tenant config changes.

**Two specific bugs found:**
1. `getSavedTenantOverride()` in `ThemeProvider.tsx` hardcodes `enablePatientMedicalRecords: true` etc. as defaults in the merge spread — this means disabling a feature via admin save then re-loading does NOT respect the saved false value.
2. Components consuming `tenant.features.enableXxx` are wrapped in conditions that never refresh if the toggle changes within the same session without a full page reload.

### 6.2 Fix `getSavedTenantOverride` in `ThemeProvider.tsx`

**Current (broken):**
```typescript
features: {
  displayDoctorDetails: true,          // ← hardcoded truthy default OVERRIDES saved false
  enablePatientMedicalRecords: true,   // ← WRONG
  ...base.features,
  ...(parsed.features || {}),
},
```

**Fix — respect saved values completely:**
```typescript
// ThemeProvider.tsx — getSavedTenantOverride()
features: {
  ...base.features,                    // base defaults FIRST
  ...(parsed.features ?? {}),          // saved values WIN — including false values
},
```

This single change ensures that when an admin disables `enablePatientMedicalRecords`, after saving it stays disabled on reload.

### 6.3 Fix Live-Session Toggle Propagation

**Problem:** Admin toggles a feature, hits Save — `updateTenant()` is called, `localStorage` is written, but components in the customer tab haven't re-rendered.

**Fix — `ThemeProvider.tsx`:** The context value exposes `tenant.features` which is reactive state. As long as all customer components read features via `useTenant().isFeatureEnabled(key)` or `useTenant().tenant.features.xxx`, they will re-render when the context updates.

**Audit all customer-side components for incorrect patterns:**
```typescript
// ❌ WRONG — reads at mount, never updates:
const isEnabled = localStorage.getItem("hospital_tenant_custom_v1_agastya")
  ? JSON.parse(...)?.features?.enableECommerce : true;

// ❌ WRONG — calls hook outside component:
const features = getHospitalTenantById("agastya").features;

// ✅ CORRECT — reactive to context updates:
const { isFeatureEnabled } = useTenant();
if (!isFeatureEnabled("enableECommerce")) return null;
```

**Files to audit and fix:**
- `frontend/src/pages/admin/DispensaryInventoryTab.tsx` — check `enableECommerce` gate
- `frontend/src/pages/AppointmentsPage.tsx` — check `enableTelemedicine` gate
- `frontend/src/components/layout/NavBar.tsx` — check nav item visibility
- `frontend/src/components/layout/BottomNav.tsx` — check mobile nav visibility
- `frontend/src/pages/admin/BillingInvoicesTab.tsx` — check `enableCustomerPayments` gate
- `frontend/src/pages/VisitSummaryPage.tsx` — check `enablePatientMedicalRecords` gate

### 6.4 Add Feature-Gate Hook

Create `frontend/src/hooks/useFeatureGate.ts`:
```typescript
/**
 * useFeatureGate — reactive feature flag hook
 * Returns true if the feature is enabled in the active tenant config.
 * Re-renders automatically when admin saves changes.
 */
import { useTenant } from "../context/ThemeProvider";
import type { HospitalFeatures } from "../types/tenant";

export function useFeatureGate(key: keyof HospitalFeatures): boolean {
  const { isFeatureEnabled } = useTenant();
  return isFeatureEnabled(key);
}

// Usage in any component:
// const canSeeCart = useFeatureGate("enableECommerce");
// if (!canSeeCart) return null;
```

### 6.5 Backend Feature Sync Endpoint

Add a new endpoint so the backend can also enforce feature gates (not just the frontend):

```python
# backend/slices/hospital/router.py

@router.get("/hospitals/{hospital_id}/features", summary="Get active feature flags for hospital")
async def get_hospital_features(hospital_id: str):
    """Returns live feature flag state for the hospital tenant."""
    hospital = get_hospital(hospital_id)
    return {
        "hospital_id": hospital_id,
        "features": hospital.get("features", {}),
        "updated_at": hospital.get("updatedAt"),
    }

@router.patch("/hospitals/{hospital_id}/features", summary="Update feature flags (admin only)")
async def update_hospital_features(
    hospital_id: str,
    features: dict[str, bool],
    user: dict = Depends(require_admin_role),
):
    """Admin-only: Atomically updates feature flags and persists to hospital tenant config."""
    hospital = get_hospital(hospital_id)
    current_features = hospital.get("features", {})
    updated_features = {**current_features, **features}
    save_hospital({**hospital, "features": updated_features, "updatedAt": datetime.now(timezone.utc).isoformat()})
    return {"status": "updated", "hospital_id": hospital_id, "features": updated_features}
```

### 6.6 Persist Feature State to Backend on Admin Save

Update `CustomizationTab.tsx` save handler to also POST to the backend:

```typescript
// In CustomizationTab.tsx — handleCustomerViewSave():
const handleCustomerViewSave = async () => {
  // 1. Update local ThemeProvider context (immediate UI response)
  updateTenantFeatures(changedFeatures);
  
  // 2. Persist to backend so all sessions see the update (not just this browser)
  if (BACKEND.ENABLED) {
    try {
      await apiFetch(`/hospitals/${tenant.id}/features`, {
        method: "PATCH",
        body: JSON.stringify(changedFeatures),
      });
    } catch (err) {
      console.warn("Feature flag backend sync failed — changes saved locally only:", err);
    }
  }
  
  setSaveSuccessMsg("Customer view preferences saved and synced.");
};
```

---

## 7. Phase 5 — Production Infrastructure (Week 3)

### 7.1 API Rate Limiting

Install: add `slowapi==0.2.0` to `requirements.txt`

```python
# backend/core/dependencies.py — add:
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address)

def rate_limit_handler(request, exc: RateLimitExceeded):
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded. Please wait and try again.", "retry_after": str(exc.limit)},
    )
```

Apply to sensitive routes:
```python
# slices/auth/router.py
from core.dependencies import limiter

@router.post("/login")
@limiter.limit(settings.RATE_LIMIT_AUTH)
async def login(req: LoginRequest, request: Request): ...

# slices/clinical/router.py
@router.post("/ai/parse-homeopathy")
@limiter.limit(settings.RATE_LIMIT_AI)
async def parse_homeopathy(req: TextParseRequest, request: Request): ...
```

Register in `main.py`:
```python
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from core.dependencies import limiter

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
```

### 7.2 Audit Log Rotation

```python
# backend/core/audit.py — replace static file open with rotating handler:
import logging.handlers

_audit_logger = logging.getLogger("agastya.audit")
_audit_logger.setLevel(logging.INFO)
_audit_handler = logging.handlers.TimedRotatingFileHandler(
    filename=str(AUDIT_LOG_FILE),
    when="midnight",
    backupCount=30,          # 30-day local retention
    encoding="utf-8",
    utc=True,
)
_audit_logger.addHandler(_audit_handler)

def record_audit_entry(entry: dict[str, Any]) -> None:
    """Thread-safe, rotation-aware audit entry writer."""
    _audit_logger.info(json.dumps(entry, default=str))
```

### 7.3 Distributed Booking Lock

Replace `threading.Lock` with PostgreSQL advisory lock via Supabase:

```python
# backend/slices/scheduling/service.py

async def _acquire_slot_lock(slot_key: str, timeout_seconds: int = 5) -> bool:
    """
    Acquires a PostgreSQL session-level advisory lock for the given slot.
    Uses pg_try_advisory_lock (non-blocking). Returns True if lock acquired.
    Works across all Uvicorn workers and Kubernetes pods sharing the same DB.
    """
    lock_id = abs(hash(slot_key)) % (2**31)   # positive 32-bit int
    client = await get_client()
    try:
        res = await client.post(
            f"{settings.SUPABASE_REST_URL}/rpc/try_acquire_slot_lock",
            json={"lock_id": lock_id},
            headers=get_headers(use_service_role=True),
        )
        return res.status_code == 200 and res.json() is True
    except Exception:
        return False   # degrade gracefully — fall back to in-process lock
```

Add to `db/schema.sql`:
```sql
-- Advisory lock helper function
CREATE OR REPLACE FUNCTION try_acquire_slot_lock(lock_id integer)
RETURNS boolean AS $$
  SELECT pg_try_advisory_xact_lock($1);
$$ LANGUAGE sql;
```

### 7.4 Docker Compose Production Volumes

Update `infra/docker-compose.yml` backend service:
```yaml
backend:
  volumes:
    - ../backend/data:/app/data
    - recordings_data:/app/data/recordings      # ← explicit persistent recording volume
    - watermarks_data:/app/data/watermarks      # ← explicit persistent watermark volume
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health"]
    interval: 15s
    timeout: 5s
    retries: 3
    start_period: 20s

volumes:
  db_data:
  storage_data:
  recordings_data:      # ← new
  watermarks_data:      # ← new
```

### 7.5 Readiness Probe Endpoint

```python
# backend/main.py — add to system_router:
_startup_complete = False

@system_router.get("/health/ready", summary="Readiness probe — returns 200 only after reconciliation")
async def readiness_probe():
    if not _startup_complete:
        raise HTTPException(status_code=503, detail="Server is initializing")
    return {"status": "ready"}

# In lifespan(), after reconciliation:
global _startup_complete
_startup_complete = True
```

---

## 8. Phase 6 — Test Completion (Week 3–4)

### 8.1 Add `test/conftest.py`

```python
# test/conftest.py — shared setup, eliminates boilerplate from every test file
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
```

### 8.2 New Test Files Required

| Test File | Tests Required |
|---|---|
| `test/test_data_store.py` | Concurrent `save_json` / `load_json` under 10 threads; atomic write validation |
| `test/test_sanitize.py` | `sanitize_safe_id` with `../`, null bytes, Unicode; `sanitize_patient_context` with 10+ phone/email patterns |
| `test/test_audio_manager.py` | `merge_overlapping_transcripts` — empty list, single segment, full overlap, partial overlap, no overlap |
| `test/test_jwt_expiry.py` | Expired token returns `None`; token with 1-second expiry; tampered payload rejected |
| `test/test_otp_security.py` | OTP is 6 digits, is numeric, demo bypass only in mock mode, expiry enforcement |
| `test/test_config_validation.py` | Production mode with weak JWT raises `RuntimeError`; all required vars present |
| `test/test_feature_flags.py` | Backend feature toggle endpoint returns updated flags; admin-only enforcement |
| `test/test_audit_lock.py` | 50 concurrent audit writes produce exactly 50 newline-separated JSON entries |
| `test/test_payment_dispatch.py` | `PaymentValidator.validate_payment("card", ...)` auto-detects Visa vs Mastercard |

### 8.3 Frontend Test Expansion

Add to `frontend/src/test/`:

| Test File | Coverage |
|---|---|
| `FeatureGate.test.tsx` | `useFeatureGate("enableECommerce")` reflects context changes |
| `ApiClient.test.ts` | `coreFetch` adds auth header; throws on 4xx/5xx; falls back correctly |
| `Validation.test.ts` | All `validateEmail`, `validatePhone`, `validateFullName` edge cases |
| `CustomizationTab.test.tsx` | Toggle save updates ThemeProvider; disabled feature hides component |

---

## 9. Phase 7 — Deployment Checklist (Week 4)

### 9.1 Environment Files

**Root `.env.production`** (never commit — template from `.env.example`):
```bash
# ── Application Mode ─────────────────────────────────────────────────────────
APP_ENV=production
USE_MOCK_DATA=false

# ── Security (generate with: python -c "import secrets; print(secrets.token_hex(64))")
JWT_SECRET=<64-char-hex-generated-secret>
POSTGRES_PASSWORD=<strong-db-password>

# ── Supabase ─────────────────────────────────────────────────────────────────
SUPABASE_REST_URL=http://kong:8000/rest/v1
SUPABASE_ANON_KEY=<real-anon-jwt-from-supabase>
SUPABASE_SERVICE_KEY=<real-service-role-jwt>

# ── Clinic Identity ───────────────────────────────────────────────────────────
DEFAULT_HOSPITAL_ID=agastya
CLINIC_NAME=Agastya Classical Homeopathy Clinic
CLINIC_DOMAIN=agastyahomoeo.com
CLINIC_ADDRESS=No. 10/2, 2nd Temple Road, Malleshwaram, Bengaluru – 560003
CLINIC_PHONE=+91 98450 XXXXX
CLINIC_ADMIN_EMAIL=admin@agastyahomoeo.com
DOCTOR_NAME=Dr. Bramarambha K, MD (Homoeopathy)
DOCTOR_SHORT_NAME=Dr. Bramarambha K
DOCTOR_EMAIL=doctor@agastyahomoeo.com
DEFAULT_COURIER_PARTNER=BlueDart Express

# ── Admin Emails ──────────────────────────────────────────────────────────────
AUTHORIZED_ADMIN_EMAILS=admin@agastyahomoeo.com,doctor@agastyahomoeo.com

# ── CORS ─────────────────────────────────────────────────────────────────────
CORS_ORIGINS=https://agastyahomoeo.com,https://www.agastyahomoeo.com,http://localhost:5173

# ── 3rd-Party APIs ────────────────────────────────────────────────────────────
GEMINI_API_KEY=<your-gemini-key>
GROQ_API_KEY=<your-groq-key>
RESEND_API_KEY=<your-resend-key>
GOOGLE_CALENDAR_ID=en.indian#holiday@group.v.calendar.google.com
VOICESTUDIO_URL=http://127.0.0.1:3900/v1/audio/transcriptions

# ── WhatsApp Business ─────────────────────────────────────────────────────────
WHATSAPP_BUSINESS_PHONE=+91XXXXXXXXXX
WHATSAPP_API_TOKEN=<your-wa-token>

# ── Rate Limiting ─────────────────────────────────────────────────────────────
RATE_LIMIT_AUTH=5/minute
RATE_LIMIT_AI=10/minute
RATE_LIMIT_UPLOAD=20/minute
```

**Frontend `.env.production`**:
```bash
VITE_APP_ENV=production
VITE_USE_MOCK_DATA=false
VITE_BACKEND_URL=https://api.agastyahomoeo.com/api/v1
VITE_SUPABASE_URL=https://api.agastyahomoeo.com
VITE_SUPABASE_ANON_KEY=<real-anon-key>
```

### 9.2 Pre-Deploy Validation Script

Create `scripts/validate_env.py`:
```python
"""
Run before every production deployment.
Verifies all required env vars are present and non-default.
"""
import os, sys
from dotenv import load_dotenv
load_dotenv(".env")

REQUIRED = {
    "JWT_SECRET": lambda v: len(v) >= 32 and "agastya-local" not in v,
    "SUPABASE_ANON_KEY": lambda v: len(v) > 20 and "dummy" not in v,
    "SUPABASE_SERVICE_KEY": lambda v: len(v) > 20 and "dummy" not in v,
    "CLINIC_ADMIN_EMAIL": lambda v: "@" in v,
    "AUTHORIZED_ADMIN_EMAILS": lambda v: len(v) > 5,
    "GEMINI_API_KEY": lambda v: len(v) > 10,
}

errors = []
for key, validator in REQUIRED.items():
    val = os.getenv(key, "")
    if not val or not validator(val):
        errors.append(f"  ✗ {key}: missing or invalid")
    else:
        print(f"  ✓ {key}: OK")

if errors:
    print("\nDeployment blocked — fix these env vars:\n" + "\n".join(errors))
    sys.exit(1)
print("\n✅ All environment variables validated. Safe to deploy.")
```

### 9.3 Deployment Steps (Docker Compose)

```bash
# 1. Validate environment
python scripts/validate_env.py

# 2. Run ruff and all tests
backend/venv/bin/ruff check backend/
cd backend && python -m pytest ../test/ -v --tb=short

# 3. Build and deploy
docker compose -f infra/docker-compose.yml --env-file .env.production up -d --build

# 4. Wait for readiness
until curl -sf http://localhost:8000/api/v1/health/ready; do sleep 2; done
echo "Backend ready"

# 5. Verify health
curl http://localhost:8000/api/v1/health
curl http://localhost:8000/api/v1/config/status
```

---

## 10. File Map — Before & After

| Before | After | Action |
|---|---|---|
| `backend/routes/auth.py` | `backend/slices/auth/router.py` | Move |
| `backend/routes/scheduling.py` | `backend/slices/scheduling/router.py` | Move |
| `backend/routes/clinical_records.py` | `backend/slices/clinical/router.py` | Move |
| `backend/routes/billing.py` | `backend/slices/billing/router.py` | Move |
| `backend/routes/dispensary.py` | `backend/slices/dispensary/router.py` | Move (remove comms concat) |
| `backend/routes/communications.py` | `backend/slices/communications/router.py` | Move |
| `backend/routes/hospital.py` | `backend/slices/hospital/router.py` | Move |
| `backend/services/auth_service.py` | `backend/slices/auth/service.py` | Move + dedup JWT |
| `backend/services/calendar_service.py` | `backend/slices/scheduling/service.py` | Move + fix F811 |
| `backend/services/llm_scribe.py` | `backend/slices/clinical/service.py` | Move + use settings |
| `backend/services/audio_manager.py` | `backend/slices/clinical/audio.py` | Move |
| `backend/services/typesafe_jev_service.py` | `backend/slices/clinical/jev.py` | Move + fix UP006 |
| `backend/services/payment_validator.py` | `backend/slices/billing/validator.py` | Move |
| `backend/services/hospital_service.py` | `backend/slices/hospital/service.py` | Move + fix unused imports |
| `backend/services/doctor_service.py` | `backend/slices/hospital/doctor.py` | Move + fix unused imports |
| `backend/services/email_service.py` | `backend/slices/communications/email.py` | Move |
| `backend/services/notification_service.py` | `backend/slices/communications/notifications.py` | Move |
| `backend/services/voicestudio_client.py` | `backend/slices/clinical/voicestudio.py` | Move |
| `backend/services/data_store.py` | `backend/shared/data_store.py` | Move + add `save_order` |
| `backend/services/supabase_service.py` | `backend/shared/supabase.py` | Move + remove DummySettings |
| `backend/schemas/auth.py` | `backend/slices/auth/schemas.py` | Move |
| `backend/schemas/billing.py` | `backend/slices/billing/schemas.py` | Move |
| `backend/schemas/clinical.py` | `backend/slices/clinical/schemas.py` | Move |
| `backend/schemas/case_record.py` | `backend/slices/clinical/case_record.py` | Move |
| `backend/schemas/communications.py` | `backend/slices/communications/schemas.py` | Move |
| `backend/schemas/dispensary.py` | `backend/slices/dispensary/schemas.py` | Move |
| `backend/schemas/scheduling.py` | `backend/slices/scheduling/schemas.py` | Move |
| `test/test_auth.py` | `backend/slices/auth/tests/test_auth.py` | Move |
| `test/test_appointments.py` | `backend/slices/scheduling/tests/test_scheduling.py` | Move |
| `test/test_payment_validator.py` | `backend/slices/billing/tests/test_billing.py` | Move + fix import |
| `test/test_concurrent_booking.py` | `backend/slices/scheduling/tests/test_concurrency.py` | Move |
| `test/test_ehr.py` | `backend/slices/clinical/tests/test_clinical.py` | Move |
| `test/test_end_to_end_scenarios.py` | `backend/tests/test_e2e.py` | Keep at root (cross-slice) |
| `test/test_load_100_users.py` | `backend/tests/test_load.py` | Keep at root (cross-slice) |
| `test/test_route_protection.py` | `backend/tests/test_security.py` | Keep at root (cross-slice) |
| `frontend/src/services/api.ts` | Same location — merge `serverFetch`/`apiFetch` | Edit |
| `frontend/src/config/app.ts` | Same location — use `ENV` from `env.ts` | Edit |
| `frontend/src/config/env.ts` | **NEW** — VITE env SSOT | Create |
| `frontend/src/hooks/useFeatureGate.ts` | **NEW** — reactive feature gate hook | Create |
| `frontend/.env.example` | Updated with all VITE_* vars | Edit |

---

## 11. Environment Variables Master SSOT

> Every variable below must exist in `.env.example` and be documented here. Backend reads via `core/config.py`. Frontend reads via `src/config/env.ts`.

### Backend Variables

| Variable | Required in Prod | Default (Dev) | Description |
|---|---|---|---|
| `APP_ENV` | ✅ | `development` | `production` or `development` |
| `USE_MOCK_DATA` | ✅ (must be false) | `false` | Mock data mode — must be `false` in production |
| `JWT_SECRET` | ✅ | *(none)* | 64-char hex secret for token signing |
| `SUPABASE_REST_URL` | ✅ | `http://127.0.0.1:54321/rest/v1` | PostgREST endpoint |
| `SUPABASE_ANON_KEY` | ✅ | *(none)* | Supabase anon JWT |
| `SUPABASE_SERVICE_KEY` | ✅ | *(none)* | Supabase service-role JWT |
| `POSTGRES_PASSWORD` | ✅ | `agastya_local_secure_pwd_2026` | DB password |
| `DEFAULT_HOSPITAL_ID` | ⬜ | `agastya` | Active tenant slug |
| `DEFAULT_DOCTOR_ID` | ⬜ | `doc-001` | Primary doctor ID |
| `CLINIC_NAME` | ✅ | *(none)* | Official clinic name |
| `CLINIC_DOMAIN` | ✅ | *(none)* | Primary domain (e.g. `agastyahomoeo.com`) |
| `CLINIC_ADDRESS` | ✅ | *(none)* | Physical address string |
| `CLINIC_PHONE` | ✅ | *(none)* | Contact phone |
| `CLINIC_ADMIN_EMAIL` | ✅ | *(none)* | Primary admin email |
| `DOCTOR_NAME` | ✅ | *(none)* | Full doctor name + title |
| `DOCTOR_SHORT_NAME` | ✅ | *(none)* | Display name |
| `DOCTOR_EMAIL` | ✅ | *(none)* | Doctor contact email |
| `AUTHORIZED_ADMIN_EMAILS` | ✅ | *(none)* | Comma-separated admin emails |
| `CORS_ORIGINS` | ✅ | `http://localhost:5173,...` | Comma-separated allowed origins |
| `DEFAULT_COURIER_PARTNER` | ⬜ | `BlueDart Express` | Display name for logistics |
| `GEMINI_API_KEY` | ⬜* | *(none)* | Google Gemini API key |
| `GROQ_API_KEY` | ⬜* | *(none)* | Groq API key |
| `OPENAI_API_KEY` | ⬜* | *(none)* | OpenAI API key |
| `ANTHROPIC_API_KEY` | ⬜* | *(none)* | Anthropic Claude API key |
| `OLLAMA_ENDPOINT` | ⬜* | `http://127.0.0.1:11434` | Ollama local LLM endpoint |
| `RESEND_API_KEY` | ⬜ | *(none)* | Resend email API key |
| `GOOGLE_CALENDAR_ID` | ⬜ | `en.indian#holiday@group.v.calendar.google.com` | Holiday calendar ID |
| `VOICESTUDIO_URL` | ⬜ | `http://127.0.0.1:3900/v1/audio/transcriptions` | Local voice transcription |
| `WHATSAPP_BUSINESS_PHONE` | ⬜ | *(none)* | WhatsApp Business number |
| `WHATSAPP_API_TOKEN` | ⬜ | *(none)* | WhatsApp Business API token |
| `RATE_LIMIT_AUTH` | ⬜ | `5/minute` | Auth rate limit per IP |
| `RATE_LIMIT_AI` | ⬜ | `10/minute` | AI parsing rate limit |
| `RATE_LIMIT_UPLOAD` | ⬜ | `20/minute` | Upload rate limit |
| `ACCESS_TOKEN_EXPIRE_DAYS` | ⬜ | `7` | JWT expiry |

*At least one LLM key required for voice AI features.

### Frontend Variables (VITE_*)

| Variable | Required in Prod | Default (Dev) | Description |
|---|---|---|---|
| `VITE_APP_ENV` | ✅ | `development` | App environment mode |
| `VITE_USE_MOCK_DATA` | ✅ | `true` | `false` to connect to live backend |
| `VITE_BACKEND_URL` | ✅ | `http://localhost:8000/api/v1` | FastAPI base URL |
| `VITE_SUPABASE_URL` | ⬜ | `http://localhost:54321` | Supabase gateway URL |
| `VITE_SUPABASE_ANON_KEY` | ⬜ | *(none)* | Supabase anon JWT for client SDK |
| `VITE_GOOGLE_ANALYTICS_ID` | ⬜ | *(none)* | GA4 measurement ID |
| `VITE_SENTRY_DSN` | ⬜ | *(none)* | Sentry error tracking DSN |

---

## 12. 3rd-Party Connection Registry

> All external service connections defined here. Each entry maps to a `core/config.py` setting.

| Service | Purpose | Config Key | Used In |
|---|---|---|---|
| **Supabase PostgREST** | Patient records, appointments, inventory, hashes | `SUPABASE_REST_URL` + `SUPABASE_ANON_KEY` | `shared/supabase.py` |
| **GoTrue (Supabase Auth)** | Local user authentication (alternative path) | *(uses same SUPABASE_REST_URL gateway)* | Not yet integrated — Phase 2 decision |
| **Google Gemini** | AI clinical scribe (primary LLM) | `GEMINI_API_KEY` | `slices/clinical/service.py` |
| **Groq (Llama 3.3)** | AI clinical scribe (fast alt LLM) | `GROQ_API_KEY` | `slices/clinical/service.py` |
| **OpenAI GPT-4o** | AI clinical scribe (GPT alt) | `OPENAI_API_KEY` | `slices/clinical/service.py` |
| **Anthropic Claude** | AI clinical scribe (Claude alt) | `ANTHROPIC_API_KEY` | `slices/clinical/service.py` |
| **Ollama** | Local self-hosted LLM (air-gapped) | `OLLAMA_ENDPOINT` | `slices/clinical/service.py` |
| **VoiceStudio** | Local Whisper audio transcription | `VOICESTUDIO_URL` | `slices/clinical/voicestudio.py` |
| **Resend** | Transactional email (appointments, invoices) | `RESEND_API_KEY` | `slices/communications/email.py` |
| **Google Calendar ICS** | Indian public holiday feed | `GOOGLE_CALENDAR_ID` | `slices/scheduling/service.py` |
| **WhatsApp Business** | Appointment & prescription notifications | `WHATSAPP_API_TOKEN` + `WHATSAPP_BUSINESS_PHONE` | `slices/communications/notifications.py` |
| **Kong API Gateway** | Single-port Supabase service mesh | *(internal Docker network)* | `infra/docker-compose.yml` |

### Connection Validation at Startup

```python
# backend/slices/hospital/service.py — add startup check:
async def validate_external_connections() -> dict[str, bool]:
    """Called from lifespan. Returns connection health for each 3rd-party service."""
    results = {}
    client = await get_client()

    # Supabase
    try:
        r = await client.get(settings.SUPABASE_REST_URL, headers=get_headers())
        results["supabase"] = r.status_code < 500
    except Exception:
        results["supabase"] = False

    # VoiceStudio
    try:
        r = await client.get(settings.VOICESTUDIO_URL.replace("/transcriptions", "/health"))
        results["voicestudio"] = r.status_code == 200
    except Exception:
        results["voicestudio"] = False

    # LLM keys present (connectivity not tested to avoid cost)
    results["gemini_key_set"] = bool(settings.GEMINI_API_KEY)
    results["groq_key_set"] = bool(settings.GROQ_API_KEY)
    results["resend_key_set"] = bool(settings.RESEND_API_KEY)

    return results
```

Expose via `/api/v1/health` endpoint:
```python
@system_router.get("/health")
async def health_check():
    connections = await validate_external_connections()
    return {
        "status": "healthy",
        "app_env": settings.APP_ENV,
        "use_mock_data": settings.USE_MOCK_DATA,
        "connections": connections,
        "architecture": "Vertical Slice v3.0",
    }
```

---

*Implementation Plan v2.0 — Agastya EHR*  
*Cross-reference: [`CODE_AUDIT_AND_PRODUCTION_READINESS.md`](./CODE_AUDIT_AND_PRODUCTION_READINESS.md) · [`ARCHITECTURE.md`](./ARCHITECTURE.md)*

