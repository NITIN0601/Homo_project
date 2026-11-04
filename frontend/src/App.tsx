import React, { Suspense, useEffect } from "react";

// ─── Context (SSOT) ───────────────────────────────────────────────────────────
import { AppProvider, useApp } from "./context/AppContext";
import { ThemeProvider, useTenant } from "./context/ThemeProvider";
import { USE_MOCK_DATA, PHASE_CONFIG } from "./config";

// ─── Layout & Navigation Components ──────────────────────────────────────────
import NavBar from "./components/layout/NavBar";
import CartDrawer from "./components/layout/CartDrawer";
import BottomNav from "./components/layout/BottomNav";
import PageFooter from "./components/layout/PageFooter";
import DemoHeaderBanner from "./components/layout/DemoHeaderBanner";

// ─── Security & Error Boundaries ─────────────────────────────────────────────
import ProtectedRoute from "./components/common/ProtectedRoute";
import RootErrorBoundary from "./components/common/RootErrorBoundary";

// ─── Modals & Floating Widgets ───────────────────────────────────────────────
import { TrackingModal } from "./components/modals/TrackingModal";
import { OrdersModal } from "./components/modals/OrdersModal";
import ChatbotWidget from "./components/widgets/ChatbotWidget";
import CookieConsentBanner from "./components/widgets/CookieConsentBanner";

// ─── Critical Pages (eager — above the fold) ──────────────────────────────────
import HomePage from "./pages/HomePage";

// ─── Non-critical Pages (lazy — code-split for faster initial load) ───────────
const AboutPage         = React.lazy(() => import("./pages/AboutPage"));
const AppointmentsPage  = React.lazy(() => import("./pages/AppointmentsPage"));
const CartPage          = React.lazy(() => import("./pages/CartPage"));
const OrderMedicinePage = React.lazy(() => import("./pages/OrderMedicinePage"));
const VisitSummaryPage  = React.lazy(() => import("./pages/VisitSummaryPage"));
const AdminDashboard    = React.lazy(() => import("./pages/AdminDashboard"));
const MobileWorkerPage  = React.lazy(() => import("./pages/MobileWorkerPage"));
const PrivacyPolicyPage = React.lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsPage         = React.lazy(() => import("./pages/TermsPage"));
const NotFoundPage      = React.lazy(() => import("./pages/NotFoundPage"));

// ─── Suspense Fallback ────────────────────────────────────────────────────────
const PageLoader: React.FC = () => (
  <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
    <div className="w-10 h-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin" />
    <p className="text-stone-500 text-sm font-medium">Loading…</p>
  </div>
);

// ─── Page router ──────────────────────────────────────────────────────────────
const PageRouter: React.FC = () => {
  const { state } = useApp();

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

    case "privacy-policy":
      return <PrivacyPolicyPage />;

    case "terms":
      return <TermsPage />;

    case "404":
      return <NotFoundPage />;

    default:
      return <NotFoundPage />;
  }
};

// ─── App shell ────────────────────────────────────────────────────────────────
const AppShell: React.FC = () => {
  const { state } = useApp();
  const { tenant } = useTenant();
  const isAdmin = state.authUser?.role === "admin" || state.activePage === "admin-dashboard";

  // Scroll to top whenever page navigation occurs
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [state.activePage]);

  return (
    <div className="min-h-dvh bg-stone-50 flex flex-col">
      {/* ── Mock Sandbox Multi-Port Navigation Banner ───── */}
      {USE_MOCK_DATA && <DemoHeaderBanner />}

      {/* ── Persistent NavBar (reads SSOT) ────────────── */}
      <NavBar />

      {/* ── Slide-over Cart Drawer (Phase 2 feature) ───── */}
      {PHASE_CONFIG.ENABLE_CART && <CartDrawer />}

      {/* ── Live 3rd Party Logistics Tracking Modal ────── */}
      {PHASE_CONFIG.ENABLE_MEDICINE_ORDERING && <TrackingModal />}

      {/* ── User Order History & Tracking List Modal ──── */}
      {PHASE_CONFIG.ENABLE_MEDICINE_ORDERING && <OrdersModal />}

      {/* ── Floating AI Chatbot & WhatsApp Business Widget (Patients only) ─ */}
      {!isAdmin && tenant.features.enableAgastyaBot !== false && <ChatbotWidget />}

      {/* ── GDPR / DPDP Cookie Consent Banner ──────────── */}
      <CookieConsentBanner />

      {/* ── Main page content area ────────────────────── */}
      <main
        id="main-content"
        className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
      >
        <RootErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <PageRouter />
          </Suspense>
        </RootErrorBoundary>

        {/* ── Centralized Clinic Footer ───────────────────── */}
        <PageFooter />
      </main>

      {/* ── Mobile-only sticky bottom nav (SSOT-connected) ─ */}
      <BottomNav />
    </div>
  );
};

// ─── Root App — wraps everything in the SSOT Provider & Root Error Boundary ──
const App: React.FC = () => (
  <RootErrorBoundary>
    <ThemeProvider>
      <AppProvider>
        <AppShell />
      </AppProvider>
    </ThemeProvider>
  </RootErrorBoundary>
);

export default App;
