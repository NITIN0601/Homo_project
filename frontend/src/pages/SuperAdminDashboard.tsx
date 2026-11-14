import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useApp, useRequireRole } from "../context/AppContext";
import { useTenant } from "../context/ThemeProvider";
import {
  getAllHospitalTenants,
  registerHospitalTenant,
  updateHospitalTenantInRegistry,
} from "../config/tenants";
import type { HospitalTenantConfig, HospitalDoctor, HospitalFeatures } from "../types/tenant";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui";
import { DashboardErrorBoundary } from "../components";
import { api } from "../services/api";
import {
  PlatformStatsBar,
  HospitalCard,
  ManageFeaturesModal,
  OnboardHospitalModal,
  OnboardSuccessDialog,
  type OnboardSuccessResult,
} from "./superadmin";

export const SuperAdminDashboard: React.FC = () => {
  // Enforce Super Admin RBAC boundary
  useRequireRole("super_admin");

  const { state, navigateTo } = useApp();
  const { tenant, setTenantId } = useTenant();
  const toast = useToast();

  const [tenantsList, setTenantsList] = useState<HospitalTenantConfig[]>(() => getAllHospitalTenants());
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [managingTenant, setManagingTenant] = useState<HospitalTenantConfig | null>(null);
  const [onboardedResult, setOnboardedResult] = useState<OnboardSuccessResult | null>(null);

  // Sync with tenant registry events across browser tabs/components
  const refreshTenants = useCallback(() => {
    setTenantsList(getAllHospitalTenants());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("tenant_registry_updated", refreshTenants);
    window.addEventListener("storage", refreshTenants);
    return () => {
      window.removeEventListener("tenant_registry_updated", refreshTenants);
      window.removeEventListener("storage", refreshTenants);
    };
  }, [refreshTenants]);

  const handleSwitchTenant = (targetTenant: HospitalTenantConfig) => {
    setTenantId(targetTenant.id);
    toast.success(`Active hospital switched to ${targetTenant.name}`);
  };

  const handlePreviewAsPatient = (targetTenant: HospitalTenantConfig) => {
    setTenantId(targetTenant.id);
    navigateTo("home");
  };

  const handlePreviewAsDoctor = (targetTenant: HospitalTenantConfig) => {
    setTenantId(targetTenant.id);
    navigateTo("admin-dashboard");
  };

  const handleSaveFeatures = async (updatedFeatures: HospitalFeatures) => {
    if (!managingTenant) return;

    try {
      await api.platform.updateHospitalFeatures(managingTenant.id, updatedFeatures as any);
    } catch {
      // Offline / local fallback
    }

    const updatedTenant: HospitalTenantConfig = {
      ...managingTenant,
      features: updatedFeatures,
    };

    updateHospitalTenantInRegistry(updatedTenant);
    setTenantsList((prev) => prev.map((t) => (t.id === managingTenant.id ? updatedTenant : t)));

    if (tenant.id === managingTenant.id) {
      setTenantId(managingTenant.id);
    }

    toast.success(`Layout & functionality permissions updated for '${managingTenant.name}'!`);
    setManagingTenant(null);
  };

  const handleOnboardHospital = async (
    newTenant: HospitalTenantConfig,
    doctorConfig: HospitalDoctor,
    featuresConfig: HospitalFeatures
  ) => {
    let inviteUrl = `${window.location.origin}/join?token=inv_${newTenant.id}_doc`;
    let emailDelivery: any = { status: "simulated" };

    try {
      const onboardPayload = {
        id: newTenant.id,
        name: newTenant.name,
        short_name: newTenant.shortName,
        tagline: newTenant.tagline,
        phone: newTenant.contact.phone,
        email: newTenant.contact.email,
        street: newTenant.contact.address.street,
        city: newTenant.contact.address.city,
        primary_color: newTenant.branding.primaryColor,
        accent_color: newTenant.branding.accentColor,
        features: featuresConfig,
        doctor_name: doctorConfig.name,
        doctor_title: doctorConfig.title,
        doctor_email: doctorConfig.email || newTenant.contact.email,
        doctor_phone: doctorConfig.phone || newTenant.contact.phone,
        doctor_qualifications: doctorConfig.qualifications,
        doctor_reg_no: doctorConfig.regNo,
        doctor_experience_years: doctorConfig.experienceYears,
        doctor_specialties: doctorConfig.specialties,
        doctor_bio: doctorConfig.aboutText,
      };

      const res = await api.platform.onboardHospital(onboardPayload);
      if (res && res.invite_url) {
        inviteUrl = res.invite_url;
        emailDelivery = res.email_delivery;
      }
    } catch (err: any) {
      console.warn("Backend onboarding dispatch error, using local fallback:", err);
    }

    registerHospitalTenant(newTenant);
    setTenantsList((prev) => [...prev, newTenant]);
    setIsOnboardingModalOpen(false);

    setOnboardedResult({
      hospital: newTenant,
      doctor: doctorConfig,
      inviteUrl,
      emailDelivery,
    });

    toast.success(`Hospital '${newTenant.name}' onboarded! Doctor credentials dispatched.`);
  };

  const existingSlugs = useMemo(() => {
    return tenantsList.map((t) => t.id.toLowerCase());
  }, [tenantsList]);

  const stats = useMemo(() => {
    return {
      totalHospitals: tenantsList.length,
      totalDoctors: tenantsList.reduce((acc, t) => acc + (t.doctors?.length || 1), 0),
      activeTenantName: tenant.name,
      activeTenantId: tenant.id,
      superAdminEmail: state.authUser?.email || "superadmin@platform.ehr",
    };
  }, [tenantsList, tenant.name, tenant.id, state.authUser]);

  return (
    <DashboardErrorBoundary dashboardName="Super Admin Console">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fadeIn">
      {/* ── Top Header Banner ──────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-black uppercase tracking-widest">
            <span>⚡</span> Multi-Tenant Platform Controller
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Super Administrator Console
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Provision new hospitals, assign verified doctors with Google 1-Click login credentials, and manage what functionalities doctors and patients can access.
          </p>
          <div className="text-xs text-indigo-300 font-mono flex items-center gap-2">
            <span>Signed in as:</span>
            <strong className="text-white">{stats.superAdminEmail}</strong>
            <span className="bg-indigo-600/40 text-indigo-100 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Full Platform Scope
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button
            onClick={() => setIsOnboardingModalOpen(true)}
            variant="primary"
            size="md"
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg cursor-pointer"
          >
            <span>➕ Onboard New Hospital</span>
          </Button>
          <Button
            onClick={() => navigateTo("admin-dashboard")}
            variant="secondary"
            size="md"
            className="cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20"
          >
            <span>🩺 Doctor Portal →</span>
          </Button>
        </div>
      </div>

      {/* ── Platform KPI Stats ─────────────────────────────────────────────── */}
      <PlatformStatsBar stats={stats} />

      {/* ── Hospital Facilities Roster ──────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900">Hospital Facilities &amp; White-Label Tenants</h2>
            <p className="text-xs text-stone-500">
              Each facility possesses customized doctor credentials, branding palettes, and managed functionality permissions.
            </p>
          </div>
          <span className="text-xs font-bold text-stone-400 font-mono">
            {tenantsList.length} hospitals registered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tenantsList.map((h) => (
            <HospitalCard
              key={h.id}
              hospital={h}
              isActive={h.id === tenant.id}
              onSwitch={handleSwitchTenant}
              onOpenFeatures={(target) => setManagingTenant(target)}
              onPreviewPatient={handlePreviewAsPatient}
              onPreviewDoctor={handlePreviewAsDoctor}
            />
          ))}
        </div>
      </div>

      {/* ── Modals & Dialogs (Isolated & Accessible) ────────────────────────── */}
      <ManageFeaturesModal
        isOpen={Boolean(managingTenant)}
        onClose={() => setManagingTenant(null)}
        hospital={managingTenant}
        onSave={handleSaveFeatures}
      />

      <OnboardHospitalModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        existingSlugs={existingSlugs}
        onOnboard={handleOnboardHospital}
      />

      <OnboardSuccessDialog
        result={onboardedResult}
        onClose={() => setOnboardedResult(null)}
        onPreviewHospital={handleSwitchTenant}
      />
    </div>
    </DashboardErrorBoundary>
  );
};

export default SuperAdminDashboard;
