import React from "react";

export interface PlatformStats {
  totalHospitals: number;
  totalDoctors: number;
  activeTenantName: string;
  activeTenantId: string;
  superAdminEmail: string;
}

export interface PlatformStatsBarProps {
  stats: PlatformStats;
}

export const PlatformStatsBar: React.FC<PlatformStatsBarProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">Total Facilities</p>
        <p className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">{stats.totalHospitals}</p>
        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">✓ Multi-tenant isolated</p>
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">Physicians Onboarded</p>
        <p className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">{stats.totalDoctors}</p>
        <p className="text-[10px] text-indigo-600 font-bold mt-0.5">Google OAuth &amp; Invite Enabled</p>
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">Active Tenant Preview</p>
        <p className="text-sm font-black text-indigo-900 mt-2 truncate">{stats.activeTenantName}</p>
        <p className="text-[10px] text-stone-400 font-mono mt-0.5">id: {stats.activeTenantId}</p>
      </div>
      <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-xs">
        <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">Governance Engine</p>
        <p className="text-sm font-black text-stone-800 mt-2">Doctor &amp; Patient Access</p>
        <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Feature Toggles Active</p>
      </div>
    </div>
  );
};

