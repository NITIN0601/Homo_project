# Run & Test Guide: Running Frontend & Backend Separately or Together

This guide provides exact commands to run, debug, and test both frontend and backend layers independently or concurrently.

---

## 1. Environment & Port Allocations

| Service | Port | Description |
| :--- | :--- | :--- |
| **Backend (FastAPI)** | `http://127.0.0.1:8000` | Python REST API gateway & slice routers |
| **Frontend (Patient Portal)** | `http://localhost:5173` | Vite development server (Patient View) |
| **Frontend (Doctor Console)** | `http://localhost:5174` | Vite development server (Doctor View) |
| **Database (Supabase / Postgres)** | `http://127.0.0.1:54321` | Local PostgREST / PostgreSQL instance |

---

## 2. Running Backend and Frontend Separately

### Option A: Running the Backend (FastAPI) Independently

1. **Activate Python Virtual Environment**:
   ```bash
   cd /Users/nitin/Desktop/Project_Suspense
   source backend/venv/bin/activate
   ```

2. **Start the Uvicorn Server**:
   ```bash
   uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
   ```

3. **Verify Health & Interactive API Docs**:
   - Health check: `curl http://127.0.0.1:8000/api/v1/sync/status`
   - Interactive Swagger documentation: `http://127.0.0.1:8000/docs`
   - OpenAPI schema JSON: `http://127.0.0.1:8000/openapi.json`

---

### Option B: Running the Frontend (Vite) Independently

1. **Install Dependencies** (if first time):
   ```bash
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

Run both in separate terminal windows, or launch them together using background processes:
```bash
# Terminal 1: Backend
backend/venv/bin/python -m uvicorn main:app --app-dir backend --port 8000 --reload

# Terminal 2: Frontend
npm run dev
```

---

## 4. Testing & Quality Verification Suites

### 1. Run Complete Backend Unit & Security Test Suite (63 Tests)
Runs all unit tests, route protection, HIPAA PHI tenant isolation, payment validation, and email simulation:
```bash
bash test/run_tests.sh
```
*Expected Output*:
```
Ran 63 tests in ~1.05s
OK. All tests passed successfully!
```

---

### 2. Run High-Concurrency 100-User Stress Test
Simulates 100 parallel worker threads executing concurrent slot bookings, inventory restocks, and invoice creations to verify zero race conditions and zero deadlocks:
```bash
backend/venv/bin/python test/test_load_100_users.py
```
*Expected Output*:
```
Ran 1 test in ~0.65s
OK (All 100 parallel user tasks completed successfully with 0 double-bookings)
```

---

### 3. Run Frontend State Machine & Reducer Tests (Vitest)
Executes the Vitest unit tests verifying appointment booking actions, invoice creation, payment status transitions, and cart state machine:
```bash
npx vitest run
```
*Expected Output*:
```
Test Files  1 passed (1)
Tests       12 passed (12)
Duration    ~400ms
```

---

### 4. Run TypeScript Compilation & Production Build
Checks for TypeScript strict typing errors and compiles production chunks:
```bash
npm run build
```
*Expected Output*:
```
✓ 321 modules transformed.
dist/index.html ...
✓ built in ~430ms with 0 errors
```

