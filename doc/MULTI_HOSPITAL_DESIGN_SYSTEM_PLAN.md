# Enterprise Multi-Hospital White-Label Design System & Vertical Slice Migration Plan

## Executive Summary & Vision
This document outlines the enterprise-grade architecture to scale the clinic application from a single clinic (**Agastya Homoeopathy Clinic**) into an **Enterprise Multi-Hospital / Multi-Clinic White-Label Platform**.

The architecture establishes:
1. **SSOT Design Tokens & Dynamic Theming**: CSS custom properties and TypeScript tokens allowing each hospital to define its own brand colors, logo, typography, and corner radii without code duplication.
2. **Base Template + Customization UI Primitive Library**: React 19 + TypeScript reusable UI primitives (`src/components/ui/`) following **shadcn/ui & Radix UI patterns** (CVA variant pattern, `tailwind-merge` class deduplication, accessibility compliance).
3. **Dual Tenant Resolution (Domain + Auth JWT)**: Dynamic hospital resolution supporting both **Option A (Subdomain / Custom Domain)** and **Option B (Auth / JWT Token Context)**.
4. **Strict HIPAA Multi-Hospital PHI Isolation**: Doctors and patients may have accounts spanning multiple hospitals, but **clinical records, appointments, invoices, and prescriptions are strictly partitioned by `hospital_id`** and never leak across tenant boundaries.
5. **Zero-Breakage Phased Vertical Slices**: Migration divided into discrete, testable phases with automated verification.

---

## 1. System Architecture Diagram

```
                     ┌────────────────────────────────────────┐
                     │          Incoming HTTP Request         │
                     │  (e.g., apollo.care.com OR JWT Token)  │
                     └───────────────────┬────────────────────┘
                                         │
                                         ▼
                     ┌────────────────────────────────────────┐
                     │     Hospital Tenant Resolver Engine    │
                     │   1. Domain/Subdomain Resolution (A)   │
                     │   2. Auth JWT / Header Resolution (B)  │
                     │   3. Fallback to Default Tenant (.env) │
                     └───────────────────┬────────────────────┘
                                         │
                         ┌───────────────┴───────────────┐
                         ▼                               ▼
       ┌───────────────────────────────────┐   ┌──────────────────────────────────┐
       │      Frontend Tenant Context      │   │     Backend Tenant Middleware    │
       │     (ThemeProvider / Config)      │   │     (X-Hospital-ID Enforcer)     │
       └─────────────────┬─────────────────┘   └────────────────┬─────────────────┘
                         │                                      │
                         ▼                                      ▼
       ┌───────────────────────────────────┐   ┌──────────────────────────────────┐
       │  CSS Custom Properties & Tokens   │   │     HIPAA PHI Tenant Filter      │
       │   --brand-primary, --font-sans    │   │  WHERE hospital_id = :tenant_id  │
       └─────────────────┬─────────────────┘   └────────────────┬─────────────────┘
                         │                                      │
                         ▼                                      ▼
       ┌───────────────────────────────────┐   ┌──────────────────────────────────┐
       │  Reusable Base UI Primitives      │   │  Partitioned Clinical Storage    │
       │  (Button, Card, Badge, Input...)  │   │  (Visits, Appointments, Billing) │
       └─────────────────┬─────────────────┘   └──────────────────────────────────┘
                         │
                         ▼
       ┌───────────────────────────────────┐
       │   Customizable Vertical Slices    │
       │ (Appointments, Records, Admin...) │
       └───────────────────────────────────┘
```

---

## 2. Dual Tenant Resolution Engine (Option A + Option B)

To support multiple hospitals where each hospital has its own domain while users might consult across multiple centers:

### Resolution Priority Flow:
1. **Step 1: Domain / Subdomain Matching (Option A)**
   - Checks `window.location.hostname` (frontend) or `Host` / `X-Forwarded-Host` (backend).
   - If `hostname === "agastya.homoeoclinic.com"` $\to$ `hospital_id = "agastya"`
   - If `hostname === "apollo.telecare.com"` $\to$ `hospital_id = "apollo"`
