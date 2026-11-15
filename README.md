
# [Homo_project](https://github.com/NITIN0601/Homo_project) — Microservice Healthcare Platform

[![GitHub Repository](https://img.shields.io/badge/GitHub-Homo__project-blue?logo=github)](https://github.com/NITIN0601/Homo_project)
[![Maintainer](https://img.shields.io/badge/Maintainer-NITIN0601-green?logo=github)](https://github.com/NITIN0601)
[![Python Version](https://img.shields.io/badge/Python-%3E%3D3.10%20(up%20to%203.14)-blue?logo=python)](https://www.python.org/)
[![Node Version](https://img.shields.io/badge/Node-%3E%3D20-green?logo=node.js)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/Tests-220%20Passed%20(132%20BE%20%2B%2088%20FE)-brightgreen?logo=vitest)](https://vitest.dev/)
[![License](https://img.shields.io/badge/License-MIT-purple)]()

A multi-tenant, cloud-and-edge Electronic Health Records (EHR) and clinical management platform designed for classical homeopathy practices. Maintained by [NITIN0601](https://github.com/NITIN0601) under the [Homo_project](https://github.com/NITIN0601/Homo_project) repository. Built on a decoupled microservice architecture to support independent horizontal and vertical scaling across frontend, backend, database, and API gateway services.

> [!TIP]
> **Client Onboarding & Human Evaluation**: See **[EVALUATION_GUIDE.md](EVALUATION_GUIDE.md)** for a rapid step-by-step walkthrough to run the platform on a client laptop, switch between the vanilla template and Agastya clinic branding, and test the Super Admin, Admin, and Customer portals with live sync.

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

- **Node.js**: `>= 20.x` (check with `node -v`)
- **npm**: `>= 10.x` (check with `npm -v`)
- **Python**: `>= 3.10` (Python 3.10, 3.11, 3.12, 3.13, and 3.14 fully supported; check with `python3 --version`)
- **Docker & Docker Compose**: *(Optional, required only for full containerized microservice stack)*

---

## 🚀 Step-by-Step Local Setup & Execution Guide

### Step 1: Clone and Configure Environment

```bash
# Clone the repository from GitHub
git clone https://github.com/NITIN0601/Homo_project.git
cd Homo_project

# Configure environment variables for frontend and backend:
# 1. Frontend client configuration
cp frontend/.env.example frontend/.env

# 2. Backend server configuration
cp backend/.env.example backend/.env

# 3. (Optional) Root / Docker Compose orchestration configuration
cp .env.example .env
```

The system operates out-of-the-box in local development mode with built-in zero-config JSON persistence in `backend/data/`. No external API keys or external database setup are required to start immediately.

---

### Step 2: Backend Setup (Python 3.10 - 3.14)

1. **Initialize Python Virtual Environment**:
   ```bash
   cd backend

   # Create virtual environment (use python3 or your preferred python binary)
   python3 -m venv venv

   # Activate virtual environment
   # On macOS / Linux:
   source venv/bin/activate
   # On Windows (cmd / PowerShell):
   # .\venv\Scripts\activate

   # Verify Python version
   python --version
   ```

2. **Install Backend Dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Start the Backend Development Server**:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - API Service: `http://localhost:8000`
   - Interactive Swagger API Documentation: `http://localhost:8000/docs`
   - Healthcheck & Status: `http://localhost:8000/health`
   - OpenAPI Specification: `http://localhost:8000/openapi.json`

---

### Step 3: Frontend Setup (React 19 + Vite)

In a new terminal window from the project root (`Homo_project`):

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

### Step 4: Running Both Services Concurrently (One-Command Launch)

From the project root, launch both the backend and frontend simultaneously with a single command:

```bash
npm run dev:all
```

This starts:
- **FastAPI Backend** on `http://localhost:8000` (auto-detects virtual environment in `backend/venv/`)
  - Health endpoint: `http://localhost:8000/health`
  - Swagger API docs: `http://localhost:8000/docs`
- **Vite React SPA** on `http://localhost:5173` (proxies `/api/v1` to `http://localhost:8000`)

---

### 🖥️ Accessing the 3 Core Dashboards

Once `npm run dev:all` is running, open **`http://localhost:5173`** in your browser. You can seamlessly switch between all 3 platform tiers:

#### 1. 🏥 Patient & Customer Portal (Public / Consumer)
- **URL**: `http://localhost:5173/`
- **Default View**: Public clinic landing page, doctor credentials card, and consultation slot booking.
- **Guest / Registered Access**:
  - Book as guest directly without prior sign-in.
  - Or sign in as demo patient: **`john@example.com`** / password: **`patient123`** (or click **"👤 Patient"** on the top demo header).
- **Core Capabilities**:
  - Auto-detected local timezone clock & candidate slot mapping.
  - Interactive multi-month calendar with Sunday *Prior Appointment Only* policy.
  - Pre-consultation symptom triage & doctor continuous care preference matching.
  - Personal Health Records (PHR), visit summary timeline, and remedy prescriptions.

#### 2. 🩺 Doctor / Clinic Admin Console (Hospital Admin & Clinical Lead)
- **URL**: `http://localhost:5173/` $\rightarrow$ Click **"🩺 Doctor Admin"** on the top demo banner, or log in via the avatar menu.
- **Direct Credentials**:
  - **Agastya Lead Doctor**: **`admin@agastyahomoeo.com`** / password: **`admin123`**
  - **General Clinic Admin**: **`admin@example.com`** / password: **`admin123`**
- **Core Capabilities**:
  - **Dashboard Overview**: Today's roster, active consultation status, stock alerts, and daily metrics.
  - **Appointments Hub**: Schedule and manage daily patient consultations and walk-in OPD tokens.
  - **Doctor Calendar & OOO**: Block out-of-office days, set morning/evening hours, and sync Indian festival feeds.
  - **Patient Medical Records (EHR)**: Clinical case records, remedy prescription slips, and clinical media uploads.
  - **Dispensary & Inventory**: Medicine stock levels, multi-medicine batch ordering, and real-time logistics tracking.
  - **Billing & Invoices**: Generate invoices, enter UTR bank transaction references, and confirm payment status.
  - **Customization**: Doctor profile, clinic details, feedback moderation, and security passcodes (patient feature toggles are locked to Super Admin).

#### 3. ⚡ Super Admin Dashboard (Cross-Hospital Multi-Tenant Governance)
- **URL**: Click the **"⚡ Super Admin"** badge in the top navigation bar, or log in.
- **Direct Credentials**: **`superadmin@platform.ehr`** (or `superadmin@platform.internal`) / password: **`admin123`**
- **Core Capabilities**:
  - **Platform Statistics**: Total active hospitals, onboarded physicians, platform-wide appointments, and patient volume.
  - **Multi-Tenant Hospital Fleet**: Live facility cards with real-time badges (Online Payments, Google Reviews, AI Bot).
  - **3-Tier Master Switchboard**: Granular feature enablement partitioned into:
    1. *Hospital Platform Features* (Dispensary E-Commerce, Telemedicine OPD, Google Review Prompts).
    2. *Doctor Portal Features* (AI VoiceStudio, Prescription Scan, Classical Case JSON, Contact Policies).
    3. *Patient Portal Features* (Clinical Records, Billing History, Payment Gateway, Bot, Profile Edit).
  - **Dynamic "+ Onboard Hospital" Wizard**: Decomposed 5-step modal for provisioning new hospital facilities, lead doctors, branding (logo, banner, theme colors), and custom domain slugs.

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
# Run ALL 220 tests (Backend 132 + Frontend 88)
npm run test:all

# Run only Python Backend Tests (132 test cases across 8 suites)
npm run test:backend
# Or directly: ./test/run_tests.sh

# Run only Frontend Vitest Suite (88 test cases across 8 suites)
npm run test:frontend

# Run Fast Frontend Linter (oxlint)
npm run lint

# Compile and Type-Check Production Frontend Bundle (tsc -b && vite build)
npm run build
```

---

## 🏥 Dynamic Multi-Tenant Hospital & Doctor Roster

The platform features strict multi-tenant isolation with zero hardcoded sensitive data or doctor leakages:

1. **Resolution Methods**:
   - **Query Parameter**: `http://localhost:5173/?tenant=agastya` or `http://localhost:5173/?tenant=apollo`
   - **Subdomain Routing**: `agastya.yourdomain.com` vs `apollo.yourdomain.com`
   - **HTTP Header**: `X-Tenant-ID: agastya` (sent with REST API calls)
   - **Navbar Switcher**: Interactive switcher dropdown on the top navigation bar.

2. **Decoupled Tenant Schemas**:
   - Hospital configurations: `backend/data/hospitals.json`
   - Doctor rosters: `backend/data/doctors.json`
   - Frontend tenant definitions: `frontend/src/config/tenants/`

3. **Tailored Bio vs Hospital Summary**:
   - Doctor bio is tailored to the physician's clinical degrees, experience, and certifications.
   - Hospital summary is dynamically customized per healthcare organization (e.g., NABH accreditation, foundation date, facility highlights).
   - Specialties list is cleanly partitioned at both doctor and hospital levels without duplicate entries.

4. **Super Admin Multi-Tenant Governance**:
   - Navigate to `/super-admin` (Login: `superadmin@platform.internal`).
   - Dynamically onboard new hospitals (`POST /api/v1/hospitals`) and doctors (`POST /api/v1/doctors`) with custom branding, themes, phone numbers, and consultation fees without server restarts.

---

## 🕐 Modular Cross-Timezone Scheduling Engine

Homeopathic consultations operate on a unified single source of truth in clinic time (`Asia/Kolkata` / IST) while automatically rendering accurately in any international patient's local timezone (e.g. US Eastern `America/New_York`):

- **Local Date Strictness**: When an international user selects Sunday, November 15 on their calendar, they see all slots belonging to their local Sunday date.
- **Cross-Midnight Alignment**: A Sunday morning slot at 10:00 AM IST corresponds to Saturday night 11:30 PM EST. The engine checks candidate days ($D-1, D, D+1$) so Saturday evening slots appear under Saturday and Sunday morning slots appear under Sunday.
- **Sunday Prior Appointment Rule**: Sunday clinic hours are handled strictly as *Prior Appointment Only*, providing immediate online booking clarity while notifying the user that the clinic will confirm their slot.
- **Elapsed Time Detection**: Past slots for the current day are automatically flagged and disabled in real time. If all slots for today have elapsed, the picker guides the patient with a one-click button to jump to the next available operating date.

---

## 🛡️ Zero-PHI Crash Telemetry & Error Boundary

- **Client Error Boundary**: React 19 `DashboardErrorBoundary` catches unhandled rendering errors and displays a user-friendly recovery UI with retry and report buttons.
- **Zero-PHI Sanitization**: The telemetry client (`frontend/src/utils/telemetry.ts`) aggressively scrubs patient names, emails, phone numbers, UUIDs, and JWTs from stack traces and URLs before transmission.
- **Telemetry Ingestion API**: Backend route `POST /api/telemetry/report` captures sanitized error telemetry into the forensic audit trail (`audit_traces.jsonl`) with unique incident IDs (`#inc-XXXXXX`).

---

## 🔒 Security & HIPAA Compliance

- **Atomic Double-Booking Prevention**: Database-level unique constraint on `(start_time, doctor_title)` preventing race conditions under high concurrency.
- **Role-Based Access Control (RBAC)**: Strict separation between `super_admin`, `admin`, `patient`, and `guest` roles.
- **Input Sanitization**: Pydantic v2 schemas sanitize and strip HTML/XSS and enforce numeric bounds on all billing and clinical endpoints.
- **PHI Data Protection Guard**: The `mobile_patient_view` database view strips raw audio and local disk paths before mobile access.
- **Forensic Audit Logging**: Every request is tagged with `X-Trace-ID` and `X-Session-ID` headers and logged to `backend/data/audit_traces.jsonl`.

---

## 👥 Authors & Repository

- **Project**: [Homo_project](https://github.com/NITIN0601/Homo_project)
- **Maintainer**: [NITIN0601](https://github.com/NITIN0601)
