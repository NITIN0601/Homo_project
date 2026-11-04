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
        UI_PATIENT["Patient Portal<br/>(Appointments, Remedies, Cart, Billing)"]
        UI_ADMIN["Doctor Practice Console<br/>(Queue, EHR Scribe, Dispensary, Invoices)"]
        APP_CTX["Central State Machine (AppContext.tsx)<br/>15s Adaptive Polling + Focus Sync"]
        API_CLIENT["Typed API Client (src/services/api.ts)"]
        MOCK_FIXTURES["Dedicated Mock Fixtures<br/>(src/data/mocks/*)<br/>Active only when VITE_USE_MOCK_DATA=true"]
    end

    subgraph GatewayLayer["FastAPI Gateway & Security Layer (Port 8000)"]
        AUDIT_MID["AuditTraceMiddleware<br/>(Trace-ID, Session-ID, Audit Log)"]
        RBAC_GUARD["RBAC & Tenant Isolation Guard<br/>(PBKDF2, JWT HS256, PHI Wall)"]
    end

    subgraph VerticalSlices["Backend Domain Slices (backend/slices/)"]
        S_AUTH["slices/auth<br/>Login, OTP, JWT, Profiles"]
        S_SCHED["slices/scheduling<br/>Booking, Slot Locking, Calendar Sync"]
        S_CLIN["slices/clinical_records<br/>EHR, Audio Watermarking, AI Scribe, JEV"]
        S_DISP["slices/dispensary<br/>Inventory, Restock, Batch Orders"]
        S_BILL["slices/billing<br/>Consultation Invoices, Payments, Logistics"]
        S_COMM["slices/communications<br/>WhatsApp Cloud, Resend Email"]
    end

    subgraph DataLayer["Canonical SSOT & Local Fallback Store"]
        DB_POSTGRES[("PostgreSQL / Supabase (Port 54321)<br/>appointments, clinic_users, invoices, records")]
        DISK_FALLBACK[("Atomic Disk Fallback<br/>(fcntl.flock + Tempfile Rename)")]
        AUDIT_STORE[("backend/data/audit_traces.jsonl<br/>Immutable HIPAA Audit Trail")]
    end

    UI_PATIENT --> APP_CTX
    UI_ADMIN --> APP_CTX
    APP_CTX --> API_CLIENT
    APP_CTX -.->|If VITE_USE_MOCK_DATA=true| MOCK_FIXTURES
    API_CLIENT -->|HTTP / JSON with X-Trace-ID| AUDIT_MID
    AUDIT_MID --> RBAC_GUARD
    RBAC_GUARD --> S_AUTH
    RBAC_GUARD --> S_SCHED
    RBAC_GUARD --> S_CLIN
    RBAC_GUARD --> S_DISP
    RBAC_GUARD --> S_BILL
    RBAC_GUARD --> S_COMM

    S_SCHED --> DB_POSTGRES
    S_CLIN --> DB_POSTGRES
    S_DISP --> DB_POSTGRES
    S_BILL --> DB_POSTGRES
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

### Role-Based Access Control (RBAC)
- **Roles**: `admin` (Doctor / Clinic Staff) and `patient`.
- **Admin-Only Endpoints**:
  - `GET /api/v1/patient-records?view=admin` (full homeopathic case files, miasmatic analysis, mental generals).
  - `POST /api/v1/inventory/{id}/restock`
  - `POST /api/v1/sync/reconcile`
  - `DELETE /api/v1/admin/alerts`
- **Patient-Safe View**:
  - `GET /api/v1/patient-records?view=mobile` redacts sensitive internal clinician notes and returns only patient-facing instructions.

### Tenant Isolation Wall
- In [`backend/slices/clinical_records/router.py`](file:///Users/nitin/Desktop/Project_Suspense/backend/slices/clinical_records/router.py), every patient endpoint checks the caller's identity against the requested record:
  ```python
  def check_phi_access_permission(target_patient_id: str, authorization: str | None) -> None:
      # If caller has role 'patient', target_patient_id MUST match their token ID.
      # If attempting to access another patient's records, raises 403 Forbidden.
  ```
- Any unauthorized access attempt triggers an automated audit entry and real-time administrator alert.

