import React, { useRef, useMemo } from "react";
import { useApp, MOCK_ACCOUNTS } from "../context/AppContext";
import CartIcon from "./CartIcon";
import AuthPanel from "./AuthPanel";
import {
  CLINIC,
  USE_MOCK_DATA,
  PHASE_CONFIG,
  THEME_COLORS,
  THEME_GRADIENTS,
  THEME_SHADOWS,
  PATIENT_NAV_ITEMS,
  INVENTORY,
} from "../config";
import { api } from "../services/api";
import { getClinicTimeInfo } from "../utils/timezone";
import type { AdminTab } from "../types";
// ─── Nav link config (Phase 1 Order: Logo | About | Book Appointment | My Summary) ─
// ─── NavBar ───────────────────────────────────────────────────────────────────
const NavBar: React.FC = () => {
  const { state, navigateTo, setAdminTab, openAuthModal } = useApp();
  const { activePage, authUser, isAuthModalOpen, adminTab, appointments, inventory, blockedDates } = state;

  const avatarRef = useRef<HTMLButtonElement>(null);
  const isAdmin = authUser?.role === "admin";
  const clinicTime = useMemo(() => getClinicTimeInfo(), []);

  const adminStats = useMemo(() => {
    const todayAppts = appointments.filter(a => a.date === "Today" || a.date === clinicTime.todayYMD).length;
    const registeredPatients = Object.values(MOCK_ACCOUNTS).filter(a => a.profile.role === "patient").length;
    const totalStock = inventory.length;
    const lowStock = inventory.filter(i => i.stockQty <= INVENTORY.LOW_STOCK_THRESHOLD).length;
    const dispatchesCount = 2;
    const blockedDays = blockedDates.length;
    return {
      todayAppts,
      registeredPatients,
      totalStock,
      lowStock,
      dispatchesCount,
      blockedDays,
    };
  }, [appointments, clinicTime.todayYMD, inventory, blockedDates]);

  type PrimaryAdminGroup = "dashboard" | "appointments" | "patients" | "supplies";

  const activePrimaryGroup: PrimaryAdminGroup = useMemo(() => {
    if (adminTab === "appointments" || adminTab === "calendar") return "appointments";
    if (adminTab === "inventory" || adminTab === "dispatches") return "supplies";
    if (adminTab === "patients" || adminTab === "billing") return "patients";
    return "dashboard";
  }, [adminTab]);

  const handleAdminNav = (tab: AdminTab) => {
    setAdminTab(tab);
    if (activePage !== "admin-dashboard") {
      navigateTo("admin-dashboard");
    }
  };

  return (
    <header
      className="sticky top-0 z-40 glass border-b border-white/40"
      style={{ boxShadow: THEME_SHADOWS.NAV_DROPSHADOW }}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-[60px] gap-4">

        {/* ── Brand ───────────────────────────────────────── */}
        <button
          id="brand-logo-btn"
          onClick={() => {
            if (isAdmin) navigateTo("admin-dashboard");
            else navigateTo("home");
          }}
          className="flex items-center gap-2.5 group select-none flex-shrink-0
            focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none rounded-xl cursor-pointer"
          aria-label={`${CLINIC.FULL_NAME} — Return to home`}
        >
          <img
            src={CLINIC.LOGO_PATH}
            alt={CLINIC.LOGO_ALT}
            className="h-9 w-9 sm:h-10 sm:w-10 object-contain transition-transform duration-300 group-hover:scale-105"
            width={40}
            height={40}
          />
          <div className="flex flex-col text-left">
            <span
              className="font-extrabold text-sm sm:text-base tracking-tight leading-none block"
              style={{ color: CLINIC.BRAND.NAVY, letterSpacing: "-0.01em" }}
            >
              {CLINIC.NAME}
            </span>
            <span
              className="text-[9px] font-bold tracking-wider uppercase leading-none mt-0.5"
              style={{ color: CLINIC.BRAND.GREEN }}
            >
              Homoeopathy Clinic
            </span>
          </div>
        </button>

        {/* ── Navigation links: visible on website view (desktop md:), hidden on mobile view (since mobile uses bottom tabs) ── */}
        <nav className="hidden md:flex items-center gap-1.5 ml-4 overflow-x-auto scrollbar-hide flex-shrink min-w-0" aria-label="Main navigation">
          {isAdmin ? (
            /* DOCTOR ADMIN DIRECT TOP NAVIGATION: EXACTLY 4 PRIMARY MODULES */
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1" role="tablist" aria-label="Doctor Admin Navigation">
              {/* 1. Dashboard */}
              <button
                id="admin-nav-dashboard"
                onClick={() => handleAdminNav("dashboard")}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  activePage === "admin-dashboard" && activePrimaryGroup === "dashboard"
                    ? "bg-emerald-100 text-emerald-950 font-black shadow-xs ring-1 ring-emerald-300"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/80"
                }`}
                aria-label="Doctor Dashboard Overview"
                title="Practice Overview & High-Level Summary"
              >
                <span>📊</span>
                <span>Dashboard</span>
              </button>

              {/* 2. Appointments */}
              <button
                id="admin-nav-appointments"
                onClick={() => handleAdminNav(adminTab === "calendar" ? "calendar" : "appointments")}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  activePage === "admin-dashboard" && activePrimaryGroup === "appointments"
                    ? "bg-emerald-100 text-emerald-950 font-black shadow-xs ring-1 ring-emerald-300"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/80"
                }`}
                aria-label="Appointments Hub"
                title="Daily Consultations & Doctor Calendar"
              >
                <span>📅</span>
                <span>Appointments</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-emerald-200/80 text-emerald-900 border border-emerald-300">
                  {adminStats.todayAppts} Today
                </span>
              </button>

              {/* 3. Patients Records */}
              <button
                id="admin-nav-patients"
                onClick={() => handleAdminNav("patients")}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  activePage === "admin-dashboard" && activePrimaryGroup === "patients"
                    ? "bg-teal-100 text-teal-950 font-black shadow-xs ring-1 ring-teal-300"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/80"
                }`}
                aria-label="Patients Records"
                title="Registered Patient Medical Records & Case Histories"
              >
                <span>👥</span>
                <span>Patients Records</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-teal-200/80 text-teal-900 border border-teal-300">
                  {adminStats.registeredPatients}
                </span>
              </button>

              {/* 4. Medical Supplies */}
              <button
                id="admin-nav-supplies"
                onClick={() => handleAdminNav(adminTab === "dispatches" ? "dispatches" : "inventory")}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  activePage === "admin-dashboard" && activePrimaryGroup === "supplies"
                    ? "bg-purple-100 text-purple-950 font-black shadow-xs ring-1 ring-purple-300"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/80"
                }`}
                aria-label="Medical Supplies & Logistics"
                title="Medicine Inventory Stock & PO Logistics"
              >
                <span>📦</span>
                <span>Medical Supplies</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-purple-200/80 text-purple-900 border border-purple-300">
                  {adminStats.totalStock}
                  {adminStats.lowStock > 0 && (
                    <span className="ml-1 text-amber-900 font-black">({adminStats.lowStock} Low)</span>
                  )}
                </span>
              </button>
            </div>
          ) : (
            /* PATIENT NAVIGATION LINKS: About | Book Appointment | (My Summary only if logged in) */
            PATIENT_NAV_ITEMS
              .filter((item) => item.id !== "home" && (item.id !== "visit-summary" || !!authUser))
              .map((item) => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => navigateTo(item.id)}
                  className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-sm transition-all duration-200 cursor-pointer whitespace-nowrap"
                  style={{
                    background: isActive ? THEME_COLORS.SAGE_ALPHA_08 : "transparent",
                    color:      isActive ? THEME_COLORS.SAGE_900 : THEME_COLORS.STONE_500,
                    fontWeight: isActive ? 700 : 500,
                  }}
                  aria-label={item.ariaLabel}
                >
                  <span className="text-sm">{item.emoji}</span>
                  <span>{item.label}</span>
                </button>
              );
            })
          )}
        </nav>

        <div className="flex-1 min-w-1" />

        {/* ── WhatsApp + Cart + Avatar ─────────────────────── */}
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

          {/* Doctor Voice Studio Header Button (Admin Only) */}
          {authUser?.role === "admin" && (
            <button
              onClick={() => navigateTo("admin-dashboard")}
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
            title="Chat with Agastya Clinic on WhatsApp"
            aria-label="Connect on WhatsApp"
          >
            <span>📱</span>
            <span className="hidden sm:inline">WhatsApp</span>
          </button>

          {/* Cart Icon — Phase 2 feature */}
          {PHASE_CONFIG.ENABLE_CART && <CartIcon />}

          {/* Profile avatar — opens AuthPanel on click */}
          <div className="relative">
            <button
              ref={avatarRef}
              id="profile-avatar-btn"
              onClick={openAuthModal}
              className="touch-target focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:outline-none rounded-full"
              aria-label={authUser ? `${authUser.name} — open profile` : "Sign in"}
              aria-expanded={isAuthModalOpen}
              aria-haspopup="dialog"
            >
              {authUser ? (
                /* Logged-in avatar */
                <div
                  className="w-9 h-9 rounded-full text-white text-sm font-bold
                    flex items-center justify-center select-none border-2 border-white shadow-md relative"
                  style={{ background: THEME_GRADIENTS.PRIMARY_SHORT }}
                  aria-hidden="true"
                >
                  {authUser.initials}
                  {/* Admin badge */}
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
                /* Guest avatar */
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

            {/* Auth dropdown panel — positioned relative to avatar */}
            <AuthPanel />
          </div>
        </div>
      </div>

      {/* ── SECONDARY SUB-NAVIGATION BAR (SPLITS ACTIVE PRIMARY SECTION INTO DETAILED TABS) ── */}
      {isAdmin && activePage === "admin-dashboard" && (
        <div className="bg-stone-50/95 border-t border-stone-200/70 py-1.5 px-4 sm:px-6 shadow-2xs">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Sub-splits for Appointments */}
            {activePrimaryGroup === "appointments" && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5" role="tablist">
                <span className="text-[11px] font-bold text-stone-500 mr-1 flex items-center gap-1 uppercase tracking-wider">
                  <span>📅</span> Appointments:
                </span>
                <button
                  id="subnav-appointments-roster"
                  onClick={() => handleAdminNav("appointments")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminTab === "appointments"
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <span>📅</span>
                  <span>Consultations & Daily Schedule</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    adminTab === "appointments" ? "bg-emerald-700 text-emerald-100" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {adminStats.todayAppts} Today
                  </span>
                </button>

                <button
                  id="subnav-appointments-calendar"
                  onClick={() => handleAdminNav("calendar")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminTab === "calendar"
                      ? "bg-emerald-800 text-white shadow-xs"
                      : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <span>🏖️</span>
                  <span>Doctor Availability & OOO / Blocked Days</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    adminTab === "calendar" ? "bg-emerald-700 text-emerald-100" : "bg-rose-100 text-rose-800"
                  }`}>
                    {adminStats.blockedDays} Days
                  </span>
                </button>
              </div>
            )}

            {/* Sub-splits for Medical Supplies */}
            {activePrimaryGroup === "supplies" && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5" role="tablist">
                <span className="text-[11px] font-bold text-stone-500 mr-1 flex items-center gap-1 uppercase tracking-wider">
                  <span>📦</span> Supplies:
                </span>
                <button
                  id="subnav-supplies-stock"
                  onClick={() => handleAdminNav("inventory")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminTab === "inventory"
                      ? "bg-purple-800 text-white shadow-xs"
                      : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <span>📦</span>
                  <span>Medicine Stock Inventory</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    adminTab === "inventory" ? "bg-purple-700 text-purple-100" : "bg-purple-100 text-purple-800"
                  }`}>
                    {adminStats.totalStock} items
                    {adminStats.lowStock > 0 ? ` (${adminStats.lowStock} Low)` : ""}
                  </span>
                </button>

                <button
                  id="subnav-supplies-dispatches"
                  onClick={() => handleAdminNav("dispatches")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminTab === "dispatches"
                      ? "bg-purple-800 text-white shadow-xs"
                      : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <span>🚚</span>
                  <span>PO Dispatches & Logistics Tracking</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                    adminTab === "dispatches" ? "bg-purple-700 text-purple-100" : "bg-sky-100 text-sky-800"
                  }`}>
                    {adminStats.dispatchesCount} Active POs
                  </span>
                </button>
              </div>
            )}

            {/* Sub-splits for Dashboard */}
            {activePrimaryGroup === "dashboard" && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5" role="tablist">
                <span className="text-[11px] font-bold text-stone-500 mr-1 flex items-center gap-1 uppercase tracking-wider">
                  <span>📊</span> Dashboard:
                </span>
                <button
                  id="subnav-dashboard-summary"
                  onClick={() => handleAdminNav("dashboard")}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-800 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>📊</span>
                  <span>Practice Summary Hub</span>
                </button>
                <button
                  id="subnav-dashboard-today-roster"
                  onClick={() => handleAdminNav("appointments")}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <span>📅</span>
                  <span>Today's Roster ({adminStats.todayAppts})</span>
                </button>
                <button
                  id="subnav-dashboard-stock-alerts"
                  onClick={() => handleAdminNav("inventory")}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <span>📦</span>
                  <span>Stock Alerts ({adminStats.lowStock} Low)</span>
                </button>
                <button
                  id="subnav-dashboard-logistics"
                  onClick={() => handleAdminNav("dispatches")}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <span>🚚</span>
                  <span>Logistics ({adminStats.dispatchesCount} POs)</span>
                </button>
              </div>
            )}

            {/* Sub-splits for Patients */}
            {activePrimaryGroup === "patients" && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5" role="tablist">
                <span className="text-[11px] font-bold text-stone-500 mr-1 flex items-center gap-1 uppercase tracking-wider">
                  <span>👥</span> Patients:
                </span>
                <button
                  id="subnav-patients-all"
                  onClick={() => handleAdminNav("patients")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminTab === "patients"
                      ? "bg-teal-800 text-white shadow-xs"
                      : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <span>👥</span>
                  <span>Patient Records ({adminStats.registeredPatients})</span>
                </button>
                <button
                  id="subnav-patients-billing"
                  onClick={() => handleAdminNav("billing")}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    adminTab === "billing"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  <span>💳</span>
                  <span>Invoices &amp; Billing</span>
                </button>
                <button
                  id="subnav-patients-appointments"
                  onClick={() => handleAdminNav("appointments")}
                  className="px-3 py-1 rounded-xl text-xs font-bold bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 cursor-pointer flex items-center gap-1.5 transition-all"
                >
                  <span>📅</span>
                  <span>Consultations ({adminStats.todayAppts} Today)</span>
                </button>
              </div>
            )}

            {/* Right side location & live clinic clock */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-[11px] font-bold text-stone-500 bg-white border border-stone-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                <span>📍</span> {CLINIC.BRANCHES.MALLESHWARAM} · {clinicTime.label} ({clinicTime.formattedTime})
              </span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default NavBar;
