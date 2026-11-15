import React from "react";
import type { AuthUser } from "../../../types";
import {
  THEME_COLORS,
  THEME_GRADIENTS,
  PHASE_CONFIG,
} from "../../../config";

interface UserProfileMenuProps {
  authUser: AuthUser;
  onLogout: () => void;
  onNavigate: (page: any) => void;
  onSetAdminTab: (tab: any) => void;
  onToggleOrders: (open: boolean) => void;
  onClose: () => void;
}

const ProfileLink: React.FC<{ emoji: string; label: string; onClick: () => void }> = ({
  emoji, label, onClick,
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-5 py-2.5 text-xs font-medium text-stone-700
      hover:bg-stone-50 transition-colors text-left cursor-pointer"
  >
    <span aria-hidden="true" className="text-base">{emoji}</span>
    {label}
  </button>
);

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  authUser,
  onLogout,
  onNavigate,
  onSetAdminTab,
  onToggleOrders,
  onClose,
}) => {
  if (!authUser) return null;

  return (
    <div className="overflow-y-auto">
      {/* Profile header */}
      <div
        className="px-5 py-5 flex items-center gap-4 text-white"
        style={{ background: THEME_GRADIENTS.PRIMARY }}
      >
        <div
          className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40
            flex items-center justify-center font-bold text-xl select-none flex-shrink-0"
        >
          {authUser.initials}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-base leading-tight truncate">{authUser.name}</p>
          <p className="text-sage-200 text-xs mt-0.5 truncate">{authUser.email}</p>
          <span
            className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-0.5"
            style={{
              background: authUser.role === "admin" ? THEME_COLORS.ADMIN_GOLD_ALPHA_25 : THEME_COLORS.WHITE_ALPHA_20,
              color: authUser.role === "admin" ? THEME_COLORS.ADMIN_GOLD : THEME_COLORS.SAGE_200,
            }}
          >
            {authUser.role === "admin" ? "🔒 Administrator" : "👤 Registered Patient"}
          </span>
        </div>
      </div>

      {/* Registered User Profile Details */}
      <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 text-xs space-y-1.5">
        <p className="font-bold text-stone-500 uppercase tracking-wider text-[9px]">Registered Account Details</p>
        <p className="text-stone-700">👤 Full Name: <strong className="font-semibold text-stone-900">{authUser.name}</strong></p>
        {(authUser.firstName || authUser.lastName) && (
          <p className="text-stone-500 text-[11px]">
            First: <span className="font-semibold text-stone-700">{authUser.firstName || authUser.name.split(" ")[0]}</span>
            {authUser.middleName ? ` · Middle: ${authUser.middleName}` : ""}
            {authUser.lastName ? ` · Last: ${authUser.lastName}` : ""}
          </p>
        )}
        {authUser.phone && <p className="text-stone-700">📞 Phone: <span className="font-medium">{authUser.phone}</span></p>}
        {authUser.address && (
          <p className="text-stone-700">
            📍 Address: <span className="font-medium">{authUser.address.street}, {authUser.address.city} - {authUser.address.pincode}</span>
          </p>
        )}
        {PHASE_CONFIG.ENABLE_PAYMENTS && authUser.savedUpiId && (
          <p className="text-stone-700 font-mono">🟢 Saved GPay: <span className="font-bold">{authUser.savedUpiId}</span></p>
        )}
        {PHASE_CONFIG.ENABLE_PAYMENTS && authUser.savedCards?.map((c) => (
          <p key={c.id} className="text-stone-700 font-mono">💳 Saved {c.brand}: <span className="font-bold">{c.cardNumber}</span></p>
        ))}
      </div>

      {/* Quick nav links */}
      <div className="py-2">
        {authUser.role === "patient" && (
          <>
            <ProfileLink
              emoji="📋"
              label="My Summary & History"
              onClick={() => { onNavigate("visit-summary"); onClose(); }}
            />
            <ProfileLink
              emoji="📅"
              label="Book Appointment"
              onClick={() => { onNavigate("appointments"); onClose(); }}
            />
          </>
        )}
        {authUser.role === "admin" && (
          <>
            <ProfileLink
              emoji="📊"
              label="Doctor Dashboard"
              onClick={() => { onSetAdminTab("dashboard"); onNavigate("admin-dashboard"); onClose(); }}
            />
            <ProfileLink
              emoji="📅"
              label="Appointments Schedule"
              onClick={() => { onSetAdminTab("appointments"); onNavigate("admin-dashboard"); onClose(); }}
            />
            <ProfileLink
              emoji="👥"
              label="Patients Records"
              onClick={() => { onSetAdminTab("patients"); onNavigate("admin-dashboard"); onClose(); }}
            />
            <ProfileLink
              emoji="📦"
              label="Medical Supplies & Stock"
              onClick={() => { onSetAdminTab("inventory"); onNavigate("admin-dashboard"); onClose(); }}
            />
            <ProfileLink
              emoji="🏖️"
              label="Doctor Schedule & OOO"
              onClick={() => { onSetAdminTab("calendar"); onNavigate("admin-dashboard"); onClose(); }}
            />
            <ProfileLink
              emoji="👁️"
              label="Preview Patient Portal"
              onClick={() => { onNavigate("home"); onClose(); }}
            />
          </>
        )}
        {PHASE_CONFIG.ENABLE_MEDICINE_ORDERING && (
          <ProfileLink
            emoji="🚚"
            label="My Orders & Tracking"
            onClick={() => { onToggleOrders(true); onClose(); }}
          />
        )}
      </div>

      <div className="h-px bg-stone-100 mx-4" />

      {/* Logout */}
      <div className="p-3">
        <button
          id="logout-btn"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl
            text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </button>
      </div>
    </div>
  );
};