2. **Step 2: Auth / JWT Token Context (Option B)**
   - When a patient or doctor logs in, their JWT payload contains `active_hospital_id` and list of `authorized_hospitals: ["agastya", "apollo"]`.
   - The user can switch active hospital context from a tenant switcher dropdown, passing `X-Hospital-ID` in the request headers.
3. **Step 3: Environment / Default Fallback**
   - Falls back to `DEFAULT_HOSPITAL_ID="agastya"` configured in `.env`.

### Hospital Configuration Schema (`HospitalTenantConfig`)
Each hospital is configured as an isolated, typed configuration object:
```typescript
export interface HospitalTenantConfig {
  id: string;                    // e.g. "agastya", "city-care"
  slug: string;                  // e.g. "agastya"
  domain?: string;               // e.g. "agastyahomoeo.com"
  name: string;                  // e.g. "Agastya Homoeopathy Clinic"
  tagline: string;
  doctor: {
    name: string;
    title: string;
    regNo: string;
  };
  contact: {
    phone: string;
    email: string;
    address: { street: string; city: string; state: string; pincode: string };
  };
  branding: {
    primaryColor: string;        // Injected into --brand-primary
    primaryDarkColor: string;
    accentColor: string;
    neutralBg: string;
    cardRadius: string;          // e.g. "1.25rem"
    buttonRadius: string;        // e.g. "0.75rem"
    fontSans: string;
  };
  features: {
    enableECommerce: boolean;    // Medicine cart and delivery
    enableVoiceStudio: boolean;  // AI voice transcription
    enablePrescriptionScan: boolean;
    enableOnlinePayments: boolean;
  };
}
```

---

## 3. Strict HIPAA PHI Multi-Hospital Tenant Isolation

### The Problem:
A patient (e.g. *John Doe*, `usr-001`) may book a consultation at **Agastya Homoeopathy** and later at **City General Hospital**. 
- His identity (email, password hash, phone) is single-sign-on (SSO).
- **CRITICAL REQUIREMENT**: Under HIPAA and global medical privacy laws, doctors at City General Hospital **MUST NEVER** see his clinical records, remedy prescriptions, or invoices from Agastya Homoeopathy unless an explicit cross-hospital referral release is signed.

### The Enforcement Rules:
1. **Mandatory `hospital_id` in Data Schema**:
   - Every appointment (`booked_appointments`), medical file (`patient_medical_files`), visit summary (`visit_summaries`), invoice (`consultation_invoices`), and order (`orders`) must have a non-null `hospital_id` column.
