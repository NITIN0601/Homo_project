import React, { useState, useEffect } from "react";
import { useTenant } from "../../context/ThemeProvider";
import { useApp } from "../../context/AppContext";
import { HOSPITAL_TENANTS } from "../../config/tenants";
import type { HospitalTenantConfig, AdminPasscode, CustomizationAuditLogEntry } from "../../types/tenant";
import { type CustomerFeedback, INITIAL_CUSTOMER_FEEDBACKS } from "../../types/feedback";
import { USE_MOCK_DATA } from "../../config";

import CustomerViewSection from "./customization/CustomerViewSection";
import ClinicalModulesSection from "./customization/ClinicalModulesSection";
import PasscodesSection from "./customization/PasscodesSection";
import ClinicProfileSection from "./customization/ClinicProfileSection";
import DoctorProfileSection from "./customization/DoctorProfileSection";
import BrandingSection from "./customization/BrandingSection";
import FeedbackModerationSection from "./customization/FeedbackModerationSection";

import CustomerViewSaveModal from "./customization/modals/CustomerViewSaveModal";
import ChangePasscodeModal from "./customization/modals/ChangePasscodeModal";
import AddPasscodeModal from "./customization/modals/AddPasscodeModal";

const PASSCODES_STORAGE_KEY = "ehr_admin_security_passcodes";
const AUDIT_LOG_STORAGE_KEY = "ehr_customization_audit_log";

const DEFAULT_PASSCODES: AdminPasscode[] = (!import.meta.env.PROD && USE_MOCK_DATA) ? [
  {
    id: "pc-master",
    code: "8899",
    label: "Demo Dev Admin Passcode",
    createdAt: "2026-11-01T09:00:00Z",
    createdBy: "Dev Initializer",
  },
] : [];

const INITIAL_AUDIT_LOGS: CustomizationAuditLogEntry[] = [
  {
    id: "audit-init-1",
    timestamp: "2026-11-03T09:30:00Z",
    adminName: "Super Admin",
    adminId: "adm-001",
    action: "ADD_PASSCODE",
    details: "Initialized primary administrative security passcode",
  },
];

