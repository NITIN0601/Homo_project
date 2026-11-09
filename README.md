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

## ✨ Features Overview

The platform provides two dedicated, role-tailored web interfaces backed by modular microservices:

### 🏥 1. Patient & Customer Portal
- **Atomic Online Consultation Booking**: Interactive calendar picker with real-time slot availability, conflict detection, and calendar invite generation.
- **Personal Health Record (PHR) / My Summary**: Secure access to medical consultations, clinical case summaries, diagnosis timeline, and symptom progression records.
- **Prescription & Remedy Viewer**: Clear display of prescribed homeopathic remedies, potencies (30C, 200C, 1M, 6X), dosage forms (globules, drops, tissue salts), frequency, and dietary guidelines.
- **Online Medicine Dispensary & Cart**: Seamless ordering of prescribed remedies with formulation information, real-time stock status, price calculations (INR), and delivery checkout.
- **Billing & Invoice Management**: Transparent consultation fee breakdown, payment simulation (UPI, Cards, NetBanking), transaction reference (UTR) tracking, and printable tax receipts.
- **Follow-Up & Feedback Management**: Post-consultation recovery status reporting, automated follow-up due date alerts, and patient satisfaction feedback.
- **AI Health Assistant (AgastyaBot)**: Integrated chat widget providing instant answers to patient inquiries, clinic hours, booking assistance, and remedy precautions.
- **Mobile Worker Mode**: Lightweight, high-performance PWA view optimized for field health workers and low-bandwidth connections.

### 🩺 2. Doctor & Clinical Administration Console
- **Multi-Tenant Medical Center Switching**: Instant toggle between hospital tenants (e.g., *Agastya Classical Homeopathy* vs *Apollo TeleHealth*) with dynamic theme and roster adaptation.
- **AI Voice Repertorization & Clinical Scribe**: Real-time voice recording / audio upload with automated transcription, symptom extraction, miasmatic predominance analysis (Psora, Sycosis, Syphilis, Tubercular), and structured case record generation via Gemini / TypeSafe Jev.
- **Comprehensive Patient Records Browser**: Full clinical history search with JSONB repertorization queries, thermal states, cravings/aversions, modalities, and mental/emotional symptoms.
- **Prescription Scanner & Media Capture**: Mobile camera scanner and image upload pipeline with automatic SHA-256 deduplication and anti-spam hashing.
- **Appointments & Leave Management**: Daily/weekly calendar scheduling, appointment status updates (confirmed, completed, cancelled), and doctor leave/out-of-office blocking with reason templates.
- **Dispensary & Inventory Control**: Real-time stock tracking, automated reorder thresholds, low-inventory alerts, one-click restock, batch order consolidation, and purchase orders.
- **Logistics & Dispatch Operations**: Order fulfillment dashboard, courier partner tracking (BlueDart, etc.), tracking ID assignment, and delivery lifecycle management.
- **Billing Ledger & UTR Reconciliation**: Financial invoice ledger, admin UTR payment verification modal, manual status overrides, and Excel/CSV export capabilities.
- **White-Label Customization Panel**: Granular admin toggles for portal features (e-Commerce, billing, PHR visibility, chatbot, profile editing) with passcode protection and audit logging.

### 👑 3. Super Admin & Multi-Hospital Platform Governance
- **3-Tier Role-Based Access Control (RBAC)**:
  - `super_admin`: Cross-hospital platform administrator with master tenant creation rights and platform-wide dev mode toggles. Can access hospital admin views but regular admins can never access super admin privileges.
  - `admin`: Clinic-specific director with full authority over doctor rosters, patient records, inventory, and clinical scheduling.
  - `patient` / `guest`: Consumer portal with self-service registration scoped strictly to the selected clinic tenant.
- **Dynamic Hospital & Doctor Onboarding**:
  - Add new hospitals (`POST /api/v1/hospitals`) on the fly with custom branding, themes, addresses, and domains.
  - Provision doctors (`POST /api/v1/doctors`) under specific clinics with specialized credentials and consultation fees.
- **Phase 1 Platform Scaling Quotas**:
  - Enforced limits: Maximum **5 Super Admins**, **10 Hospital Admins**, and **1,000 Customers per hospital**.
- **User Invite & Secure Onboarding Flow**:
  - Send email/secure link invitations (`POST /api/v1/auth/invite`) with cryptographic single-use redemption tokens (`/join?token=...`).
