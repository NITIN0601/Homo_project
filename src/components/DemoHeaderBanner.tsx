import React, { useState } from "react";
import { useApp, MOCK_ACCOUNTS } from "../context/AppContext";
import { DEMO_CREDENTIALS, DEV_PORTS } from "../config";

export const DemoHeaderBanner: React.FC = () => {
  const { state, login, logout, navigateTo } = useApp();
  const { authUser, activePage } = state;
  const [collapsed, setCollapsed] = useState(false);

  const port = typeof window !== "undefined" ? window.location.port : "";
  const isAdminPort = port === DEV_PORTS.ADMIN;
  const isPatientPort = port === DEV_PORTS.PATIENT;
  const isAdminRole = authUser?.role === "admin";

  if (collapsed) {
    return (
      <aside aria-label="Mock Demo Navigation">
        <button
          onClick={() => setCollapsed(false)}
          className="fixed bottom-3 right-3 z-50 px-3 py-1.5 rounded-full text-[11px] font-extrabold shadow-lg backdrop-blur-md border transition-all hover:scale-105 cursor-pointer bg-stone-900 text-white border-stone-700 opacity-90 hover:opacity-100 flex items-center gap-1.5"
          title="Expand Demo Environment Switcher"
        >
          <span>🧪</span>
          <span>Demo Controls ({isAdminPort ? "Admin :5174" : isPatientPort ? "Patient :5173" : "Mock"})</span>
          <span className="text-[10px] text-stone-400">▲</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Mock Demo Mode Banner"
      className="bg-stone-900 text-stone-100 text-xs py-2 px-4 border-b border-stone-800 shadow-sm relative z-50 select-none"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Port & Current Identity Status */}
        <div className="flex items-center flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-black text-[11px] tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Mock Demo Sandbox
          </span>

          <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-300">
            <span className="text-stone-400 font-mono">
              [localhost:{port || (isAdminRole ? "5174" : "5173")}]
            </span>
            <span>·</span>
            <span>Active Instance:</span>
            <strong className="text-white flex items-center gap-1 font-bold">
              {isAdminRole ? "🩺 Clinic Admin Console" : "👤 Patient Client Portal"}
            </strong>
            <span className="text-stone-400">
              ({authUser ? `${authUser.name} · ${authUser.role}` : "Guest / Not signed in"})
            </span>
          </div>
        </div>

        {/* Right Side: 1-Click Role Switchers and In-App Portal Navigation */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Quick-switch buttons inside current window */}
          <div className="flex items-center gap-1 bg-stone-800/80 p-0.5 rounded-lg border border-stone-700/60 text-[10px]">
            <span className="px-1.5 text-stone-400 font-semibold">Simulate Login:</span>

            <button
              onClick={() => {
                login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.ADMIN.email].profile);
                navigateTo("admin-dashboard");
              }}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                isAdminRole
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-stone-300 hover:text-white hover:bg-stone-700"
              }`}
              title="Switch identity to Admin Doctor"
            >
              🩺 Admin (Dr. Bramarambha)
            </button>

            <button
              onClick={() => {
                login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.PATIENT.email].profile);
                if (activePage === "admin-dashboard") navigateTo("home");
              }}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                authUser?.id === "usr-001"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-stone-300 hover:text-white hover:bg-stone-700"
              }`}
              title="Switch identity to Patient John Doe"
            >
              👤 Patient (John)
            </button>

            <button
              onClick={() => {
                login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.PATIENT2.email].profile);
                if (activePage === "admin-dashboard") navigateTo("home");
              }}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                authUser?.id === "usr-002"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-stone-300 hover:text-white hover:bg-stone-700"
              }`}
              title="Switch identity to Patient Priya Sharma"
            >
              👩 Patient (Priya)
            </button>

            {authUser && (
              <button
                onClick={() => {
                  logout();
                  navigateTo("home");
                }}
                className="px-2 py-0.5 rounded text-stone-400 hover:text-rose-300 hover:bg-stone-700 transition-colors cursor-pointer"
                title="Log out to Guest Visitor mode"
              >
                🚪 Guest
              </button>
            )}
          </div>

          {/* Quick Portal Switch for Admin */}
          {isAdminRole && (
            <button
              onClick={() => {
                if (activePage === "admin-dashboard") {
                  navigateTo("home");
                } else {
                  navigateTo("admin-dashboard");
                }
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer"
              title={activePage === "admin-dashboard" ? "View Patient Landing Page" : "Back to Admin Dashboard"}
            >
              <span>{activePage === "admin-dashboard" ? "👁️ Preview Patient View" : "🩺 Back to Admin Console"}</span>
            </button>
          )}

          {/* Minimize / Collapse Button */}
          <button
            onClick={() => setCollapsed(true)}
            className="text-stone-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-stone-800 transition-colors text-xs font-mono ml-1 cursor-pointer"
            title="Minimize banner"
            aria-label="Minimize demo banner"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  );
};

export default DemoHeaderBanner;
