# Senior Staff Enterprise Architectural Audit: Frontend System

**Project:** Modern Healthcare Clinic EHR & Telemedicine Platform  
**Target:** Frontend Architecture (`frontend/src/`)  
**Scope:** Super Admin Portal, Doctor/Admin Portal, Patient Portal, White-Label Multi-Tenancy, Design Tokens, State Synchronization, Modularity, and Interaction Systems  
**Evaluation Role:** Senior Staff Enterprise Systems & UI Architect  
**Audit Date:** November 2026  

---

## 1. Executive Summary & Architecture Scorecard

A thorough, line-by-line architectural inspection of the entire frontend codebase (141 TypeScript files, ~32,800 lines of code) was conducted across all three core platform tiers:
1. **Super Admin Tier** (Platform operations, hospital tenant provisioning, multi-facility oversight).
2. **Doctor/Admin Tier** (Clinical roster, appointments, EMR case records, Voice Studio, inventory, dispatches, billing).
3. **Patient Tier** (Public discovery, self-serve appointment scheduling, guest booking, continuous care doctor matching, visit history, invoice payments).

### Architecture Health Scorecard

| Architectural Dimension | Grade | Enterprise Status | Key Finding |
| :--- | :---: | :---: | :--- |
| **Type Safety & Compilation** | **A+** | **Clean** | Strict TypeScript configuration; 0 errors on `tsc --noEmit`. Central schemas typed. |
| **Multi-Tenant White-Labeling** | **C+** | **Needs Remediation** | Core resolution logic exists, but 200+ components bypass `useTenant()` and hardcode static clinic/doctor constants. |
| **Super Admin RBAC & Routing** | **D** | **Critical Defect** | Role `"super_admin"` exists in schema, but RBAC guard `useRequireRole` and `ProtectedRoute` block Super Admins from the console; no tenant management UI. |
| **Doctor Console Modularity** | **B** | **Good Progress** | Deconstructed into 8 domain tabs; however, `CalendarTab.tsx` (947 LOC) and `AdminDashboard.tsx` (708 LOC) need sub-component extraction. |
| **Patient Portal Experience** | **B+** | **Strong Functional** | Seamless appointment booking and continuity triage; however, `HomePage.tsx` and `AboutPage.tsx` fail to render onboarded hospital metadata. |
| **Design Tokens & Styling** | **C** | **Inconsistent** | `--brand-primary` injected in `ThemeProvider`, but 245+ `bg-emerald-*` and 278+ `text-emerald-*` classes override theme tokens. |
| **Notifications & Toasters** | **D+** | **Anti-Pattern** | No centralized `ToastProvider`. 12 native browser `alert()` dialogs block user execution (WCAG violation). |
| **Hooks & Reusable Abstractions**| **C-** | **Under-utilized** | Only 1 hook (`useFeatureGate.ts`) in `frontend/src/hooks/`. Excessive inline state in pages. |

---

## 2. Deep-Dive Audit of the 3 Portals

```
                                  ┌──────────────────────────────────┐
                                  │      Multi-Tenant App Shell      │
                                  │   (Vanilla Layout + Resolvers)   │
                                  └────────────────┬─────────────────┘
                                                   │
         ┌─────────────────────────────────────────┼────────────────────────────────────────┐
         ▼                                         ▼                                        ▼
┌─────────────────────────┐             ┌─────────────────────────┐              ┌─────────────────────────┐
│   Super Admin Portal    │             │   Doctor Admin Portal   │              │     Patient Portal      │
├─────────────────────────┤             ├─────────────────────────┤              ├─────────────────────────┤
│ • Hospital Onboarding   │             │ • Clinical Dashboard    │              │ • Clinic Landing Page   │
│ • Tenant Branding Config│             │ • Appointment Roster    │              │ • Care Continuity Match │
│ • Doctor Assignments    │             │ • EMR Patient Records   │              │ • 1-Click Booking       │
│ • System Quota Controls │             │ • AI Jev & Voice Studio │              │ • Visit Summaries / EMR │
│ ⚠️ CRITICAL GAP:        │             │ • Inventory & Logistics │              │ ⚠️ ISSUE:                │
│ Blocked by RBAC check;  │             │ ⚠️ ISSUE:                │              │ Hardcoded clinic text;  │
│ No dedicated view yet   │             │ Browser alert() calls;  │              │ Ignores tenant doctor   │
│                         │             │ Fragmented toast state  │              │ metadata on home page   │
└─────────────────────────┘             └─────────────────────────┘              └─────────────────────────┘
```