- **Developer Mode & Live Mock/Real Sync**:
  - Super Admin toggle (`POST /api/v1/platform/toggle-dev-mode`) and environment flags (`USE_MOCK_DATA`) enabling seamless switching between live Supabase data and mock datastores.

### 🔒 4. Enterprise Security & Concurrency
- **Atomic Double-Booking Prevention**: Database-level unique constraint on `(start_time, doctor_title)` preventing race conditions across 100+ concurrent users.
- **HIPAA PHI Privacy Guard**: Sanitized database views (`mobile_patient_view`) preventing internal server file paths from reaching client mobile applications.
- **Forensic Audit Pipeline**: Automated `X-Trace-ID` and `X-Session-ID` injection on every request, recorded in an append-only audit trace ledger.
- **Zero-Config Local Development**: Built-in JSON fallback engine enabling immediate offline testing without installing PostgreSQL.

---

## 📂 Repository Structure

```
Homo_project/
├── frontend/                  # React 19 + TypeScript + Vite Workspace
│   ├── src/                   # Components, contexts, pages, hooks, services, types
│   ├── public/                # Static assets, branding logos, banners
│   ├── vite.config.ts         # Vite build configuration & local API reverse proxy
│   ├── .env.example           # Frontend Vite client environment template
│   └── package.json           # Frontend dependency manifest
├── backend/                   # FastAPI Asynchronous Core Engine (Python 3.14)
│   ├── routes/                # Modular REST endpoints (/api/v1/...)
│   ├── services/              # Business logic (doctor, hospital, auth, appointments, sync)
│   ├── models/                # Pydantic validation models
│   ├── data/                  # Dynamic tenant datastores (hospitals.json, doctors.json)
│   ├── main.py                # FastAPI app bootstrap & middleware pipeline
│   ├── Dockerfile             # Python 3.14-slim production container
│   ├── requirements.txt       # Pinned Python dependencies
│   ├── .env.example           # Backend FastAPI server environment template
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
│   ├── run_tests.sh           # Backend test runner (113 tests)
│   └── test_*.py              # Modular test suites (security, auth, booking, multi-tenant, platform management)
├── doc/                       # System Architecture, HLD/LLD diagrams, and technical reviews
├── scripts/                   # Developer utilities and holiday synchronization scripts
├── .env.example               # Root monorepo & Docker Compose environment template
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

# Configure environment variables for frontend and backend:
# 1. Frontend client configuration
cp frontend/.env.example frontend/.env

# 2. Backend server configuration
cp backend/.env.example backend/.env

# 3. (Optional) Root / Docker Compose orchestration configuration
cp .env.example .env
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

1. **Ensure root `.env` is configured**:
   ```bash
   cp .env.example .env
   ```

2. **Launch all 8 container services in detached mode**:
   ```bash
   docker compose -f infra/docker-compose.yml up --build -d
   ```

#### 🚢 Microservice Fleet Map

| Service | Container Name | Host URL / Port | Internal Architecture Role |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | `agastya-ehr-frontend` | `http://localhost:5173` | React 19 SPA, dynamic tenant theme, multi-role portal |
| **FastAPI Backend** | `agastya-ehr-backend` | `http://localhost:8000` | Asynchronous Python 3.14 core, RBAC, clinical logic, AI scribe |
| **Kong API Gateway** | `agastya-ehr-gateway` | `http://localhost:54321` | Declarative reverse-proxy routing and rate-limiting |
| **Supabase Studio GUI** | `agastya-ehr-studio` | `http://localhost:54323` | Visual database manager & schema inspector |
| **PostgreSQL Database** | `agastya-ehr-db` | `localhost:5432` | Relational SSOT, GIN indexes, RLS, double-booking constraints |
| **PostgREST REST API** | `agastya-ehr-rest` | `http://localhost:54321/rest/v1` | Direct SQL-to-REST translation layer |
| **GoTrue Auth Engine** | `agastya-ehr-auth` | `http://localhost:54321/auth/v1` | Local user authentication, JWT issuer & session tokens |
| **Storage Engine** | `agastya-ehr-storage` | `http://localhost:54321/storage/v1` | Local S3-compatible document, audio & prescription storage |

To view real-time fleet logs:
```bash
docker compose -f infra/docker-compose.yml logs -f
```

To stop the microservice fleet:
```bash
docker compose -f infra/docker-compose.yml down
```

---

## 🧪 Testing & Code Quality

Run tests and linters across the entire stack from the root directory:

```bash
# Run ALL tests (Backend + Frontend)
npm run test:all

# Run only Python Backend Tests (113 test cases)
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