export const CustomizationTab: React.FC = () => {
  const { tenant, setTenantId, updateTenant, resetTenantToDefaults } = useTenant();
  const { state: appState } = useApp();

  const currentAdminName = appState.authUser?.name || "Super Admin";
  const currentAdminId = appState.authUser?.id || "adm-001";

  // Local form state initialized from active tenant
  const [formData, setFormData] = useState<HospitalTenantConfig>(tenant);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Security Passcodes
  const [passcodes, setPasscodes] = useState<AdminPasscode[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(PASSCODES_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return DEFAULT_PASSCODES;
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<CustomizationAuditLogEntry[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return INITIAL_AUDIT_LOGS;
  });

  // Modal States
  const [isCustomerViewSaveModalOpen, setIsCustomerViewSaveModalOpen] = useState(false);
  const [isChangePasscodeModalOpen, setIsChangePasscodeModalOpen] = useState(false);
  const [isAddPasscodeModalOpen, setIsAddPasscodeModalOpen] = useState(false);

  // Customer Feedback & Google Reviews moderation state
  const [feedbackList, setFeedbackList] = useState<CustomerFeedback[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("ehr_customer_feedbacks") || localStorage.getItem("agastya_customer_feedbacks");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return INITIAL_CUSTOMER_FEEDBACKS;
  });

  // Synchronize when tenant switches
  useEffect(() => {
    setFormData(tenant);
  }, [tenant]);

  const appendAuditLog = (
    action: CustomizationAuditLogEntry["action"],
    details: string,
    targetKey?: string,
    oldValue?: any,
    newValue?: any
  ) => {
    const entry: CustomizationAuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      adminName: currentAdminName,
      adminId: currentAdminId,
      action,
      targetKey,
      oldValue,
      newValue,
      details,
    };
    setAuditLogs((prev) => {
      const next = [entry, ...prev];
      try {
        localStorage.setItem(AUDIT_LOG_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const customerViewKeys: Array<keyof HospitalTenantConfig["features"]> = [
    "displayDoctorDetails",
    "enableAgastyaBot",
    "enablePatientProfileEdit",
    "enablePatientMedicalRecords",
    "enableBillingHistory",
    "enableFollowupFeedback",
  ];

  const hasCustomerViewChanges = customerViewKeys.some(
    (k) => (formData.features[k] ?? true) !== (tenant.features[k] ?? true)
  );

  const toggleCustomerViewFeature = (key: keyof HospitalTenantConfig["features"]) => {
    setFormData((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: prev.features[key] === false ? true : false,
      },
    }));
  };

  const handleAuthorizedCustomerViewSave = () => {
    updateTenant({
      features: {
        ...tenant.features,
        displayDoctorDetails: formData.features.displayDoctorDetails,
        enableAgastyaBot: formData.features.enableAgastyaBot,
        enablePatientProfileEdit: formData.features.enablePatientProfileEdit,
        enablePatientMedicalRecords: formData.features.enablePatientMedicalRecords,
        enableBillingHistory: formData.features.enableBillingHistory,
        enableFollowupFeedback: formData.features.enableFollowupFeedback,
      },
    });

    appendAuditLog(
      "TOGGLE_FEATURE",
      `Admin "${currentAdminName}" verified passcode and saved Customer View access filters for tenant "${formData.name}".`
    );

    setSaveSuccessMsg("✓ Customer View settings authorized & applied live to patient logins!");
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleSavePlatformModules = () => {
    updateTenant({
      features: {
        ...tenant.features,
        enableCustomerPayments: formData.features.enableCustomerPayments,
        enableRawCaseJson: formData.features.enableRawCaseJson,
        enableGoogleReviews: formData.features.enableGoogleReviews,
        enableTelemedicine: formData.features.enableTelemedicine,
        enableECommerce: formData.features.enableECommerce,
        enablePrescriptionScan: formData.features.enablePrescriptionScan,
      },
    });
    setSaveSuccessMsg("✓ Clinic & Platform Modules saved and applied live!");
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSaveHospitalInfo = () => {
    updateTenant({
      name: formData.name,
      shortName: formData.shortName,
      tagline: formData.tagline,
      contact: formData.contact,
      branding: {
        ...formData.branding,
        aboutClinicText: formData.branding.aboutClinicText,
      },
    });
    setSaveSuccessMsg("✓ Hospital & Clinic Information saved and applied live!");
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSaveDoctorProfile = () => {
    updateTenant({
      doctor: formData.doctor,
      branding: {
        ...formData.branding,
        aboutDocText: formData.doctor.aboutText || formData.branding.aboutDocText,
      },
    });
    setSaveSuccessMsg("✓ Attending Physician credentials & profile saved and applied live!");
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSaveBranding = () => {
    updateTenant({
      branding: formData.branding,
    });
    setSaveSuccessMsg("✓ Branding, Media, Logo & Banner saved and applied live!");
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handlePasscodeChanged = (updatedPasscodes: AdminPasscode[]) => {
    setPasscodes(updatedPasscodes);
    try {
      localStorage.setItem(PASSCODES_STORAGE_KEY, JSON.stringify(updatedPasscodes));
    } catch {}

    appendAuditLog(
      "CHANGE_PASSCODE",
      `Admin "${currentAdminName}" changed master security passcode.`
    );

    setSaveSuccessMsg("✓ Security passcode updated and logged successfully.");
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handlePasscodeAdded = (newPasscodeObj: AdminPasscode) => {
    const updatedPasscodes = [...passcodes, newPasscodeObj];
    setPasscodes(updatedPasscodes);
    try {
      localStorage.setItem(PASSCODES_STORAGE_KEY, JSON.stringify(updatedPasscodes));
    } catch {}

    appendAuditLog(
      "ADD_PASSCODE",
      `Admin "${currentAdminName}" created new passcode: "${newPasscodeObj.label}"`
    );

    setSaveSuccessMsg(`✓ Added new passcode "${newPasscodeObj.label}" successfully.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleDeletePasscode = (id: string, label: string) => {
    if (passcodes.length <= 1) {
      alert("At least one master security passcode must remain active.");
      return;
    }
    const entered = window.prompt("Enter an active admin passcode to authorize deletion:");
    if (!entered || !passcodes.some((p) => p.code.trim() === entered.trim())) {
      alert("Passcode verification failed. Deletion aborted.");
      return;
    }

    const updated = passcodes.filter((p) => p.id !== id);
    setPasscodes(updated);
    try {
      localStorage.setItem(PASSCODES_STORAGE_KEY, JSON.stringify(updated));
    } catch {}

    appendAuditLog(
      "DELETE_PASSCODE",
      `Admin "${currentAdminName}" deleted passcode: "${label}"`
    );
    setSaveSuccessMsg(`✓ Deleted passcode "${label}".`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset this tenant to default clinic settings?")) {
      resetTenantToDefaults();
      setSaveSuccessMsg("✓ Restored factory clinic default settings.");
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    }
  };

  const handleApproveFeedback = (id: string) => {
    setFeedbackList((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, status: "approved" as const } : f));
      try { localStorage.setItem("ehr_customer_feedbacks", JSON.stringify(next)); } catch {}
      return next;
    });
    setSaveSuccessMsg("✓ Feedback approved and featured on clinic public showcase!");
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleHideFeedback = (id: string) => {
    setFeedbackList((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, status: "hidden" as const } : f));
      try { localStorage.setItem("ehr_customer_feedbacks", JSON.stringify(next)); } catch {}
      return next;
    });
    setSaveSuccessMsg("✓ Feedback hidden from public listing.");
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleDeleteFeedback = (id: string) => {
    setFeedbackList((prev) => {
      const next = prev.filter((f) => f.id !== id);
      try { localStorage.setItem("ehr_customer_feedbacks", JSON.stringify(next)); } catch {}
      return next;
    });
    setSaveSuccessMsg("✓ Feedback permanently deleted.");
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSyncToGoogle = (feedback: CustomerFeedback) => {
    const textToCopy = `[${feedback.rating}/5 Stars] ${feedback.topic}: ${feedback.comments}`;
    navigator.clipboard.writeText(textToCopy);
    const targetUrl =
      formData.contact.googleReviewUrl ||
      "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4";
    window.open(targetUrl, "_blank");

    setFeedbackList((prev) => {
      const next = prev.map((f) =>
        f.id === feedback.id ? { ...f, publishedToGoogle: true, status: "approved" as const } : f
      );
      try { localStorage.setItem("ehr_customer_feedbacks", JSON.stringify(next)); } catch {}
      return next;
    });

    setSaveSuccessMsg("✓ Copied review to clipboard & opened Google Maps Review window!");
    setTimeout(() => setSaveSuccessMsg(null), 4500);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ── HEADER BANNER ── */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-teal-950 text-white rounded-3xl p-6 card-shadow border border-emerald-800/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl shadow-inner">
              ⚙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">Hospital &amp; Feature Customization</h2>
                <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Multi-Tenant Admin
                </span>
              </div>
              <p className="text-emerald-200/90 text-xs mt-0.5">
                Customize features, customer view permissions, branding, doctor profiles, and clinic identity per hospital tenant.
              </p>
            </div>
          </div>

          {/* Quick Tenant Switcher (Simulates Multi-Hospital Environment) */}
          <div className="flex items-center gap-2 bg-stone-900/90 p-2 rounded-2xl border border-stone-700/80">
            <span className="text-xs text-stone-400 font-bold ml-1">Active Hospital:</span>
            <select
              value={tenant.id}
              onChange={(e) => setTenantId(e.target.value)}
              className="bg-stone-800 text-emerald-300 font-bold text-xs py-1.5 px-3 rounded-xl border border-stone-600 focus:outline-none focus:ring-1 focus:ring-emerald-400 cursor-pointer"
            >
              {Object.values(HOSPITAL_TENANTS).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.id})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold text-sm rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span>🛡️</span>
            <span>{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-xs text-emerald-800 hover:text-emerald-950 underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── 1. CUSTOMER VIEW CUSTOMIZATION & ACCESS FILTERS (PASSCODE PROTECTED) ── */}
      <CustomerViewSection
        formData={formData}
        hasCustomerViewChanges={hasCustomerViewChanges}
        toggleCustomerViewFeature={toggleCustomerViewFeature}
        onOpenCustomerViewSaveModal={() => setIsCustomerViewSaveModalOpen(true)}
      />

      {/* ── 2. GENERAL CLINICAL & PLATFORM FEATURE GATES ── */}
      <ClinicalModulesSection
        formData={formData}
        toggleCustomerViewFeature={toggleCustomerViewFeature}
        onSavePlatformModules={handleSavePlatformModules}
      />

      {/* ── 3. ADMIN SECURITY PASSCODES & AUDIT TRAIL ── */}
      <PasscodesSection
        passcodes={passcodes}
        auditLogs={auditLogs}
        onChangePasscode={() => setIsChangePasscodeModalOpen(true)}
        onAddPasscode={() => setIsAddPasscodeModalOpen(true)}
        onDeletePasscode={handleDeletePasscode}
      />

      {/* ── 4. HOSPITAL & CLINIC IDENTITY ── */}
      <ClinicProfileSection
        formData={formData}
        setFormData={setFormData}
        onSaveHospitalInfo={handleSaveHospitalInfo}
      />

      {/* ── 5. DOCTOR PROFILE & BIO ── */}
      <DoctorProfileSection
        formData={formData}
        setFormData={setFormData}
        onSaveDoctorProfile={handleSaveDoctorProfile}
      />

      {/* ── 6. BRANDING & MEDIA ASSETS ── */}
      <BrandingSection
        formData={formData}
        setFormData={setFormData}
        onSaveBranding={handleSaveBranding}
      />

      {/* ── 7. CUSTOMER FEEDBACK & GOOGLE REVIEWS MODERATION ── */}
      <FeedbackModerationSection
        feedbackList={feedbackList}
        onApproveFeedback={handleApproveFeedback}
        onHideFeedback={handleHideFeedback}
        onDeleteFeedback={handleDeleteFeedback}
        onSyncToGoogle={handleSyncToGoogle}
        onResetTenant={handleReset}
      />

      {/* ── MODALS ── */}
      <CustomerViewSaveModal
        isOpen={isCustomerViewSaveModalOpen}
        onClose={() => setIsCustomerViewSaveModalOpen(false)}
        formData={formData}
        currentAdminName={currentAdminName}
        passcodes={passcodes}
        onAuthorizedSave={handleAuthorizedCustomerViewSave}
      />

      <ChangePasscodeModal
        isOpen={isChangePasscodeModalOpen}
        onClose={() => setIsChangePasscodeModalOpen(false)}
        passcodes={passcodes}
        onPasscodeChanged={handlePasscodeChanged}
      />

      <AddPasscodeModal
        isOpen={isAddPasscodeModalOpen}
        onClose={() => setIsAddPasscodeModalOpen(false)}
        passcodes={passcodes}
        currentAdminName={currentAdminName}
        onPasscodeAdded={handlePasscodeAdded}
      />
    </div>
  );
};

export default CustomizationTab;
