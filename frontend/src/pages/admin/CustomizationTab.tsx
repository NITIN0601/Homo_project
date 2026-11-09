import React, { useState, useEffect } from "react";
import { useTenant } from "../../context/ThemeProvider";
import { useApp } from "../../context/AppContext";
import { Button, Card, Badge, Input, Textarea, Modal } from "../../components/ui";
import { HOSPITAL_TENANTS } from "../../config/tenants";
import type { HospitalTenantConfig, AdminPasscode, CustomizationAuditLogEntry } from "../../types/tenant";
import { type CustomerFeedback, INITIAL_CUSTOMER_FEEDBACKS } from "../../types/feedback";
import { formatDateTime } from "../../utils/format";
import { api } from "../../services/api";

const PASSCODES_STORAGE_KEY = "agastya_admin_security_passcodes";
const AUDIT_LOG_STORAGE_KEY = "agastya_customization_audit_log";

const DEFAULT_PASSCODES: AdminPasscode[] = [
  {
    id: "pc-master",
    code: "8899",
    label: "Primary Super Admin Passcode",
    createdAt: "2026-11-01T09:00:00Z",
    createdBy: "System Security Initializer",
  },
];

const INITIAL_AUDIT_LOGS: CustomizationAuditLogEntry[] = [
  {
    id: "audit-init-1",
    timestamp: "2026-11-03T09:30:00Z",
    adminName: "Dr. Agastya (Super Admin)",
    adminId: "adm-001",
    action: "ADD_PASSCODE",
    details: "Initialized primary administrative security passcode (8899)",
  },
];

