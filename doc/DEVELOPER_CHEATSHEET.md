# Developer Cheatsheet: Where to Touch the Code

When you need to make modifications or add new features, use this reference guide to locate the exact single source of truth (SSOT) files to edit.

---

## 1. Quick Directory Reference

```
Project_Suspense/
├── src/                               # Frontend (Vite + React 19 + TypeScript)
│   ├── config/                        # Frontend Configuration & Theme SSOT
│   │   ├── clinic.ts                  # Clinic name, doctor details, phone, address
│   │   ├── theme.ts                   # Hex colors, gradients, elevation shadows
│   │   ├── app.ts                     # USE_MOCK_DATA flag, backend URLs, ports
│   │   └── constants.ts               # Storage keys, placeholders, timeouts
│   ├── data/
│   │   └── mocks/                     # Dedicated Mock Fixtures (Separated from code)
│   │       ├── medicines.ts           # Mock remedy catalogue
│   │       ├── accounts.ts            # Mock doctor & patient login accounts
│   │       ├── inventory.ts           # Mock dispensary stock items
│   │       ├── visits.ts              # Mock patient clinical EHR files
│   │       ├── orders.ts              # Mock orders, appointments, invoices
│   │       └── media.ts               # Mock clinical photography & POs
│   ├── context/
│   │   └── AppContext.tsx             # Central UI state machine & reducers
│   ├── services/
│   │   ├── api.ts                     # Central typed backend HTTP client
│   │   └── voiceStudio.ts             # Audio dictation & LLM scribe client
│   ├── pages/                         # Route pages (AdminDashboard, AppointmentsPage, CartPage)
│   └── components/                    # Reusable UI widgets & modals
│
├── backend/                           # Backend (FastAPI + Python 3.14)
│   ├── main.py                        # Minimal gateway mounting slice routers & audit middleware
│   ├── core/                          # Cross-cutting core infrastructure
│   │   ├── config.py                  # Pydantic Settings, environment variables
│   │   ├── security.py                # Password hashing, JWT verification, RBAC guards
│   │   └── audit.py                   # AuditTraceMiddleware, session & trace tagging
│   ├── slices/                        # Domain Vertical Slices
│   │   ├── auth/                      # Login, registration, OTP verification
│   │   ├── scheduling/                # Appointments, calendar sync, slot locking, blocked dates
│   │   ├── clinical_records/          # Patient EHR, audio recording, AI scribe, JEV model
│   │   ├── dispensary/                # Inventory stock, restock transactions
│   │   ├── billing/                   # Consultation invoices, orders, offline payment validation
│   │   └── communications/            # WhatsApp Cloud API, Resend email confirmations
│   ├── services/                      # Low-level service connectors (Supabase, Google Calendar, LLM)
│   └── data/                          # Immutable audit logs & atomic disk fallback
│
├── supabase/
│   └── init.sql                       # Canonical PostgreSQL Schema & Unique Constraints
└── test/                              # Unified Test Suite (Unit, Concurrency, Security)
```

---

## 2. Common Engineering Tasks & Exact Touchpoints

### Task 1: Adding a New Backend Route
1. **Define Endpoint in its Slice**:
   Open the corresponding slice router (e.g. `backend/slices/dispensary/router.py`).
   Add your Pydantic request model and route handler:
   ```python
   @router.post("/inventory/barcode-scan")
   async def scan_barcode_endpoint(req: BarcodeScanRequest):
       ...
   ```
2. **Expose in Typed Frontend Client**:
   Add the method to [`src/services/api.ts`](file:///Users/nitin/Desktop/Project_Suspense/src/services/api.ts):
   ```typescript
   export const api = {
     inventory: {
       scanBarcode: (barcode: string) => fetchApi<InventoryItem>("/inventory/barcode-scan", {
         method: "POST",
         body: JSON.stringify({ barcode }),
       }),
     },
   };
   ```
3. **Add Unit Test**:
   Add test case to `test/test_api_endpoints.py`.

---

### Task 2: Modifying Colors, Themes, or Styling (SSOT)
- **Do not hardcode hex codes or Tailwind arbitrary classes across components.**
- Open [`src/config/theme.ts`](file:///Users/nitin/Desktop/Project_Suspense/src/config/theme.ts):
  - Primary, Sage, Emerald, Amber, and Slate palettes are defined here.
  - Gradients (`THEME_GRADIENTS`) and elevation shadows (`THEME_SHADOWS`) are centralized here.
  - Any edit here automatically updates buttons, headers, cards, and badges across the entire application.

---

### Task 3: Modifying Clinic Branding, Address, or Doctor Details (SSOT)
- Open [`src/config/clinic.ts`](file:///Users/nitin/Desktop/Project_Suspense/src/config/clinic.ts):
  - Edit `CLINIC.FULL_NAME`, `CLINIC.DOCTOR_NAME`, `CLINIC.PHONE_DISPLAY`, or `CLINIC.ADDRESS`.
  - Automatically cascades across the Navigation Bar, Footer, Consultation Invoices, Appointment Email Confirmations, and Calendar events.

---

### Task 4: Adding or Editing Mock Data (Without Touching Code)
- **All mock data is strictly separated in `src/data/mocks/`**:
  - Edit medicines: `src/data/mocks/medicines.ts`
  - Edit accounts: `src/data/mocks/accounts.ts`
  - Edit inventory: `src/data/mocks/inventory.ts`
  - Edit visit summaries: `src/data/mocks/visits.ts`
- Modifying these files will **never** alter application logic or break production builds.

---

### Task 5: Switching from Mock Data to Live Database Mode
In your `.env` or `.env.local`:
```bash
# Set to false to disable all mock data and connect directly to FastAPI & Supabase
VITE_USE_MOCK_DATA="false"

# Set to true to enable FastAPI Python backend
VITE_ENABLE_PYTHON_BACKEND="true"
```
When `VITE_USE_MOCK_DATA="false"`, the application boots with clean empty states and populates live data from the server.

---

### Task 6: Adding a New Database Column or Table
1. Open [`supabase/init.sql`](file:///Users/nitin/Desktop/Project_Suspense/supabase/init.sql).
2. Add your table definition with appropriate constraints and Row-Level Security (RLS) policies.
3. Update `backend/services/supabase_service.py` to include any query helpers.
4. If testing without live Supabase, ensure the corresponding data store fallback in `backend/services/data_store.py` mirrors the fields.

