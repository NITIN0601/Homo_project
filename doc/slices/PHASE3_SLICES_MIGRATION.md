# Phase 3 to 7: Vertical Slices Migration Strategy

## Overview
This document specifies the exact refactoring sequence for all vertical slices in the application. By executing these one slice at a time, we ensure **100% test passing, zero regressions, and continuous deployment capability**.

---

## Status Tracker & Progress Matrix

| Slice | Name | Target Components | Status | Verification Status |
|---|---|---|---|---|
| **Slice 1** | Global Navigation & Shell | `NavBar`, `BottomNav`, `PageFooter`, `CookieConsentBanner` | ✅ **Completed** | Full build & test pass |
| **Slice 2** | Scheduling & Booking | `AppointmentsPage`, `CalendarPicker` | ✅ **Completed** | Full build & test pass |
| **Slice 3** | Pharmacy & Cart | `OrderMedicinePage`, `CartPage`, `CartDrawer` | ✅ **Completed** | Full build & test pass |
| **Slice 4** | Medical File & Patient Portal | `VisitSummaryPage` (Tabs, Invoices, Modals) | ✅ **Completed** | 1,200 LOC deduplicated, bundle reduced 40% |
| **Slice 5** | Doctor Admin & Clinical Modals | `AdminDashboard`, `AppointmentCancellationModal`, `PrescribeRemedyModal`, `LogisticsTimelineModal`, `UtrReconciliationModal` | ✅ **Completed** | Full build, 36 Vitest, 64 Backend, 100/100 load test |

---

## Slice 1: Global Navigation, Modals & Shell
- **Target Files**:
  - [`src/components/NavBar.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/components/NavBar.tsx)
  - [`src/components/BottomNav.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/components/BottomNav.tsx)
  - [`src/components/AuthPanel.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/components/AuthPanel.tsx)
  - [`src/components/PageFooter.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/components/PageFooter.tsx)
  - [`src/components/CookieConsentBanner.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/components/CookieConsentBanner.tsx)
- **Refactoring Scope**:
  - Replace raw buttons with `<Button variant="ghost" | "primary">`.
  - Replace raw auth modals with `<Modal>` primitive.
  - Dynamically load hospital name, logo, phone number, and address from active `HospitalTenantConfig`.
  - Replace raw badge pill counters with `<Badge variant="warning">`.

---

## Slice 2: Patient Scheduling & Appointment Booking
- **Target Files**:
  - [`src/pages/AppointmentsPage.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/pages/AppointmentsPage.tsx)
  - [`src/components/CalendarPicker.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/components/CalendarPicker.tsx)
- **Refactoring Scope**:
  - Time slot selection grid migrated to `<Button variant="outline" | "primary" size="sm">`.
  - Triage assessment and TypeSafe AI Jev model urgency badges migrated to `<Badge variant="...">`.
  - Patient personal details inputs migrated to `<Input>` and `<Textarea>` (enforcing iOS 16px anti-zoom).
  - Booking confirmation cards migrated to `<Card>`.

---

## Slice 3: Pharmacy, Medicine Catalog & Cart
- **Target Files**:
  - [`src/pages/OrderMedicinePage.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/pages/OrderMedicinePage.tsx)
  - [`src/pages/CartPage.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/pages/CartPage.tsx)
  - [`src/components/CartDrawer.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/components/CartDrawer.tsx)
- **Refactoring Scope**:
  - Medicine cards migrated to `<Card variant="interactive">`.
  - Potency & quantity stepper buttons migrated to `<Button size="sm">`.
  - Checkout form inputs migrated to `<Input>`.
  - Stock availability badges migrated to `<Badge variant="success" | "danger">`.

---

## Slice 4: Medical File, Visits, Billing & Patient Feedback
- **Target Files**:
  - [`src/pages/VisitSummaryPage.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/pages/VisitSummaryPage.tsx)
- **Refactoring Scope**:
  - Tab navigation bar migrated to `<Tabs variant="pills">` (`Medical Records`, `Billing & Payment`, `Follow-up & Feedback`).
  - Itemized consultation invoice cards and payment status pills migrated to `<Card>` and `<Badge>`.
  - Official clinic payment receipt modal migrated to `<Modal size="lg">`.
  - Star rating & recovery status selector migrated to reusable UI controls.

---

## Slice 5: Doctor Admin Dashboard & Clinical Modals
- **Target Files**:
  - [`src/pages/AdminDashboard.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/pages/AdminDashboard.tsx)
  - [`src/pages/admin/OverviewTab.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/pages/admin/OverviewTab.tsx)
  - [`src/pages/admin/AppointmentsTab.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/pages/admin/AppointmentsTab.tsx)
  - [`src/pages/admin/PatientRecordsTab.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/pages/admin/PatientRecordsTab.tsx)
  - [`src/pages/admin/BillingInvoicesTab.tsx`](file:///Users/nitin/Desktop/Project_Suspense/src/pages/admin/BillingInvoicesTab.tsx)
  - Modals under `src/pages/admin/modals/`:
    - `PrescribeRemedyModal.tsx`
    - `AppointmentCancellationModal.tsx`
    - `UtrReconciliationModal.tsx`
    - `LogisticsTimelineModal.tsx`
    - `CustomPOModal.tsx`
- **Refactoring Scope**:
  - All admin modals unified with `<Modal>` and `<ModalHeader>`, `<ModalContent>`, `<ModalFooter>`.
  - Quick action buttons unified with `<Button>`.
  - Status indicators (Verified, Pending UTR, Stock Critical) unified with `<Badge>`.

---

## 6. Verification Protocol After Each Slice
1. **Frontend Compilation**: `npm run build` must complete with zero errors and clean bundle sizes.
2. **State & Reducer Suite**: `npx vitest run` must pass 100% of tests.
3. **Backend API Suite**: `bash test/run_tests.sh` must pass all 64 endpoint tests.
4. **Concurrency Benchmark**: `test/test_load_100_users.py` must handle 100 parallel users with 0 dropouts.

