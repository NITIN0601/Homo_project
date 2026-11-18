# Migration Manifest: Enterprise HMS Frontend

**Target Architecture:** Feature-Sliced, Domain-Modular Architecture  
**Baseline Verified:** November 2026 | TypeScript Strict Green | 134 Tests Green  
**Status Key:**  
- `[PLANNED]`: Target location identified, legacy intact  
- `[IN_PROGRESS]`: Target created, compatibility layer in place  
- `[MIGRATED]`: Target active and primary, legacy re-export retained for stability  
- `[VERIFIED]`: Domain isolated, tests & typecheck green, verified  

---

## 1. Core Layer (`src/core/`)

| Legacy Source Path | Target Architecture Path | Architectural Domain / Responsibility | Status |
|---|---|---|---|
| `src/services/httpClient.ts` | `src/core/api/client/httpClient.ts` | Base HTTP client, correlation IDs, abort signals, retry policy | `[MIGRATED]` |
| `src/services/api.ts` | `src/core/api/client/apiClient.ts` | Centralized typed API entry point | `[MIGRATED]` |
| `src/utils/cacheReload.ts` | `src/core/api/query/cacheReload.ts` | Cache eviction, tenant reload, query client lifecycle | `[MIGRATED]` |
| `src/services/tenantResolver.ts` | `src/core/tenancy/identity/tenantResolver.ts` | Hostname, slug & runtime tenant identity resolution | `[MIGRATED]` |
| `src/context/ThemeProvider.tsx` | `src/core/tenancy/branding/ThemeProvider.tsx` | Dynamic CSS custom properties & tenant theme injection | `[MIGRATED]` |
| `src/hooks/useTenant.ts` | `src/core/tenancy/context/useTenant.ts` | Tenant context accessor hook | `[MIGRATED]` |
| `src/hooks/useFeatureGate.ts` | `src/core/tenancy/features/useFeatureGate.ts` | Capability-based tenant feature gating hook | `[MIGRATED]` |
| `src/services/tokenStorage.ts` | `src/core/security/tokenStorage.ts` | Ephemeral auth tokens & storage boundary | `[MIGRATED]` |
| `src/utils/sessionSync.ts` | `src/core/security/sessionSync.ts` | Cross-tab multi-window session lifecycle synchronization | `[MIGRATED]` |
| `src/utils/sanitize.ts` | `src/core/security/phiRedaction.ts` & `src/core/security/outputEncoding.ts` | Input sanitization, XSS mitigation, zero-PHI masking | `[MIGRATED]` |
| `src/services/auditService.ts` | `src/core/observability/auditClient.ts` | Auditable user actions & immutable audit logging client | `[MIGRATED]` |
| `src/utils/telemetry.ts` | `src/core/observability/telemetry.ts` | Sanitized zero-PHI telemetry & crash reporting | `[MIGRATED]` |
| `src/components/common/DashboardErrorBoundary.tsx` | `src/app/error/DashboardErrorBoundary.tsx` | Tab-level error boundary with diagnostic report | `[MIGRATED]` |
| `src/utils/timezone/*` | `src/core/timezone/*` | IANA facility timezone conversion, slot mapping, clock | `[MIGRATED]` |
| `src/hooks/useHospitalClock.ts` | `src/core/timezone/useHospitalClock.ts` | Live facility clock hook | `[MIGRATED]` |
| `src/i18n/*` | `src/core/i18n/*` | Localization, en.ts strings, unit conversion | `[MIGRATED]` |
| `src/config/env.ts` | `src/core/config/env.ts` | Validated environment variables | `[MIGRATED]` |
| `src/config/app.ts` | `src/core/config/app.ts` | Global application metadata | `[MIGRATED]` |
| `src/config/constants.ts` | `src/core/config/constants.ts` | Storage keys, operational constants | `[MIGRATED]` |
| `src/config/countries.ts` | `src/core/config/countries.ts` | ISO country codes & dial codes | `[MIGRATED]` |
| `src/config/medical.ts` | `src/core/config/medical.ts` | Standard medical defaults & advice templates | `[MIGRATED]` |
| `src/config/commerce.ts` | `src/core/config/commerce.ts` | Currency configuration & payment defaults | `[MIGRATED]` |
| `src/config/banks.ts` | `src/core/config/banks.ts` | Supported banking institutions list | `[MIGRATED]` |
| `src/config/contact.ts` | `src/core/config/contact.ts` | Support contact configuration | `[MIGRATED]` |

