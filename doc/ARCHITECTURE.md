# System Architecture: Enterprise Multi-Hospital Healthcare & EHR Platform (Homo_project)

## 1. Architectural Philosophy & Multi-Hospital Tenancy Core

The platform is engineered as an **Enterprise Multi-Hospital / Multi-Tenant Healthcare & Electronic Health Records (EHR) Operating System**. Rather than being bound to a single clinical entity, the core architecture is designed from the ground up to support multiple hospital organizations, medical centers, and outpatient clinics simultaneously.

> [!NOTE]
> **Onboarded Hospital Tenants**:  
> **Agastya Classical Homeopathy** (`agastya`) is one of the premier onboarded hospital tenants provided as a production reference instance, alongside the default base template (**General Healthcare Hospital**, `default`) and enterprise network tenants (e.g., **Apollo TeleHealth & Integrated Clinics**, `apollo`). Additional hospitals are provisioned on-demand via the Super Admin Console without code modifications or server restarts.

The architecture is founded upon five core pillars:

1. **Dynamic Multi-Hospital Tenancy (Dual-Resolution Engine)**:
   - **Option A (Domain / Subdomain Resolution)**: Resolves the active hospital tenant via the incoming request hostname (e.g. `agastya.homoeo.org`, `apollo.clinic.net`, or `localhost?tenant=agastya`).
   - **Option B (Auth JWT & Header Resolution)**: Authenticated requests carry tenant context via signed JWT claims and the `X-Hospital-ID` request header.
   - **Dynamic Branding & Feature SSOT**: Each hospital maintains its own visual theme (colors, typography, logo, card curvature), contact details, courier logistics, and toggleable feature switches (`enableECommerce`, `enableVoiceStudio`, `enablePrescriptionScan`, `enableOnlinePayments`).

2. **Strict HIPAA Multi-Hospital PHI Isolation**:
   - Complete partition wall: every clinical record, appointment, invoice, visit summary, prescription, and audio recording is strictly scoped to a canonical `hospital_id`.
   - A clinician or patient with accounts across multiple institutions **can never** view or leak Protected Health Information (PHI) across hospital boundaries unless an explicit cross-hospital referral release is executed.
   - Any cross-tenant or unauthorized access attempt returns `403 Forbidden` and emits an automated, tamper-evident security alert.

3. **Super-Admin Governance & Quotas**:
   - 3-Tier governance model separating cross-hospital Super Admins (`super_admin`), Clinic Directors / Doctors (`admin`), and Patients (`patient`/`guest`).
   - Super Admins provision new hospitals (`POST /api/v1/hospitals`), configure quotas (`MAX_CUSTOMERS_PER_HOSPITAL = 1000`, `MAX_ADMINS = 10`), toggle global developer modes, and audit platform telemetry.

4. **Single Source of Truth (SSOT) with Zero-Data-Loss Fallback**:
   - PostgreSQL (hosted on-premise or via Supabase) serves as canonical persistence for clinical, billing, inventory, and scheduling data.
   - Dual-layer cache with `InterProcessLock` (`fcntl.flock` + `threading.Lock`) and atomic disk writes ensures that even during database maintenance or network drops, on-premise clinics suffer zero data loss and automatically reconcile when connectivity resumes.

5. **Vertical Slice & Feature-Sliced Architecture**:
   - **Backend**: Thin FastAPI routers mapped to isolated vertical domain services (`routes/hospital.py`, `routes/scheduling.py`, `routes/clinical_records.py`, `routes/billing.py`, etc.).
   - **Frontend**: Feature-Sliced Architecture (FSD) organizing code into strictly-enforced layers (`src/app/`, `src/pages/`, `src/features/`, `src/entities/`, `src/shared/`).

---

## 2. Universal System Architecture Diagram

