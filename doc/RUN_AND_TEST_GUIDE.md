# Run & Test Guide: Running Frontend & Backend Separately or Together
**Platform:** Enterprise Multi-Hospital Healthcare & EHR Platform (Homo_project)

This guide provides exact commands to run, debug, and test both frontend and backend layers independently or concurrently.

---

## 1. Environment & Port Allocations

| Service | Default Port | Description |
| :--- | :--- | :--- |
| **Backend (FastAPI)** | `http://127.0.0.1:8000` | Python REST API gateway, domain microservices, & audit middleware |
| **Frontend (Multi-Tenant SPA)** | `http://localhost:5173` | Vite development server serving Super Admin, Doctor, & Patient portals |
| **Database (Supabase / Postgres)** | `http://127.0.0.1:54321` | Local Docker Compose PostgREST / PostgreSQL instance |

---

## 2. Running Backend and Frontend Separately

### Option A: Running the Backend (FastAPI) Independently

1. **Activate Python Virtual Environment**:
   ```bash
   source backend/venv/bin/activate
   ```

2. **Start the Uvicorn Server**:
   ```bash
   uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
   ```

3. **Verify Health, Readiness & Interactive API Docs**:
   - Readiness probe: `curl http://127.0.0.1:8000/api/v1/health/ready`
   - Health check: `curl http://127.0.0.1:8000/api/v1/health`
   - Interactive Swagger documentation: `http://127.0.0.1:8000/docs`
   - OpenAPI schema JSON: `http://127.0.0.1:8000/openapi.json`

---

### Option B: Running the Frontend (Vite) Independently

1. **Install Dependencies** (if first time):
   ```bash
   cd frontend
   npm install
   ```

2. **Start Vite Dev Server**:
   ```bash
   npm run dev
   ```
   - Opens on `http://localhost:5173`.
   - The Vite dev server automatically proxies `/api` and `/api/v1` traffic to `http://127.0.0.1:8000` when the backend is online.
   - If the backend is not running and `VITE_USE_MOCK_DATA="true"`, the frontend smoothly operates in standalone demo mode with mock fixtures.

---

## 3. Running Frontend and Backend Together

Run both in separate terminal windows, or launch them together using Docker Compose:

### Option A: Two Terminals
```bash
# Terminal 1: Backend
backend/venv/bin/python -m uvicorn main:app --app-dir backend --port 8000 --reload

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Option B: One-Command Docker Compose
```bash
docker compose -f infra/docker-compose.yml up --build -d
```

---

## 4. Multi-Hospital Tenant Evaluation

The platform supports on-demand switching between hospital tenants without server restarts:

1. **Default Hospital Template**:
   - URL: `http://localhost:5173`
   - Neutral base template with standard medical branding.
2. **Agastya Classical Homeopathy (Reference Onboarded Tenant)**:
   - Select "Agastya Classical Homeopathy" from the hospital dropdown or pass `?tenant=agastya`.
   - Dynamically loads botanical branding, emerald color scheme, and homeopathic repertory features.
3. **Apollo TeleHealth & Integrated Clinics**:
   - Select "Apollo TeleHealth" or pass `?tenant=apollo`.
   - Dynamically loads navy clinical palette and multi-doctor teleconsultation roster.
4. **Super Admin Provisioning**:
   - Access `http://localhost:5173/super-admin-dashboard` (login: `super@example.com` / `super123`).
   - Provision a new hospital dynamically with custom branding, contact details, and feature toggles.

---

## 5. Testing & Quality Verification Suites

### 1. Run Complete Backend Microservice & Security Tests
Runs all unit tests, route protection, HIPAA PHI tenant isolation, payment validation, email simulation, 3-tier RBAC, and scaling quota enforcements:
```bash
PYTHONPATH=backend ./backend/venv/bin/python -m unittest discover backend/tests
```
*Expected Output*:
```
Ran 24 tests in ~0.20s
OK
```

### 2. Run Targeted Concurrency, Data Store & Auth Tests
```bash
./backend/venv/bin/python -m unittest test/test_auth.py test/test_otp_security.py test/test_jwt_expiry.py test/test_audit_lock.py test/test_payment_validator.py test/test_config_validation.py test/test_feature_flags.py test/test_data_store.py test/test_security_patches.py
```
*Expected Output*:
```
Ran 47 tests in ~0.25s
OK
```

### 3. Run Frontend Vitest Suite (16 Test Files, 148 Tests)
```bash
cd frontend && npm test
```
*Expected Output*:
```
Test Files  16 passed (16)
Tests       148 passed (148)
```

### 4. Run TypeScript Compilation & Architecture Boundary Checker
```bash
node ./node_modules/typescript/bin/tsc -b frontend/tsconfig.app.json
node frontend/scripts/check-architecture.mjs
```
*Expected Output*:
```
[Architecture Check Passed] All architectural boundaries and dependency directions are respected.
```

---

*Cross-reference: [`ARCHITECTURE.md`](./ARCHITECTURE.md) · [`WIRING_AND_DATA_FLOW.md`](./WIRING_AND_DATA_FLOW.md) · [`DEVELOPER_CHEATSHEET.md`](./DEVELOPER_CHEATSHEET.md)*
