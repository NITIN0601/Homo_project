import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { RbacAccessError, useApp } from "../../context/AppContext";
import { useTenant } from "../../context/ThemeProvider";
import { THEME_GRADIENTS, THEME_COLORS, USE_MOCK_DATA, DEMO_CREDENTIALS } from "../../config";
import { MOCK_ACCOUNTS } from "../../data/mocks";

// ─── Props ───────────────────────────────────────────────────────────────────
interface ProtectedRouteProps {
  /** The role required to render children */
  requiredRole: "admin" | "patient" | "super_admin";
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

// ─── Generic RBAC Denial Screen ───────────────────────────────────────────────
interface AccessDeniedScreenProps {
  requiredRole?: "admin" | "patient" | "super_admin";
}

const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({ requiredRole = "admin" }) => {
  const { navigateTo, openAuthModal, login } = useApp();
  const { tenant } = useTenant();
  const isSuperAdminRequired = requiredRole === "super_admin";
  const doctorDisplayName = tenant.doctor?.name || "the attending physician";

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
        style={{ background: isSuperAdminRequired ? "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)" : THEME_GRADIENTS.DANGER_SOFT }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isSuperAdminRequired ? "#4338ca" : THEME_COLORS.DANGER_RED}
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
        {isSuperAdminRequired
          ? "Platform Super Admin Console Protected"
          : "Doctor Admin Console Protected"}
      </h1>
      <p className="text-stone-500 text-sm leading-relaxed mb-6">
        {isSuperAdminRequired
          ? "This area is restricted to Platform Super Administrators managing multi-hospital infrastructure, cross-tenant configurations, and governance."
          : `This area is restricted to authorized clinic medical staff. If you are ${doctorDisplayName} or a clinic administrator, please sign in with your administrative credentials.`}
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
        <button
          onClick={openAuthModal}
          className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm active:scale-95 cursor-pointer ${
            isSuperAdminRequired
              ? "bg-indigo-700 hover:bg-indigo-600"
              : "bg-emerald-700 hover:bg-emerald-600"
          }`}
        >
          {isSuperAdminRequired ? "⚡ Sign In as Super Admin" : "🔑 Sign In as Admin"}
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
          {isSuperAdminRequired ? (
            <button
              onClick={() => {
                login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.SUPER_ADMIN.email].profile);
                navigateTo("super-admin-dashboard");
              }}
              className="text-xs font-bold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              ⚡ Instant Demo Login as Super Admin
            </button>
          ) : (
            <button
              onClick={() => {
                login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.ADMIN.email].profile);
                navigateTo("admin-dashboard");
              }}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              🩺 Instant Login as {doctorDisplayName} (Admin)
            </button>
          )}
        </div>
      )}

      <div
        className="mt-6 text-[10px] text-stone-400 font-mono bg-stone-100/70 rounded-md px-3 py-1"
        aria-label="Error code"
      >
        {isSuperAdminRequired
          ? "ERR_RBAC_403 · Platform Super Administrator Role Required"
          : "ERR_RBAC_403 · Clinical Role Verification Required"}
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
  requiredRole,
  children,
  fallback,
}) => {
  const denial = fallback ?? <AccessDeniedScreen requiredRole={requiredRole} />;
  return (
    <RbacErrorBoundary fallback={denial}>
      {children}
    </RbacErrorBoundary>
  );
};

export default ProtectedRoute;
export { AccessDeniedScreen };
