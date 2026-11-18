import React from "react";
import type { AdminTab } from "@core/types";
import type { PrimaryAdminGroup, AdminNavStats } from "./navTypes";
import type { HospitalTenantConfig } from "@core/types/tenant";
import { Badge } from "../../shared/ui/Badge";
import { HOSPITAL } from "../../core/config";

interface NavAdminSubBarProps {
  activePrimaryGroup: PrimaryAdminGroup;
  adminTab: AdminTab | null;
  adminStats: AdminNavStats;
  tenant: HospitalTenantConfig;
  hospitalTime?: { label: string; formattedTime: string };
  onAdminNav: (tab: AdminTab) => void;
}

export const NavAdminSubBar: React.FC<NavAdminSubBarProps> = ({
  activePrimaryGroup,
  adminTab,
  adminStats,
  tenant,
  hospitalTime,
  onAdminNav,
}) => {
  const activeTime = hospitalTime || { label: "IST", formattedTime: "" };
  return (
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
              onClick={() => onAdminNav("appointments")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                adminTab === "appointments"
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
              }`}
            >
              <span>📅</span>
              <span>Consultations &amp; Daily Schedule</span>
              <Badge
                size="micro"
                variant={adminTab === "appointments" ? "success" : "neutral"}
                className={adminTab === "appointments" ? "bg-emerald-700 text-emerald-100 border-emerald-600" : undefined}
              >
                {adminStats.todayAppts} Today
              </Badge>
            </button>

            <button
              id="subnav-appointments-calendar"
              onClick={() => onAdminNav("calendar")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                adminTab === "calendar"
                  ? "bg-emerald-800 text-white shadow-xs"
                  : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
              }`}
            >
              <span>🏖️</span>
              <span>Doctor Availability &amp; OOO / Blocked Days</span>
              <Badge
                size="micro"
                variant={adminTab === "calendar" ? "success" : "danger"}
                className={adminTab === "calendar" ? "bg-emerald-700 text-emerald-100 border-emerald-600" : undefined}
              >
                {adminStats.blockedDays} Days
              </Badge>
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
              onClick={() => onAdminNav("inventory")}
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
              onClick={() => onAdminNav("dispatches")}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                adminTab === "dispatches"
                  ? "bg-purple-800 text-white shadow-xs"
                  : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
              }`}
            >
              <span>🚚</span>
              <span>PO Dispatches &amp; Logistics Tracking</span>
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
              onClick={() => onAdminNav("dashboard")}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-800 text-white shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>📊</span>
              <span>Practice Summary Hub</span>
            </button>
            <button
              id="subnav-dashboard-today-roster"
              onClick={() => onAdminNav("appointments")}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <span>📅</span>
              <span>Today's Roster ({adminStats.todayAppts})</span>
            </button>
            <button
              id="subnav-dashboard-stock-alerts"
              onClick={() => onAdminNav("inventory")}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <span>📦</span>
              <span>Stock Alerts ({adminStats.lowStock} Low)</span>
            </button>
            <button
              id="subnav-dashboard-logistics"
              onClick={() => onAdminNav("dispatches")}
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
              onClick={() => onAdminNav("patients")}
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
              onClick={() => onAdminNav("billing")}
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
              onClick={() => onAdminNav("appointments")}
              className="px-3 py-1 rounded-xl text-xs font-bold bg-white text-stone-700 border border-stone-200 hover:bg-stone-100 cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <span>📅</span>
              <span>Consultations ({adminStats.todayAppts} Today)</span>
            </button>
          </div>
        )}

        {/* Right side location & live hospital clock */}
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[11px] font-bold text-stone-500 bg-white border border-stone-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1">
            <span>📍</span> {tenant.contact.address.city || HOSPITAL.ADDRESS.CITY} · {activeTime.label} ({activeTime.formattedTime})
          </span>
        </div>
      </div>
    </div>
  );
};

export default NavAdminSubBar;
