import React, { useState, useEffect } from "react";
import { useTenant } from "../../context/ThemeProvider";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { getAllHospitalTenants } from "../../config/tenants";
import type { HospitalTenantConfig, AdminPasscode, CustomizationAuditLogEntry } from "../../types/tenant";
import { type CustomerFeedback, INITIAL_CUSTOMER_FEEDBACKS } from "../../types/feedback";
import { USE_MOCK_DATA } from "../../config";
import { FeatureToggleGroup } from "../../components/common/FeatureToggleGroup";
import { Button } from "../../components/ui";
import { api } from "../../services/api";
import { auditService } from "../../services/auditService";

import PasscodesSection from "./PasscodesSection";
import HospitalProfileSection from "./HospitalProfileSection";
import DoctorProfileSection from "./DoctorProfileSection";
import BrandingSection from "./BrandingSection";
import FeedbackModerationSection from "./FeedbackModerationSection";

import ChangePasscodeModal from "./ChangePasscodeModal";
import AddPasscodeModal from "./AddPasscodeModal";
import ConfirmDialogModal from "../../components/common/ConfirmDialogModal";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";

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
  const toast = useToast();

  const isSuperAdmin = appState.authUser?.role === "super_admin";
  const currentAdminName = appState.authUser?.name || (isSuperAdmin ? "Super Admin" : "Doctor Admin");
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
      } catch { }
    }
    return DEFAULT_PASSCODES;
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<CustomizationAuditLogEntry[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(AUDIT_LOG_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch { }
    }
    return INITIAL_AUDIT_LOGS;
  });

  // Modal States
  const [isChangePasscodeModalOpen, setIsChangePasscodeModalOpen] = useState(false);
  const [isAddPasscodeModalOpen, setIsAddPasscodeModalOpen] = useState(false);

  // Customer Feedback & Google Reviews moderation state
  const [feedbackList, setFeedbackList] = useState<CustomerFeedback[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("ehr_customer_feedbacks") || localStorage.getItem("agastya_customer_feedbacks");
        if (raw) return JSON.parse(raw);
      } catch { }
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
      } catch { }
      return next;
    });
    auditService.logAction("CUSTOMIZATION_CHANGED", {
      actorId: currentAdminId,
      actorRole: "admin",
      details: {
        action,
        targetKey,
        oldValue,
        newValue,
        details,
      },
    });
  };

  const handleSaveAllFeatures = async () => {
    try {
      await api.platform.updateHospitalFeatures(formData.id, formData.features as any);
    } catch {
      // offline / local fallback
    }

    updateTenant({
      features: formData.features,
    });

    appendAuditLog(
      "TOGGLE_FEATURE",
      `Super Admin "${currentAdminName}" updated 3-tier feature governance (Hospital, Doctor, Patient) for "${formData.name}".`
    );

    setSaveSuccessMsg("✓ All layout & functionality permissions (Hospital, Doctor, Patient) saved and applied live!");
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleSaveHospitalInfo = async () => {
    const payload = {
      name: formData.name,
      shortName: formData.shortName,
      facilityType: formData.facilityType,
      tagline: formData.tagline,
      contact: formData.contact,
      legal: formData.legal,
      branding: {
        ...formData.branding,
        aboutHospitalText: formData.branding.aboutHospitalText,
      },
    };

    try {
      await api.platform.updateHospitalCustomization(formData.id, payload);
    } catch {
      // offline fallback
    }

    updateTenant(payload);
    appendAuditLog("UPDATE_PROFILE", `Updated hospital profile details for '${formData.name}'`);
    setSaveSuccessMsg("✓ Hospital Information saved and applied live!");
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSaveDoctorProfile = async () => {
    const payload = {
      doctor: formData.doctor,
      branding: {
        ...formData.branding,
        aboutDocText: formData.doctor.aboutText || formData.branding.aboutDocText,
      },
    };

    try {
      await api.platform.updateHospitalCustomization(formData.id, payload);
    } catch {
      // offline fallback
    }

    updateTenant(payload);
    appendAuditLog("UPDATE_PROFILE", `Updated doctor profile for '${formData.doctor.name}'`);
    setSaveSuccessMsg("✓ Attending Physician credentials & profile saved and applied live!");
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleSaveBranding = async () => {
    const payload = {
      branding: formData.branding,
    };

    try {
      await api.platform.updateHospitalCustomization(formData.id, payload);
    } catch {
      // offline fallback
    }

    updateTenant(payload);
    appendAuditLog("UPDATE_PROFILE", `Updated branding & colors for '${formData.name}'`);
    setSaveSuccessMsg("✓ Branding, Media, Logo & Banner saved and applied live!");
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handlePasscodeChanged = (updatedPasscodes: AdminPasscode[]) => {
    setPasscodes(updatedPasscodes);
    try {
      localStorage.setItem(PASSCODES_STORAGE_KEY, JSON.stringify(updatedPasscodes));
    } catch { }

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
    } catch { }

    appendAuditLog(
      "ADD_PASSCODE",
      `Admin "${currentAdminName}" created new passcode: "${newPasscodeObj.label}"`
    );

    setSaveSuccessMsg(`✓ Added new passcode "${newPasscodeObj.label}" successfully.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const { confirm, dialogState } = useConfirmDialog();

  const handleDeletePasscode = async (id: string, label: string) => {
    if (passcodes.length <= 1) {
      toast.error("At least one master security passcode must remain active.");
      return;
    }

    const accepted = await confirm({
      title: "Delete Security Passcode",
      message: `Are you sure you want to permanently revoke passcode "${label}"? This action is immediate and non-reversible.`,
      confirmLabel: "Delete Passcode",
      variant: "danger",
      onConfirm: () => {
        const updated = passcodes.filter((p) => p.id !== id);
        setPasscodes(updated);
        try {
          localStorage.setItem(PASSCODES_STORAGE_KEY, JSON.stringify(updated));
        } catch { }

        appendAuditLog(
          "DELETE_PASSCODE",
          `Admin "${currentAdminName}" deleted passcode: "${label}"`
        );
        setSaveSuccessMsg(`✓ Deleted passcode "${label}".`);
        setTimeout(() => setSaveSuccessMsg(null), 3500);
      },
    });
  };

  const handleReset = async () => {
    await confirm({
      title: "Reset Hospital Tenant Defaults",
      message: "Are you sure you want to reset this tenant to default hospital settings? All custom branding and feature flags will be reverted to factory defaults.",
      confirmLabel: "Restore Defaults",
      variant: "danger",
      onConfirm: () => {
        resetTenantToDefaults();
        setSaveSuccessMsg("✓ Restored factory hospital default settings.");
        setTimeout(() => setSaveSuccessMsg(null), 3500);
      },
    });
  };

  const handleApproveFeedback = (id: string) => {
    setFeedbackList((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, status: "approved" as const } : f));
      try { localStorage.setItem("ehr_customer_feedbacks", JSON.stringify(next)); } catch { }
      return next;
    });
    setSaveSuccessMsg("✓ Feedback approved and featured on hospital public showcase!");
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleHideFeedback = (id: string) => {
    setFeedbackList((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, status: "hidden" as const } : f));
      try { localStorage.setItem("ehr_customer_feedbacks", JSON.stringify(next)); } catch { }
      return next;
    });
    setSaveSuccessMsg("✓ Feedback hidden from public listing.");
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleDeleteFeedback = (id: string) => {
    setFeedbackList((prev) => {
      const next = prev.filter((f) => f.id !== id);
      try { localStorage.setItem("ehr_customer_feedbacks", JSON.stringify(next)); } catch { }
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
      try { localStorage.setItem("ehr_customer_feedbacks", JSON.stringify(next)); } catch { }
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
                  {isSuperAdmin ? "Multi-Tenant Super Admin" : "Doctor & Hospital Admin"}
                </span>
              </div>
              <p className="text-emerald-200/90 text-xs mt-0.5">
                {isSuperAdmin
                  ? "Configure platform feature governance (Hospital, Doctor, Patient), hospital branding, and physician profiles."
                  : "Customize physician credentials, clinical bio, branding, and hospital profile. Feature enablement is governed centrally by Super Admin."}
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
              {getAllHospitalTenants().map((t) => (
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
            className="text-xs text-emerald-800 hover:text-emerald-950 underline font-semibold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── FEATURE GOVERNANCE: SUPER ADMIN ONLY (DOCS DO NOT SEE PATIENT FEATURE CUSTOMIZATION) ── */}
      {isSuperAdmin ? (
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🎛️</span>
                <h3 className="text-stone-900 font-extrabold text-base">
                  Feature Governance &amp; Enablement (Super Admin Master Control)
                </h3>
                <span className="bg-indigo-100 text-indigo-900 border border-indigo-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-stone-500 text-xs mt-0.5">
                Enable or disable Hospital platform modules, Doctor clinical capabilities, and Patient portal visibility. Doctors have no access to alter patient portal capabilities.
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAllFeatures}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <span>💾</span> Save All Feature Permissions
            </Button>
          </div>

          <FeatureToggleGroup
            features={formData.features}
            onChange={(key, val) => {
              setFormData((prev) => ({
                ...prev,
                features: {
                  ...prev.features,
                  [key]: val,
                  ...(key === "enableOnlinePayments" ? { enableCustomerPayments: val } : {}),
                  ...(key === "enableCustomerPayments" ? { enableOnlinePayments: val } : {}),
                },
              }));
            }}
            category="all"
          />
        </div>
      ) : (
        /* Doctor Notice: Patient features cannot be altered by doctors */
        <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
          <span className="text-2xl" aria-hidden="true">🛡️</span>
          <div className="space-y-1">
            <h4 className="font-bold text-xs text-emerald-950 uppercase tracking-wider">
              Feature Enablement &amp; Patient Portal Governance Policy
            </h4>
            <p className="text-xs text-stone-600 leading-relaxed">
              Hospital platform modules, doctor clinical tools, and patient portal visibility settings are managed centrally by the <strong>Platform Super Administrator</strong>. Attending physicians cannot modify patient portal features. You may configure your clinical bio, contact sharing preferences, hospital hours, and branding below.
            </p>
          </div>
        </div>
      )}

      {/* ── 1. DOCTOR PROFILE & BIO ── */}
      <DoctorProfileSection
        formData={formData}
        setFormData={setFormData}
        onSaveDoctorProfile={handleSaveDoctorProfile}
      />

      {/* ── 2. HOSPITAL IDENTITY ── */}
      <HospitalProfileSection
        formData={formData}
        setFormData={setFormData}
        onSaveHospitalInfo={handleSaveHospitalInfo}
      />

      {/* ── 3. BRANDING & MEDIA ASSETS ── */}
      <BrandingSection
        formData={formData}
        setFormData={setFormData}
        onSaveBranding={handleSaveBranding}
      />

      {/* ── 4. CUSTOMER FEEDBACK & GOOGLE REVIEWS MODERATION ── */}
      <FeedbackModerationSection
        feedbackList={feedbackList}
        onApproveFeedback={handleApproveFeedback}
        onHideFeedback={handleHideFeedback}
        onDeleteFeedback={handleDeleteFeedback}
        onSyncToGoogle={handleSyncToGoogle}
        onResetTenant={handleReset}
      />

      {/* ── 5. ADMIN SECURITY PASSCODES & AUDIT TRAIL ── */}
      <PasscodesSection
        passcodes={passcodes}
        auditLogs={auditLogs}
        onChangePasscode={() => setIsChangePasscodeModalOpen(true)}
        onAddPasscode={() => setIsAddPasscodeModalOpen(true)}
        onDeletePasscode={handleDeletePasscode}
      />

      {/* ── MODALS ── */}
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

      {/* ── Confirmation Modal for Destructive Actions ── */}
      <ConfirmDialogModal {...dialogState} />
    </div>
  );
};

export default CustomizationTab;
