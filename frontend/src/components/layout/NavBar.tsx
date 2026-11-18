import React, { useRef, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { useTenant } from "../../context/ThemeProvider";
import { useHospital } from "../../hooks/useHospital";
import { MOCK_ACCOUNTS } from "../../data/mocks";
import {
  USE_MOCK_DATA,
  THEME_SHADOWS,
  INVENTORY,
} from "../../config";
import { getHospitalTimeInfo } from "../../utils/timezone";
import type { AdminTab } from "../../types";
import { NavBrand } from "./NavBrand";
import { NavAdminLinks } from "./NavAdminLinks";
import { NavPatientLinks } from "./NavPatientLinks";
import { NavUserControls } from "./NavUserControls";
import { NavAdminSubBar } from "./NavAdminSubBar";
import type { PrimaryAdminGroup, AdminNavStats } from "./navTypes";

export const NavBar: React.FC = () => {
  const { state, navigateTo, setAdminTab, openAuthModal } = useApp();
  const { tenant, setTenantId } = useTenant();
  const hospital = useHospital();
  const { activePage, authUser, isAuthModalOpen, adminTab, appointments, inventory, blockedDates } = state;

  const avatarRef = useRef<HTMLButtonElement>(null);
  const isSuperAdmin = authUser?.role === "super_admin" || activePage === "super-admin-dashboard";
  const isAdminPage = activePage === "admin-dashboard" || (authUser?.role === "admin" && !isSuperAdmin);
  const hospitalTime = useMemo(() => getHospitalTimeInfo(), []);

  const adminStats = useMemo<AdminNavStats>(() => {
    const todayAppts = appointments.filter(a => a.date === "Today" || a.date === hospitalTime.todayYMD).length;
    const registeredPatients = new Set([
      ...Object.keys(state.visitSummaries),
      ...appointments.map((a) => a.patientId).filter(Boolean),
      ...(USE_MOCK_DATA ? Object.values(MOCK_ACCOUNTS).filter((a) => a.profile.role === "patient").map((a) => a.profile.id) : []),
    ]).size;
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
  }, [appointments, hospitalTime.todayYMD, inventory, blockedDates, state.visitSummaries]);

  const activePrimaryGroup: PrimaryAdminGroup = useMemo(() => {
    if (adminTab === "customization") return "customization";
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

  const handleBrandClick = () => {
    if (isSuperAdmin) navigateTo("super-admin-dashboard");
    else if (isAdminPage) navigateTo("admin-dashboard");
    else navigateTo("home");
  };

  return (
    <header
      className="sticky top-0 z-[60] glass border-b border-white/40"
      style={{ boxShadow: THEME_SHADOWS.NAV_DROPSHADOW }}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center h-[60px] gap-4">
        {/* Brand */}
        <NavBrand hospital={hospital} onBrandClick={handleBrandClick} />

        {/* Navigation links (Desktop md:) */}
        <nav className="hidden md:flex items-center gap-1.5 ml-4 overflow-x-auto scrollbar-hide flex-shrink min-w-0" aria-label="Main navigation">
          {isSuperAdmin ? (
            <div className="flex items-center gap-2 text-xs font-bold text-stone-700 bg-indigo-50/90 border border-indigo-200/80 px-3.5 py-1 rounded-full shadow-2xs">
              <span className="text-indigo-600">⚡</span>
              <span className="text-indigo-950 font-black tracking-wide uppercase text-[10px]">Platform Controller</span>
              <span className="text-stone-300">|</span>
              <span className="text-stone-500 font-medium text-[11px]">Multi-Tenant Fleet Governance</span>
            </div>
          ) : isAdminPage ? (
            <NavAdminLinks
              activePage={activePage}
              adminTab={adminTab}
              activePrimaryGroup={activePrimaryGroup}
              adminStats={adminStats}
              onAdminNav={handleAdminNav}
            />
          ) : (
            <NavPatientLinks
              activePage={activePage}
              authUser={authUser}
              onNavigate={navigateTo}
            />
          )}
        </nav>

        <div className="flex-1 min-w-1" />

        {/* User Controls, Role Badges, Cart & Profile */}
        <NavUserControls
          authUser={authUser}
          isSuperAdmin={isSuperAdmin}
          tenant={tenant}
          onSetTenantId={setTenantId}
          onNavigateTo={navigateTo}
          isAuthModalOpen={isAuthModalOpen}
          onOpenAuthModal={openAuthModal}
          avatarRef={avatarRef}
        />
      </div>

      {/* Secondary Sub-Navigation Bar for Doctor Admin */}
      {isAdminPage && activePage === "admin-dashboard" && (
        <NavAdminSubBar
          activePrimaryGroup={activePrimaryGroup}
          adminTab={adminTab}
          adminStats={adminStats}
          tenant={tenant}
          hospitalTime={hospitalTime}
          onAdminNav={handleAdminNav}
        />
      )}
    </header>
  );
};

export default NavBar;
