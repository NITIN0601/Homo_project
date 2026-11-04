/**
 * Enterprise Component Barrel Export (SSOT)
 * Exports domain-grouped components: layout, modals, widgets, forms, common, and UI primitives.
 */

// Layout & Shell
export * from "./layout/NavBar";
export { default as NavBar } from "./layout/NavBar";
export * from "./layout/BottomNav";
export { default as BottomNav } from "./layout/BottomNav";
export * from "./layout/PageFooter";
export { default as PageFooter } from "./layout/PageFooter";
export * from "./layout/DemoHeaderBanner";
export { default as DemoHeaderBanner } from "./layout/DemoHeaderBanner";
export * from "./layout/CartDrawer";
export { default as CartDrawer } from "./layout/CartDrawer";
export * from "./layout/CartIcon";
export { default as CartIcon } from "./layout/CartIcon";
export * from "./layout/AuthPanel";
export { default as AuthPanel } from "./layout/AuthPanel";

// Global Modals
export * from "./modals/TrackingModal";
export * from "./modals/OrdersModal";
export * from "./modals/TermsPrivacyModal";
export * from "./modals/PrescriptionCaptureModal";
export { default as PrescriptionCaptureModal } from "./modals/PrescriptionCaptureModal";

// Interactive Widgets
export * from "./widgets/ChatbotWidget";
export { default as ChatbotWidget } from "./widgets/ChatbotWidget";
export * from "./widgets/CookieConsentBanner";
export { default as CookieConsentBanner } from "./widgets/CookieConsentBanner";

// Form Controls
export * from "./forms/CalendarPicker";
export { default as CalendarPicker } from "./forms/CalendarPicker";
export * from "./forms/PhoneInput";
export { default as PhoneInput } from "./forms/PhoneInput";

// Common & Security Guards
export * from "./common/CaseRecordCard";
export { default as CaseRecordCard } from "./common/CaseRecordCard";
export * from "./common/ProviderSelector";
export { default as ProviderSelector } from "./common/ProviderSelector";
export * from "./common/ProtectedRoute";
export { default as ProtectedRoute } from "./common/ProtectedRoute";
export * from "./common/RootErrorBoundary";
export { default as RootErrorBoundary } from "./common/RootErrorBoundary";

// Design System Primitives
export * from "./ui";

