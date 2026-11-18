// Top-level Application Pages
export { default as HomePage } from "./HomePage";
export { default as AboutPage } from "./AboutPage";
export { default as AppointmentsPage } from "./AppointmentsPage";
export { default as CartPage } from "./CartPage";
export { default as OrderMedicinePage } from "./OrderMedicinePage";
export { default as VisitSummaryPage } from "./VisitSummaryPage";
export { default as AdminDashboard } from "./AdminDashboard";
export { default as SuperAdminDashboard } from "./SuperAdminDashboard";
export { default as MobileWorkerPage } from "./MobileWorkerPage";
export { default as PrivacyPolicyPage } from "./PrivacyPolicyPage";
export { default as TermsPage } from "./TermsPage";
export { default as JoinHospitalPage } from "./JoinHospitalPage";
export { default as NotFoundPage } from "./NotFoundPage";

// Domain-specific page modules
export * as AdminDomain from "./admin";
export * as SuperAdminDomain from "./superadmin";
export * as PatientDomain from "./patient";
export * as AppointmentsDomain from "./appointments";
export * as CartDomain from "./cart";