---

## 2. Shared Layer (`src/shared/`)

| Legacy Source Path | Target Architecture Path | Architectural Domain / Responsibility | Status |
|---|---|---|---|
| `src/components/ui/Badge.tsx` | `src/shared/ui/Badge.tsx` | Atomic accessible status badge | `[MIGRATED]` |
| `src/components/ui/Button.tsx` | `src/shared/ui/Button.tsx` | Primary, secondary, outline, ghost accessible button | `[MIGRATED]` |
| `src/components/ui/Card.tsx` | `src/shared/ui/Card.tsx` | Elevated container card primitive | `[MIGRATED]` |
| `src/components/ui/Input.tsx` | `src/shared/ui/Input.tsx` | Accessible text input | `[MIGRATED]` |
| `src/components/ui/Modal.tsx` | `src/shared/ui/Modal.tsx` | Accessible dialog modal with focus trap & ESC handling | `[MIGRATED]` |
| `src/components/ui/Select.tsx` | `src/shared/ui/Select.tsx` | Accessible select primitive | `[MIGRATED]` |
| `src/components/ui/Tabs.tsx` | `src/shared/ui/Tabs.tsx` | Accessible tablist and tabs | `[MIGRATED]` |
| `src/components/ui/Textarea.tsx` | `src/shared/ui/Textarea.tsx` | Multi-line text area primitive | `[MIGRATED]` |
| `src/components/ui/Typography.tsx` | `src/shared/ui/Typography.tsx` | Consistent heading and text tokens | `[MIGRATED]` |
| `src/components/modals/ConfirmDialogModal.tsx` | `src/shared/ui/ConfirmDialogModal.tsx` | Generic accessible confirmation dialog | `[MIGRATED]` |
| `src/components/common/ConnectionStatusBar.tsx` | `src/shared/ui/ConnectionStatusBar.tsx` | Network offline/online indicator | `[MIGRATED]` |
| `src/context/ToastContext.tsx` | `src/shared/ui/ToastContext.tsx` | Global toast notification container & hook | `[MIGRATED]` |
| `src/components/forms/PhoneInput.tsx` | `src/shared/forms/PhoneInput.tsx` | E.164 phone validation input | `[MIGRATED]` |
| `src/hooks/useConfirmDialog.ts` | `src/shared/hooks/useConfirmDialog.ts` | Imperative confirmation modal hook | `[MIGRATED]` |
| `src/hooks/useDraftPersistence.ts` | `src/shared/hooks/useDraftPersistence.ts` | Local form draft auto-save hook | `[MIGRATED]` |
| `src/hooks/useNetworkStatus.ts` | `src/shared/hooks/useNetworkStatus.ts` | Navigator online/offline state hook | `[MIGRATED]` |
| `src/utils/cn.ts` | `src/shared/utils/cn.ts` | Tailwind class merge utility | `[MIGRATED]` |
| `src/utils/format.ts` | `src/shared/utils/format.ts` | Pure date, time, currency and name formatting | `[MIGRATED]` |
| `src/utils/validation.ts` | `src/shared/utils/validation.ts` | Pure input validation & regex checkers | `[MIGRATED]` |
| `src/utils/fileValidation.ts` | `src/shared/utils/fileValidation.ts` | Magic bytes & MIME upload safety checks | `[MIGRATED]` |

---

## 3. Domains Layer (`src/domains/`)

