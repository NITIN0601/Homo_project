# Phase 5: Dynamic Tenant Customization & Scalability Architecture

## 1. Executive Summary
This document specifies the enterprise multi-tenant architecture and dynamic customization capabilities of the platform, detailing how multiple hospitals, multi-physician rosters, custom branding, and per-tenant feature gates operate in a decoupled, zero-regression environment.

---

## 2. Multi-Hospital & Multi-Doctor Scalability Assessment

### Is the codebase currently architecturally scalable for multi-hospital, multi-doctor without rewrites?
**Yes.** The system was refactored with enterprise-grade decoupling:

1. **Tenant Isolation via Dual Resolution (Domain + JWT)**:
   - **Public Unauthenticated Visits**: Resolved dynamically via domain/subdomain (`window.location.hostname` parsed in `tenantResolver.ts`).
   - **Authenticated Patient/Doctor Visits**: Resolved via `user.hospital_id` or `user.tenantId` in JWT claims.
   - **Cross-Hospital Patient Separation**: Even if Patient X visits Hospital A (`agastya`) and Hospital B (`apollo`), their appointments, medical records, and prescriptions remain strictly partitioned by `hospital_id` in both Postgres/Supabase tables and the backend security scoping wall (`scope_items_to_patient_or_admin`). Records are never merged across hospitals.

2. **Multi-Doctor Clinical Scalability**:
   - `HospitalTenantConfig` encapsulates both the primary physician (`doctor: HospitalDoctor`) and the full clinic physician roster (`doctors?: HospitalDoctor[]`).
   - Appointment slots, case notes, and prescriptions store `doctor_id` alongside `hospital_id`, allowing a hospital to employ 1 doctor or 50 doctors without altering the scheduling or EHR engine.

3. **Custom Branding & Typography (Zero Hardcoding)**:
   - Dynamic CSS Custom Properties (`--brand-primary`, `--brand-primary-dark`, `--brand-accent`, `--radius-card`, `--radius-button`, `--font-sans`) are injected into the HTML root by `ThemeProvider.tsx`.
   - Modals, buttons, cards, headers, footers, logos, and banners derive styling and content dynamically from `useTenant()`.

---

## 3. Dynamic Admin Customization Tab

Administrators can navigate to the **Customization Tab** (`#admin-dashboard` -> `⚙️ Customization` or `/admin/customization`) to control:

### A. Feature Entitlements & Customer View Visibility
- **Customer Payment Portal & Online Settlement (`enableCustomerPayments`)**:
  - *Enabled*: Customers can pay via instant Google Pay/UPI, Credit/Debit cards, or NetBanking.
  - *Disabled* (e.g. Tenant A wanting offline reception billing): The payment options in the cart and visit summaries are hidden, replaced by an in-clinic reception billing notice.
- **Customer Raw JSON Case Record View (`enableRawCaseJson`)**:
  - *Enabled*: Patients can view and copy the raw Classical Homeopathy JSON schema.
  - *Disabled (Default)*: Hidden for patients so they only see human-friendly prescriptions, avoiding technical developer clutter.
- **Telemedicine & Video Consultations (`enableTelemedicine`)**
- **Dispensary & Medicine Courier Ordering (`enableECommerce`)**
- **Prescription OCR & AI Scan (`enablePrescriptionScan`)**
- **Clinical Voice Studio AI Transcription (`enableVoiceStudio`)**

### B. Hospital & Clinic Information
- Hospital Name, Short Name, Tagline
- Official Phone, Email, and Physical Clinic Address

### C. Doctor Profile & Bio
- Doctor Name, Official Title, Registration Number, Years of Experience, Academic Degrees, and Physician Biography

### D. Media Assets
- Clinic Logo URL & Header Banner URL with live color palette tokens preview.

---

## 4. Appointment Booking Infinite Reload Bug Resolution
- **Root Cause**: `AppContext.tsx` synchronization `useEffect` included state dependencies (`state.appointments`, `state.blockedDates`, etc.) in its dependency array. Dispatches triggered during polling re-ran the effect cleanup and fetch immediately, resulting in a continuous re-render loop. Additionally, `TimeSlotGrid` received an unmemoized callback.
- **Resolution**:
  1. Utilized a synchronized `stateRef` in `AppContext.tsx` so `syncFromServer()` accesses current state without triggering effect re-execution.
  2. Changed `useEffect` dependency to `[]` (mount only), relying on a steady 15s interval, focus events, and cross-tab storage events.
  3. Stabilized `onSelectSlot` in `AppointmentsPage.tsx` with `useCallback` and wrapped within `useRef` inside `TimeSlotGrid`.

