# System Architecture: Agastya Homoeopathy Clinic EHR

## 1. Architectural Philosophy & Core Principles

The Agastya Homoeopathy Clinic EHR is designed around four foundational principles:

1. **Single Source of Truth (SSOT)**:
   - PostgreSQL (hosted on-premise or via Supabase) is the canonical source of truth for all clinical, scheduling, and billing entities.
   - Elimination of split-brain state: all writes to `node_modules/.cache` or uncoordinated local JSON files have been removed.
   - When the local database container is launching or temporarily unreachable, an atomic, file-locked (`fcntl.flock`) fallback cache ensures zero data loss and automatically reconciles when connectivity resumes.

2. **Vertical Slice Architecture**:
   - Both backend and frontend are organized into domain-driven vertical slices.
   - Each slice encapsulates its own data contracts, endpoints, domain logic, and validation rules without monolithic cross-coupling.

3. **Concurrency & Race Condition Elimination (≥100 Concurrent Users)**:
   - Database-level unique constraint preventing double-booking:
     ```sql
     CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot_unique 
     ON public.appointments (start_time, doctor_title) 
     WHERE status != 'cancelled';
     ```
   - Process-safe slot reservation locks preventing memory race conditions under multi-worker Uvicorn configurations.

4. **HIPAA / PHI Isolation & Forensic Auditability**:
   - Complete tenant isolation: patients can only access their own Protected Health Information (PHI).
   - Doctor/Admin accounts retain complete, audited practice oversight.
   - Every request is tagged with an immutable `X-Trace-ID` and `X-Session-ID`, persisted to `audit_traces.jsonl`.
   - Any unauthorized access attempt (403) or internal error triggers an automated administrative alert.

---

## 2. System Architecture Diagram

```mermaid
graph TB
    subgraph ClientLayer["Frontend Client (React 19 + TypeScript + Vite)"]
        UI_SUPER["Super Admin Console<br/>(Multi-Hospital Registry, Dev Mode, Scaling Quotas)"]
        UI_ADMIN["Doctor & Clinic Director Console<br/>(Doctor Roster, EHR Scribe, Dispensary, Invoices)"]
        UI_PATIENT["Patient Portal & Guest View<br/>(Appointments, Remedies, Cart, Scoped Registration)"]
        APP_CTX["Central State Machine (AppContext.tsx)<br/>15s Adaptive Polling + Focus Sync"]
        THEME_CTX["ThemeProvider.tsx<br/>Dynamic Hospital Branding & Palette"]
        API_CLIENT["Typed API Client (src/services/api.ts)"]
        MOCK_FIXTURES["Dedicated Mock Fixtures<br/>(src/data/mocks/*)<br/>Active when VITE_USE_MOCK_DATA=true"]
    end

    subgraph GatewayLayer["FastAPI Gateway & Security Layer (Port 8000)"]
        AUDIT_MID["AuditTraceMiddleware<br/>(X-Trace-ID, X-Session-ID, X-Hospital-ID)"]
        RBAC_GUARD["3-Tier RBAC Guard<br/>(super_admin, admin, patient/guest)"]
        QUOTA_GUARD["Phase 1 Quota Limiter<br/>(Max 5 Super Admin, 10 Admin, 1000 Patients/Clinic)"]
    end

    subgraph BackendModules["Modular Backend (backend/routes/ & backend/services/)"]
        M_HOSP["routes/hospital.py<br/>Hospital & Doctor Provisioning, Dev Mode Toggle"]
        M_AUTH["routes/auth.py & services/auth_service.py<br/>Login, OTP, JWT, User Invites (/join?token=)"]
        M_SCHED["routes/appointments.py & services/calendar_service.py<br/>Atomic Booking, Slot Locking, GCal Sync"]
        M_CLIN["routes/clinical.py & services/typesafe_jev_service.py<br/>EHR, Audio Watermarking, AI Scribe, JEV"]
        M_DISP["routes/dispensary.py<br/>Inventory, Restock, Batch Orders"]
        M_BILL["routes/billing.py<br/>Invoices, UTR Ledger, Logistics"]
        M_COMM["services/notification_service.py<br/>WhatsApp Cloud API & Resend Email"]
    end

    subgraph DataLayer["Canonical SSOT & Local Fallback Store"]
        DB_POSTGRES[("PostgreSQL / Supabase (Port 54321 / 5432)<br/>appointments, clinic_users, invoices, records")]
        TENANT_REG[("Dynamic Tenant Datastores (backend/data/)<br/>hospitals.json, doctors.json, user_invites.json")]
        DISK_FALLBACK[("Atomic Disk Fallback<br/>(fcntl.flock + Tempfile Rename)")]
        AUDIT_STORE[("backend/data/audit_traces.jsonl<br/>30-Day Rotating Immutable Audit Trail")]
    end

    UI_SUPER --> APP_CTX
    UI_ADMIN --> APP_CTX
    UI_PATIENT --> APP_CTX
    APP_CTX --> THEME_CTX
    APP_CTX --> API_CLIENT
    APP_CTX -.->|If VITE_USE_MOCK_DATA=true| MOCK_FIXTURES
    API_CLIENT -->|HTTP / JSON with X-Trace-ID| AUDIT_MID
    AUDIT_MID --> RBAC_GUARD
    RBAC_GUARD --> QUOTA_GUARD
    QUOTA_GUARD --> M_HOSP
    QUOTA_GUARD --> M_AUTH
    QUOTA_GUARD --> M_SCHED
    QUOTA_GUARD --> M_CLIN
    QUOTA_GUARD --> M_DISP
    QUOTA_GUARD --> M_BILL
    QUOTA_GUARD --> M_COMM

    M_HOSP --> TENANT_REG
    M_AUTH --> TENANT_REG
    M_AUTH --> DB_POSTGRES
    M_SCHED --> DB_POSTGRES
    M_CLIN --> DB_POSTGRES
    M_DISP --> DB_POSTGRES
    M_BILL --> DB_POSTGRES
    DB_POSTGRES -.->|On DB Offline| DISK_FALLBACK
    AUDIT_MID --> AUDIT_STORE
```

