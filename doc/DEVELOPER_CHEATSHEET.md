# Developer Cheatsheet: Where to Touch the Code
**Platform:** Enterprise Multi-Hospital Healthcare & EHR Platform (Homo_project)

When you need to make modifications or add new features, use this reference guide to locate the exact single source of truth (SSOT) files to edit.

---

## 1. Quick Directory Reference

```
Homo_project/
├── frontend/                          # Frontend (Vite + React 19 + TypeScript + FSD)
│   ├── src/
│   │   ├── app/                       # Application entry, providers, AppContext SSOT reducer
│   │   ├── entities/                  # Domain contracts (appointment, invoice, patient, session)
│   │   ├── features/                  # User flows (auth, booking-wizard, admin-dashboard)
│   │   ├── pages/                     # Route-level views (HomePage, AdminDashboard, SuperAdminDashboard)
│   │   ├── shared/                    # Reusable UI primitives, typed API client (api.ts), utils
│   │   ├── data/mocks/                # Isolated mock fixtures (medicines, accounts, inventory, visits)
│   │   └── types/                     # Shared TypeScript domain interfaces
│   └── package.json                   # Frontend dependencies & scripts
│
├── backend/                           # Backend (FastAPI + Python 3.14)
│   ├── main.py                        # Gateway mounting domain routers, rate limiters, & audit middleware
│   ├── core/                          # Cross-cutting infrastructure
│   │   ├── config.py                  # Pydantic Settings, environment variables, startup guards
│   │   ├── security.py                # Password hashing, JWT signing, PHI isolation wall, RBAC
│   │   ├── audit.py                   # AuditTraceMiddleware, 20MB rotating log handler
│   │   └── dependencies.py            # slowapi limiter, auth dependencies
│   ├── routes/                        # Domain Vertical Slices (Thin HTTP Controllers)
│   │   ├── hospital.py                # Multi-hospital provisioning, doctor management, dev mode
│   │   ├── auth.py                    # Login, CSPRNG OTP, scoped invites (/join?token=)
│   │   ├── scheduling.py              # InterProcessLock booking, slot locking, Google Calendar sync
│   │   ├── clinical_records.py        # Patient EHR, audio dictation, AI scribe, JEV model
│   │   ├── dispensary.py              # Remedy inventory, restock transactions
│   │   ├── billing.py                 # Invoices, orders, offline bank UTR reconciliation
│   │   ├── communications.py          # WhatsApp Cloud API, Resend email confirmations
│   │   └── telemetry.py               # Incident ingestion, crash telemetry, admin alerts
│   ├── services/                      # Low-level business logic & external connectors
│   │   ├── hospital_service.py        # Hospital metadata & branding SSOT
│   │   ├── doctor_service.py          # Doctor profile & roster management
│   │   ├── auth_service.py            # Account registration & credential verification
│   │   ├── data_store.py              # InterProcessLock & atomic JSON persistence SSOT
│   │   ├── supabase_service.py        # PostgREST connector & atomic fallback storage
│   │   └── ai_service.py              # LLM integration & prompt engineering
│   ├── shared/
│   │   └── http_pool.py               # Singleton httpx.AsyncClient connection pool
│   └── data/                          # Multi-tenant datastores & fallback records
│       ├── hospitals.json             # Hospital tenant registry (branding, contact, features)
│       ├── doctors.json               # Doctor directory scoped by hospital_id
│       ├── hospital_accounts.json     # User credential accounts
│       └── audit_traces.jsonl         # Bounded rotating audit trail (capped at 2GB)
│
├── db/                                # Canonical Relational Database
│   ├── schema.sql                     # PostgreSQL schema with multi-tenant hospital_id indexes
│   └── seeds/                         # Initial seeds & default hospital records
├── test/                              # Unified Test Suite (Unit, Concurrency, Security)
└── infra/                             # Docker Compose, Kong, & Nginx reverse proxy configs
```

---

## 2. Common Engineering Tasks & Exact Touchpoints