### 3.1 `iam-auth`
| Legacy Path | Target Path | Responsibility | Status |
|---|---|---|---|
| `src/services/authService.ts` | `src/domains/iam-auth/api/authService.ts` | Auth API calls, OTP verification, credential checking | `[MIGRATED]` |
| `src/context/AuthContext.tsx` | `src/domains/iam-auth/model/AuthContext.tsx` | Auth state, login/logout, user profile | `[MIGRATED]` |
| `src/hooks/useIdleTimer.ts` | `src/domains/iam-auth/hooks/useIdleTimer.ts` | Clinician workstation lock timer | `[MIGRATED]` |
| `src/components/auth/AuthPanel.tsx` | `src/domains/iam-auth/components/AuthPanel.tsx` | Slide-out authentication drawer | `[MIGRATED]` |
| `src/components/auth/LoginForm.tsx` | `src/domains/iam-auth/components/LoginForm.tsx` | Standard password & email login | `[MIGRATED]` |
| `src/components/auth/OtpVerificationView.tsx` | `src/domains/iam-auth/components/OtpVerificationView.tsx` | OTP verification journey | `[MIGRATED]` |
| `src/components/auth/RegisterForm.tsx` | `src/domains/iam-auth/components/RegisterForm.tsx` | New patient registration form | `[MIGRATED]` |
| `src/components/auth/IdleTimeoutModal.tsx` | `src/domains/iam-auth/components/IdleTimeoutModal.tsx` | Workstation lock countdown modal | `[MIGRATED]` |
| `src/components/auth/ProtectedRoute.tsx` | `src/domains/iam-auth/components/ProtectedRoute.tsx` | Capability-based route guard | `[MIGRATED]` |
| `src/components/auth/UserProfileMenu.tsx` | `src/domains/iam-auth/components/UserProfileMenu.tsx` | Current user menu & logout trigger | `[MIGRATED]` |
| `src/components/auth/PasscodesSection.tsx` | `src/domains/iam-auth/components/PasscodesSection.tsx` | Staff security passcode configuration | `[MIGRATED]` |
| `src/components/modals/AddPasscodeModal.tsx` | `src/domains/iam-auth/modals/AddPasscodeModal.tsx` | Create passcode dialog | `[MIGRATED]` |
| `src/components/modals/ChangePasscodeModal.tsx` | `src/domains/iam-auth/modals/ChangePasscodeModal.tsx` | Update passcode dialog | `[MIGRATED]` |

### 3.2 `tenant-governance`
| Legacy Path | Target Path | Responsibility | Status |
|---|---|---|---|
| `src/services/hospitalService.ts` | `src/domains/tenant-governance/api/hospitalService.ts` | Tenant provisioning, hospital profiles | `[MIGRATED]` |
| `src/pages/SuperAdminDashboard.tsx` | `src/domains/tenant-governance/pages/SuperAdminDashboard.tsx` | Multi-tenant administration console | `[MIGRATED]` |
| `src/pages/JoinHospitalPage.tsx` | `src/domains/tenant-governance/pages/JoinHospitalPage.tsx` | Patient clinic discovery & registration | `[MIGRATED]` |
| `src/pages/admin/CustomizationTab.tsx` | `src/domains/tenant-governance/pages/CustomizationTab.tsx` | Hospital branding & module settings | `[MIGRATED]` |
| `src/pages/superadmin/OnboardHospitalModal.tsx` | `src/domains/tenant-governance/modals/OnboardHospitalModal.tsx` | 4-step wizard for onboarding hospital | `[MIGRATED]` |
| `src/pages/superadmin/OnboardSuccessDialog.tsx` | `src/domains/tenant-governance/modals/OnboardSuccessDialog.tsx` | Provisioning success credentials | `[MIGRATED]` |
| `src/pages/superadmin/ManageFeaturesModal.tsx` | `src/domains/tenant-governance/modals/ManageFeaturesModal.tsx` | Tenant module toggles | `[MIGRATED]` |

### 3.3 `scheduling`
| Legacy Path | Target Path | Responsibility | Status |
|---|---|---|---|
| `src/services/schedulingService.ts` | `src/domains/scheduling/api/schedulingService.ts` | Slot query, booking, appointment mutation | `[MIGRATED]` |
| `src/services/holidayService.ts` | `src/domains/scheduling/api/holidayService.ts` | Regional & hospital holidays | `[MIGRATED]` |
| `src/context/SchedulingContext.tsx` | `src/domains/scheduling/model/schedulingStore.ts` | Appointments, blocked dates state | `[MIGRATED]` |
| `src/utils/schedulingEngine.ts` | `src/domains/scheduling/engine/schedulingEngine.ts` | Slot generation, OOO exclusions | `[MIGRATED]` |
| `src/pages/AppointmentsPage.tsx` | `src/domains/scheduling/pages/AppointmentsPage.tsx` | Patient booking workflow | `[MIGRATED]` |
| `src/pages/admin/CalendarTab.tsx` | `src/domains/scheduling/pages/CalendarTab.tsx` | Doctor roster & scheduling calendar | `[MIGRATED]` |
| `src/pages/admin/BlockDateModal.tsx` | `src/domains/scheduling/modals/BlockDateModal.tsx` | Out of office block dates dialog | `[MIGRATED]` |
| `src/components/calendar/*` | `src/domains/scheduling/components/*` | Calendar grids, day view, slot pickers | `[MIGRATED]` |

