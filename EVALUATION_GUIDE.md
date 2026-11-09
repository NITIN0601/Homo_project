# Multi-Tenant EHR Healthcare Platform — Client Evaluation & Onboarding Guide

This runbook is designed for running and demonstrating the application on a client or evaluator laptop immediately after pulling from Git.

The repository initializes with a **neutral vanilla layout template** by default. From there, you can either **instantly load the Agastya clinic configuration** or use the **Super Admin GUI** to enter and live-sync custom clinic details without editing code or restarting servers.

---

## 🚀 Quick Setup (Client Laptop)

### 1. Clone & Enter Repository
```bash
git clone https://github.com/NITIN0601/Homo_project.git
cd Homo_project
```

### 2. Start the Application

Choose **Option A** (Docker) or **Option B** (Local Dev):

#### Option A: One-Command Docker Compose (Recommended)
```bash
docker compose -f infra/docker-compose.yml up --build -d
```
*Frontend runs on `http://localhost:5173` • Backend on `http://localhost:8000`*

#### Option B: Local Development Mode

**Terminal 1 — Backend (Python 3.12+):**
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

**Terminal 2 — Frontend (Node 20+):**
```bash
cd frontend
npm install
npm run dev
```

The application is now live at **`http://localhost:5173`**.

---

## 🏥 Evaluating Clinic Customization: 2 Ways

### Method 1: Instant Agastya Profile (One-Click URL Parameter)

To view the platform fully branded for **Agastya Classical Homeopathy Clinic**, simply open:

