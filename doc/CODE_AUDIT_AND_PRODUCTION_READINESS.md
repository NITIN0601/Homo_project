# Code Audit & Production Readiness Report
**Project:** Agastya Classical Homeopathy EHR  
**Audit Date:** November 9, 2026  
**Scope:** Backend (FastAPI/Python 3.14) · Frontend (React 19/TypeScript) · Infra (Docker/Supabase)

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Code Reusability Analysis](#3-code-reusability-analysis)
4. [Linting & Ruff Analysis (Backend)](#4-linting--ruff-analysis-backend)
5. [Frontend Lint (OXLint)](#5-frontend-lint-oxlint)
6. [Test Coverage & Quality](#6-test-coverage--quality)
7. [Logic & Code Correctness Issues](#7-logic--code-correctness-issues)
8. [Standardization Gaps](#8-standardization-gaps)
9. [Production Scaling Issues](#9-production-scaling-issues)
10. [Security Hardening Checklist](#10-security-hardening-checklist)
11. [Priority Fix Matrix](#11-priority-fix-matrix)

---

## 1. Executive Summary

The codebase is a well-structured, locally-deployable clinical EHR with strong fundamentals:  
✅ Vertical Slice Architecture in routes  
✅ Pydantic v2 validation end-to-end  
✅ HIPAA-aware PHI isolation wall  
✅ HMAC-SHA256 JWT (zero external auth dependency)  
✅ Atomic writes with `fcntl` + `os.replace` for JSON persistence  
✅ 10+ test files covering auth, concurrency, billing, EHR, and E2E  
✅ OTel telemetry imported, Ruff configured, Docker Compose + Kong gateway ready  

However there are **56 ruff violations** (50 auto-fixable), **7 logic/correctness issues**, **4 critical production blockers**, and **12 scaling gaps** that must be resolved before production.

---

## 2. Architecture Overview

```
Project_Suspense/
├── backend/                  # FastAPI + Pydantic v2 (Python 3.14)
│   ├── core/                 # config.py · security.py · audit.py
│   ├── routes/               # Thin HTTP handlers (vertical slices)
│   ├── schemas/              # Pydantic request/response models
│   ├── services/             # Business logic + external integrations
│   └── data/                 # JSON on-disk store (appointments, invoices, etc.)
├── frontend/                 # React 19 + TypeScript + Vite + Tailwind CSS v4
│   └── src/
│       ├── context/          # AppContext SSOT reducer
│       ├── pages/            # Route-level page components
│       ├── components/       # Reusable UI primitives + layout
│       ├── services/api.ts   # Typed API client
│       ├── types/index.ts    # Shared TypeScript types
│       └── utils/            # format · validation · cn · timezone
├── test/                     # Backend unit + integration + load tests
├── db/                       # PostgreSQL schema + seeds
└── infra/                    # Docker Compose · Kong · Nginx
```

---

## 3. Code Reusability Analysis

### 3.1 Backend — What's Reused Well ✅

| Pattern | Location | Description |
|---|---|---|
| `load_json` / `save_json` | `services/data_store.py` | Single atomic I/O SSOT used by all 6 domain stores |
| `scope_items_to_patient_or_admin` | `core/security.py` | PHI filter reused in billing, scheduling, and clinical routes |
| `EMAIL_REGEX` | `core/security.py` | Defined once, imported by `auth_service.py` |
| `get_hospital()` / `get_doctor()` | `hospital_service.py` / `doctor_service.py` | Shared by scheduling and billing routes |
| `verify_access_token` | `core/security.py` | Used by audit middleware AND route dependencies |
| `AuditTraceMiddleware` | `core/audit.py` | Registered once, covers every request globally |
| `HomeopathicCaseRecord` schema | `schemas/case_record.py` | Shared between clinical schema and LLM scribe |

### 3.2 Backend — Duplication Issues ⚠️

| Issue | Files | Detail |
|---|---|---|
| **Duplicate JWT implementation** | `core/security.py` and `services/auth_service.py` | Both implement `generate_local_jwt` with identical HMAC-SHA256 logic. `auth_service.py` should be a thin wrapper calling `core/security.py:create_access_token` only. |
| **Duplicate `hash_password` / `verify_password`** | `core/security.py` and `services/auth_service.py` | Identical PBKDF2 logic defined twice. `auth_service.py` should import from `core.security`. |
| **`filter_holidays_by_month` redefined twice** | `services/calendar_service.py:284–289` | The function is defined on line 284 and immediately redefined on line 289 (`F811` ruff error — dead code). |
| **`save_order` / `save_invoice` pattern** | `routes/billing.py` duplicates `save_appointment` pattern from `data_store.py` | The `save_order` function in billing.py is an inline clone of the generic upsert pattern already in `data_store.py`. It should be factored into `data_store.py` as `save_order(order)`. |
| **Fallback config in `supabase_service.py`** | `services/supabase_service.py` lines 17–28 | Contains a full `DummySettings` class and three inline function overrides in case `core.config` import fails. This guard pattern is unnecessary and creates a hidden second source of config truth. The import error would indicate a broken install, not normal runtime. |

### 3.3 Frontend — What's Reused Well ✅

| Pattern | Location | Description |
|---|---|---|
| Shared TypeScript types | `src/types/index.ts` | Single source for `UserProfile`, `BookedAppointment`, `InventoryItem`, etc. |
| `api.ts` client | `src/services/api.ts` | Unified typed API layer with `serverFetch` / `apiFetch` helpers and localStorage fallback |
| `validation.ts` | `src/utils/validation.ts` | Centralised `validateEmail`, `validatePhone`, `validateFullName` functions |
| `cn()` utility | `src/utils/cn.ts` | Standard `clsx`-style class merger |
| `format.ts` utility | `src/utils/format.ts` | Shared date/currency formatters |
| AppContext Reducer | `src/context/AppContext.tsx` | Full SSOT reducer driving all pages via dispatched actions |
| Component index barrel | `src/components/index.ts` | Clean public export surface |

### 3.4 Frontend — Duplication Issues ⚠️

| Issue | Location | Detail |
|---|---|---|
| **Two `fetch` helpers doing the same thing** | `src/services/api.ts` — `serverFetch` and `apiFetch` | Both add auth header and throw on `!res.ok`. The only difference is the base URL. Should be one `coreFetch(baseUrl, path, options)` function. |
| **Mock data scattered in multiple files** | `src/data/mocks/` with 6 separate files | No consistent type-guard wrapper; some use hardcoded strings where enums from `types/index.ts` exist. |
| **Hardcoded demo token strings** | `api.ts` lines ~60–65 | `"demo-jwt-token-xyz"` and `"demo-token"` as fallback return values should be constants in `src/config.ts`. |

---

## 4. Linting & Ruff Analysis (Backend)

**Configuration:** `ruff.toml` at project root with `line-length = 120`, selects `E, W, F, I, UP, B, C4`.  
**Command run:** `backend/venv/bin/ruff check backend/ --statistics`

### 4.1 Summary Table

| Code | Count | Category | Auto-fixable |
|---|---|---|---|
| `F401` | 18 | Unused imports | ✅ Yes |
| `I001` | 15 | Unsorted imports | ✅ Yes |
| `UP006` | 8 | Use `dict` not `Dict` annotation | ✅ Yes |
| `W293` | 5 | Blank line with whitespace | ✅ Yes |
| `E402` | 2 | Module import not at top of file | ❌ Manual |
| `UP045` | 2 | Use `X \| None` not `Optional[X]` | ✅ Yes |
| `UP015` | 2 | Redundant `open()` mode argument | ✅ Yes |
| `UP012` | 2 | Unnecessary `encoding="utf-8"` to `encode()` | ✅ Yes |
| `UP035` | 1 | Deprecated import (`typing.Dict`) | ❌ Manual |
| `F811` | 1 | Redefined-while-unused (`filter_holidays_by_month`) | ❌ Manual logic fix |
| **Total** | **56** | | **50 auto-fixable** |

### 4.2 Notable File-Level Findings

**`backend/services/typesafe_jev_service.py`** — Most violations (10 errors):
- Uses `typing.Dict` (deprecated since Python 3.9)
- Uses `Optional[X]` instead of `X | None`
- Unsorted imports

**`backend/services/calendar_service.py`**:
- `requests` and `ics.Calendar` imported but unused — leftover from an earlier implementation
- `filter_holidays_by_month` defined twice on consecutive lines (dead code — `F811`)

**`backend/core/audit.py`**:
- `os` imported but never used — straightforward removal

**`backend/main.py`**:
- `sync_appointment_to_supabase` imported from `supabase_service` but only commented as "exported for test patching parity" — a leaky abstraction that should be replaced with a mock patch path

### 4.3 Fix Command

Run these two commands to auto-fix 50 of 56 violations:
```bash
# From project root
backend/venv/bin/ruff check backend/ --fix
backend/venv/bin/ruff format backend/
```

---

## 5. Frontend Lint (OXLint)

**Tool:** OXLint v1.81.0 (configured via `.oxlintrc.json`)  
**Command:** `npm run lint` (from `frontend/`)

### 5.1 Static Analysis Findings

| File | Issue | Severity |
|---|---|---|
| `src/services/api.ts` | Two near-identical `fetch` wrappers (`serverFetch` / `apiFetch`) | ⚠️ Medium |
| `src/App.tsx` | Switch-case router without URL-based routing (custom `activePage` state manages routing, no browser History API) | ⚠️ Medium |
| `src/pages/admin/modals/*.tsx` | Multiple large modal components (600–900 lines each) with no sub-component extraction | ⚠️ Medium |
| `src/context/AppContext.tsx` | Very large reducer file (1000+ lines); `AppState` has 15+ fields mixing UI state and domain data | ⚠️ Medium |
| `src/data/mocks/*.ts` | Mock data files do not use the centralized `types/index.ts` enums consistently | ℹ️ Low |
| `frontend/src/test/` | Only 3 test files for the entire frontend (AppContext, TenantResolver, UIPrimitives) — no component-level integration tests | 🔴 High |

### 5.2 TypeScript Strictness

`tsconfig.app.json` should include `"strict": true` and `"noUncheckedIndexedAccess": true` for production safety.

---

## 6. Test Coverage & Quality

### 6.1 Backend Test Inventory

| Test File | Type | Coverage |
|---|---|---|
| `test_auth.py` | Unit | Email validation, password hashing, JWT creation/verification, default account login |
| `test_appointments.py` | Unit | Email/date validation, Google Calendar event simulation |
| `test_payment_validator.py` | Unit | Luhn checksum, Visa/Mastercard/UPI patterns — comprehensive |
| `test_concurrent_booking.py` | Integration | Race condition (2 users, same slot), sequential duplicate rejection, concurrent different slots |
| `test_load_100_users.py` | Load | 100-concurrent user storm: 30 contested + 40 unique + 20 admin + 10 dispensary |
| `test_route_protection.py` | Integration | 401/403 enforcement, HIPAA patient isolation, audit trace headers |
| `test_ehr.py` | Async unit | Anti-spam hash deduplication, patient record mobile/admin view redaction |
| `test_end_to_end_scenarios.py` | E2E | 10 full clinical scenarios: patient auth → booking → invoice → inventory |
| `test_invoices.py` | Integration | Invoice CRUD |
| `test_api_endpoints.py` | Integration | General API endpoint smoke tests |
| `test_hospital_doctor_services.py` | Unit | Hospital/doctor service resolution |
| `test_jev_model.py` | Unit | Jev AI classifier model outputs |
| `test_email.py` | Unit | Email dispatch simulation |

**What's well-tested:** Auth logic, payment validation, concurrency, HIPAA access control, E2E clinical flows.

### 6.2 Test Gaps ❌

| Gap | Risk |
|---|---|
| **No test for `save_json` / `load_json` under concurrent writes** | Critical: data corruption path under >100 concurrent writers |
| **No test for `audit_traces.jsonl` write under load** | The audit file uses no file lock and is append-only — no test validates durability |
| **No test for `reconcile_offline_data`** | The sync engine is only tested indirectly via health check |
| **No test for `sanitize_patient_context` PII redaction** | Edge cases: multi-line transcripts, international phone numbers |
| **No test for `merge_overlapping_transcripts`** | Algorithm is untested; edge cases (empty list, single chunk, full overlap) are uncovered |
| **No test for `sanitize_safe_id` path traversal prevention** | Security-critical: `../etc/passwd` style attacks |
| **No test for token expiry enforcement** | JWT expiry is in the logic but no test with an expired token |
| **Frontend has only 3 tests** | `AppContext`, `TenantResolver`, `UIPrimitives` — no rendering tests for pages or modals |
| **No test for `PaymentValidator.validate_payment` dispatch router** | The `card` auto-detect method is tested indirectly but not directly |

### 6.3 Test Infrastructure Issues

```python
# test_payment_validator.py lines 18-24: broken import fallback
try:
    from services.payment_validator import (luhn_checksum, ...)
except ImportError:
    from backend.services.payment_validator import (luhn_checksum, ...)
```

> **Warning:** `luhn_checksum` and `validate_payment` are **not top-level exported functions** — they are static methods on `PaymentValidator`. This import will raise `ImportError` at runtime. Tests likely pass only due to `sys.path` manipulation before the import. The correct import is `PaymentValidator.luhn_checksum` or the class must expose module-level aliases.

---

## 7. Logic & Code Correctness Issues

### 7.1 🔴 Critical

**Issue 1: `generate_otp` uses `random.randint` — not cryptographically secure**  
`backend/services/auth_service.py:30`
```python
# CURRENT (insecure)
import random
otp = f"{random.randint(100000, 999999)}"

# FIX
import secrets
otp = str(secrets.randbelow(900000) + 100000)
```

**Issue 2: Hardcoded demo OTP bypass is always active**  
`backend/services/auth_service.py:38`
```python
# CURRENT (security backdoor in production)
if code == "123456":
    return True

# FIX
import os
if os.getenv("USE_MOCK_DATA", "false").lower() in ("true", "1") and code == "123456":
    return True
```

**Issue 3: `audit_traces.jsonl` has no file lock**  
`backend/core/audit.py:21-27`  
Under 100+ concurrent requests, concurrent appends can produce interleaved or partial writes. Must add `fcntl.flock(f.fileno(), fcntl.LOCK_EX)` or use a thread-safe queue.

**Issue 4: `booking_lock` is a threading.Lock — not multiprocess-safe**  
`backend/routes/scheduling.py:28`  
`threading.Lock()` works only within a single process. Under multiple Uvicorn workers or Kubernetes replicas, each process has its own lock — double-booking is possible. Fix: PostgreSQL advisory lock or Redis distributed lock.

### 7.2 🟠 High

**Issue 5: `_save_fallback` has no file lock**  
`services/supabase_service.py` — Uses plain `open("w")` without atomic rename or exclusive lock, unlike `save_json`. Concurrent reconciliation calls can corrupt fallback files.

**Issue 6: `CORS_ORIGINS` is hardcoded (no env override for production domains)**  
`core/config.py` — Production domains are absent. App will reject cross-origin requests from real users.
```python
# FIX
CORS_ORIGINS: list[str] = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]
```

**Issue 7: JWT secret has a human-readable weak default**  
If `JWT_SECRET` env var is not set in production, the codebase default allows any attacker who reads the open-source code to forge admin tokens. Add startup guard:
```python
if not JWT_SECRET or "dummy" in JWT_SECRET.lower() or "agastya-local" in JWT_SECRET:
    raise RuntimeError("JWT_SECRET must be set to a secure random value in production.")
```

### 7.3 🟡 Medium

**Issue 8: `_save_accounts` has no file lock**  
`services/auth_service.py` — Concurrent registrations can corrupt or empty the accounts file. Use `data_store.save_json` instead.

**Issue 9: `dispensary.py` contains two concatenated modules**  
`backend/routes/dispensary.py` has two `router = APIRouter(...)` statements and two top-level docstrings (dispensary + communications). The second `router` assignment silently shadows the first. The communications router is never registered. These must be split into two distinct files:  
- `backend/routes/dispensary.py`  
- `backend/routes/communications.py`

**Issue 10: `fetch_appointments_from_supabase` returns unvalidated raw dicts**  
When Supabase returns a partial or malformed response, raw dicts are served to the client without Pydantic validation. Add schema validation on the return value.

---

## 8. Standardization Gaps

### 8.1 Backend

| Gap | Detail |
|---|---|
| **No `pyproject.toml`** | Standard Python projects should have `pyproject.toml` with `[project]`, `[build-system]`, and `[tool.ruff]` sections for pip/uv compatibility |
| **No `conftest.py` for tests** | Each test file manually adds `backend/` to `sys.path`. A single `test/conftest.py` eliminates 10+ boilerplate blocks |
| **No `pytest.ini` or `[tool.pytest]`** | Tests use `unittest`, not pytest fixtures. No shared fixtures, parametrize, or marks |
| **Missing `response_model=` on routes** | Most routes return `dict[str, Any]` without typed `response_model=`, preventing correct OpenAPI schema generation |
| **Mixed timezone-naive and timezone-aware `datetime`** | Several routes use `datetime.now()` (naive) while others correctly use `datetime.now(timezone.utc)`. All timestamps must be UTC-aware |
| **`fcntl` is Unix-only** | `data_store.py` uses `fcntl` which is unavailable on Windows. Document Linux-only requirement or use `filelock` |
| **OpenTelemetry imported but not wired** | `opentelemetry-api` is pinned in `requirements.txt` but no OTLP exporter, tracer, or meter is configured — zero benefit, dead dependency |

### 8.2 Frontend

| Gap | Detail |
|---|---|
| **No URL-based router** | Navigation uses `state.activePage` switch-case. No URL changes on page transition — users cannot bookmark pages, share deep links, or use browser back/forward. Adopt `react-router-dom` for production |
| **`localStorage` for JWT** | Auth tokens stored in `localStorage` are vulnerable to XSS. Use `httpOnly` cookies with `SameSite=Strict` for production |
| **Mock data always imported in bundle** | `src/data/mocks/` files are always imported in `AppContext.tsx` regardless of `USE_MOCK_DATA`. Dead weight in production bundle. Use dynamic imports gated by the flag |
| **No environment variable validation at boot** | App silently falls back when `BACKEND.ENABLED = false`. No startup check for required env vars in production mode |
| **Duplicate `package.json`** | Both `/package.json` (root) and `/frontend/package.json` exist. The root one appears to be leftover — should be removed or clearly documented as workspace root |

---

## 9. Production Scaling Issues

### 9.1 🔴 Data Layer — JSON File Store Does Not Scale

All clinical data (appointments, invoices, inventory, visits) is stored in JSON files in `backend/data/`. Hard limits:
- **No horizontal scaling** — Cannot run multiple backend containers sharing the same JSON files
- **No transactions** — Read-modify-write is not atomic beyond the file level
- **Linear scan** — `get_all_appointments()` loads the entire JSON array on every request (2–10 MB at scale)
- **No query/filter at storage layer** — All filtering in Python after full deserialization

**Fix:** Migrate all domain data to PostgreSQL/Supabase. The schema already exists in `db/schema.sql`. Complete the bridge already started in `supabase_service.py`.

### 9.2 🔴 Booking Lock is Not Distributed

`_booking_lock = threading.Lock()` prevents double-booking within a **single process only**. Under multiple Uvicorn workers or Kubernetes replicas, each process has its own lock — two concurrent requests on different workers will both succeed.

**Fix:** Replace with PostgreSQL advisory lock or Redis `SET NX EX` distributed lock:
```sql
-- PostgreSQL advisory lock (held for transaction duration)
SELECT pg_try_advisory_xact_lock(hashtext(slot_key));
```

### 9.3 🔴 Audit Log is Unbounded

`backend/data/audit_traces.jsonl` grows indefinitely. At 100 req/s production load:
- ~1 KB per entry × 100 req/s × 86,400 s/day = **~8 GB/day**
- Disk will fill and the app will crash with no graceful degradation

**Fix:** Rotate daily with `logging.handlers.TimedRotatingFileHandler`. Ship to external sink (Loki, CloudWatch, Elasticsearch) via OTLP. Set 30-day retention policy.

### 9.4 🔴 Accounts File is a Single-File User Database

`backend/data/clinic_accounts.json` holds all user credentials. Concurrent registrations without file locking can corrupt records. Loading all accounts on every login/register call will degrade linearly with user count.

**Fix:** Move accounts to the PostgreSQL `users` table (already seeded in `db/seeds/001_seed_initial_data.sql`).

### 9.5 🟠 LLM API Calls Have No Rate Limiting, Retry, or Circuit Breaker

Direct HTTP calls to Gemini/Groq/OpenAI with 45-second timeouts but no:
- **Retry logic** for transient 429/503 errors
- **Circuit breaker** for cascading failures
- **Background queue** — AI parsing blocks the HTTP request thread for up to 45 seconds

**Fix:** Add `tenacity` for exponential backoff. Offload to background task queue (Celery + Redis or FastAPI `BackgroundTasks`) with a polling/webhook model.

### 9.6 🟠 No API Rate Limiting

All API endpoints are unprotected from abuse. A single client can flood `/auth/login` (brute-force), `/ai/parse-homeopathy` (exhaust LLM quota), or `/upload/check-file-hash` (spam hash store).

**Fix:** Add `slowapi` (Redis-backed rate limiter for FastAPI):
```python
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)

@router.post("/auth/login")
@limiter.limit("5/minute")
async def login_user_endpoint(req: LoginRequest, request: Request): ...
```

### 9.7 🟠 No Graceful Readiness Probe

The Docker Compose backend service has no `healthcheck`. Under rolling deploys, the load balancer may send traffic to a container that has started but not finished reconciling offline data.

**Fix:** Add a `/health/ready` endpoint that returns 503 until `reconcile_offline_data()` completes. Configure Docker healthcheck:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/health/ready"]
  interval: 10s
  timeout: 5s
  retries: 3
```

### 9.8 🟠 Two Parallel JWT Auth Systems

GoTrue (Supabase Auth) runs alongside the custom FastAPI HMAC-SHA256 JWT service. Tokens from one system cannot be verified by the other. This creates two independent credential systems that must be explicitly integrated or one deprecated.

**Fix:** Choose one authoritative JWT issuer. Either use GoTrue exclusively (validate Supabase JWTs in FastAPI using the shared `JWT_SECRET`) or deprecate GoTrue and rely solely on the custom FastAPI auth service.

### 9.9 🟡 No CDN for Static Assets

All static assets (JS bundles, fonts, images) are served from the Nginx container inside the clinic's local network, with no edge caching for remote/mobile patients.

**Fix for public production:** Place Cloudflare or AWS CloudFront in front of Nginx, or deploy the React build to Netlify/Vercel.

### 9.10 🟡 Recordings Directory Has No Persistent Volume Mount

Audio recordings saved to `backend/data/recordings/` inside the Docker container are lost on container restart — the `docker-compose.yml` mounts `../backend/data:/app/data` generically but does not explicitly name the recordings subdirectory as a persistent named volume.

**Fix:** Add an explicit named volume in `docker-compose.yml`:
```yaml
volumes:
  - ../backend/data:/app/data
  - recordings_data:/app/data/recordings
```

### 9.11 🟡 `USE_MOCK_DATA` Has No Startup Guard

If `USE_MOCK_DATA=true` is accidentally deployed, the app will serve demo prescriptions to real patients. No startup guard rejects conflicting modes (e.g., `USE_MOCK_DATA=true` + `GEMINI_API_KEY` set).

**Fix:** Add startup validation in `lifespan()`:
```python
if is_mock_enabled() and os.getenv("GEMINI_API_KEY"):
    raise RuntimeError("Cannot run USE_MOCK_DATA=true with a live GEMINI_API_KEY in production.")
```

### 9.12 🟡 No Connection Pooling for Supabase/PostgreSQL

Every HTTP call to Supabase creates a new `httpx.AsyncClient()` context. At 100 concurrent requests, this creates 100 concurrent new TCP connections, exhausting PostgreSQL's connection pool.

**Fix:** Use a module-level `httpx.AsyncClient` instance with connection pooling:
```python
# supabase_service.py
_http_client: httpx.AsyncClient | None = None

async def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            timeout=10.0,
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10)
        )
    return _http_client
```

---

## 10. Security Hardening Checklist

| Item | Status | Action Required |
|---|---|---|
| Hardcoded OTP bypass `123456` | 🔴 Active in prod | Gate behind `USE_MOCK_DATA` check |
| `random.randint` for OTP generation | 🔴 Insecure PRNG | Switch to `secrets.randbelow` |
| Default JWT secret in config/docker-compose | 🔴 Weak default | Raise `RuntimeError` if default is used in prod |
| `localStorage` for JWT on frontend | 🟠 XSS risk | Move to `httpOnly` SameSite=Strict cookie |
| CORS origins hardcoded (no env override) | 🟠 Config gap | Make env-configurable |
| No login rate limiting | 🟠 Brute-force risk | Add `slowapi` with Redis |
| Audit log file has no file lock | 🟠 Data integrity | Add `fcntl` lock or thread-safe handler |
| `_save_accounts` has no file lock | 🟠 Race condition | Use `data_store.save_json` |
| `_save_fallback` has no file lock | 🟠 Race condition | Use `data_store.save_json` |
| `sanitize_safe_id` path traversal | ✅ Protected | Regex strips `../` and special chars |
| PHI isolation wall | ✅ Implemented | `scope_items_to_patient_or_admin` in security.py |
| PBKDF2-SHA256 password hashing | ✅ Secure | 100,000 iterations, random salt |
| HMAC-SHA256 JWT signing | ✅ Correct | No third-party dependency, timing-safe compare |
| `hmac.compare_digest` for verification | ✅ Constant-time | Used for password and JWT verification |
| PII redaction before LLM calls | ✅ Implemented | `sanitize_patient_context` strips phone/email |
| Path traversal in audio recording | ✅ Protected | `sanitize_safe_id` + `.is_relative_to()` check |
| Duplicate file hash prevention | ✅ Implemented | SHA-256 anti-spam gate |
| Admin registration blocked publicly | ✅ Enforced | `role == "admin"` raises `403` on public register |
| Google OAuth admin scoped by email allowlist | ✅ Enforced | Checked against `AUTHORIZED_ADMIN_EMAILS` |
| HIPAA patient isolation in multi-tenant | ✅ Enforced | `require_patient_or_admin` in clinical routes |

---

## 11. Priority Fix Matrix

### Immediate — Before Any Production Deployment

| # | Item | File | Effort |
|---|---|---|---|
| 1 | Fix OTP: `random.randint` → `secrets.randbelow` | `services/auth_service.py:30` | 5 min |
| 2 | Gate demo OTP `123456` behind `USE_MOCK_DATA` | `services/auth_service.py:38` | 5 min |
| 3 | Add startup guard for weak/default JWT secret | `core/config.py` | 15 min |
| 4 | Add `fcntl` lock to `audit_traces.jsonl` writer | `core/audit.py` | 20 min |
| 5 | Add file lock to `_save_accounts` | `services/auth_service.py` | 15 min |
| 6 | Fix `dispensary.py` double-router concatenation bug | `routes/dispensary.py` | 10 min |
| 7 | Auto-fix 50 ruff violations | All backend files | `ruff --fix` (2 min) |
| 8 | Delete the second `filter_holidays_by_month` definition | `services/calendar_service.py:289` | 2 min |
| 9 | Make `CORS_ORIGINS` env-configurable | `core/config.py` | 10 min |
| 10 | Add `conftest.py` to `test/` for shared `sys.path` setup | `test/conftest.py` | 10 min |

### Short-Term — Within 2 Weeks

| # | Item | Effort |
|---|---|---|
| 11 | Replace `threading.Lock` with PostgreSQL advisory lock or Redis distributed lock for booking | Medium |
| 12 | Add `slowapi` rate limiting to auth and AI endpoints | Small |
| 13 | Implement shared `httpx.AsyncClient` pool for Supabase calls | Small |
| 14 | Add audit log rotation (`TimedRotatingFileHandler`) | Small |
| 15 | Merge `auth_service.py` JWT/hash functions into `core/security.py` (remove duplication) | Small |
| 16 | Merge `serverFetch` and `apiFetch` in `api.ts` into one `coreFetch` helper | Small |
| 17 | Add missing tests: `sanitize_safe_id`, `merge_overlapping_transcripts`, JWT expiry | Medium |
| 18 | Add `response_model=` to all FastAPI routes | Medium |
| 19 | Fix all `datetime.now()` → `datetime.now(timezone.utc)` | Small |
| 20 | Add `/health/ready` readiness probe + Docker healthcheck | Small |

### Medium-Term — Before 1,000+ Users

| # | Item | Effort |
|---|---|---|
| 21 | Migrate JSON file stores to PostgreSQL via Supabase (schema exists in `db/schema.sql`) | Large |
| 22 | Offload LLM API calls to background task queue (Celery + Redis) | Large |
| 23 | Add URL-based routing to React frontend (`react-router-dom`) | Medium |
| 24 | Move frontend JWT from `localStorage` to `httpOnly` cookie | Medium |
| 25 | Set up OTLP exporter for OpenTelemetry (already imported in requirements) | Medium |
| 26 | Add named Docker volume for recordings directory | Small |
| 27 | Deprecate or integrate GoTrue Auth to remove dual-JWT system | Medium |

---

*Generated by automated code audit — November 9, 2026*  
*Cross-reference: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`RUN_AND_TEST_GUIDE.md`](./RUN_AND_TEST_GUIDE.md) · [`DEVELOPER_CHEATSHEET.md`](./DEVELOPER_CHEATSHEET.md)*

