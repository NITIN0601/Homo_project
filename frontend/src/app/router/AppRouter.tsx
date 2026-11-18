import React, { Suspense } from "react";
import { useApp } from "../store/AppContext";
import ProtectedRoute from "../../domains/iam-auth/components/ProtectedRoute";
import HomePage from "../../domains/patient-engagement/pages/HomePage";

const AboutPage = React.lazy(() => import("../../domains/patient-engagement/pages/AboutPage"));
const AppointmentsPage = React.lazy(() => import("../../domains/scheduling/pages/AppointmentsPage"));
const CartPage = React.lazy(() => import("../../domains/dispensary-pharmacy/pages/CartPage"));
const OrderMedicinePage = React.lazy(() => import("../../domains/dispensary-pharmacy/pages/OrderMedicinePage"));
const VisitSummaryPage = React.lazy(() => import("../../domains/clinical-ehr/pages/VisitSummaryPage"));
const AdminDashboard = React.lazy(() => import("../admin/AdminDashboard"));
const SuperAdminDashboard = React.lazy(() => import("../../domains/tenant-governance/pages/SuperAdminDashboard"));
const MobileWorkerPage = React.lazy(() => import("../../domains/clinical-ehr/pages/MobileWorkerPage"));
const PrivacyPolicyPage = React.lazy(() => import("../../domains/patient-engagement/pages/PrivacyPolicyPage"));
const TermsPage = React.lazy(() => import("../../domains/patient-engagement/pages/TermsPage"));
const JoinHospitalPage = React.lazy(() => import("../../domains/tenant-governance/pages/JoinHospitalPage"));
const NotFoundPage = React.lazy(() => import("../error/NotFoundPage"));

export const PageLoader: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
    <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
    <p className="text-stone-500 text-sm font-medium">Loading…</p>
  </div>
);

export const AppRouter: React.FC = () => {
  const { state } = useApp();

  return (
    <Suspense fallback={<PageLoader />}>
      {(() => {
        switch (state.activePage) {
          case "home":
            return <HomePage />;
          case "about":
            return <AboutPage />;
          case "appointments":
            return <AppointmentsPage />;
          case "cart-page":
            return <CartPage />;
          case "order-medicine":
            return <OrderMedicinePage />;
          case "visit-summary":
            return <VisitSummaryPage />;
          case "mobile-worker":
            return <MobileWorkerPage />;
          case "admin-dashboard":
            return (
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            );
          case "super-admin-dashboard":
            return (
              <ProtectedRoute requiredRole="super_admin">
                <SuperAdminDashboard />
              </ProtectedRoute>
            );
          case "privacy-policy":
            return <PrivacyPolicyPage />;
          case "terms":
            return <TermsPage />;
          case "join":
            return <JoinHospitalPage />;
          case "404":
          default:
            return <NotFoundPage />;
        }
      })()}
    </Suspense>
  );
};

export default AppRouter;