2. **Backend Tenant Isolation Guard**:
   - In [`backend/core/auth_middleware.py`](file:///Users/nitin/Desktop/Project_Suspense/backend/core/auth_middleware.py), incoming requests validate:
     ```python
     if record.hospital_id != current_tenant_hospital_id:
         audit_logger.record_phi_violation(...)
         raise HTTPException(status_code=403, detail="Cross-hospital tenant access violation")
     ```
3. **Admin Dashboard Scoping**:
   - A doctor's token is scoped to specific hospital IDs. Dr. Nitin Dhiman's admin credentials only permit `hospital_id == "agastya"`.

---

## 4. Base Template + Customization UI Primitive Architecture

We implement standard **shadcn/ui & Radix UI design patterns** using TypeScript:
- **Base Primitives Directory**: `src/components/ui/`
- **Class Merging Utility**: `src/utils/cn.ts` combining `clsx` and class variance authority.

### Primitives to Implement:
| Component | Base Template Guarantees | Variants / Customization |
| :--- | :--- | :--- |
| **`Button`** | 44px touch target, focus ring, loading spinner, disabled state | `primary`, `secondary`, `outline`, `ghost`, `danger`; sizes: `sm`, `md`, `lg` |
| **`Badge`** | Pill formatting, micro/caption font, inline dot status | `success`, `warning`, `danger`, `info`, `purple`, `neutral` |
| **`Card`** | Base elevation, border, rounded corner token, padding scale | `default`, `dark`, `bordered`, `interactive` (hover lift) |
| **`Input`** | iOS ≥16px anti-zoom guard, label, error helper text, icon slot | `default`, `error`, `disabled` |
| **`Select`** | Accessible custom-styled dropdown with chevron indicator | `default`, `error` |
| **`Modal` / `Dialog`** | Backdrop blur, ESC key dismiss, focus trap, ARIA role | `sm`, `md`, `lg`, `xl`, `full` |
| **`Tabs`** | WAI-ARIA tablist/tab/tabpanel, keyboard navigation | `pills`, `underline`, `segmented` |
| **`Text` / `Typography`** | Font hierarchy SSOT (Heading, Subheading, Body, Caption, Micro) | `h1`, `h2`, `h3`, `body`, `caption`, `micro` |

---

## 5. Phased Vertical Slice Roadmap

| Phase | Slice Name | Scope & Deliverables | Verification Gates |
| :---: | :--- | :--- | :--- |
| **Phase 1** | **Design Tokens & Base UI Library** | - Create `src/utils/cn.ts`<br>- Implement `src/components/ui/` (Button, Badge, Card, Input, Select, Modal, Tabs, Text)<br>- Wire CSS custom properties in `src/index.css` | - Vitest UI component suite<br>- `npm run build` 0 errors |
| **Phase 2** | **Multi-Tenant Engine & PHI Isolation** | - Create `src/config/tenants/` schema & Agastya tenant config<br>- Add `ThemeProvider` and tenant resolver (Option A & B)<br>- Add backend `hospital_id` middleware & validation | - Tenant resolution tests<br>- 64/64 backend tests pass |
| **Phase 3** | **Slice 1: Navigation, Shell & Auth** | - Migrate `NavBar.tsx`, `BottomNav.tsx`, `AuthPanel.tsx`, `PageFooter.tsx`<br>- Dynamic hospital branding & logo | - Mobile Safari touch test<br>- Login & OAuth verification |
| **Phase 4** | **Slice 2: Scheduling & Booking** | - Migrate `AppointmentsPage.tsx` and `CalendarPicker.tsx`<br>- Standardize slot buttons, triage badges, and date pickers | - Booking & conflict test<br>- Email & WhatsApp triggers |
| **Phase 5** | **Slice 3: Pharmacy & Commerce** | - Migrate `CartPage.tsx`, `OrderMedicinePage.tsx`, `CartDrawer.tsx`<br>- Standardize quantity controls and checkout inputs | - Cart reducer tests<br>- Order submission check |
| **Phase 6** | **Slice 4: Medical Records & Portal** | - Migrate `VisitSummaryPage.tsx` (Records, Billing, Feedback)<br>- Standardize itemized receipt and feedback form | - Feedback submission test<br>- URL tab navigation test |
| **Phase 7** | **Slice 5: Doctor Admin Dashboard** | - Migrate `AdminDashboard.tsx` and all modals in `src/pages/admin/modals/`<br>- Standardize doctor action buttons and table grids | - 100-user concurrency test<br>- HIPAA PHI guard check |

---

## 6. Detailed Phase Specifications
See the dedicated phase specification documents under [`doc/slices/`](file:///Users/nitin/Desktop/Project_Suspense/doc/slices/):
- [`PHASE1_UI_PRIMITIVES_AND_TOKENS.md`](file:///Users/nitin/Desktop/Project_Suspense/doc/slices/PHASE1_UI_PRIMITIVES_AND_TOKENS.md)
- [`PHASE2_MULTI_TENANT_CORE.md`](file:///Users/nitin/Desktop/Project_Suspense/doc/slices/PHASE2_MULTI_TENANT_CORE.md)
- [`PHASE3_SLICES_MIGRATION.md`](file:///Users/nitin/Desktop/Project_Suspense/doc/slices/PHASE3_SLICES_MIGRATION.md)