### Task 1: Adding or Customizing a Hospital Tenant
- **Dynamic Provisioning (Super Admin UI)**:
  - Log in as Super Admin (`super@example.com` / `super123`) and navigate to the Super Admin Dashboard.
  - Enter hospital details (Name, Domain/Subdomain, Address, Contact, Brand Colors, and Feature Flags).
  - Submits to `POST /api/v1/hospitals`, which atomically registers the tenant in `backend/data/hospitals.json`.
- **Pre-Configured Tenants**:
  - `default`: Base generic healthcare hospital template.
  - `agastya`: Agastya Classical Homeopathy Hospital (reference onboarding tenant).
  - `apollo`: Apollo TeleHealth & Integrated Clinics.
- **Customizing Onboarded Branding**:
  - In `backend/data/hospitals.json`, modify the tenant's `branding` block (`primaryColor`, `accentColor`, `cardRadius`, `buttonRadius`, `logoUrl`, `bannerUrl`) or `features` block (`enableECommerce`, `enableVoiceStudio`, `enablePrescriptionScan`, `enableOnlinePayments`).

---

### Task 2: Adding a New Backend Route
1. **Define Endpoint in its Domain Router**:
   Open the corresponding router in `backend/routes/` (e.g. `backend/routes/dispensary.py`).
   Add your Pydantic request model and route handler:
   ```python
   @router.post("/inventory/barcode-scan")
   async def scan_barcode_endpoint(req: BarcodeScanRequest):
       ...
   ```
2. **Expose in Typed Frontend API Client**:
   Add the typed call to [`frontend/src/shared/api/api.ts`](frontend/src/shared/api/api.ts):
   ```typescript
   export const api = {
     inventory: {
       scanBarcode: (barcode: string) => serverFetch<InventoryItem>("/inventory/barcode-scan", {
         method: "POST",
         body: JSON.stringify({ barcode }),
       }),
     },
   };
   ```
3. **Add Automated Test**:
   Add a test case in `test/test_api_endpoints.py` or `backend/tests/`.

---

### Task 3: Modifying Colors, Themes, or Styling (SSOT)
- **Do not hardcode hex codes or arbitrary CSS classes across components.**
- The frontend uses dynamic CSS custom properties injected by the `ThemeProvider`:
  - `--brand-primary`: Hospital primary color (e.g. emerald green for Agastya, navy blue for Apollo).
  - `--brand-dark`: Deep contrast shade for headers and buttons.
  - `--brand-accent`: Focus rings, highlights, and secondary badges.
  - `--radius-card` & `--radius-btn`: Corner rounding radius.
- When switching hospital tenants in the UI or navigating via subdomain, these CSS properties update dynamically without full-page reloads.

---

### Task 4: Adding or Editing Mock Data (Without Touching Code)
- **All mock data is strictly separated in `frontend/src/data/mocks/`**:
  - Remedies: `frontend/src/data/mocks/medicines.ts`
  - User accounts: `frontend/src/data/mocks/accounts.ts`
  - Inventory stock: `frontend/src/data/mocks/inventory.ts`
  - Clinical visit records: `frontend/src/data/mocks/visits.ts`
- Modifying these fixtures will **never** alter application logic or break production builds.

---

### Task 5: Switching from Mock Mode to Live Multi-Tenant Database
In your `frontend/.env` or `backend/.env`:
```bash
# Set to false to disable all mock fixtures and communicate directly with FastAPI & Supabase
VITE_USE_MOCK_DATA="false"

# Set to true to route all API calls through the FastAPI Python backend
VITE_ENABLE_PYTHON_BACKEND="true"
```
When `VITE_USE_MOCK_DATA="false"`, the application boots connected to live backend storage with strict tenant isolation.

---

### Task 6: Adding a New Database Column or Table
1. Open [`db/schema.sql`](db/schema.sql).
2. Add your table definition with `hospital_id TEXT NOT NULL DEFAULT 'default'` foreign key and index.
3. Update `backend/services/supabase_service.py` to add any query helpers.
4. If testing without a live Supabase container, ensure the corresponding data store fallback in `backend/services/data_store.py` mirrors the fields.

---

*Cross-reference: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`WIRING_AND_DATA_FLOW.md`](./WIRING_AND_DATA_FLOW.md) · [`RUN_AND_TEST_GUIDE.md`](./RUN_AND_TEST_GUIDE.md)*