---

### Portal 1: Super Admin Portal

#### Current State
- The type definition [`UserRole`](file:///Users/nitin/Desktop/Homo_project/frontend/src/types/index.ts#L19) defines:
  ```typescript
  export type UserRole = "patient" | "admin" | "super_admin";
  ```
- Seeded super admin account (`superadmin@platform.ehr`, role: `super_admin`) exists in the backend authentication store.

#### Issues Discovered
1. **RBAC Guard Blockout (Critical)**:
   In [`frontend/src/context/AppContext.tsx#L685`](file:///Users/nitin/Desktop/Homo_project/frontend/src/context/AppContext.tsx#L685):
   ```typescript
   export function useRequireRole(required: "admin" | "patient"): void {
     const { state } = useApp();
     const role = state.authUser?.role;
     if (role !== required) {
       throw new RbacAccessError(`Access denied: role '${role ?? "guest"}' cannot access a '${required}' resource.`);
     }
   }
   ```
   When a user with `role === "super_admin"` logs in and navigates to `admin-dashboard`, `role !== "admin"` evaluates to `true`, throwing an `RbacAccessError` and rendering the access-denied shield. Super Admin is locked out!
2. **Missing Super Admin Workspace & Tenant Management Interface**:
   In [`frontend/src/App.tsx#L53-L97`](file:///Users/nitin/Desktop/Homo_project/frontend/src/App.tsx#L53-L97), `PageRouter` only has `case "admin-dashboard"` and patient pages. There is no `case "super-admin-dashboard"` or dedicated hospital management tab.
3. **No Hospital Tenant Switcher**:
   Super Admins cannot switch between hospitals (e.g. `default`, `agastya`, `apollo`) in the top navigation bar without manually changing browser URL query parameters (`?tenant=...`).

#### Enterprise Fix
- Update `useRequireRole` and `ProtectedRoute` to support hierarchical role inheritance:
  `super_admin` automatically inherits all `admin` and `patient` privileges.
- Add a dedicated **Super Admin Multi-Tenant Panel** accessible via `NavBar` and `AdminDashboard`:
  Allows Super Admins to:
  1. View all onboarded hospitals (`/api/v1/hospitals`).
  2. Onboard new hospitals with custom branding (colors, logo, domain, slug).
  3. Assign physicians to hospital facilities.
  4. Preview any hospital's live patient experience instantly.

---

### Portal 2: Doctor (Admin) Portal

#### Current State
- Centered in [`frontend/src/pages/AdminDashboard.tsx`](file:///Users/nitin/Desktop/Homo_project/frontend/src/pages/AdminDashboard.tsx) (708 LOC).
- Structured across 8 modular domain tabs:
  1. `OverviewTab`: Daily stats, today's appointments, doctor todo checklist, quick actions.
  2. `AppointmentsTab`: Tabular appointment roster with continuity of care badges (`🩺 continuing_care`, `🔄 colleague_coverage`).
  3. `PatientRecordsTab`: Electronic medical records, case history viewer, media upload, doctor invite portal modal.
  4. `BillingInvoicesTab`: Consultation fee invoicing, Razorpay/UPI UTR reconciliation, payment receipt issuance.
  5. `DispensaryInventoryTab`: Remedy stocks, potency inventory, batch purchase order generation.
  6. `DispatchesTab`: Medicine shipping, courier logistics tracker.
  7. `CalendarTab`: Interactive calendar view with date blocking and operating hours.
  8. `CustomizationTab`: White-label clinic settings, passcodes, and customer view customization.

#### Issues Discovered
1. **Native Browser `alert()` Disruptions (WCAG & Enterprise UX Violation)**:
   Found across critical admin components:
   - `CalendarTab.tsx:222`: `alert("Please select at least one time slot...")`
   - `CustomizationTab.tsx:255`: `alert("At least one master security passcode must remain active.")`
   - `CustomizationTab.tsx:260`: `alert("Passcode verification failed. Deletion aborted.")`
   - `AdminVoiceStudioModal.tsx:172`: `alert("✓ Discovered ... models from ... API!")`
   - `ClinicalMediaLightboxModal.tsx:72`: `alert("Downloaded clinical artifact...")`
   Native modal dialogs freeze browser rendering threads, disrupt keyboard navigation, and fail enterprise healthcare UI guidelines.
2. **Fragmented Local Toast States**:
   `AdminDashboard.tsx` maintains 4 separate states:
   ```typescript
   const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
   const [mediaSuccessMsg, setMediaSuccessMsg] = useState<string | null>(null);
   const [uploadPrescriptionSuccessMsg, setUploadPrescriptionSuccessMsg] = useState<string | null>(null);
   const [batchOrderSuccessMsg, setBatchOrderSuccessMsg] = useState<string | null>(null);
   ```
   Each tab has duplicate notification markup instead of dispatching to a shared notification queue.
3. **Monolithic Calendar Component**:
   `CalendarTab.tsx` is 947 LOC, mixing date arithmetic, SVG rendering, modal dialogs, and booking logic in a single file.

---

### Portal 3: Patient Portal

#### Current State
- Includes:
  1. `HomePage.tsx`: Patient landing page, clinical specialties, office hours, address card.
  2. `AppointmentsPage.tsx`: 4-step booking workflow with date/time picker, automated continuity of care doctor triage, and GCal sync.
  3. `OrderMedicinePage.tsx`: Phase 2 remedy and formulation ordering.
  4. `CartPage.tsx`: Medicine checkout, delivery address verification, UPI/Card payment.
  5. `VisitSummaryPage.tsx`: Patient health portal containing medical records, consultation notes, payment history, and feedback.
  6. `JoinClinicPage.tsx`: Doctor invite onboarding page (`/join?token=inv_xxx`) with passwordless Google claim.

#### Issues Discovered
1. **Hardcoded Clinic and Doctor Constants Overriding Tenant Settings**:
   In [`frontend/src/pages/HomePage.tsx#L35-L42`](file:///Users/nitin/Desktop/Homo_project/frontend/src/pages/HomePage.tsx#L35-L42):
   ```tsx
   <h1 className="text-3xl sm:text-4xl font-black text-stone-800 leading-tight">
     {CLINIC.FULL_NAME}
   </h1>
   <p className="text-emerald-800 font-semibold text-sm tracking-wide">
     {CLINIC.TAGLINE}
   </p>
   <p className="text-stone-500 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto">
     Under the expert clinical care of <strong>{DOCTOR.NAME}</strong> ({DOCTOR.QUALIFICATIONS})...
   </p>
   ```
   `HomePage.tsx` directly imports `CLINIC` and `DOCTOR` from `src/config/clinic.ts`. It does **not** call `useTenant()`.
   **Result:** When a new hospital (or the default vanilla hospital) is active, the patient landing page still displays `"Agastya Homoeopathy Clinic"` and `"Dr. Bramarambha K"`.
2. **`AboutPage.tsx` Hardcoding**:
   `AboutPage.tsx` lines 55-60 hardcodes `"About Agastya Homoeopathy Clinic"` and the doctor biography.
3. **Input Validation Alerts in `CartPage.tsx`**:
   Lines 255, 261, 267 trigger `alert(nameVal.error)` instead of surfacing inline form validation errors below each field.

---

## 3. The Vanilla Layout & Multi-Tenant Customization Engine

### The Problem: Decoupled Multi-Tenancy

The platform has a well-architected tenant engine in [`frontend/src/context/ThemeProvider.tsx`](file:///Users/nitin/Desktop/Homo_project/frontend/src/context/ThemeProvider.tsx) and [`frontend/src/services/tenantResolver.ts`](file:///Users/nitin/Desktop/Homo_project/frontend/src/services/tenantResolver.ts), defining:
- `VANILLA_DEFAULT_TENANT` (General Healthcare Clinic, `#1b4332`, Dr. Primary Physician).
- `AGASTYA_TENANT` (Agastya Homoeopathy Clinic, `#1e3a6e`, Dr. Bramarambha K).
- `APOLLO_DEMO_TENANT` (Apollo AYUR Integrative Health, `#0d9488`, Dr. Rajesh V. Sharma).

However, the UI layer is largely disconnected from this engine:
- **202 direct references to `CLINIC.*`** across components.
- **71 direct references to `DOCTOR.*`** across components.
- **245 occurrences of `bg-emerald-*`** and **278 occurrences of `text-emerald-*`** hardcoding emerald green across components regardless of the tenant's primary brand color.

### Architectural Solution: Vanilla Layout Engine with Dynamic Tenant Customization

```mermaid
flowchart TD
    A["Incoming Request / User Session"] --> B{"Resolution Chain<br>(tenantResolver.ts)"}
    B -->|1. Query Param| C["?tenant=apollo / ?hospital=..."]
    B -->|2. Active Auth| D["authUser.hospital_id"]
    B -->|3. Hostname| E["subdomain.platform.ehr"]
    B -->|4. Fallback| F["VANILLA_DEFAULT_TENANT<br>(General Healthcare Clinic)"]
    
    C --> G["ThemeProvider & Context"]
    D --> G
    E --> G
    F --> G
    
    G --> H["Inject CSS Custom Properties<br>--brand-primary, --brand-accent, --radius-*"]
    G --> I["Dynamic Document Title & Favicon"]
    G --> J["useClinic() Unified Facade Hook"]
    
    J --> K["Patient Portal Pages<br>(Home, About, Book, Summary)"]
    J --> L["Doctor Admin Console<br>(Roster, Appointments, Records)"]
    J --> M["Super Admin Console<br>(Facility Overview, Customization)"]
    
    H --> N["Design Token Components<br>(Button, Card, Badge, Modal, Input)"]
```

---

## 4. Design Tokens, Colors & CSS Hierarchy

### Current Deficiency
- `THEME_GRADIENTS` in `frontend/src/config/theme.ts`:
  ```typescript
  PRIMARY: "linear-gradient(135deg, #064e3b 0%, #059669 100%)", // Hardcoded Emerald!
  ```
- `Button.tsx`:
  ```typescript
  primary: "bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm border border-emerald-800/20 active:bg-emerald-900",
  ```
  Variant `primary` hardcodes emerald green, ignoring `--brand-primary`.

### Enterprise Token Bridge Specification
By updating `THEME_GRADIENTS` and UI primitives to consume CSS variables with fallbacks:
```css
/* Injected by ThemeProvider */
:root {
  --brand-primary: #1b4332;
  --brand-primary-dark: #081c15;
  --brand-accent: #40916c;
  --brand-bg: #fafaf9;
  --radius-card: 1.25rem;
  --radius-button: 0.75rem;
  --font-sans: "Inter", sans-serif;
}
```

```typescript
// Updated THEME_GRADIENTS in theme.ts
export const THEME_GRADIENTS = {
  PRIMARY: "linear-gradient(135deg, var(--brand-primary, #064e3b) 0%, var(--brand-accent, #059669) 100%)",
  HERO: "linear-gradient(135deg, var(--brand-primary-dark, #152d56) 0%, var(--brand-primary, #1e3a6e) 50%, var(--brand-accent, #2d6a30) 100%)",
  FOOTER: "linear-gradient(135deg, var(--brand-primary-dark, #022c22) 0%, var(--brand-primary, #064e3b) 100%)",
} as const;
```

And updating `Button.tsx`:
```tsx
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--brand-primary,#047857)] hover:opacity-90 text-white shadow-sm border border-black/10 active:opacity-100",
  // ...
};
```
When any new hospital is selected, **the entire app instantly updates its visual identity** without modifying a single line of component code.

---

## 5. Toast Notifications & Interaction Systems (POI)

### The Problem
- 12 occurrences of blocking `alert(...)`.
- Fragmented notification banners across pages.
- No accessible toast queue.

### Enterprise Solution: Centralized `ToastProvider` & `useToast()`

Create `frontend/src/context/ToastContext.tsx`:
```typescript
export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  durationMs?: number;
}
```
Expose `useToast()` with simple API:
```typescript
const toast = useToast();
toast.success("Appointment booked successfully!");
toast.error("Invalid phone number format.");
```
Rendered via a fixed viewport (`top-4 right-4 z-[9999]`) with smooth CSS entry animations, auto-dismiss, and accessibility compliance (`role="status"`, `aria-live="polite"`).

---

## 6. Code Modularity & File Size Audit

### Top 10 Largest Frontend Files

| File Path | LOC | Status | Recommendation |
| :--- | :---: | :---: | :--- |
| `frontend/src/services/modelProviders.ts` | 1,043 | Monolithic | Sliced by provider (Anthropic, Gemini, Groq, Ollama) |
| `frontend/src/components/layout/AuthPanel.tsx` | 1,015 | Monolithic | Extract `SignInForm`, `RegisterForm`, `OtpVerificationScreen` |
| `frontend/src/pages/admin/CalendarTab.tsx` | 947 | Monolithic | Extract `CalendarGrid`, `SlotConfigDrawer`, `BlockedDatesList` |
| `frontend/src/pages/CartPage.tsx` | 855 | Monolithic | Extract `CartItemsTable`, `DeliveryForm`, `PaymentMethodSelector` |
| `frontend/src/components/forms/CalendarPicker.tsx` | 832 | Monolithic | Sliced into date math engine and day-cell renderer |
| `frontend/src/pages/AdminDashboard.tsx` | 708 | Large | State extracted into `useAdminDashboardState` hook |
| `frontend/src/context/AppContext.tsx` | 703 | Refactored | Reducer and state already extracted; modularized |
| `frontend/src/pages/admin/OverviewTab.tsx` | 692 | Moderate | Extract `DoctorTodoList` and `QuickStatsRow` |
| `frontend/src/pages/AppointmentsPage.tsx` | 613 | Moderate | Split into appointment steps (<250 LOC each) |
| `frontend/src/components/layout/NavBar.tsx` | 525 | Moderate | Extract `AdminNavLinks` and `PatientNavLinks` |

---

## 7. What is Done Well (Architectural Strengths)

1. **Strict TypeScript Typing**:
   - Zero errors across the entire frontend with strict null checks.
   - Centralized data contracts in `src/types/index.ts` and `src/types/tenant.ts`.
2. **Lazy-Loaded Route Architecture**:
   - `App.tsx` employs `React.lazy` and `Suspense` for all secondary pages, keeping initial JS bundle lean and responsive.
3. **Advanced Healthcare Workflows**:
   - Multi-hospital Doctor Continuity of Care matching (`PatientDoctorContinuityBanner.tsx`).
   - 3-Way Patient Onboarding (doctor-initiated invites with 7-day tokens, progressive guest account claiming, and direct registered login).
   - Passwordless 1-Click Google OAuth authentication for patients.
   - Comprehensive AI Jev Decision Engine and multi-provider Voice Studio.
4. **Resilient Local Mock & Live API Mode**:
   - `api.ts` cleanly bifurcates live REST backend endpoints (`USE_MOCK_DATA = false`) and client-side demo mode (`USE_MOCK_DATA = true`), enabling testing without external dependencies.
5. **Centralized Form Validation**:
   - `src/utils/validation.ts` provides reusable, RFC-compliant email, phone, and name validators used across auth and booking forms.

---

## 8. Actionable Remediation Roadmap

### Phase 1: High Priority (RBAC, Multi-Tenancy & Toaster)
1. **Fix Super Admin RBAC Guard**:
   Update `useRequireRole` in `AppContext.tsx` and `ProtectedRoute.tsx` so `super_admin` can access the admin dashboard.
2. **Create Centralized `ToastProvider`**:
   Build `ToastContext.tsx` and `ToastContainer.tsx`. Replace all 12 `alert()` calls with `toast.error()` / `toast.success()`.
3. **Create `useClinic()` Facade Hook**:
   Create `src/hooks/useClinic.ts` that merges `tenant` and fallback clinic config so components receive dynamic hospital metadata.
4. **Bind `HomePage.tsx` and `AboutPage.tsx` to `useTenant()`**:
   Replace static `CLINIC.FULL_NAME` and `DOCTOR.NAME` with dynamic values from `useClinic()`.

### Phase 2: Design Token Harmonization
1. **Bridge CSS Variables in `theme.ts`**:
   Update `THEME_GRADIENTS.PRIMARY` and `THEME_GRADIENTS.HERO` to use `var(--brand-primary)` and `var(--brand-accent)`.
2. **Refactor UI Primitives (`Button.tsx`, `Badge.tsx`)**:
   Bind primary button backgrounds to `var(--brand-primary)`.

### Phase 3: Monolith Deconstruction
1. **Deconstruct `AuthPanel.tsx`**:
   Split into `SignInTab.tsx`, `RegisterTab.tsx`, and `OtpVerifyTab.tsx` (<300 LOC each).
2. **Deconstruct `CalendarTab.tsx`**:
   Extract `CalendarGrid.tsx` and `SlotBlockDrawer.tsx`.
3. **Add Super Admin Hospital Switcher in `NavBar.tsx`**:
   When `authUser?.role === "super_admin"`, show a hospital dropdown pill allowing one-click preview of all onboarded hospitals.

---
*Report prepared for engineering leadership and implementation teams.*