```mermaid
graph TB
    subgraph ClientLayer["Frontend Client (React 19 + TypeScript + Feature-Sliced Architecture)"]
        UI_SUPER["Super Admin Governance Console<br/>(src/pages/SuperAdminDashboard.tsx)"]
        UI_ADMIN["Doctor & Practice Management Portal<br/>(src/features/admin-dashboard/)"]
        UI_PATIENT["Patient Portal & Self-Service Flow<br/>(src/features/booking-wizard/, clinical-summary/)"]
        APP_CTX["Application State & Reducer<br/>(src/app/store/AppContext.tsx)"]
        THEME_CTX["ThemeProvider (Multi-Hospital Engine)<br/>Dynamic Colors, Curvatures & Feature Toggles"]
        API_CLIENT["Unified Typed API Client<br/>(src/shared/api/api.ts)"]
        MOCK_FIXTURES["Canonical Mock Fixtures<br/>(src/data/mocks/*)<br/>Active when USE_MOCK_DATA=true"]
    end

    subgraph GatewayLayer["FastAPI Gateway & Security Layer (Port 8000)"]
        AUDIT_MID["AuditTraceMiddleware<br/>(X-Trace-ID, X-Session-ID, X-Hospital-ID)"]
        RBAC_GUARD["3-Tier RBAC Guard<br/>(super_admin, admin, patient/guest)"]
        RATE_LIMITER["SlowAPI Rate Limiter<br/>(Redis/In-Memory Token Bucket)"]
        TENANT_RESOLVER["Hospital Tenant Scoping Middleware<br/>(HospitalContext & Quota Checker)"]
    end

    subgraph BackendModules["Modular Microservices & Domain Routers (backend/routes/)"]
        M_HOSP["routes/hospital.py & services/hospital_service.py<br/>Multi-Hospital Provisioning, Doctors & Theme Config"]
        M_AUTH["routes/auth.py & services/auth_service.py<br/>CSPRNG OTP, Local HMAC JWT, Scoped Invites (/join?token=)"]
        M_SCHED["routes/scheduling.py & services/scheduling_service.py<br/>InterProcessLock Booking, Slot Locking, GCal Sync"]
        M_CLIN["routes/clinical_records.py & services/clinical_service.py<br/>EHR, Audio Watermarking, AI Scribe, JEV Repertory"]
        M_DISP["routes/dispensary.py & services/dispensary_service.py<br/>Remedy Stock, Restock Transactions, Batch POs"]
        M_BILL["routes/billing.py & services/billing_service.py<br/>Consultation Invoices, UTR Bank Ledger, Logistics"]
        M_COMM["routes/communications.py & services/notification_service.py<br/>WhatsApp Cloud API & Resend Email Confirmations"]
        M_TELEM["routes/telemetry.py & services/telemetry_service.py<br/>Zero-PHI Crash Ingestion & Admin Incident Alerting"]
    end

    subgraph DataLayer["Canonical SSOT & Local Persistence Stores"]
        DB_POSTGRES[("PostgreSQL / Supabase (Port 54321 / 5432)<br/>appointments, clinic_users, invoices, records")]
        TENANT_REG[("Multi-Tenant Datastores (backend/data/)<br/>hospitals.json, doctors.json, user_invites.json")]
        DISK_FALLBACK[("Atomic Disk Fallback (backend/data/supabase_fallback/)<br/>fcntl.flock + Tempfile Rename + os.replace")]
        AUDIT_STORE[("backend/data/audit_traces.jsonl<br/>Rotating 20MB Log Handler (Bounded to 2GB)")]
    end

    UI_SUPER --> APP_CTX
    UI_ADMIN --> APP_CTX
    UI_PATIENT --> APP_CTX
    APP_CTX --> THEME_CTX
    APP_CTX --> API_CLIENT
    APP_CTX -.->|If USE_MOCK_DATA=true| MOCK_FIXTURES
    API_CLIENT -->|HTTP / JSON with X-Trace-ID & X-Hospital-ID| AUDIT_MID
    AUDIT_MID --> RATE_LIMITER
    RATE_LIMITER --> RBAC_GUARD
    RBAC_GUARD --> TENANT_RESOLVER

    TENANT_RESOLVER --> M_HOSP
    TENANT_RESOLVER --> M_AUTH
    TENANT_RESOLVER --> M_SCHED
    TENANT_RESOLVER --> M_CLIN
    TENANT_RESOLVER --> M_DISP
    TENANT_RESOLVER --> M_BILL
    TENANT_RESOLVER --> M_COMM
    TENANT_RESOLVER --> M_TELEM

    M_HOSP --> TENANT_REG
    M_AUTH --> TENANT_REG
    M_AUTH --> DB_POSTGRES
    M_SCHED --> DB_POSTGRES
    M_CLIN --> DB_POSTGRES
    M_DISP --> DB_POSTGRES
    M_BILL --> DB_POSTGRES
    M_TELEM --> AUDIT_STORE
    DB_POSTGRES -.->|On Database Offline| DISK_FALLBACK
    AUDIT_MID --> AUDIT_STORE
```

---

## 3. Multi-Hospital Tenancy & PHI Isolation Model

### 3.1 Tenant Data Separation

Every primary persistence structure enforces a `hospital_id` foreign key partition:

```sql
-- Appointments strictly partitioned by hospital tenant
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS hospital_id TEXT NOT NULL DEFAULT 'default';
CREATE INDEX IF NOT EXISTS idx_appointments_hospital ON public.appointments(hospital_id, status);

-- Unique slot booking enforced per hospital to prevent inter-clinic collision
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot_unique 
ON public.appointments (hospital_id, start_time, doctor_title) 
WHERE status != 'cancelled';
```

### 3.2 Tenant Isolation Wall in Application Layer

In `backend/core/security.py`, `scope_items_to_patient_or_admin` ensures callers can only access records matching their verified tenant:

```python
def scope_items_to_patient_or_admin(
    items: list[dict],
    current_user: dict | None,
    patient_key: str = "patient_id",
    hospital_key: str = "hospital_id"
) -> list[dict]:
    """
    Guarantees strict two-dimensional isolation:
    1. Tenant Isolation: Users can only view data scoped to their authorized hospital_id.
    2. PHI Isolation: Patients can only view records where patient_id matches their identity.
    """
```

