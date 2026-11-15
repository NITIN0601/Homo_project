import React from "react";
import type { AuthUser, Page } from "../../../types";
import type { HospitalTenantConfig } from "../../../types/tenant";
import { getAllHospitalTenants } from "../../../config/tenants";
import { USE_MOCK_DATA, PHASE_CONFIG, THEME_COLORS, THEME_GRADIENTS } from "../../../config";
import { api } from "../../../services/api";
import CartIcon from "../CartIcon";
import AuthPanel from "../AuthPanel";

interface NavUserControlsProps {
  authUser: AuthUser | null;
  isSuperAdmin: boolean;
  tenant: HospitalTenantConfig;
  onSetTenantId: (id: string) => void;
  onNavigateTo: (page: Page) => void;
  isAuthModalOpen: boolean;
  onOpenAuthModal: () => void;
  avatarRef: React.RefObject<HTMLButtonElement | null>;
}

export const NavUserControls: React.FC<NavUserControlsProps> = ({
  authUser,
  isSuperAdmin,
  tenant,
  onSetTenantId,
  onNavigateTo,
  isAuthModalOpen,
  onOpenAuthModal,
  avatarRef,
}) => {
  return (
    <div className="flex items-center gap-2">
      {/* Environment Mode Badge */}
      {USE_MOCK_DATA ? (
        <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
          <span>🧪</span> Mock Data
        </span>
      ) : (
        <span className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Local EHR
        </span>
      )}

      {/* Hospital Tenant Selector (Visible to Super Admin, Hospital Admin, or in Dev/Demo mode) */}
      {(isSuperAdmin || authUser?.role === "admin" || USE_MOCK_DATA) && (
        <div className="hidden sm:flex items-center gap-1 bg-stone-100 hover:bg-stone-200/80 border border-stone-300 rounded-full px-2 py-1 text-xs transition-colors">
          <span className="text-xs">🏥</span>
          <select
            value={tenant.id}
            onChange={(e) => onSetTenantId(e.target.value)}
            className="bg-transparent text-stone-800 text-[11px] font-bold outline-none cursor-pointer max-w-[130px] truncate"
            title="Switch Active Hospital Tenant"
            aria-label="Active Hospital Facility"
          >
            {getAllHospitalTenants().map((h) => (
              <option key={h.id} value={h.id} className="text-stone-900 bg-white">
                {h.shortName || h.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Super Admin Privileged Portal Pill */}
      {(isSuperAdmin || USE_MOCK_DATA) && (
        <button
          onClick={() => onNavigateTo("super-admin-dashboard")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-sm transition-all active:scale-95 cursor-pointer border ${
            isSuperAdmin
              ? "text-white bg-gradient-to-r from-indigo-700 via-indigo-600 to-slate-900 hover:opacity-90 border-indigo-400/40"
              : "text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border-indigo-300"
          }`}
          title="Super Administrator Console"
          aria-label="Super Administrator Console"
        >
          <span>⚡</span>
          <span className="hidden sm:inline">Super Admin</span>
        </button>
      )}

      {/* Doctor Voice Studio Header Button (Admin Only) */}
      {authUser?.role === "admin" && (
        <button
          onClick={() => onNavigateTo("admin-dashboard")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold text-white bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-600 hover:to-indigo-600 shadow-sm transition-all active:scale-95 cursor-pointer border border-purple-400/40"
          title="Launch Doctor Voice Studio"
          aria-label="Doctor Voice Studio"
        >
          <span className="animate-pulse">🎙️</span>
          <span className="hidden sm:inline">Voice Studio</span>
        </button>
      )}

      {/* WhatsApp Direct Header Pill */}
      <button
        onClick={() => api.whatsapp.openChat(undefined, authUser)}
        style={{ background: THEME_COLORS.WHATSAPP_GREEN }}
        className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-extrabold text-white hover:opacity-90 shadow-xs transition-all active:scale-95 cursor-pointer"
        title={`Chat with ${tenant.shortName || tenant.name} on WhatsApp`}
        aria-label="Connect on WhatsApp"
      >
        <span>📱</span>
        <span className="hidden sm:inline">WhatsApp</span>
      </button>

      {/* Cart Icon — Phase 2 feature */}
      {PHASE_CONFIG.ENABLE_CART && tenant.features?.enableECommerce && <CartIcon />}

      {/* Profile avatar — opens AuthPanel on click */}
      <div className="relative">
        <button
          ref={avatarRef}
          id="profile-avatar-btn"
          onClick={onOpenAuthModal}
          className="touch-target focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:outline-none rounded-full"
          aria-label={authUser ? `${authUser.name} — open profile` : "Sign in"}
          aria-expanded={isAuthModalOpen}
          aria-haspopup="dialog"
        >
          {authUser ? (
            <div
              className="w-9 h-9 rounded-full text-white text-sm font-bold
                flex items-center justify-center select-none border-2 border-white shadow-md relative"
              style={{ background: THEME_GRADIENTS.PRIMARY_SHORT }}
              aria-hidden="true"
            >
              {authUser.initials}
              {authUser.role === "admin" && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 text-[9px] bg-amber-400
                    text-amber-900 rounded-full w-4 h-4 flex items-center justify-center
                    font-black border border-white"
                  aria-hidden="true"
                >
                  A
                </span>
              )}
            </div>
          ) : (
            <div
              className="w-9 h-9 rounded-full bg-stone-200 text-stone-500 text-sm
                flex items-center justify-center border-2 border-white shadow-sm"
              aria-hidden="true"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </button>

        <AuthPanel />
      </div>
    </div>
  );
};
