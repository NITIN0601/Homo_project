import React from "react";
import type { AdminTab, Page } from "@core/types";
import type { PrimaryAdminGroup, AdminNavStats } from "./navTypes";

interface NavAdminLinksProps {
  activePage: Page;
  adminTab: AdminTab | null;
  activePrimaryGroup: PrimaryAdminGroup;
  adminStats: AdminNavStats;
  onAdminNav: (tab: AdminTab) => void;
}

export const NavAdminLinks: React.FC<NavAdminLinksProps> = ({
  activePage,
  adminTab,
  activePrimaryGroup,
  adminStats,
  onAdminNav,
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-1" role="tablist" aria-label="Doctor Admin Navigation">
      {/* 1. Dashboard */}
      <button
        id="admin-nav-dashboard"
        onClick={() => onAdminNav("dashboard")}
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
        onClick={() => onAdminNav(adminTab === "calendar" ? "calendar" : "appointments")}
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
        onClick={() => onAdminNav("patients")}
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
        onClick={() => onAdminNav(adminTab === "dispatches" ? "dispatches" : "inventory")}
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

      {/* 5. Customization */}
      <button
        id="admin-nav-customization"
        onClick={() => onAdminNav("customization")}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
          activePage === "admin-dashboard" && activePrimaryGroup === "customization"
            ? "bg-amber-100 text-amber-950 font-black shadow-xs ring-1 ring-amber-300"
            : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/80"
        }`}
        aria-label="Hospital Customization & Feature Toggles"
        title="Hospital Features, Doctor Bio & Branding Customization"
      >
        <span>⚙️</span>
        <span>Customization</span>
      </button>
    </div>
  );
};