### 3.3 Dynamic Onboarding & Reference Tenants

| Tenant ID | Hospital Name | Domain / Subdomain | Specialty Focus |
|---|---|---|---|
| `default` | **General Healthcare Hospital** | `localhost` / `default` | Standard multi-specialty baseline template |
| `agastya` | **Agastya Classical Homeopathy Hospital** | `agastya.*` / `agastyahomoeo.com` | Constitutional homeopathy, miasmatic repertory, JEV engine |
| `apollo` | **Apollo TeleHealth & Integrated Clinics** | `apollo.*` / `telehealth.care` | Distributed multi-doctor teleconsultation network |
| `custom-*` | **On-Demand Provisioned Hospital** | Provisioned via `POST /api/v1/hospitals` | Instant dynamic onboarding via Super Admin GUI |

---

## 4. High-Concurrency Design (≥100 Concurrent Users)

### Problem Statement
Under peak patient surges (e.g. morning registration windows), simultaneous write operations on slot bookings, inventory decrements, and invoice numbering can induce race conditions, thread starvation, and double-bookings.

### Concurrency Protection Stack

1. **Layer 1: Partial Unique Composite Constraint (Database Level)**:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot_unique 
   ON public.appointments (hospital_id, start_time, doctor_title) 
   WHERE status != 'cancelled';
   ```
   Enforces mathematical serialization. If 50 patients attempt to claim `2026-11-20 09:30 AM` under Doctor A at Hospital X, exactly 1 succeeds (`201 Created`); the remaining 49 receive clean `409 Conflict` responses without data corruption.

2. **Layer 2: Dual-Layer InterProcessLock (OS Kernel Level)**:
   Defined in `backend/services/data_store.py`:
   - Combines in-process `threading.Lock` (thread safety) with kernel-level `fcntl.flock(LOCK_EX)` (process safety across multiple Uvicorn workers).
   - Atomic replacement (`tempfile.NamedTemporaryFile` + `os.replace` + `os.fsync`) prevents dirty reads or half-written records.
   - High-throughput in-memory TTL read cache (3.0s window) absorbs read storms without disk thrashing.

3. **Layer 3: Frontend Adaptive Polling**:
   - Adaptive 15-second background synchronization combined with immediate focus revalidation (`window.addEventListener("focus")`).
   - Slashes client-to-server request volume from 400 req/s down to <10 req/s under 100 concurrent browser sessions.

---

## 5. Security & Multi-Tier Role-Based Access Control (RBAC)

### 3-Tier Governance Hierarchy

| Role | Scope | Permitted Endpoints & Capabilities |
|---|---|---|
| `super_admin` | Platform Global | Provisions new hospitals (`POST /api/v1/hospitals`), configures global quotas, manages multi-hospital doctors, toggles dev/live mode, audits cross-hospital security logs. |
| `admin` | Hospital Scoped | Hospital Director / Doctor. Manages local practice doctors (`POST /api/v1/doctors`), sends user invites (`POST /api/v1/auth/invite`), reviews full clinical case records, manages inventory, approves prescriptions. |
| `patient` / `guest` | Self Scoped | Consumer portal. Self-registers or accepts invite links (`/join?token=...`) scoped strictly to assigned hospital. Manages own appointments, views sanitized personal summaries, pays invoices. |

### Security Endpoints & Protections

- **CSPRNG OTP Engine**: 6-digit one-time passcodes generated exclusively via `secrets.randbelow(900000) + 100000`.
- **Zero Hardcoded Backdoors**: Strict constant-time validation (`hmac.compare_digest`) with a 5-attempt rate-limiting lockout and 10-minute expiration.
- **HMAC-SHA256 JWT**: Zero external auth provider dependency; tokens signed locally with secret verification and persistent JTI revocation checking (`/auth/logout`).
- **Bounded Forensic Audit Trail**: Global `AuditTraceMiddleware` tags every HTTP request with `X-Trace-ID`, `X-Session-ID`, and `X-Hospital-ID`. Written to `audit_traces.jsonl` using a 20MB rotating file handler capped at 100 rotations (bounded to 2GB disk footprint max).
- **HTTP Connection Pool**: Shared `httpx.AsyncClient` pool in `backend/shared/http_pool.py` prevents TCP socket exhaustion under external API and Supabase PostgREST load.

---

*Cross-reference: [`WIRING_AND_DATA_FLOW.md`](./WIRING_AND_DATA_FLOW.md) · [`MULTI_HOSPITAL_DESIGN_SYSTEM_PLAN.md`](./MULTI_HOSPITAL_DESIGN_SYSTEM_PLAN.md) · [`RUN_AND_TEST_GUIDE.md`](./RUN_AND_TEST_GUIDE.md) · [`DEVELOPER_CHEATSHEET.md`](./DEVELOPER_CHEATSHEET.md)*