### 3.4 `clinical-ehr`
| Legacy Path | Target Path | Responsibility | Status |
|---|---|---|---|
| `src/services/clinicalService.ts` | `src/domains/clinical-ehr/api/clinicalService.ts` | Clinical records, encounters, diagnoses | `[MIGRATED]` |
| `src/services/clinicalStorageService.ts`| `src/domains/clinical-ehr/api/clinicalStorageService.ts`| Storage for clinical attachments | `[MIGRATED]` |
| `src/services/imageUploadPipeline.ts` | `src/domains/clinical-ehr/api/imageUploadPipeline.ts` | Client image compression & upload pipeline | `[MIGRATED]` |
| `src/services/voiceStudio.ts` | `src/domains/clinical-ehr/api/voiceStudio.ts` | Audio recording, speech-to-text, prompt exec | `[MIGRATED]` |
| `src/services/clinicalPrompts.ts` | `src/domains/clinical-ehr/api/clinicalPrompts.ts` | Prompt templates for clinical synthesis | `[MIGRATED]` |
| `src/services/modelProviders.ts` | `src/domains/clinical-ehr/api/modelProviders.ts` | AI backend provider connectivity | `[MIGRATED]` |
| `src/context/ClinicalContext.tsx` | `src/domains/clinical-ehr/model/clinicalStore.ts` | Active encounter, visit history | `[MIGRATED]` |
| `src/hooks/useBarcodeScanner.ts` | `src/domains/clinical-ehr/hooks/useBarcodeScanner.ts` | Hardware & keyboard barcode scanner hook | `[MIGRATED]` |
| `src/pages/VisitSummaryPage.tsx` | `src/domains/clinical-ehr/pages/VisitSummaryPage.tsx` | Patient medical file & visit summary portal | `[MIGRATED]` |
| `src/pages/admin/PatientRecordsTab.tsx` | `src/domains/clinical-ehr/pages/PatientRecordsTab.tsx` | Clinical charts & encounters tab | `[MIGRATED]` |
| `src/components/common/CaseRecordCard.tsx` | `src/domains/clinical-ehr/components/CaseRecordCard.tsx` | Classical homeopathy case record card | `[MIGRATED]` |
| `src/components/voice/*` | `src/domains/clinical-ehr/components/voice/*` | Voice recording UI, waveform, transcript | `[MIGRATED]` |
| `src/pages/admin/AdminVoiceStudioModal.tsx` | `src/domains/clinical-ehr/modals/AdminVoiceStudioModal.tsx` | Clinician AI Voice Studio modal | `[MIGRATED]` |
| `src/pages/admin/ClinicalMediaUploadModal.tsx` | `src/domains/clinical-ehr/modals/ClinicalMediaUploadModal.tsx` | Clinical media file upload dialog | `[MIGRATED]` |
| `src/pages/patient/ViewCaseRecordJsonModal.tsx` | `src/domains/clinical-ehr/modals/ViewCaseRecordJsonModal.tsx` | Case record JSON export modal | `[MIGRATED]` |

