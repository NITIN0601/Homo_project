import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useTenant } from "../../context/ThemeProvider";
import { MOCK_ACCOUNTS } from "../../data/mocks";
import { DEMO_CREDENTIALS, DEV_PORTS } from "../../config";

export const DemoHeaderBanner: React.FC = () => {
  const { state, login, logout, navigateTo } = useApp();
  const { tenant } = useTenant();
  const { authUser, activePage } = state;
  const [collapsed, setCollapsed] = useState(false);

  const port = typeof window !== "undefined" ? window.location.port : "";
  const isAdminPort = port === DEV_PORTS.ADMIN;
  const isPatientPort = port === DEV_PORTS.PATIENT;

  const isSuperAdminRole = authUser?.role === "super_admin";
  const isAdminRole = authUser?.role === "admin";
  const isSuperAdminPage = activePage === "super-admin-dashboard";
  const isAdminPage = activePage === "admin-dashboard";

  const doctorShortName = tenant.doctor?.name ? tenant.doctor.name.replace(/^Dr\.\s*/, "") : "Doctor";

  if (collapsed) {
    return (
      <aside aria-label="Mock Demo Navigation">
        <button
          onClick={() => setCollapsed(false)}
          className="fixed bottom-3 right-3 z-50 px-3 py-1.5 rounded-full text-[11px] font-extrabold shadow-lg backdrop-blur-md border transition-all hover:scale-105 cursor-pointer bg-stone-900 text-white border-stone-700 opacity-90 hover:opacity-100 flex items-center gap-1.5"
          title="Expand Demo Environment Switcher"
        >
          <span>🧪</span>
          <span>
            {isSuperAdminPage
              ? "⚡ Super Admin"
              : isAdminPage
              ? `🩺 Admin :${isAdminPort ? "5174" : port || "5173"}`
              : `👤 Patient :${isPatientPort ? "5173" : port || "5173"}`}
          </span>
          <span className="text-[10px] text-stone-400">▲</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Mock Demo Mode Banner"
      className="bg-stone-900 text-stone-100 text-xs py-2 px-4 border-b border-stone-800 shadow-sm relative z-[60] select-none"
    >
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left Side: Port & Active Dashboard Identity */}
        <div className="flex items-center flex-wrap gap-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-black text-[11px] tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Mock Sandbox
          </span>

          <div className="flex items-center gap-1.5 text-[11px] font-medium text-stone-300">
            <span className="text-stone-400 font-mono">
              [localhost:{port || (isSuperAdminPage ? "5173" : isAdminRole ? "5174" : "5173")}]
            </span>
            <span>·</span>
            <span>Active Dashboard:</span>
            <strong className="text-white flex items-center gap-1 font-bold">
              {isSuperAdminPage
                ? "⚡ Platform Super Admin Console"
                : isAdminPage
                ? "🩺 Clinic Doctor Admin Console"
                : "👤 Patient Client Portal"}
            </strong>
            <span className="text-stone-400">
              ({authUser ? `${authUser.name} [${authUser.role}]` : "Guest / Not signed in"})
            </span>
          </div>
        </div>

        {/* Right Side: 3-Dashboard Role Switchers and Direct Navigation */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Quick-switch simulated identities */}
          <div className="flex items-center gap-1 bg-stone-800/80 p-0.5 rounded-lg border border-stone-700/60 text-[10px]">
            <span className="px-1.5 text-stone-400 font-semibold">Switch Role:</span>

            {/* 1. Super Admin Role & Console */}
            <button
              onClick={() => {
                login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.SUPER_ADMIN.email].profile);
                navigateTo("super-admin-dashboard");
              }}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                isSuperAdminPage || isSuperAdminRole
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-stone-300 hover:text-white hover:bg-stone-700"
              }`}
              title="Switch identity to Platform Super Administrator"
            >
              <span>⚡</span> Super Admin
            </button>

            {/* 2. Doctor Admin Role & Console */}
            <button
              onClick={() => {
                login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.ADMIN.email].profile);
                navigateTo("admin-dashboard");
              }}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                isAdminPage || isAdminRole
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-stone-300 hover:text-white hover:bg-stone-700"
              }`}
              title={`Switch identity to Admin Doctor (${doctorShortName})`}
            >
              <span>🩺</span> Doctor Admin
            </button>

            {/* 3. Patient Role & Portal */}
            <button
              onClick={() => {
                login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.PATIENT.email].profile);
                navigateTo("home");
              }}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                !isSuperAdminPage && !isAdminPage && authUser?.id === "usr-001"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-stone-300 hover:text-white hover:bg-stone-700"
              }`}
              title="Switch identity to Patient John Doe"
            >
              <span>👤</span> Patient (John)
            </button>

            {/* 4. Second Patient */}
            <button
              onClick={() => {
                login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.PATIENT2.email].profile);
                navigateTo("home");
              }}
              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                !isSuperAdminPage && !isAdminPage && authUser?.id === "usr-002"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-stone-300 hover:text-white hover:bg-stone-700"
              }`}
              title="Switch identity to Patient Priya Sharma"
            >
              👩 Priya
            </button>

            {/* 5. Guest */}
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

          {/* Direct Dashboard Jump Buttons */}
          <div className="flex items-center gap-1">
            {isSuperAdminPage ? (
              <>
                <button
                  onClick={() => {
                    login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.ADMIN.email].profile);
                    navigateTo("admin-dashboard");
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer"
                  title="Jump to Clinic Doctor Admin Console"
                >
                  <span>🩺 Clinic Admin</span>
                </button>
                <button
                  onClick={() => {
                    navigateTo("home");
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer"
                  title="Jump to Patient Portal"
                >
                  <span>👁️ Patient View</span>
                </button>
              </>
            ) : isAdminPage ? (
              <>
                <button
                  onClick={() => {
                    login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.SUPER_ADMIN.email].profile);
                    navigateTo("super-admin-dashboard");
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all cursor-pointer"
                  title="Jump to Platform Super Admin Console"
                >
                  <span>⚡ Super Admin</span>
                </button>
                <button
                  onClick={() => {
                    navigateTo("home");
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all cursor-pointer"
                  title="Jump to Patient Portal"
                >
                  <span>👁️ Patient View</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.ADMIN.email].profile);
                    navigateTo("admin-dashboard");
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all cursor-pointer"
                  title="Open Doctor Admin Console"
                >
                  <span>🩺 Doctor Console</span>
                </button>
                <button
                  onClick={() => {
                    login(MOCK_ACCOUNTS[DEMO_CREDENTIALS.SUPER_ADMIN.email].profile);
                    navigateTo("super-admin-dashboard");
                  }}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all cursor-pointer"
                  title="Open Platform Super Admin Console"
                >
                  <span>⚡ Super Admin</span>
                </button>
              </>
            )}
          </div>

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