export const CustomizationTab: React.FC = () => {
  const { tenant, setTenantId, updateTenant, resetTenantToDefaults } = useTenant();
  const { state: appState } = useApp();

  const currentAdminName = appState.authUser?.name || "Dr. Agastya (Super Admin)";
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

  // Group-Level Customer View Save Modal State
  const [isCustomerViewSaveModalOpen, setIsCustomerViewSaveModalOpen] = useState(false);
  const [customerViewPasscode, setCustomerViewPasscode] = useState("");
  const [customerViewPasscodeError, setCustomerViewPasscodeError] = useState<string | null>(null);
  const [showCustomerViewPasscodeText, setShowCustomerViewPasscodeText] = useState(false);

  // Passcode Management Modal States
  const [isChangePasscodeModalOpen, setIsChangePasscodeModalOpen] = useState(false);
  const [changeOldPasscode, setChangeOldPasscode] = useState("");
  const [changeNewPasscode, setChangeNewPasscode] = useState("");
  const [changeConfirmPasscode, setChangeConfirmPasscode] = useState("");
  const [changePasscodeError, setChangePasscodeError] = useState<string | null>(null);

  const [isAddPasscodeModalOpen, setIsAddPasscodeModalOpen] = useState(false);
  const [addAuthPasscode, setAddAuthPasscode] = useState("");
  const [addNewPasscode, setAddNewPasscode] = useState("");
  const [addPasscodeLabel, setAddPasscodeLabel] = useState("");
  const [addPasscodeError, setAddPasscodeError] = useState<string | null>(null);

  // Customer Feedback & Google Reviews moderation state
  const [feedbackList, setFeedbackList] = useState<CustomerFeedback[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("agastya_customer_feedbacks");
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

  const handleSaveCustomerViewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = passcodes.some((p) => p.code.trim() === customerViewPasscode.trim());
    if (!matched) {
      setCustomerViewPasscodeError("Invalid security passcode. Authorization denied.");
      return;
    }

    const updatedFeatures = {
      ...tenant.features,
      ...formData.features,
    };

    updateTenant({
      features: updatedFeatures,
    });

    api.hospitals.updateFeatures(tenant.id, updatedFeatures as Record<string, boolean>).catch((err) => {
      console.warn("Feature flag backend sync failed — changes saved locally only:", err);
    });

    appendAuditLog(
      "TOGGLE_FEATURE",
      `Admin "${currentAdminName}" verified passcode and saved Customer View access filters for tenant "${formData.name}".`
    );

    setIsCustomerViewSaveModalOpen(false);
    setCustomerViewPasscode("");
    setCustomerViewPasscodeError(null);
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

  const handleChangePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = passcodes.some((p) => p.code.trim() === changeOldPasscode.trim());
    if (!matched) {
      setChangePasscodeError("Current passcode is incorrect.");
      return;
    }
    if (changeNewPasscode.trim().length < 4) {
      setChangePasscodeError("New passcode must be at least 4 digits/characters.");
      return;
    }
    if (changeNewPasscode !== changeConfirmPasscode) {
      setChangePasscodeError("New passcode and confirmation do not match.");
      return;
    }

    const updatedPasscodes = passcodes.map((p, idx) => {
      if (idx === 0 || p.code === changeOldPasscode.trim()) {
        return { ...p, code: changeNewPasscode.trim() };
      }
      return p;
    });

    setPasscodes(updatedPasscodes);
    try {
      localStorage.setItem(PASSCODES_STORAGE_KEY, JSON.stringify(updatedPasscodes));
    } catch {}

    appendAuditLog(
      "CHANGE_PASSCODE",
      `Admin "${currentAdminName}" changed master security passcode.`
    );

    setIsChangePasscodeModalOpen(false);
    setChangeOldPasscode("");
    setChangeNewPasscode("");
    setChangeConfirmPasscode("");
    setChangePasscodeError(null);
    setSaveSuccessMsg("✓ Security passcode updated and logged successfully.");
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  const handleAddPasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const matched = passcodes.some((p) => p.code.trim() === addAuthPasscode.trim());
    if (!matched) {
      setAddPasscodeError("Authorization passcode is incorrect.");
      return;
    }
    if (addNewPasscode.trim().length < 4) {
      setAddPasscodeError("New passcode must be at least 4 digits/characters.");
      return;
    }
    if (!addPasscodeLabel.trim()) {
      setAddPasscodeError("Please provide a label or admin role for this passcode.");
      return;
    }

    const newPasscodeObj: AdminPasscode = {
      id: `pc-${Date.now()}`,
      code: addNewPasscode.trim(),
      label: addPasscodeLabel.trim(),
      createdAt: new Date().toISOString(),
      createdBy: currentAdminName,
    };

    const updatedPasscodes = [...passcodes, newPasscodeObj];
    setPasscodes(updatedPasscodes);
    try {
      localStorage.setItem(PASSCODES_STORAGE_KEY, JSON.stringify(updatedPasscodes));
    } catch {}

    appendAuditLog(
      "ADD_PASSCODE",
      `Admin "${currentAdminName}" created new passcode: "${addPasscodeLabel.trim()}"`
    );

    setIsAddPasscodeModalOpen(false);
    setAddAuthPasscode("");
    setAddNewPasscode("");
    setAddPasscodeLabel("");
    setAddPasscodeError(null);
    setSaveSuccessMsg(`✓ Added new passcode "${addPasscodeLabel.trim()}" successfully.`);
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
      try { localStorage.setItem("agastya_customer_feedbacks", JSON.stringify(next)); } catch {}
      return next;
    });
    setSaveSuccessMsg("✓ Feedback approved and featured on clinic public showcase!");
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleHideFeedback = (id: string) => {
    setFeedbackList((prev) => {
      const next = prev.map((f) => (f.id === id ? { ...f, status: "hidden" as const } : f));
      try { localStorage.setItem("agastya_customer_feedbacks", JSON.stringify(next)); } catch {}
      return next;
    });
    setSaveSuccessMsg("✓ Feedback hidden from public listing.");
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleDeleteFeedback = (id: string) => {
    setFeedbackList((prev) => {
      const next = prev.filter((f) => f.id !== id);
      try { localStorage.setItem("agastya_customer_feedbacks", JSON.stringify(next)); } catch {}
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
      try { localStorage.setItem("agastya_customer_feedbacks", JSON.stringify(next)); } catch {}
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

      {/* ── SUCCESS NOTIFICATION ── */}
      {saveSuccessMsg && (
        <div className="bg-emerald-950 border border-emerald-500/60 text-emerald-100 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-xl bg-emerald-500 text-stone-950 flex items-center justify-center font-black text-sm">
              ✓
            </span>
            <p className="text-xs font-bold">{saveSuccessMsg}</p>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-400 hover:text-white font-mono text-xs cursor-pointer px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* ── 1. CUSTOMER VIEW CUSTOMIZATION & ACCESS FILTERS (PASSCODE PROTECTED) ── */}
        <Card variant="default" className="space-y-5 border-emerald-900/20 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🎛️</span>
                <h3 className="text-stone-900 font-extrabold text-base">
                  Customer View Customization &amp; Access Filters
                </h3>
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                  <span>🔒</span> Passcode Protected
                </span>
              </div>
              <p className="text-stone-500 text-xs mt-0.5">
                Configure patient-facing visibility. Toggling any feature requires admin passcode verification to prevent accidental changes, and all actions are recorded in the security audit log.
              </p>
            </div>
            <Badge variant="purple" size="sm">
              Real-time Customer Sync
            </Badge>
          </div>

          {/* Primary Customer View Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            {/* Toggle: Display Doctor Details */}
            <div
              onClick={() => toggleCustomerViewFeature("displayDoctorDetails")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.features.displayDoctorDetails !== false
                  ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/30"
                  : "bg-stone-50/60 border-stone-200 opacity-80"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👨‍⚕️</span>
                  <span className="font-bold text-sm text-stone-900">Display Doc Details</span>
                  {formData.features.displayDoctorDetails !== false ? (
                    <Badge variant="success" size="micro">Active (Visible)</Badge>
                  ) : (
                    <Badge variant="neutral" size="micro">Disabled</Badge>
                  )}
                </div>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Controls doctor title, registration number, and clinical profile visibility on customer pages.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features.displayDoctorDetails !== false}
                onChange={() => toggleCustomerViewFeature("displayDoctorDetails")}
                className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
              />
            </div>

            {/* Toggle: AgastyaBot AI Assistant */}
            <div
              onClick={() => toggleCustomerViewFeature("enableAgastyaBot")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.features.enableAgastyaBot !== false
                  ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/30"
                  : "bg-stone-50/60 border-stone-200 opacity-80"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤖</span>
                  <span className="font-bold text-sm text-stone-900">AgastyaBot</span>
                  {formData.features.enableAgastyaBot !== false ? (
                    <Badge variant="success" size="micro">Active (Visible)</Badge>
                  ) : (
                    <Badge variant="neutral" size="micro">Disabled</Badge>
                  )}
                </div>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Floating patient assistant widget for instant remedy FAQs, clinic timings, and appointment queries.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features.enableAgastyaBot !== false}
                onChange={() => toggleCustomerViewFeature("enableAgastyaBot")}
                className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
              />
            </div>

            {/* Toggle: Patient Details Edit Option */}
            <div
              onClick={() => toggleCustomerViewFeature("enablePatientProfileEdit")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.features.enablePatientProfileEdit !== false
                  ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/30"
                  : "bg-stone-50/60 border-stone-200 opacity-80"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✏️</span>
                  <span className="font-bold text-sm text-stone-900">Patient Details Edit Option</span>
                  {formData.features.enablePatientProfileEdit !== false ? (
                    <Badge variant="success" size="micro">Active (Editable)</Badge>
                  ) : (
                    <Badge variant="neutral" size="micro">Disabled (Read-Only)</Badge>
                  )}
                </div>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Controls whether patients see the "Edit Details" button on their clinical summary card.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features.enablePatientProfileEdit !== false}
                onChange={() => toggleCustomerViewFeature("enablePatientProfileEdit")}
                className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Sub-Section: My Summary Options */}
          <div className="pt-2">
            <div className="bg-stone-50/80 rounded-2xl p-4 border border-stone-200/80 space-y-3">
              <div className="flex items-center justify-between border-b border-stone-200/70 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📋</span>
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-stone-800">
                    My Summary Options (Customer Portal Tabs)
                  </h4>
                </div>
                <span className="text-[11px] text-stone-400 font-semibold">
                  Controls individual tabs in /visit-summary
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Display Patient Record */}
                <div
                  onClick={() => toggleCustomerViewFeature("enablePatientMedicalRecords")}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                    formData.features.enablePatientMedicalRecords !== false
                      ? "bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-400/30"
                      : "bg-stone-100/70 border-stone-300 opacity-75"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">🩺</span>
                      <strong className="text-xs text-stone-900">Display Patient Record</strong>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-tight">
                      Prescription timeline, remedies, dosages &amp; doctor consultation notes.
                    </p>
                    <div className="pt-1">
                      {formData.features.enablePatientMedicalRecords !== false ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Tab Visible
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-md">
                          Tab Hidden
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.features.enablePatientMedicalRecords !== false}
                    onChange={() => toggleCustomerViewFeature("enablePatientMedicalRecords")}
                    className="w-4 h-4 accent-emerald-600 rounded mt-0.5 cursor-pointer"
                  />
                </div>

                {/* 2. Billing and Payment History */}
                <div
                  onClick={() => toggleCustomerViewFeature("enableBillingHistory")}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                    formData.features.enableBillingHistory !== false
                      ? "bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-400/30"
                      : "bg-stone-100/70 border-stone-300 opacity-75"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">💳</span>
                      <strong className="text-xs text-stone-900">Billing &amp; Payment History</strong>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-tight">
                      Consultation fees, UPI settlement portal, and tax invoices.
                    </p>
                    <div className="pt-1">
                      {formData.features.enableBillingHistory !== false ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Tab Visible
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-md">
                          Tab Hidden
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.features.enableBillingHistory !== false}
                    onChange={() => toggleCustomerViewFeature("enableBillingHistory")}
                    className="w-4 h-4 accent-emerald-600 rounded mt-0.5 cursor-pointer"
                  />
                </div>

                {/* 3. Followup & Feedback */}
                <div
                  onClick={() => toggleCustomerViewFeature("enableFollowupFeedback")}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                    formData.features.enableFollowupFeedback !== false
                      ? "bg-white border-emerald-400 shadow-xs ring-1 ring-emerald-400/30"
                      : "bg-stone-100/70 border-stone-300 opacity-75"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">📝</span>
                      <strong className="text-xs text-stone-900">Follow-up &amp; Feedback</strong>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-tight">
                      Patient progress questionnaire, symptom diary, and review sync.
                    </p>
                    <div className="pt-1">
                      {formData.features.enableFollowupFeedback !== false ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                          Tab Visible
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-stone-600 bg-stone-200 px-2 py-0.5 rounded-md">
                          Tab Hidden
                        </span>
                      )}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.features.enableFollowupFeedback !== false}
                    onChange={() => toggleCustomerViewFeature("enableFollowupFeedback")}
                    className="w-4 h-4 accent-emerald-600 rounded mt-0.5 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Group 1 Dedicated Action Bar: Save & Apply Customer View Settings with Passcode */}
          <div className="pt-4 border-t border-emerald-900/10 flex flex-wrap items-center justify-between gap-3 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-200/50">
            <div className="space-y-0.5">
              <span className="font-extrabold text-xs text-stone-900 flex items-center gap-1.5">
                <span>🔒</span> Customer View Security Authorization
              </span>
              <p className="text-[11px] text-stone-500">
                Enter admin passcode once to authorize and immediately broadcast these Customer View filters to all patient accounts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasCustomerViewChanges && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg animate-pulse">
                  ● Unsaved Filter Changes
                </span>
              )}
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setCustomerViewPasscode("");
                  setCustomerViewPasscodeError(null);
                  setIsCustomerViewSaveModalOpen(true);
                }}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black shadow-xs cursor-pointer"
              >
                <span>🔒</span> Save &amp; Apply Customer View Settings
              </Button>
            </div>
          </div>
        </Card>

        {/* ── GENERAL CLINICAL & PLATFORM FEATURE GATES ── */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-stone-900 font-extrabold text-base flex items-center gap-2">
                <span>⚙️</span> General Clinic &amp; Platform Modules
              </h3>
              <p className="text-stone-500 text-xs mt-0.5">
                Enable or disable system-wide clinical services for this hospital tenant.
              </p>
            </div>
            <Badge variant="neutral" size="sm">
              Core Modules
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {/* Toggle: Customer Payment Portal */}
            <div
              onClick={() => toggleCustomerViewFeature("enableCustomerPayments")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.features.enableCustomerPayments
                  ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30"
                  : "bg-stone-50/60 border-stone-200 opacity-80"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💳</span>
                  <span className="font-bold text-sm text-stone-900">Online Checkout &amp; Settlements</span>
                  {formData.features.enableCustomerPayments ? (
                    <Badge variant="success" size="micro">Active</Badge>
                  ) : (
                    <Badge variant="neutral" size="micro">Disabled</Badge>
                  )}
                </div>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Allows patients to settle fees online via UPI, Cards, and NetBanking.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features.enableCustomerPayments}
                onChange={() => toggleCustomerViewFeature("enableCustomerPayments")}
                className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
              />
            </div>

            {/* Toggle: Raw Classical Homeopathy JSON Case Record */}
            <div
              onClick={() => toggleCustomerViewFeature("enableRawCaseJson")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.features.enableRawCaseJson
                  ? "bg-purple-50/50 border-purple-300 ring-1 ring-purple-400/30"
                  : "bg-stone-50/60 border-stone-200 opacity-80"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span className="font-bold text-sm text-stone-900">View Raw Case Record (JSON)</span>
                  {formData.features.enableRawCaseJson ? (
                    <Badge variant="purple" size="micro">Visible</Badge>
                  ) : (
                    <Badge variant="neutral" size="micro">Hidden (Default)</Badge>
                  )}
                </div>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Controls whether patients can inspect raw developer homeopathic case schemas.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features.enableRawCaseJson}
                onChange={() => toggleCustomerViewFeature("enableRawCaseJson")}
                className="w-5 h-5 accent-purple-600 rounded mt-1 flex-shrink-0 cursor-pointer"
              />
            </div>

            {/* Toggle: Google Reviews & Patient Testimonials */}
            <div
              onClick={() => toggleCustomerViewFeature("enableGoogleReviews")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.features.enableGoogleReviews
                  ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30"
                  : "bg-stone-50/60 border-stone-200 opacity-80"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌟</span>
                  <span className="font-bold text-sm text-stone-900">Google Reviews &amp; Testimonials</span>
                  {formData.features.enableGoogleReviews ? (
                    <Badge variant="success" size="micro">Active</Badge>
                  ) : (
                    <Badge variant="neutral" size="micro">Disabled</Badge>
                  )}
                </div>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Enables structured feedback collection and Google Maps review sync.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features.enableGoogleReviews}
                onChange={() => toggleCustomerViewFeature("enableGoogleReviews")}
                className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
              />
            </div>

            {/* Toggle: Telemedicine & Remote Consultation */}
            <div
              onClick={() => toggleCustomerViewFeature("enableTelemedicine")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.features.enableTelemedicine
                  ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30"
                  : "bg-stone-50/60 border-stone-200 opacity-80"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📱</span>
                  <span className="font-bold text-sm text-stone-900">Telemedicine &amp; Video Consults</span>
                  {formData.features.enableTelemedicine ? (
                    <Badge variant="success" size="micro">Active</Badge>
                  ) : (
                    <Badge variant="neutral" size="micro">Disabled</Badge>
                  )}
                </div>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Enables international remote consultations and WhatsApp video link dispatch.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features.enableTelemedicine}
                onChange={() => toggleCustomerViewFeature("enableTelemedicine")}
                className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
              />
            </div>

            {/* Toggle: Dispensary & Medicine Ordering */}
            <div
              onClick={() => toggleCustomerViewFeature("enableECommerce")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.features.enableECommerce
                  ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30"
                  : "bg-stone-50/60 border-stone-200 opacity-80"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📦</span>
                  <span className="font-bold text-sm text-stone-900">Dispensary &amp; Medicine Ordering</span>
                  {formData.features.enableECommerce ? (
                    <Badge variant="success" size="micro">Active</Badge>
                  ) : (
                    <Badge variant="neutral" size="micro">Disabled</Badge>
                  )}
                </div>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Allows patients to order remedies from dispensary with courier delivery.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features.enableECommerce}
                onChange={() => toggleCustomerViewFeature("enableECommerce")}
                className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
              />
            </div>

            {/* Toggle: Prescription OCR Scan */}
            <div
              onClick={() => toggleCustomerViewFeature("enablePrescriptionScan")}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                formData.features.enablePrescriptionScan
                  ? "bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-400/30"
                  : "bg-stone-50/60 border-stone-200 opacity-80"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">📄</span>
                  <span className="font-bold text-sm text-stone-900">AI Prescription Scan (OCR)</span>
                  {formData.features.enablePrescriptionScan ? (
                    <Badge variant="success" size="micro">Active</Badge>
                  ) : (
                    <Badge variant="neutral" size="micro">Disabled</Badge>
                  )}
                </div>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Enables scanning and auto-parsing of uploaded clinical prescriptions.
                </p>
              </div>
              <input
                type="checkbox"
                checked={formData.features.enablePrescriptionScan}
                onChange={() => toggleCustomerViewFeature("enablePrescriptionScan")}
                className="w-5 h-5 accent-emerald-600 rounded mt-1 flex-shrink-0 cursor-pointer"
              />
            </div>
          </div>

          {/* Group 2 Dedicated Action Bar: Save & Apply Platform Modules */}
          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50 p-3.5 rounded-2xl">
            <p className="text-[11px] text-stone-500">
              Save clinical services, raw JSON schemas, reviews, and e-commerce modules for this clinic.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSavePlatformModules}
            >
              <span>💾</span> Save &amp; Apply Platform Modules
            </Button>
          </div>
        </Card>

        {/* ── 2. ADMIN SECURITY PASSCODES & AUDIT TRAIL ── */}
        <Card variant="default" className="space-y-4 border-amber-900/30 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔐</span>
                <h3 className="text-stone-900 font-extrabold text-base">
                  Admin Passcodes &amp; Security Audit Trail
                </h3>
              </div>
              <p className="text-stone-500 text-xs mt-0.5">
                Authorized passcodes protect customer view configuration from unintended edits. All changes are timestamped and attributed to the modifying administrator.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setChangeOldPasscode("");
                  setChangeNewPasscode("");
                  setChangeConfirmPasscode("");
                  setChangePasscodeError(null);
                  setIsChangePasscodeModalOpen(true);
                }}
                className="text-xs"
              >
                <span>🔑</span> Change Passcode
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setAddAuthPasscode("");
                  setAddNewPasscode("");
                  setAddPasscodeLabel("");
                  setAddPasscodeError(null);
                  setIsAddPasscodeModalOpen(true);
                }}
                className="text-xs"
              >
                <span>➕</span> Add New Passcode
              </Button>
            </div>
          </div>

          {/* Active Passcodes Roster */}
          <div className="space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 block">
              Active Authorized Security Passcodes ({passcodes.length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {passcodes.map((pc, idx) => (
                <div
                  key={pc.id}
                  className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-2 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-stone-900">{pc.label}</span>
                    <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                      ••••
                    </span>
                  </div>
                  <div className="text-[11px] text-stone-500 space-y-0.5">
                    <p>Created: {formatDateTime(pc.createdAt)}</p>
                    <p>By: <strong className="text-stone-700">{pc.createdBy}</strong></p>
                  </div>
                  {passcodes.length > 1 && idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => handleDeletePasscode(pc.id, pc.label)}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                    >
                      Delete Passcode
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Live Security Audit Log Table */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 block">
                Security &amp; Configuration Change Audit Log ({auditLogs.length} Records)
              </span>
              <span className="text-[10px] text-stone-400">Chronological tamper-evident audit</span>
            </div>

            <div className="border border-stone-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100 text-stone-700 font-bold text-[10px] uppercase">
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Admin</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Details / Audit Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-[11px]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-stone-50/80">
                      <td className="py-2 px-3 font-mono text-stone-500 whitespace-nowrap">
                        {formatDateTime(log.timestamp)}
                      </td>
                      <td className="py-2 px-3 font-bold text-stone-900 whitespace-nowrap">
                        {log.adminName}
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            log.action === "TOGGLE_FEATURE"
                              ? "bg-purple-100 text-purple-900 border border-purple-200"
                              : log.action === "CHANGE_PASSCODE"
                              ? "bg-amber-100 text-amber-900 border border-amber-200"
                              : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                          }`}
                        >
                          {log.action.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-stone-700 font-medium">
                        {log.details}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>

        {/* ── 2. HOSPITAL & CLINIC IDENTITY ── */}
        <Card variant="default" className="space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="text-stone-900 font-extrabold text-base flex items-center gap-2">
              <span>🏥</span> Hospital &amp; Clinic Information
            </h3>
            <p className="text-stone-500 text-xs mt-0.5">
              General display information, brand titles, and contact lines.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              label="Official Hospital / Clinic Name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Agastya Homoeopathy Clinic"
              required
            />
            <Input
              label="Short Display Name"
              value={formData.shortName}
              onChange={(e) => setFormData((p) => ({ ...p, shortName: e.target.value }))}
              placeholder="e.g. Agastya Clinic"
              required
            />
            <Input
              label="Tagline / Motto"
              value={formData.tagline}
              onChange={(e) => setFormData((p) => ({ ...p, tagline: e.target.value }))}
              placeholder="e.g. Holistic Classical Healing"
            />
            <Input
              label="Official Contact Phone"
              value={formData.contact.phoneDisplay}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  contact: { ...p.contact, phoneDisplay: e.target.value, phone: e.target.value },
                }))
              }
              placeholder="+91 98450 12345"
            />
            <Input
              label="Official Support Email"
              type="email"
              value={formData.contact.email}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  contact: { ...p.contact, email: e.target.value },
                }))
              }
              placeholder="care@clinic.com"
            />
            <Input
              label="City & State"
              value={`${formData.contact.address.city}, ${formData.contact.address.state}`}
              onChange={(e) => {
                const parts = e.target.value.split(",");
                setFormData((p) => ({
                  ...p,
                  contact: {
                    ...p.contact,
                    address: {
                      ...p.contact.address,
                      city: parts[0]?.trim() || p.contact.address.city,
                      state: parts[1]?.trim() || p.contact.address.state,
                    },
                  },
                }));
              }}
              placeholder="Bengaluru, Karnataka"
            />
          </div>

          {/* Google Maps & Business Review Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <Input
              label="Direct Google Maps Review URL (Write Review Intent)"
              value={formData.contact.googleReviewUrl || ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  contact: { ...p.contact, googleReviewUrl: e.target.value },
                }))
              }
              placeholder="https://search.google.com/local/writereview?placeid=ChIJ..."
              helperText="Opens when syncing approved patient feedback directly to Google Maps."
            />
            <Input
              label="Google Place ID"
              value={formData.contact.googlePlaceId || ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  contact: { ...p.contact, googlePlaceId: e.target.value },
                }))
              }
              placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
            />
          </div>

          <Textarea
            label="About the Clinic (Public Notice & Bio)"
            value={formData.branding.aboutClinicText || ""}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                branding: { ...p.branding, aboutClinicText: e.target.value },
              }))
            }
            rows={2}
            placeholder="Describe the clinical heritage, methodology, and care principles of this hospital..."
          />

          {/* Group Dedicated Action Bar: Save & Apply Clinic Info */}
          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50 p-3.5 rounded-2xl">
            <p className="text-[11px] text-stone-500">
              Save clinic display name, phone, email, Google review links, and about text.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveHospitalInfo}
            >
              <span>💾</span> Save &amp; Apply Clinic Information
            </Button>
          </div>
        </Card>

        {/* ── 3. DOCTOR PROFILE & BIO (SCALABLE MULTI-DOCTOR READY) ── */}
        <Card variant="default" className="space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-stone-900 font-extrabold text-base flex items-center gap-2">
                <span>🩺</span> Doctor Profile &amp; Clinical Bio
              </h3>
              <p className="text-stone-500 text-xs mt-0.5">
                Physician details displayed on prescription headers, consult confirmations, and about pages.
              </p>
            </div>
            {formData.doctors && formData.doctors.length > 1 && (
              <Badge variant="info" size="sm">
                {formData.doctors.length} Doctors Registered
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Input
              label="Doctor Full Name"
              value={formData.doctor.name}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  doctor: { ...p.doctor, name: e.target.value },
                }))
              }
              placeholder="e.g. Dr. K. S. Sharma"
              required
            />
            <Input
              label="Official Title & Suffix"
              value={formData.doctor.title}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  doctor: { ...p.doctor, title: e.target.value },
                }))
              }
              placeholder="e.g. Dr. K. S. Sharma, MD (Hom), Chief Physician"
              required
            />
            <Input
              label="Medical Registration No"
              value={formData.doctor.regNo}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  doctor: { ...p.doctor, regNo: e.target.value },
                }))
              }
              placeholder="e.g. KAR-HOM-2018-0492"
            />
            <Input
              label="Years of Experience"
              type="number"
              value={formData.doctor.experienceYears}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  doctor: { ...p.doctor, experienceYears: Number(e.target.value) || 0 },
                }))
              }
            />
            <div className="sm:col-span-2">
              <Input
                label="Qualifications & Academic Degrees"
                value={formData.doctor.qualifications}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    doctor: { ...p.doctor, qualifications: e.target.value },
                  }))
                }
                placeholder="e.g. BHMS, MD (Homeopathy), Gold Medalist"
              />
            </div>
          </div>

          <Textarea
            label="About the Doctor (Physician Biography)"
            value={formData.doctor.aboutText || ""}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                doctor: { ...p.doctor, aboutText: e.target.value },
                branding: { ...p.branding, aboutDocText: e.target.value },
              }))
            }
            rows={3}
            placeholder="Clinical philosophy, chronic case handling approach, constitutional prescribing style..."
          />

          {/* Group Dedicated Action Bar: Save & Apply Doctor Profile */}
          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50 p-3.5 rounded-2xl">
            <p className="text-[11px] text-stone-500">
              Save physician credentials, medical registration number, experience, and clinical biography.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveDoctorProfile}
            >
              <span>💾</span> Save &amp; Apply Doctor Profile
            </Button>
          </div>
        </Card>

        {/* ── 4. BRANDING & MEDIA ASSETS ── */}
        <Card variant="default" className="space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="text-stone-900 font-extrabold text-base flex items-center gap-2">
              <span>🎨</span> Branding, Media, Logo &amp; Banner
            </h3>
            <p className="text-stone-500 text-xs mt-0.5">
              Customize logos, header banners, and hospital color scheme tokens.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Clinic Logo URL"
              value={formData.branding.logoUrl || ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  branding: { ...p.branding, logoUrl: e.target.value },
                }))
              }
              placeholder="https://example.com/logo.png"
            />
            <Input
              label="Clinic Header Banner Image URL"
              value={formData.branding.bannerUrl || ""}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  branding: { ...p.branding, bannerUrl: e.target.value },
                }))
              }
              placeholder="https://example.com/clinic-banner.jpg"
            />
          </div>

          {/* Color Palettes preview */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/70 flex flex-wrap items-center gap-4 text-xs">
            <span className="font-bold text-stone-700">Hospital Brand Colors:</span>
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full border border-stone-300 shadow-xs"
                style={{ backgroundColor: formData.branding.primaryColor }}
              />
              <span className="font-mono text-stone-600">Primary: {formData.branding.primaryColor}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full border border-stone-300 shadow-xs"
                style={{ backgroundColor: formData.branding.accentColor }}
              />
              <span className="font-mono text-stone-600">Accent: {formData.branding.accentColor}</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="w-5 h-5 rounded-full border border-stone-300 shadow-xs"
                style={{ backgroundColor: formData.branding.neutralBg }}
              />
              <span className="font-mono text-stone-600">Bg: {formData.branding.neutralBg}</span>
            </div>
          </div>

          {/* Group Dedicated Action Bar: Save & Apply Branding */}
          <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50 p-3.5 rounded-2xl">
            <p className="text-[11px] text-stone-500">
              Save clinic logo image, header banner image, and brand theme colors.
            </p>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSaveBranding}
            >
              <span>💾</span> Save &amp; Apply Branding Settings
            </Button>
          </div>
        </Card>

        {/* ── 5. CUSTOMER FEEDBACK & GOOGLE REVIEWS MODERATION ── */}
        <Card variant="default" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
            <div>
              <h3 className="text-stone-900 font-extrabold text-base flex items-center gap-2">
                <span>⭐</span> Customer Feedback &amp; Google Reviews Showcase
              </h3>
              <p className="text-stone-500 text-xs mt-0.5">
                Review submitted patient testimonials, approve for public display, or sync directly to Google Maps reviews.
              </p>
            </div>
            <Badge variant="purple" size="sm">
              {feedbackList.length} Total Feedback Records
            </Badge>
          </div>

          {feedbackList.length === 0 ? (
            <p className="text-stone-400 text-xs py-4 text-center italic">No customer feedback submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {feedbackList.map((fb) => (
                <div
                  key={fb.id}
                  className="p-4 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-2.5 transition-all hover:bg-white hover:shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <strong className="text-stone-900 text-xs">{fb.patientName}</strong>
                      <span className="text-[10px] text-stone-400 font-mono">({fb.submittedAt})</span>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          fb.status === "approved"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : fb.status === "hidden"
                            ? "bg-stone-200 text-stone-600"
                            : "bg-amber-100 text-amber-900 border border-amber-300"
                        }`}
                      >
                        {fb.status}
                      </span>
                      {fb.publishedToGoogle && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                          ✓ Synced to Google
                        </span>
                      )}
                    </div>

                    {/* Star Rating */}
                    <div className="flex items-center gap-1 text-amber-400 text-sm">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < fb.rating ? "text-amber-400" : "text-stone-300"}>
                          ★
                        </span>
                      ))}
                      <span className="text-[11px] font-bold text-stone-700 ml-1">({fb.rating}/5)</span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-stone-200/80 space-y-1 text-xs">
                    <span className="text-[10px] font-bold font-mono text-purple-700 block">
                      {fb.topic}
                    </span>
                    <p className="text-stone-800 leading-relaxed font-medium">{fb.comments}</p>
                    {fb.recoveryStatus && (
                      <span className="text-[10px] text-stone-500 font-medium block pt-1">
                        Recovery Status: <strong>{fb.recoveryStatus}</strong>
                      </span>
                    )}
                  </div>

                  {/* Doctor Moderation Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60">
                    <span className="text-[10px] text-stone-400">
                      ID: {fb.id} · Verified Clinical Patient
                    </span>

                    <div className="flex items-center gap-2">
                      {fb.status !== "approved" && (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleApproveFeedback(fb.id)}
                          className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300"
                        >
                          ✓ Approve &amp; Feature
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleSyncToGoogle(fb)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                        title="Copy text & launch Google Maps review window"
                      >
                        🌐 Sync / Post to Google Review
                      </Button>

                      {fb.status !== "hidden" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleHideFeedback(fb.id)}
                          className="text-stone-500 hover:text-stone-700 text-xs"
                        >
                          Hide
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApproveFeedback(fb.id)}
                          className="text-stone-500 hover:text-stone-700 text-xs"
                        >
                          Unhide
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFeedback(fb.id)}
                        className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 text-xs"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* ── FACTORY RESET & UTILITIES ── */}
        <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80">
          <div>
            <p className="font-extrabold text-stone-800 text-xs">Clinic Defaults &amp; Factory Reset</p>
            <p className="text-[11px] text-stone-500">
              Settings are saved directly per group using each card's dedicated Save &amp; Apply button.
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-stone-600 hover:text-rose-700 hover:bg-rose-50 font-bold border border-stone-300"
          >
            <span>↺</span> Reset Tenant to Factory Defaults
          </Button>
        </div>
      </div>

      {/* ── 0. Passcode Confirmation Modal for Save & Apply Customer View Settings ── */}
      {isCustomerViewSaveModalOpen && (
        <Modal
          isOpen={isCustomerViewSaveModalOpen}
          onClose={() => setIsCustomerViewSaveModalOpen(false)}
          title="Security Authorization: Save Customer View Settings"
          subtitle={`Hospital Tenant: ${formData.name} — Passcode Required`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsCustomerViewSaveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="customer-view-save-passcode-form"
                disabled={!customerViewPasscode.trim()}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-black"
              >
                <span>✓</span> Authorize &amp; Apply Live
              </Button>
            </div>
          }
        >
          <form
            id="customer-view-save-passcode-form"
            onSubmit={handleSaveCustomerViewSubmit}
            className="p-5 sm:p-6 space-y-4 text-xs"
          >
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">🛡️</span>
                <span className="font-extrabold text-xs sm:text-sm">
                  Confirm Broadcast to Patient Portal ({formData.shortName || formData.name})
                </span>
              </div>
              <p className="text-[11px] text-emerald-900 leading-relaxed">
                You are authorizing updated customer access filters. Upon verification, these settings will immediately take effect for all patient logins:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] font-semibold">
                <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-200">
                  <span>👨‍⚕️ Doctor Details:</span>
                  <span className={formData.features.displayDoctorDetails !== false ? "text-emerald-700 font-bold" : "text-stone-500 font-bold"}>
                    {formData.features.displayDoctorDetails !== false ? "Visible" : "Hidden"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-200">
                  <span>🤖 AgastyaBot AI:</span>
                  <span className={formData.features.enableAgastyaBot !== false ? "text-emerald-700 font-bold" : "text-stone-500 font-bold"}>
                    {formData.features.enableAgastyaBot !== false ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-200">
                  <span>✏️ Profile Edit:</span>
                  <span className={formData.features.enablePatientProfileEdit !== false ? "text-emerald-700 font-bold" : "text-stone-500 font-bold"}>
                    {formData.features.enablePatientProfileEdit !== false ? "Editable" : "Read-Only"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-200">
                  <span>🩺 Patient Records:</span>
                  <span className={formData.features.enablePatientMedicalRecords !== false ? "text-emerald-700 font-bold" : "text-stone-500 font-bold"}>
                    {formData.features.enablePatientMedicalRecords !== false ? "Visible" : "Hidden"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-200">
                  <span>💳 Billing History:</span>
                  <span className={formData.features.enableBillingHistory !== false ? "text-emerald-700 font-bold" : "text-stone-500 font-bold"}>
                    {formData.features.enableBillingHistory !== false ? "Visible" : "Hidden"}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/80 p-2 rounded-xl border border-emerald-200">
                  <span>📝 Follow-up Tab:</span>
                  <span className={formData.features.enableFollowupFeedback !== false ? "text-emerald-700 font-bold" : "text-stone-500 font-bold"}>
                    {formData.features.enableFollowupFeedback !== false ? "Visible" : "Hidden"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block">
                Enter Admin Security Passcode *
              </label>
              <div className="relative">
                <input
                  type={showCustomerViewPasscodeText ? "text" : "password"}
                  required
                  placeholder="Enter 4-digit passcode"
                  value={customerViewPasscode}
                  onChange={(e) => {
                    setCustomerViewPasscode(e.target.value);
                    if (customerViewPasscodeError) setCustomerViewPasscodeError(null);
                  }}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-sm font-mono tracking-widest outline-none focus:ring-2 focus:ring-emerald-500 pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowCustomerViewPasscodeText(!showCustomerViewPasscodeText)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-stone-500 hover:text-stone-800 font-bold px-1.5 py-1 cursor-pointer"
                >
                  {showCustomerViewPasscodeText ? "Hide" : "Show"}
                </button>
              </div>

              {customerViewPasscodeError && (
                <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 font-bold text-[11px] flex items-center gap-1.5 animate-fadeIn">
                  <span>⚠️</span> {customerViewPasscodeError}
                </div>
              )}

              <p className="text-[10px] text-stone-400">
                Logged to security audit trail as Admin: <strong className="text-stone-700">{currentAdminName}</strong>
              </p>
            </div>
          </form>
        </Modal>
      )}

      {/* ── 2. Change Passcode Modal ── */}
      {isChangePasscodeModalOpen && (
        <Modal
          isOpen={isChangePasscodeModalOpen}
          onClose={() => setIsChangePasscodeModalOpen(false)}
          title="Change Master Admin Security Passcode"
          subtitle="Update the primary security passcode used to authorize configuration changes"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsChangePasscodeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="change-passcode-form"
                disabled={!changeOldPasscode || !changeNewPasscode || !changeConfirmPasscode}
              >
                Save New Passcode
              </Button>
            </div>
          }
        >
          <form
            id="change-passcode-form"
            onSubmit={handleChangePasscodeSubmit}
            className="p-4 sm:p-5 space-y-3 text-xs"
          >
            {changePasscodeError && (
              <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 font-bold text-[11px] flex items-center gap-1.5">
                <span>⚠️</span> {changePasscodeError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
                  Current Passcode *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current passcode"
                  value={changeOldPasscode}
                  onChange={(e) => setChangeOldPasscode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
                  New Passcode (min 4 characters) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new secure passcode"
                  value={changeNewPasscode}
                  onChange={(e) => setChangeNewPasscode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
                  Confirm New Passcode *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-type new passcode"
                  value={changeConfirmPasscode}
                  onChange={(e) => setChangeConfirmPasscode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ── 3. Add New Passcode Modal ── */}
      {isAddPasscodeModalOpen && (
        <Modal
          isOpen={isAddPasscodeModalOpen}
          onClose={() => setIsAddPasscodeModalOpen(false)}
          title="Add New Admin Security Passcode"
          subtitle="Provision a designated passcode for secondary clinic administrators"
          size="sm"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                type="button"
                onClick={() => setIsAddPasscodeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                form="add-passcode-form"
                disabled={!addAuthPasscode || !addNewPasscode || !addPasscodeLabel}
              >
                Provision Passcode
              </Button>
            </div>
          }
        >
          <form
            id="add-passcode-form"
            onSubmit={handleAddPasscodeSubmit}
            className="p-4 sm:p-5 space-y-3 text-xs"
          >
            {addPasscodeError && (
              <div className="p-2.5 rounded-xl bg-rose-100 border border-rose-300 text-rose-900 font-bold text-[11px] flex items-center gap-1.5">
                <span>⚠️</span> {addPasscodeError}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
                  Master Authorization Passcode *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter active master passcode"
                  value={addAuthPasscode}
                  onChange={(e) => setAddAuthPasscode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
                  Passcode Label / Owner Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Clinic Reception Desk, Dr. Assistant"
                  value={addPasscodeLabel}
                  onChange={(e) => setAddPasscodeLabel(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-stone-600 block mb-1">
                  New Passcode *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter new 4-digit code"
                  value={addNewPasscode}
                  onChange={(e) => setAddNewPasscode(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs font-mono tracking-widest outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CustomizationTab;