---

## 3. High-Concurrency Design (100+ Parallel Users)

### Problem Statement
In traditional SQLite or raw file-based JSON backends, 100 simultaneous users writing appointments or updating inventory will encounter race conditions, file corruption, and double-bookings.

### Multi-Layer Concurrency Protection
1. **Layer 1: Database Partial Unique Index**:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot_unique 
   ON public.appointments (start_time, doctor_title) 
   WHERE status != 'cancelled';
   ```
   If 50 patients attempt to book `2026-11-10 10:00 AM` simultaneously, the database engine enforces serialization at the transaction level. Exactly 1 request succeeds with `201 Created`; all 49 conflicting requests receive `409 Conflict`.

2. **Layer 2: Atomic File Locking (`fcntl.flock`)**:
   In `backend/services/data_store.py`:
   - Shared locks (`fcntl.LOCK_SH`) for high-throughput parallel reads.
   - Exclusive locks (`fcntl.LOCK_EX`) for writes.
   - Atomic replacement (`NamedTemporaryFile` + `os.replace`) ensures file descriptors never read partially-written JSON.

3. **Layer 3: Frontend Adaptive Polling**:
   - Replaced naive 1-second interval loops with an adaptive 15-second background sync plus immediate revalidation on window focus (`window.addEventListener("focus")`).
   - Reduces network load from 400 requests/sec under 100 users down to < 10 requests/sec.

---

## 4. Security & HIPAA PHI Isolation

### 3-Tier Role-Based Access Control (RBAC) & Governance
- **Roles**:
  - `super_admin`: Cross-hospital platform administrator. Can create new hospitals (`POST /api/v1/hospitals`), switch live dev mode (`POST /api/v1/platform/toggle-dev-mode`), and manage quotas. Can view hospital admin screens, but hospital admins can never access super admin operations.
  - `admin`: Clinic Director / Doctor. Full practice control over doctor provisioning (`POST /api/v1/doctors`), patient records, inventory, and clinical scheduling.
  - `patient` / `guest`: Consumer portal. Patients can self-register or join via invite links (`/join?token=...`) scoped strictly to their assigned clinic tenant.
- **Phase 1 Scaling Limits**:
  - `MAX_SUPER_ADMINS = 5`
  - `MAX_ADMINS = 10`
  - `MAX_CUSTOMERS_PER_HOSPITAL = 1000`
- **Admin & Super-Admin Endpoints**:
  - `POST /api/v1/hospitals` (Super Admin only: provisions new medical center)
  - `POST /api/v1/platform/toggle-dev-mode` (Super Admin only: switches mock vs live database)
  - `POST /api/v1/doctors` (Admin / Super Admin: provisions doctor under clinic)
  - `POST /api/v1/auth/invite` (Admin: generates secure email/link invite)
  - `GET /api/v1/patient-records?view=admin` (full homeopathic case files, miasmatic analysis, mental generals).
  - `POST /api/v1/inventory/{id}/restock`
  - `POST /api/v1/sync/reconcile`
  - `DELETE /api/v1/admin/alerts`
- **Patient-Safe View**:
  - `GET /api/v1/patient-records?view=mobile` redacts sensitive internal clinician notes and returns only patient-facing instructions.

### Tenant Isolation Wall
- In [`backend/core/security.py`](file:///Users/nitin/Desktop/Project_Suspense/backend/core/security.py), `scope_items_to_patient_or_admin` checks caller identity:
  ```python
  def scope_items_to_patient_or_admin(items: list[dict], current_user: dict | None, patient_key: str = "patient_id") -> list[dict]:
      # Patients only receive items where patient_id matches their token subject.
      # Super admins and clinic admins can inspect all records within authorized tenant scope.
      # Cross-patient or cross-tenant PHI access raises 403 Forbidden.
  ```
- Any unauthorized access attempt triggers an automated audit entry and real-time administrator alert.

