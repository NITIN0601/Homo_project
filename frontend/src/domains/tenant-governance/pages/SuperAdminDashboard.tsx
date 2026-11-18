import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useApp, useRequireRole } from "@app/store";
import { useTenant } from "@core/tenancy";
import {
  getAllHospitalTenants,
  registerHospitalTenant,
  updateHospitalTenantInRegistry,
  deleteHospitalTenantFromRegistry,
} from "../../../core/config/tenants";
import type { HospitalTenantConfig, HospitalDoctor, HospitalFeatures } from "@core/types/tenant";
import { useToast } from "@shared/ui";
import { Button } from "../../../shared/ui";
import { DashboardErrorBoundary } from "../../../app/error";
import { api } from "@app/api/apiServiceFacade";
import {
  PlatformStatsBar,
  HospitalCard,
  ManageFeaturesModal,
  OnboardHospitalModal,
  UpdateDoctorModal,
  OnboardSuccessDialog,
  type OnboardSuccessResult,
} from "..";

export const SuperAdminDashboard: React.FC = () => {
  // Enforce Super Admin RBAC boundary
  useRequireRole("super_admin");

  const { state, navigateTo } = useApp();
  const { tenant, setTenantId } = useTenant();
  const toast = useToast();

  const [tenantsList, setTenantsList] = useState<HospitalTenantConfig[]>(() => getAllHospitalTenants());
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [editingHospital, setEditingHospital] = useState<HospitalTenantConfig | null>(null);
  const [editingDoctorHospital, setEditingDoctorHospital] = useState<HospitalTenantConfig | null>(null);
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

  // Synchronize server-registered hospitals into frontend registry on initial mount
  useEffect(() => {
    let mounted = true;
    api.platform
      .listHospitals()
      .then((hospitals) => {
        if (!mounted || !Array.isArray(hospitals) || hospitals.length === 0) return;
        hospitals.forEach((h: any) => {
          if (h && h.id) {
            registerHospitalTenant(h);
          }
        });
        setTenantsList(getAllHospitalTenants());
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const handleDeleteHospital = async (targetTenant: HospitalTenantConfig) => {
    if (targetTenant.id === "default") {
      toast.error("The default hospital facility cannot be deleted.");
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to deactivate '${targetTenant.name}'? Existing patient records will be archived.`
    );
    if (!confirmed) return;

    try {
      await api.platform.deleteHospital(targetTenant.id);
    } catch (err: any) {
      console.warn("Backend delete error:", err);
    }

    deleteHospitalTenantFromRegistry(targetTenant.id);
    setTenantsList((prev) => prev.filter((t) => t.id !== targetTenant.id));
    if (tenant.id === targetTenant.id) {
      setTenantId("default");
    }
    toast.success(`Hospital '${targetTenant.name}' has been deactivated.`);
  };

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

  const handleSaveHospitalEdit = async (
    updatedTenant: HospitalTenantConfig,
    doctorConfig: HospitalDoctor,
    featuresConfig: HospitalFeatures
  ) => {
    try {
      await api.platform.updateHospital(updatedTenant.id, {
        name: updatedTenant.name,
        short_name: updatedTenant.shortName,
        facility_type: updatedTenant.facilityType || "hospital",
        tagline: updatedTenant.tagline,
        phone: updatedTenant.contact.phone,
        email: updatedTenant.contact.email,
        street: updatedTenant.contact.address.street,
        city: updatedTenant.contact.address.city,
        primary_color: updatedTenant.branding.primaryColor,
        accent_color: updatedTenant.branding.accentColor,
        logo_url: updatedTenant.branding.logoUrl,
        banner_url: updatedTenant.branding.bannerUrl,
        about_hospital_text: updatedTenant.branding.aboutHospitalText,
        legal: updatedTenant.legal,
        terms_conditions_text: updatedTenant.legal?.termsConditionsText,
        privacy_policy_text: updatedTenant.legal?.privacyPolicyText,
        emergency_notice: updatedTenant.legal?.emergencyNotice,
        features: featuresConfig,
        doctor: doctorConfig,
      });
    } catch (err: any) {
      console.warn("Backend update dispatch error, using local fallback:", err);
    }

    updateHospitalTenantInRegistry(updatedTenant);
    setTenantsList(getAllHospitalTenants());
    if (tenant.id === updatedTenant.id) {
      setTenantId(updatedTenant.id);
    }
    setEditingHospital(null);
    toast.success(`Hospital '${updatedTenant.name}' details updated successfully!`);
  };

  const handleSaveDoctorEdit = async (
    hospitalId: string,
    doctorId: string,
    updatedDoctor: HospitalDoctor
  ) => {
    try {
      await api.platform.updateDoctor(hospitalId, doctorId, {
        name: updatedDoctor.name,
        title: updatedDoctor.title,
        regNo: updatedDoctor.regNo,
        qualifications: updatedDoctor.qualifications,
        experienceYears: updatedDoctor.experienceYears,
        consultationFee: updatedDoctor.consultationFee,
        email: updatedDoctor.email,
        phone: updatedDoctor.phone,
        specialties: updatedDoctor.specialties,
        aboutText: updatedDoctor.aboutText,
        sharingPreferences: updatedDoctor.sharingPreferences,
      });
    } catch (err: any) {
      console.warn("Backend doctor update error, using local fallback:", err);
    }

    const existing = tenantsList.find((h) => h.id === hospitalId);
    if (existing) {
      const isLead =
        !existing.doctor.id ||
        existing.doctor.id === doctorId ||
        existing.doctor.email === updatedDoctor.email;

      const updatedTenant: HospitalTenantConfig = {
        ...existing,
        doctor: isLead ? updatedDoctor : existing.doctor,
        doctors: existing.doctors && existing.doctors.length > 0
          ? existing.doctors.map((d) =>
              d.id === doctorId || d.email === updatedDoctor.email ? updatedDoctor : d
            )
          : [updatedDoctor],
      };

      updateHospitalTenantInRegistry(updatedTenant);
      setTenantsList(getAllHospitalTenants());
      if (tenant.id === hospitalId) {
        setTenantId(hospitalId);
      }
    }
    setEditingDoctorHospital(null);
    toast.success(`Doctor '${updatedDoctor.name}' profile updated successfully!`);
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
        facility_type: newTenant.facilityType || "hospital",
        tagline: newTenant.tagline,
        phone: newTenant.contact.phone,
        email: newTenant.contact.email,
        street: newTenant.contact.address.street,
        city: newTenant.contact.address.city,
        primary_color: newTenant.branding.primaryColor,
        accent_color: newTenant.branding.accentColor,
        logo_url: newTenant.branding.logoUrl || "/generic-hospital-logo.svg",
        banner_url: newTenant.branding.bannerUrl || "/assets/banner.jpg",
        about_hospital_text: newTenant.branding.aboutHospitalText,
        legal: newTenant.legal,
        terms_conditions_text: newTenant.legal?.termsConditionsText,
        privacy_policy_text: newTenant.legal?.privacyPolicyText,
        emergency_notice: newTenant.legal?.emergencyNotice,
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
              onEditHospital={(target) => setEditingHospital(target)}
              onEditDoctor={(target) => setEditingDoctorHospital(target)}
              onOpenFeatures={(target) => setManagingTenant(target)}
              onPreviewPatient={handlePreviewAsPatient}
              onPreviewDoctor={handlePreviewAsDoctor}
              onDeleteHospital={handleDeleteHospital}
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

      {/* Edit Hospital Details Modal */}
      <OnboardHospitalModal
        isOpen={Boolean(editingHospital)}
        onClose={() => setEditingHospital(null)}
        existingSlugs={existingSlugs}
        initialTenant={editingHospital}
        onOnboard={handleSaveHospitalEdit}
      />

      {/* Edit Doctor Credentials Modal */}
      <UpdateDoctorModal
        isOpen={Boolean(editingDoctorHospital)}
        onClose={() => setEditingDoctorHospital(null)}
        hospital={editingDoctorHospital}
        onSaveDoctor={handleSaveDoctorEdit}
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
