# [Homo_project](https://github.com/NITIN0601/Homo_project) — Microservice Healthcare Platform

[![GitHub Repository](https://img.shields.io/badge/GitHub-Homo__project-blue?logo=github)](https://github.com/NITIN0601/Homo_project)
[![Maintainer](https://img.shields.io/badge/Maintainer-NITIN0601-green?logo=github)](https://github.com/NITIN0601)
[![Python Version](https://img.shields.io/badge/Python-3.14-blue?logo=python)](https://www.python.org/)
[![Node Version](https://img.shields.io/badge/Node-%3E%3D20-green?logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-purple)]()

A multi-tenant, cloud-and-edge Electronic Health Records (EHR) and clinical management platform designed for classical homeopathy practices. Maintained by [NITIN0601](https://github.com/NITIN0601) under the [Homo_project](https://github.com/NITIN0601/Homo_project) repository. Built on a decoupled microservice architecture to support independent horizontal and vertical scaling across frontend, backend, database, and API gateway services.

---

## 🏛 Microservice Architecture & Scaling Strategy

```
                                  ┌────────────────────────┐
                                  │   Clients / Web View   │
                                  │ (Desktop, Tablet, iOS) │
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      │                                               │
                      ▼                                               ▼
          ┌───────────────────────┐                       ┌───────────────────────┐
          │   Frontend Service    │                       │  API Gateway / Proxy  │
          │    (Port 5173/80)     │                       │     (Port 54321)      │
          │  React 19 + TypeScript│                       │     Kong / Nginx      │
          └───────────────────────┘                       └───────────┬───────────┘
                                                                      │
                                          ┌───────────────────────────┴───────────────────────────┐
                                          ▼                                                       ▼
                              ┌───────────────────────┐                               ┌───────────────────────┐
                              │  Backend API Service  │                               │   Database Service    │
                              │      (Port 8000)      │◀─────────────────────────────▶│      (Port 5432)      │
                              │ FastAPI + Python 3.14 │                               │ PostgreSQL 15 / GIN   │
                              └───────────────────────┘                               └───────────────────────┘
```

### Modular Microservices

1. **Frontend Service (`frontend/`)**:
   - Single-Page Application (SPA) powered by React 19, TypeScript, Vite, and Tailwind CSS v4.
   - Dynamic multi-tenant branding, role-based views (Patient Portal & Doctor/Admin Console), and offline state caching.
   - **Horizontal Scaling**: Stateless static assets served globally via CDN or containerized Nginx Alpine instances.

2. **Backend API Service (`backend/`)**:
   - High-throughput asynchronous REST API built with FastAPI and **Python 3.14**.
   - Modular domains: scheduling, multi-doctor roster, repertory AI analysis, billing/UTR reconciliation, and HIPAA-compliant audit tracing.
   - **Horizontal Scaling**: Stateless ASGI uvicorn workers scaled behind an API gateway or Kubernetes deployment with zero shared in-memory state.

3. **Database Service (`db/`)**:
   - Production PostgreSQL 15+ schema with GIN indexes on repertory JSONB analysis and atomic database constraints preventing appointment double-booking.
   - Native support for both local development (zero-config local JSON persistence fallback) and cloud-managed Supabase / PostgreSQL.
   - **Vertical/Horizontal Scaling**: Read-replicas for repertory searches and write-primary for clinical records and scheduling.

4. **Gateway & Infrastructure (`infra/`)**:
   - Kong Gateway declarative routing and Nginx reverse proxy with CORS, security headers, and rate limiting.

---

## 📂 Repository Structure

```
Homo_project/
├── frontend/                  # React 19 + TypeScript + Vite Workspace
│   ├── src/                   # Components, contexts, pages, hooks, services, types
│   ├── public/                # Static assets, branding logos, banners
│   ├── vite.config.ts         # Vite build configuration & local API reverse proxy
│   └── package.json           # Frontend dependency manifest
├── backend/                   # FastAPI Asynchronous Core Engine (Python 3.14)
│   ├── routes/                # Modular REST endpoints (/api/v1/...)
│   ├── services/              # Business logic (doctor, hospital, auth, appointments, sync)
│   ├── models/                # Pydantic validation models
│   ├── data/                  # Dynamic tenant datastores (hospitals.json, doctors.json)
│   ├── main.py                # FastAPI app bootstrap & middleware pipeline
│   ├── Dockerfile             # Python 3.14-slim production container
│   ├── requirements.txt       # Pinned Python dependencies
│   └── venv/                  # Python 3.14 virtual environment
├── db/                        # Database Schemas, Migrations & Seed Data
│   ├── schema.sql             # Consolidated PostgreSQL / Supabase DDL
│   ├── migrations/            # Versioned migration files (001_initial_schema.sql)
│   ├── seeds/                 # Fixtures (medicines catalogue, admin/demo users)
│   └── README.md              # Database documentation & ERD guide
├── infra/                     # Infrastructure & Deployment Orchestration
│   ├── docker-compose.yml     # Multi-service stack (db, rest, auth, storage, backend, frontend)
│   ├── Dockerfile             # Multi-stage Nginx frontend build
│   ├── nginx.conf             # Production Nginx reverse-proxy configuration
│   └── gateway/               # Kong API Gateway declarative routing rules (kong.yml)
├── test/                      # Unified Test Harness
│   ├── run_tests.sh           # Backend test runner (79 tests)
│   └── test_*.py              # Modular test suites (security, auth, booking, multi-tenant)
├── doc/                       # System Architecture, HLD/LLD diagrams, and technical reviews
├── scripts/                   # Developer utilities and holiday synchronization scripts
├── .env.example               # Clean client environment template (zero PII)
├── package.json               # Root npm workspace manifest delegating monorepo tasks
└── README.md                  # Project documentation (this file)
```

---

## ⚙️ Prerequisites

Before launching locally, ensure you have the following installed:

- **Node.js**: `>= 20.x`
- **npm**: `>= 10.x`
- **Python**: `3.14.x` (check with `python3 --version`)
- **Docker & Docker Compose**: *(Optional, required only for full containerized stack)*

---

## 🚀 Step-by-Step Local Setup & Execution Guide

### Step 1: Clone and Configure Environment

```bash
# Clone the repository from GitHub
git clone https://github.com/NITIN0601/Homo_project.git Homo_project
cd Homo_project

# Copy the example environment variables
cp .env.example .env
cp backend/.env.example backend/.env
```

The system operates out-of-the-box in local development mode without requiring external API keys.

---

### Step 2: Backend Setup (Python 3.14)

1. **Verify or Initialize Python 3.14 Virtual Environment**:
   ```bash
   cd backend

   # Create virtual environment with Python 3.14 (if not already present)
   python3.14 -m venv venv

   # Activate virtual environment
   source venv/bin/activate

   # Verify Python version is 3.14
   python --version
   ```

2. **Install Pinned Dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Start the Backend Development Server**:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
   - API is live at: `http://localhost:8000`
   - Interactive Swagger API Documentation: `http://localhost:8000/docs`
   - OpenAPI Specification: `http://localhost:8000/openapi.json`

---

### Step 3: Frontend Setup (React 19 + Vite)

From the project root:

1. **Install Node Dependencies**:
   ```bash
   npm install
   ```

2. **Launch the Frontend Development Server**:
   ```bash
   npm run dev
   ```
   - Web application is live at: `http://localhost:5173`

---

### Step 4: Running Both Services Concurrently

From the project root, launch both the backend and frontend simultaneously with a single command:

```bash
npm run dev:all
```

---

### Step 5: Database Setup (PostgreSQL / Supabase)

#### Option A: Zero-Config Local Development (Default)
The application automatically starts with local file persistence in `backend/data/` if PostgreSQL is not detected. No database installation is required for quick prototyping.

#### Option B: Self-Hosted PostgreSQL / Supabase
To run a production-identical PostgreSQL database with full GIN indexing and Row-Level Security:

```bash
# Start only the PostgreSQL database and PostgREST API
docker compose -f infra/docker-compose.yml up -d db rest
```

The database container will automatically execute `db/schema.sql` and `db/seeds/001_seed_initial_data.sql`.

---

### Step 6: Full Containerized Stack (Docker Compose)

To spin up the entire microservice fleet in Docker (PostgreSQL, PostgREST, GoTrue Auth, Storage, Kong Gateway, Studio GUI, Backend, and Frontend):

```bash
docker compose -f infra/docker-compose.yml up --build -d
```

| Service | Container Name | URL / Port |
| :--- | :--- | :--- |
| **Frontend UI** | `agastya-ehr-frontend` | `http://localhost:5173` |
| **FastAPI Backend** | `agastya-ehr-backend` | `http://localhost:8000` |
| **Kong API Gateway** | `agastya-ehr-gateway` | `http://localhost:54321` |
| **Supabase Studio GUI**| `agastya-ehr-studio` | `http://localhost:54323` |
| **PostgreSQL Database**| `agastya-ehr-db` | `localhost:5432` |

To stop the containers:
```bash
docker compose -f infra/docker-compose.yml down
```

---

## 🧪 Testing & Code Quality

Run tests and linters across the entire stack from the root directory:

```bash
# Run ALL tests (Backend + Frontend)
npm run test:all

# Run only Python Backend Tests (79 test cases)
npm run test:backend
# Or directly: ./test/run_tests.sh

# Run only Frontend Vitest Suite (40 test cases)
npm run test:frontend

# Run Fast Frontend Linter (oxlint)
npm run lint

# Compile and Type-Check Production Frontend Bundle
npm run build
```

---

## 🏥 Multi-Tenant Hospital & Doctor Configuration

The application natively supports multi-tenant operation. Hospital settings, branding, and doctor rosters are dynamically resolved via:

1. **Subdomain Resolution**: `agastya.yourdomain.com` vs `apollo.yourdomain.com`
2. **Query Parameter**: `http://localhost:5173/?tenant=agastya` or `http://localhost:5173/?tenant=apollo`
3. **HTTP Header**: `X-Tenant-ID: agastya` (sent to `/api/v1/...` backend endpoints)

Hospital configurations are decoupled in `backend/data/hospitals.json` and doctor rosters in `backend/data/doctors.json`.

---

## 🔒 Security & HIPAA Compliance

- **Atomic Double-Booking Prevention**: Database-level unique constraint on `(start_time, doctor_title)`.
- **Role-Based Access Control (RBAC)**: Admin routes enforce JWT bearer verification and role checking.
- **PHI Data Protection Guard**: The `mobile_patient_view` database view strips raw audio and local disk paths before mobile access.
- **Audit Logging**: Every request is tagged with `X-Trace-ID` and `X-Session-ID` headers and logged to `audit_traces.jsonl`.

---

## 👥 Authors & Repository

- **Project**: [Homo_project](https://github.com/NITIN0601/Homo_project)
- **Maintainer**: [NITIN0601](https://github.com/NITIN0601)