### 3.5 `dispensary-pharmacy`
| Legacy Path | Target Path | Responsibility | Status |
|---|---|---|---|
| `src/services/dispensaryService.ts` | `src/domains/dispensary-pharmacy/api/dispensaryService.ts` | Pharmacy catalog, orders, inventory | `[MIGRATED]` |
| `src/context/CartContext.tsx` | `src/domains/dispensary-pharmacy/model/cartStore.ts` | Patient & doctor dispensary cart state | `[MIGRATED]` |
| `src/pages/OrderMedicinePage.tsx` | `src/domains/dispensary-pharmacy/pages/OrderMedicinePage.tsx` | Patient medicine order catalog | `[MIGRATED]` |
| `src/pages/CartPage.tsx` | `src/domains/dispensary-pharmacy/pages/CartPage.tsx` | Pharmacy checkout & payment | `[MIGRATED]` |
| `src/pages/admin/DispensaryInventoryTab.tsx` | `src/domains/dispensary-pharmacy/pages/DispensaryInventoryTab.tsx` | Stock inventory & purchase orders tab | `[MIGRATED]` |
| `src/pages/admin/DoctorPrescriptionUploadModal.tsx` | `src/domains/dispensary-pharmacy/modals/DoctorPrescriptionUploadModal.tsx` | Prescription issuance modal | `[MIGRATED]` |
| `src/pages/admin/ExcelSyncModal.tsx` | `src/domains/dispensary-pharmacy/modals/ExcelSyncModal.tsx` | Excel inventory import/export modal | `[MIGRATED]` |
| `src/pages/admin/ConsolidatedBatchOrderModal.tsx` | `src/domains/dispensary-pharmacy/modals/ConsolidatedBatchOrderModal.tsx` | Pharmacy batch order requisition modal | `[MIGRATED]` |
| `src/pages/admin/CustomPOModal.tsx` | `src/domains/dispensary-pharmacy/modals/CustomPOModal.tsx` | Custom purchase order modal | `[MIGRATED]` |

### 3.6 `billing-finance`
| Legacy Path | Target Path | Responsibility | Status |
|---|---|---|---|
| `src/services/billingService.ts` | `src/domains/billing-finance/api/billingService.ts` | Invoice generation, payments | `[MIGRATED]` |
| `src/services/paymentGatewayService.ts`| `src/domains/billing-finance/api/paymentGatewayService.ts`| Razorpay/Stripe checkout handshakes | `[MIGRATED]` |
| `src/utils/currency.ts` | `src/domains/billing-finance/utils/currency.ts` | Minor units, currency conversion | `[MIGRATED]` |
| `src/pages/admin/BillingTab.tsx` | `src/domains/billing-finance/pages/BillingTab.tsx` | Consultation invoices & accounts tab | `[MIGRATED]` |
| `src/pages/admin/PostConsultationFeeModal.tsx` | `src/domains/billing-finance/modals/PostConsultationFeeModal.tsx` | Consultation fee entry dialog | `[MIGRATED]` |

### 3.7 `patient-engagement`
| Legacy Path | Target Path | Responsibility | Status |
|---|---|---|---|
| `src/services/communicationService.ts` | `src/domains/patient-engagement/api/communicationService.ts` | Patient notification & messages | `[MIGRATED]` |
| `src/types/feedback.ts` | `src/domains/patient-engagement/model/feedback.ts` | Patient reviews & star ratings | `[MIGRATED]` |
| `src/pages/admin/PatientFeedbackTab.tsx`| `src/domains/patient-engagement/pages/PatientFeedbackTab.tsx`| Doctor feedback moderation tab | `[MIGRATED]` |
| `src/components/widgets/ChatbotWidget.tsx` | `src/domains/patient-engagement/components/ChatbotWidget.tsx` | AI clinic concierge chatbot | `[MIGRATED]` |
| `src/components/modals/EditPatientProfileModal.tsx` | `src/domains/patient-engagement/modals/EditPatientProfileModal.tsx` | Patient self-service profile modal | `[MIGRATED]` |
| `src/components/modals/TermsPrivacyModal.tsx` | `src/domains/patient-engagement/modals/TermsPrivacyModal.tsx` | Legal terms & HIPAA notice dialog | `[MIGRATED]` |

---

## 4. App Layer (`src/app/`)

| Legacy Path | Target Path | Responsibility | Status |
|---|---|---|---|
| `src/App.tsx` | `src/app/App.tsx` | Root application composition shell | `[MIGRATED]` |
| `src/context/AppContext.tsx` | `src/app/AppProviders.tsx` | Root providers composition tree | `[MIGRATED]` |
| `src/router/routeParser.ts` | `src/app/router/routeParser.ts` | Route parsing & URL synchronization | `[MIGRATED]` |
| `src/components/layout/*` | `src/app/layout/*` | AppShell, NavBar, BottomNav, PageFooter | `[MIGRATED]` |
| `src/components/common/RouteErrorFallback.tsx` | `src/app/error/RouteErrorFallback.tsx` | Route fallback error boundary | `[MIGRATED]` |
