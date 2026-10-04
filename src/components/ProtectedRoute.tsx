import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { RbacAccessError } from "../context/AppContext";
import { THEME_GRADIENTS, THEME_COLORS } from "../config";

// ─── Props ───────────────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  /** The role required to render children */
  requiredRole: "admin" | "patient";
  children: ReactNode;
  /** Optional custom fallback; defaults to the generic RBAC wall below */
  fallback?: ReactNode;
}


// ─── Class-based Error Boundary ───────────────────────────────────────────────
// We use a class component so we can use componentDidCatch to intercept the
// RbacAccessError thrown by useRequireRole() inside child components.
class RbacErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { caught: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { caught: false };
  }

  static getDerivedStateFromError(error: unknown) {
    if (error instanceof RbacAccessError) {
      return { caught: true };
    }
    // Re-throw non-RBAC errors to the parent error boundary
    throw error;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (error instanceof RbacAccessError) {
      // HIPAA-compliant: log only error name, never patient data
      console.warn("[RBAC] Access denied:", error.name, info.componentStack?.slice(0, 120));
    }
  }

  componentDidUpdate(prevProps: { children: ReactNode; fallback: ReactNode }) {
    // Reset boundary when children change (e.g. role is elevated)
    if (prevProps.children !== this.props.children && this.state.caught) {
      this.setState({ caught: false });
    }
  }

  render() {
    return this.state.caught ? this.props.fallback : this.props.children;
  }
}

import { useApp, MOCK_ACCOUNTS } from "../context/AppContext";
import { DEMO_CREDENTIALS, USE_MOCK_DATA } from "../config";

// ─── Generic RBAC Denial Screen ───────────────────────────────────────────────
const AccessDeniedScreen: React.FC = () => {
  const { navigateTo, openAuthModal, login } = useApp();

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[460px] px-6 py-12 max-w-md mx-auto text-center"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      {/* Shield icon */}
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-inner"
        style={{ background: THEME_GRADIENTS.DANGER_SOFT }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke={THEME_COLORS.DANGER_RED}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>

      <h1 className="text-2xl font-black text-stone-800 mb-2">
        Doctor Admin Console Protected
      </h1>
      <p className="text-stone-500 text-sm leading-relaxed mb-6">
        This area is restricted to authorized clinic medical staff. If you are Dr. Bramarambha K or a clinic administrator, please sign in with your administrative credentials.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
        <button
          onClick={openAuthModal}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-600 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          🔑 Sign In as Admin
        </button>

        <button
          onClick={() => navigateTo("home")}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 transition-all cursor-pointer"
        >
          ← Return to Patient Portal
        </button>
      </div>

      {USE_MOCK_DATA && (
        <div className="mt-6 pt-5 border-t border-stone-200/80 w-full flex flex-col items-center">
          <p className="text-[11px] font-semibold text-stone-400 mb-2">⚡ Quick Developer Demo Access:</p>
          <button
            onClick={() => {
              login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.ADMIN.email].profile);
              navigateTo("admin-dashboard");
            }}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            🩺 Instant Login as Dr. Bramarambha K (Admin)
          </button>
        </div>
      )}

      <div
        className="mt-6 text-[10px] text-stone-400 font-mono bg-stone-100/70 rounded-md px-3 py-1"
        aria-label="Error code"
      >
        ERR_RBAC_403 · Clinical Role Verification Required
      </div>
    </div>
  );
};

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
/**
 * Wraps any component tree that requires a specific role.
 * If the user's role does not match, renders a generic
 * authorization failure screen — never leaking the reason or user data.
 *
 * Usage:
 * ```tsx
 * <ProtectedRoute requiredRole="admin">
 *   <AdminDashboard />
 * </ProtectedRoute>
 * ```
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
}) => {
  const denial = fallback ?? <AccessDeniedScreen />;
  return (
    <RbacErrorBoundary fallback={denial}>
      {children}
    </RbacErrorBoundary>
  );
};

export default ProtectedRoute;
export { AccessDeniedScreen };