👉 **[http://localhost:5173/?tenant=agastya](http://localhost:5173/?tenant=agastya)**

What automatically loads:
- **Branding**: Agastya emerald & forest green theme (`#1b4332`).
- **Attending Physician**: Dr. Bramarambha K, MD (Homeopathic Materia Medica), SCPH.
- **AI Chatbot**: Automatically branded as **AgastyaBot** with tailored homeopathy FAQs.
- **Clinic Address**: Malleshwaram, Bengaluru with operational hours & consultation slots.
- **Dispensary Logistics**: Central Pharmacy Malleshwaram courier routing.

*To compare against the neutral vanilla template, open [http://localhost:5173/](http://localhost:5173/).*  
*To compare against Apollo Tele-Care, open [http://localhost:5173/?tenant=apollo](http://localhost:5173/?tenant=apollo).*

---

### Method 2: Non-Coder Super Admin GUI (Live Sync Customization)

If a non-technical user or client administrator wants to enter clinic details through the UI and click "Save", follow these steps:

#### Step 1: Log in to the Admin Dashboard
1. Open **`http://localhost:5173/admin`** in your browser.
2. Sign in with the administrative credentials:
   - **Email**: `admin@example.com` *(or `doctor@agastyahomoeo.com`)*
   - **Password**: `admin123`

#### Step 2: Open the "Customization" Tab
Click on the **🎛️ Customization** tab on the navigation bar.

#### Step 3: Choose Your Customization Flow

##### Option A: Pre-fill All Agastya Details Instantly
At the top of the Customization screen, locate the **Active Hospital** dropdown:
- Select **`Agastya Classical Homeopathy Clinic (agastya)`**.
- All form inputs (hospital name, doctor bio, qualifications, contact numbers, branding colors, and feature flags) will immediately populate with Agastya's data.

##### Option B: Enter Any Custom Clinic Details Manually
Type directly into the intuitive form fields:
1. **Clinic Identity**:
   - Hospital Name: `Agastya Classical Homeopathy Clinic`
   - Short Name: `Agastya Clinic`
   - Tagline: `Gentle Healing, Lasting Wellness`
   - Contact Phone: `+91 98450 12345`
   - Support Email: `admin@agastyahomoeo.com`
   - Address: `Malleshwaram, Bengaluru, Karnataka – 560003`
2. **Attending Doctor Profile**:
   - Name: `Dr. Bramarambha K.`
   - Title: `Dr. Bramarambha K, MD (Homeopathic Materia Medica), SCPH`
   - Qualifications: `Homoeopathic Physician | MD in Materia Medica | SCPH-Certified`
   - Experience: `6 Years`
   - Specialties: `Classical Homeopathy, Chronic Pathology, Paediatric Immunity`
3. **Custom Branding**:
   - Primary Brand Color: `#1b4332`
   - Accent Color: `#40916c`
   - Neutral Background: `#fafaf9`
4. **Feature Toggles (Customer View & Portal Access)**:
   - Toggle **E-Commerce / Remedy Dispensary** ON or OFF
   - Toggle **AI Assistant Bot** ON or OFF
   - Toggle **Online Payments & Checkout** ON or OFF
   - Toggle **Telemedicine / Remote Video** ON or OFF
   - Toggle **Display Doctor Details** ON or OFF

#### Step 4: Click "Save & Apply Live"
Click the green **Save & Apply Live** button on the section you modified.
*(When saving customer-view security filters, confirm with the default administrative passcode: **`8899`**)*.

#### Step 5: Immediate Verification
Open a new browser tab to **`http://localhost:5173/`**:
- The homepage title, header, doctor profile, branding colors, and chatbot reflect the saved changes immediately in **live sync** — no code changes, no compilation, and no server restart required.

---

## 🔍 Human Evaluation Checklist

Use this structured test path during client walkthroughs:

### 1. Customer View Walkthrough (Guest Mode)
- [ ] **Home Page**: Verify clinic header, doctor credentials chip, and treatment areas.
- [ ] **AI Assistant**: Click the floating assistant button in the bottom right; verify it introduces itself as the clinic's bot and accurately returns clinic timings.
- [ ] **Appointment Scheduling (`/appointments`)**: Pick a future date; confirm available time slots show operational hours with IST timezone display.
- [ ] **Remedy Store (`/order-medicine`)**: Add a remedy to cart, review cart drawer, and view checkout summary.

### 2. Patient Account View (Authenticated)
- [ ] Click top-right avatar → Sign In.
- [ ] Log in with patient test account:
  - **Email**: `john@example.com` *(or `john@agastyahomoeo.com`)*
  - **Password**: `patient123`
- [ ] Open **My Summary (`/visit-summary`)**:
  - Review historical consultation records and diagnosis notes.
  - Inspect prescribed remedies and dosage instructions.
  - Review and download official tax receipts/invoices.

### 3. Clinic Admin Walkthrough (`/admin`)
- [ ] **Appointments Queue**: Filter bookings by status (Confirmed, Pending, Completed). Reschedule or mark complete.
- [ ] **Invoice & UTR Reconciliation**: Open invoice list, click reconcile, and input a 12-digit bank UTR reference.
- [ ] **Dispensary Stock & Restock**: View remedy inventory stock, batch references, and trigger a PO batch.
- [ ] **Prescription OCR Scanner**: Upload a prescription image and test auto-parsing into structured fields.
- [ ] **Voice Studio Consultation**: Test real-time audio consultation recording and automatic clinical transcription.

### 4. Super Admin Multi-Tenant Verification
- [ ] Open `/admin` → **Customization** tab.
- [ ] Change the active hospital dropdown from `agastya` to `default` or `apollo`.
- [ ] Turn OFF the **AI Assistant Bot** feature flag and click Save (`8899`).
- [ ] Switch to the customer view at `/` — observe that the floating bot widget is disabled immediately.
- [ ] Turn the feature flag back ON — observe the bot reappears.

---

## 🔑 Reference Credentials & Ports

| Role | Email / Username | Password | Access Portal |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@example.com` | `admin123` | `http://localhost:5173/admin` |
| **Clinic Admin** | `admin@example.com` *(or `doctor@agastyahomoeo.com`)* | `admin123` | `http://localhost:5173/admin` |
| **Patient / Customer** | `john@example.com` *(or `john@agastyahomoeo.com`)* | `patient123` | `http://localhost:5173/visit-summary` |
| **Admin Passcode** | Security confirmation code: **`8899`** | — | Customization Tab |

### Services & URLs

| Service | Port / URL | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | `http://localhost:5173` | React 19 Client Web Application |
| **Backend API** | `http://localhost:8000` | FastAPI Microservice Engine |
| **Interactive Docs (Swagger)** | `http://localhost:8000/docs` | Live API Sandbox & Endpoint Testing |
| **Kong API Gateway** | `http://localhost:54321` | Microservice Route & Auth Proxy |
| **Supabase Studio GUI** | `http://localhost:54323` | Database & Storage Inspection GUI |
| **PostgreSQL Database** | `localhost:5432` | Relational Storage & Audit Trail |

---

## 🧪 Pre-Evaluation Health Check

Run this single command on the client laptop to ensure 100% of tests pass before evaluation:

```bash
# Run all 113 backend tests and 41 frontend tests
npm test && npm run test:frontend
```
