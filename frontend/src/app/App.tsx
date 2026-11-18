import React, { useEffect } from "react";
import { AppProviders } from "./AppProviders";
import { useApp } from "./store/AppContext";
import { useTenant } from "../core/tenancy/branding/ThemeProvider";
import { USE_MOCK_DATA, PHASE_CONFIG } from "../core/config";
import { AppRouter } from "./router/AppRouter";
import { NavBar } from "./layout/NavBar";
import { BottomNav } from "./layout/BottomNav";
import { PageFooter } from "./layout/PageFooter";
import { DemoHeaderBanner } from "./layout/DemoHeaderBanner";
import CartDrawer from "../domains/dispensary-pharmacy/components/CartDrawer";
import { TrackingModal } from "../domains/dispensary-pharmacy/modals/TrackingModal";
import { OrdersModal } from "../domains/dispensary-pharmacy/modals/OrdersModal";
import ChatbotWidget from "../domains/patient-engagement/components/ChatbotWidget";
import CookieConsentBanner from "../domains/patient-engagement/components/CookieConsentBanner";
import IdleTimeoutModal from "../domains/iam-auth/components/IdleTimeoutModal";
import { ConnectionStatusBar } from "../shared/ui/ConnectionStatusBar";
import { useIdleTimer } from "../domains/iam-auth/hooks/useIdleTimer";
import { broadcastSessionEvent } from "../core/security/sessionSync";
import { RootErrorBoundary } from "./error/RootErrorBoundary";

export const AppShell: React.FC = () => {
  const { state, logout } = useApp();
  const { tenant } = useTenant();
  const isSuperAdmin = state.authUser?.role === "super_admin" || state.activePage === "super-admin-dashboard";
  const isAdmin = state.authUser?.role === "admin" || state.activePage === "admin-dashboard";

  // HIPAA §164.312(a)(2)(iii): 15-minute idle session auto-lockout
  const { isWarning, remainingSeconds, resetTimer } = useIdleTimer({
    timeoutMs: 15 * 60 * 1000,
    warningMs: 60 * 1000,
    enabled: Boolean(state.authUser),
    onIdle: () => {
      logout();
      broadcastSessionEvent({ type: "AUTH_LOGOUT" });
    },
  });

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
      {/* ── Offline Network Status Bar ─────────────────── */}
      <ConnectionStatusBar />

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
      {!isAdmin && !isSuperAdmin && tenant.features.enableAgastyaBot !== false && <ChatbotWidget />}

      {/* ── GDPR / DPDP Cookie Consent Banner ──────────── */}
      <CookieConsentBanner />

      {/* ── HIPAA Inactivity Lockout Warning Modal ───── */}
      <IdleTimeoutModal
        isOpen={isWarning}
        remainingSeconds={remainingSeconds}
        onStaySignedIn={resetTimer}
        onLogoutNow={() => {
          logout();
          broadcastSessionEvent({ type: "AUTH_LOGOUT" });
        }}
      />

      {/* ── Main page content area ────────────────────── */}
      <main
        id="main-content"
        className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5rem)" }}
      >
        <RootErrorBoundary>
          <AppRouter />
        </RootErrorBoundary>

        {/* ── Centralized Clinic Footer ───────────────────── */}
        <PageFooter />
      </main>

      {/* ── Mobile-only sticky bottom nav (SSOT-connected) ─ */}
      <BottomNav />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
};

export default App;
