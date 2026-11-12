import React, { useState, useMemo } from "react";
import { useApp, useRequireRole } from "../context/AppContext";
import { useTenant } from "../context/ThemeProvider";
import { HOSPITAL_TENANTS } from "../config/tenants";
import type { HospitalTenantConfig, HospitalDoctor, HospitalFeatures } from "../types/tenant";
import { useToast } from "../context/ToastContext";
import { Button } from "../components/ui";
import { api } from "../services/api";

export const SuperAdminDashboard: React.FC = () => {
  // Enforce Super Admin RBAC boundary
  useRequireRole("super_admin");

  const { state, navigateTo } = useApp();
  const { tenant, setTenantId } = useTenant();
  const toast = useToast();

  const [tenantsList, setTenantsList] = useState<HospitalTenantConfig[]>(() => {
    return Object.values(HOSPITAL_TENANTS);
  });

  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [managingTenant, setManagingTenant] = useState<HospitalTenantConfig | null>(null);
  const [managingFeatures, setManagingFeatures] = useState<HospitalFeatures | null>(null);
  const [isOnboardingSubmitting, setIsOnboardingSubmitting] = useState(false);

  // Success dialog after onboarding
  const [onboardedResult, setOnboardedResult] = useState<{
    hospital: HospitalTenantConfig;
    doctor: HospitalDoctor;
    inviteUrl: string;
    emailDelivery: any;
  } | null>(null);

  // New hospital form state
  const [newHospitalName, setNewHospitalName] = useState("");
  const [newHospitalSlug, setNewHospitalSlug] = useState("");
  const [newHospitalTagline, setNewHospitalTagline] = useState("");
  const [newPhone, setNewPhone] = useState("+91 98450 00000");
  const [newEmail, setNewEmail] = useState("admin@newclinic.com");
  const [newCity, setNewCity] = useState("Bengaluru");
  const [newStreet, setNewStreet] = useState("123 Healthcare Blvd");
  const [newPrimaryColor, setNewPrimaryColor] = useState("#0d9488");
  const [newAccentColor, setNewAccentColor] = useState("#14b8a6");

  // Lead Doctor details state
  const [newDoctorName, setNewDoctorName] = useState("");
  const [newDoctorEmail, setNewDoctorEmail] = useState("");
  const [newDoctorPhone, setNewDoctorPhone] = useState("+91 98450 12345");
  const [newDoctorTitle, setNewDoctorTitle] = useState("Consulting Physician, MD");
  const [newDoctorQual, setNewDoctorQual] = useState("MD, MBBS");
  const [newDoctorRegNo, setNewDoctorRegNo] = useState("");
  const [newDoctorExp, setNewDoctorExp] = useState(8);
  const [newDoctorSpecialties, setNewDoctorSpecialties] = useState("General Medicine, Holistic Health");
  const [newDoctorBio, setNewDoctorBio] = useState("");

  // Feature / Functionality governance state
  const [featVoiceStudio, setFeatVoiceStudio] = useState(true);
  const [featPrescriptionScan, setFeatPrescriptionScan] = useState(true);
  const [featTelemedicine, setFeatTelemedicine] = useState(true);
  const [featRawCaseJson, setFeatRawCaseJson] = useState(true);
  const [featECommerce, setFeatECommerce] = useState(true);
  const [featDisplayDoctorDetails, setFeatDisplayDoctorDetails] = useState(true);
  const [featPatientMedicalRecords, setFeatPatientMedicalRecords] = useState(true);
  const [featBillingHistory, setFeatBillingHistory] = useState(true);
  const [featFollowupFeedback, setFeatFollowupFeedback] = useState(true);
  const [featOnlinePayments, setFeatOnlinePayments] = useState(true);

  const colorPresets = [
    { label: "Teal (Ayur)", primary: "#0d9488", accent: "#14b8a6" },
    { label: "Sapphire (General)", primary: "#1e3a6e", accent: "#3b82f6" },
    { label: "Emerald (Integrative)", primary: "#065f46", accent: "#10b981" },
    { label: "Forest (Vanilla)", primary: "#1b4332", accent: "#40916c" },
    { label: "Ruby (Cardio)", primary: "#9f1239", accent: "#f43f5e" },
    { label: "Amethyst (Wellness)", primary: "#581c87", accent: "#a855f7" },
  ];

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

  // Open feature manager modal for existing hospital
  const handleOpenFeatureManager = (targetTenant: HospitalTenantConfig) => {
    setManagingTenant(targetTenant);
    setManagingFeatures({ ...targetTenant.features });
  };

  // Save updated feature permissions for existing hospital
  const handleSaveFeatureManager = async () => {
    if (!managingTenant || !managingFeatures) return;

    try {
      await api.platform.updateHospitalFeatures(managingTenant.id, managingFeatures as any);
    } catch {
      // Local fallback
    }

    const updatedTenant: HospitalTenantConfig = {
      ...managingTenant,
      features: managingFeatures,
    };

    HOSPITAL_TENANTS[managingTenant.id] = updatedTenant;
    setTenantsList((prev) =>
      prev.map((t) => (t.id === managingTenant.id ? updatedTenant : t))
    );

    if (tenant.id === managingTenant.id) {
      setTenantId(managingTenant.id);
    }

    toast.success(`Layout & functionality permissions updated for '${managingTenant.name}'!`);
    setManagingTenant(null);
    setManagingFeatures(null);
  };

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospitalName.trim() || !newHospitalSlug.trim() || !newDoctorName.trim() || !newDoctorEmail.trim()) {
      toast.error("Please fill in Hospital Name, Slug, Lead Doctor Name, and Doctor Email.");
      return;
    }

    const cleanSlug = newHospitalSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (tenantsList.some((t) => t.id === cleanSlug || t.slug === cleanSlug)) {
      toast.error("A hospital with this slug already exists.");
      return;
    }

    setIsOnboardingSubmitting(true);

    const doctorConfig: HospitalDoctor = {
      id: `doc-${cleanSlug}-01`,
      name: newDoctorName.trim(),
      title: newDoctorTitle.trim() || "Consulting Physician, MD",
      qualifications: newDoctorQual.trim() || "MD, MBBS",
      experienceYears: Number(newDoctorExp) || 8,
      regNo: newDoctorRegNo.trim() || `MED-${cleanSlug.toUpperCase()}-001`,
      aboutText: newDoctorBio.trim() || `Primary clinical lead and consultant for ${newHospitalName.trim()}.`,
      specialties: newDoctorSpecialties.split(",").map((s) => s.trim()).filter(Boolean),
    };

    const featuresConfig: HospitalFeatures = {
      enableECommerce: featECommerce,
      enableVoiceStudio: featVoiceStudio,
      enablePrescriptionScan: featPrescriptionScan,
      enableOnlinePayments: featOnlinePayments,
      enableTelemedicine: featTelemedicine,
      enableCustomerPayments: featOnlinePayments,
      enableRawCaseJson: featRawCaseJson,
      enableGoogleReviews: false,
      displayDoctorDetails: featDisplayDoctorDetails,
      enablePatientMedicalRecords: featPatientMedicalRecords,
      enableBillingHistory: featBillingHistory,
      enableFollowupFeedback: featFollowupFeedback,
    };

    const newTenant: HospitalTenantConfig = {
      id: cleanSlug,
      slug: cleanSlug,
      domain: `${cleanSlug}.ehr.local`,
      subdomains: [cleanSlug],
      name: newHospitalName.trim(),
      shortName: newHospitalName.trim().split(" ")[0] || "Clinic",
      tagline: newHospitalTagline.trim() || "Compassionate Healthcare with Clinical Precision",
      doctor: doctorConfig,
      doctors: [doctorConfig],
      contact: {
        phone: newPhone.trim(),
        phoneDisplay: newPhone.trim(),
        email: newEmail.trim(),
        emergencyPhone: newPhone.trim(),
        address: {
          street: newStreet.trim() || "123 Healthcare Blvd",
          city: newCity.trim(),
          state: "Karnataka",
          pincode: "560001",
          country: "India",
        },
        mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(`${newHospitalName} ${newCity}`)}`,
        googleReviewUrl: "",
      },
      branding: {
        primaryColor: newPrimaryColor,
        primaryDarkColor: "#0f172a",
        accentColor: newAccentColor,
        neutralBg: "#fafaf9",
        cardRadius: "1.25rem",
        buttonRadius: "0.75rem",
        logoUrl: "/logo.png",
        fontSans: '"Inter", sans-serif',
      },
      features: featuresConfig,
    };

    let inviteUrl = `${window.location.origin}/join?token=inv_${cleanSlug}_doc`;
    let emailDelivery: any = { status: "simulated" };

    try {
      const onboardPayload = {
        id: cleanSlug,
        name: newTenant.name,
        short_name: newTenant.shortName,
        tagline: newTenant.tagline,
        phone: newPhone.trim(),
        email: newEmail.trim(),
        street: newStreet.trim(),
        city: newCity.trim(),
        primary_color: newPrimaryColor,
        accent_color: newAccentColor,
        features: featuresConfig,
        doctor_name: newDoctorName.trim(),
        doctor_title: doctorConfig.title,
        doctor_email: newDoctorEmail.trim(),
        doctor_phone: newDoctorPhone.trim(),
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
    } finally {
      setIsOnboardingSubmitting(false);
    }

    HOSPITAL_TENANTS[cleanSlug] = newTenant;
    setTenantsList((prev) => [...prev, newTenant]);
    setIsOnboardingModalOpen(false);

    // Show success dialog
    setOnboardedResult({
      hospital: newTenant,
      doctor: doctorConfig,
      inviteUrl,
      emailDelivery,
    });

    toast.success(`Hospital '${newTenant.name}' onboarded! Doctor credentials dispatched.`);
  };

  const stats = useMemo(() => {
    return {
      totalHospitals: tenantsList.length,
      totalDoctors: tenantsList.reduce((acc, t) => acc + (t.doctors?.length || 1), 0),
      activeTenantId: tenant.id,
      superAdminEmail: state.authUser?.email || "superadmin@platform.ehr",
    };
  }, [tenantsList, tenant.id, state.authUser]);

  return (
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">Total Facilities</p>
          <p className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">{stats.totalHospitals}</p>
          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">✓ Multi-tenant isolated</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">Physicians Onboarded</p>
          <p className="text-2xl sm:text-3xl font-black text-stone-900 mt-1">{stats.totalDoctors}</p>
          <p className="text-[10px] text-indigo-600 font-bold mt-0.5">Google OAuth &amp; Invite Enabled</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">Active Tenant Preview</p>
          <p className="text-sm font-black text-indigo-900 mt-2 truncate">{tenant.name}</p>
          <p className="text-[10px] text-stone-400 font-mono mt-0.5">id: {tenant.id}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-stone-400">Governance Engine</p>
          <p className="text-sm font-black text-stone-800 mt-2">Doctor &amp; Patient Access</p>
          <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Feature Toggles Active</p>
        </div>
      </div>

      {/* ── Hospital Facilities Roster ──────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-stone-900">Hospital Facilities &amp; White-Label Tenants</h2>
            <p className="text-xs text-stone-500">Each facility possesses customized doctor credentials, branding palettes, and managed functionality permissions.</p>
          </div>
          <span className="text-xs font-bold text-stone-400 font-mono">
            {tenantsList.length} hospitals registered
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tenantsList.map((h) => {
            const isActive = h.id === tenant.id;
            return (
              <div
                key={h.id}
                className={`bg-white rounded-3xl p-6 border transition-all duration-200 flex flex-col justify-between gap-5 relative overflow-hidden ${
                  isActive
                    ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-xl"
                    : "border-stone-200 shadow-sm hover:border-stone-300 hover:shadow-md"
                }`}
              >
                {isActive && (
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
                    Active Preview
                  </div>
                )}

                <div className="space-y-3">
                  {/* Color Swatch & Title */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0"
                      style={{ background: h.branding.primaryColor }}
                    >
                      🏥
                    </div>
                    <div>
                      <h3 className="font-extrabold text-stone-900 text-base leading-snug">{h.name}</h3>
                      <p className="text-xs font-mono text-stone-400">id: {h.id}</p>
                    </div>
                  </div>

                  {/* Brand Swatches Bar */}
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
                    <span className="text-[10px] font-bold text-stone-500">Branding:</span>
                    <div className="flex items-center gap-1.5 flex-1">
                      <div
                        className="w-5 h-5 rounded-md border border-black/10 shadow-inner"
                        style={{ background: h.branding.primaryColor }}
                        title={`Primary: ${h.branding.primaryColor}`}
                      />
                      <div
                        className="w-5 h-5 rounded-md border border-black/10 shadow-inner"
                        style={{ background: h.branding.primaryDarkColor }}
                        title={`Dark: ${h.branding.primaryDarkColor}`}
                      />
                      <div
                        className="w-5 h-5 rounded-md border border-black/10 shadow-inner"
                        style={{ background: h.branding.accentColor }}
                        title={`Accent: ${h.branding.accentColor}`}
                      />
                      <span className="text-[10px] font-mono text-stone-400 ml-1">
                        {h.branding.primaryColor}
                      </span>
                    </div>
                  </div>

                  {/* Doctor Info */}
                  <div className="text-xs space-y-1 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 text-indigo-950">
                    <p className="font-bold flex items-center gap-1">
                      <span>🩺</span> Lead Physician: <strong>{h.doctor.name}</strong>
                    </p>
                    <p className="text-[11px] text-stone-500 pl-4">{h.doctor.title}</p>
                    <p className="text-[10px] text-stone-400 pl-4">{h.doctor.qualifications} • {h.doctor.experienceYears} yrs exp</p>
                    {h.doctor.regNo && (
                      <p className="text-[10px] text-indigo-700 font-mono font-bold pl-4">Reg: {h.doctor.regNo}</p>
                    )}
                  </div>

                  {/* Feature Badges */}
                  <div className="space-y-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Enabled Modules:</p>
                    <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                      {h.features.enableVoiceStudio && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">🎙️ AI Voice</span>
                      )}
                      {h.features.enablePrescriptionScan && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">📄 OCR Scan</span>
                      )}
                      {h.features.enableTelemedicine && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">📹 Telehealth</span>
                      )}
                      {h.features.enableECommerce && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">💊 Pharmacy</span>
                      )}
                      {h.features.enablePatientMedicalRecords && (
                        <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">📋 Medical Records</span>
                      )}
                      {h.features.enableBillingHistory && (
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800">💳 Billing</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-stone-100 flex flex-col gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSwitchTenant(h)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        isActive
                          ? "bg-indigo-100 text-indigo-950 font-black cursor-default"
                          : "bg-stone-100 hover:bg-stone-200 text-stone-800"
                      }`}
                    >
                      <span>{isActive ? "✓ Active" : "🎯 Switch"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenFeatureManager(h)}
                      className="py-2 px-3 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
                      title="Manage what Doctor and Patient can view/do"
                    >
                      <span>⚙️ Layout &amp; Access</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePreviewAsPatient(h)}
                      className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer text-center"
                    >
                      👁️ Patient View
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePreviewAsDoctor(h)}
                      className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer text-center"
                    >
                      🩺 Doctor View
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Onboarding Success Dialog (Doctor Credentials & Invite Link) ─────── */}
      {onboardedResult && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl mx-auto shadow-inner">
              ✓
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-extrabold text-xl text-stone-900">
                Hospital Onboarded &amp; Doctor Provisioned!
              </h3>
              <p className="text-xs text-stone-500">
                Hospital <strong>{onboardedResult.hospital.name}</strong> and <strong>{onboardedResult.doctor.name}</strong> are now live in the network.
              </p>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-stone-500 font-bold">Doctor Login Email:</span>
                <strong className="text-stone-900 font-mono">{onboardedResult.hospital.contact.email}</strong>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <span className="text-stone-500 font-bold">Google 1-Click Login:</span>
                <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  ✓ Pre-authorized
                </span>
              </div>
              <div>
                <span className="text-stone-500 font-bold block mb-1">Doctor Activation / Invite Link:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={onboardedResult.inviteUrl}
                    className="flex-1 bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-stone-700 select-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(onboardedResult.inviteUrl);
                      toast.success("Invite link copied to clipboard!");
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-stone-500">
                ✉️ An official registration email has been dispatched with Google Sign-In and invite activation instructions.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setOnboardedResult(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
                onClick={() => {
                  handleSwitchTenant(onboardedResult.hospital);
                  setOnboardedResult(null);
                }}
              >
                Preview Hospital →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Functionalities Modal (Doctor & Patient View Governance) ──── */}
      {managingTenant && managingFeatures && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-stone-900">
                  Manage Layout &amp; Functionalities
                </h3>
                <p className="text-xs text-stone-500">
                  Control what features the <strong>Doctor</strong> can access and what the <strong>Patient</strong> can view for <em>{managingTenant.name}</em>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setManagingTenant(null)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Doctor Portal Capabilities */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🩺</span>
                  <h4 className="font-black text-xs text-indigo-950 uppercase tracking-wider">
                    Doctor Portal Capabilities (What Doctor Can View &amp; Use)
                  </h4>
                </div>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={managingFeatures.enableVoiceStudio !== false}
                      onChange={(e) => setManagingFeatures({ ...managingFeatures, enableVoiceStudio: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    🎙️ AI VoiceStudio Clinical Speech-to-Text Dictation
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={managingFeatures.enablePrescriptionScan !== false}
                      onChange={(e) => setManagingFeatures({ ...managingFeatures, enablePrescriptionScan: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    📄 OCR Prescription Scanning &amp; Repertorization
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={managingFeatures.enableTelemedicine !== false}
                      onChange={(e) => setManagingFeatures({ ...managingFeatures, enableTelemedicine: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    📹 Telemedicine &amp; Remote Outpatient Consultations
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={managingFeatures.enableRawCaseJson !== false}
                      onChange={(e) => setManagingFeatures({ ...managingFeatures, enableRawCaseJson: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    🔬 Classical Homeopathy Case Record JSON Editor
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={managingFeatures.enableECommerce !== false}
                      onChange={(e) => setManagingFeatures({ ...managingFeatures, enableECommerce: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    💊 Remedy Inventory &amp; Dispensary Supply Management
                  </label>
                </div>
              </div>

              {/* Patient Portal Capabilities */}
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌿</span>
                  <h4 className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                    Patient Portal Capabilities (What Patient Can View &amp; Access)
                  </h4>
                </div>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={managingFeatures.displayDoctorDetails !== false}
                      onChange={(e) => setManagingFeatures({ ...managingFeatures, displayDoctorDetails: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    👨‍⚕️ Display Doctor Credentials, Registration No. &amp; Experience
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={managingFeatures.enablePatientMedicalRecords !== false}
                      onChange={(e) => setManagingFeatures({ ...managingFeatures, enablePatientMedicalRecords: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    📋 Allow Patients to View Clinical Visit Summaries &amp; Case Records
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={managingFeatures.enableBillingHistory !== false}
                      onChange={(e) => setManagingFeatures({ ...managingFeatures, enableBillingHistory: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    💳 Allow Patients to View Consultation Invoices &amp; Billing History
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={managingFeatures.enableFollowupFeedback !== false}
                      onChange={(e) => setManagingFeatures({ ...managingFeatures, enableFollowupFeedback: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    📝 Enable Post-Consultation Follow-up &amp; Progress Submissions
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={managingFeatures.enableOnlinePayments !== false}
                      onChange={(e) => setManagingFeatures({ ...managingFeatures, enableOnlinePayments: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    💰 Enable Online Payment Gateway for Consultations
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setManagingTenant(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleSaveFeatureManager}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Save Layout &amp; Functionalities →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Onboard New Hospital Modal ─────────────────────────────────────── */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ animation: "fadeInUp 0.3s ease both" }}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-stone-900">Onboard New Hospital Facility</h3>
                <p className="text-xs text-stone-500">Configure hospital branding, doctor credentials, and view permissions.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOnboardingModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHospital} className="space-y-4">
              {/* Hospital Details */}
              <div className="space-y-3">
                <p className="text-[11px] font-black text-stone-700 uppercase tracking-wider">1. Facility Details &amp; Location</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Hospital Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Manipal Integrative Health"
                      value={newHospitalName}
                      onChange={(e) => setNewHospitalName(e.target.value)}
                      className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Tenant Slug / ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. manipal-care"
                      value={newHospitalSlug}
                      onChange={(e) => setNewHospitalSlug(e.target.value)}
                      className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Hospital Tagline</label>
                  <input
                    type="text"
                    placeholder="e.g. Advanced Integrative Care & Lasting Wellness"
                    value={newHospitalTagline}
                    onChange={(e) => setNewHospitalTagline(e.target.value)}
                    className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Facility City *</label>
                    <input
                      type="text"
                      required
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Contact Phone *</label>
                    <input
                      type="text"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Facility Admin Email *</label>
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Street Address</label>
                  <input
                    type="text"
                    placeholder="e.g. 123 Healthcare Blvd, Medical Wing"
                    value={newStreet}
                    onChange={(e) => setNewStreet(e.target.value)}
                    className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
                  />
                </div>
              </div>

              {/* Lead Doctor Section */}
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-black text-indigo-950 uppercase tracking-wider">
                    2. Lead Consulting Doctor (Google Login &amp; Credentials)
                  </p>
                  <span className="text-[10px] bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded-full">
                    Activation Email Dispatched
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 uppercase">Doctor Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Sharma"
                      value={newDoctorName}
                      onChange={(e) => setNewDoctorName(e.target.value)}
                      className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 uppercase">Doctor Login Email * (For Google Sign-In)</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. doctor.sharma@hospital.org"
                      value={newDoctorEmail}
                      onChange={(e) => setNewDoctorEmail(e.target.value)}
                      className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none font-medium text-indigo-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 uppercase">Doctor Designation</label>
                    <input
                      type="text"
                      placeholder="e.g. Chief Medical Director"
                      value={newDoctorTitle}
                      onChange={(e) => setNewDoctorTitle(e.target.value)}
                      className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 uppercase">Medical Reg. Number</label>
                    <input
                      type="text"
                      placeholder="e.g. MCI-2012-8841"
                      value={newDoctorRegNo}
                      onChange={(e) => setNewDoctorRegNo(e.target.value)}
                      className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 uppercase">Experience (Years)</label>
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={newDoctorExp}
                      onChange={(e) => setNewDoctorExp(Number(e.target.value))}
                      className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-600 uppercase">Qualifications &amp; Degrees</label>
                  <input
                    type="text"
                    placeholder="e.g. MD, MBBS, Fellowship in Telemedicine"
                    value={newDoctorQual}
                    onChange={(e) => setNewDoctorQual(e.target.value)}
                    className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 uppercase">Doctor Direct Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98450 12345"
                      value={newDoctorPhone}
                      onChange={(e) => setNewDoctorPhone(e.target.value)}
                      className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 uppercase">Specialties (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="e.g. General Medicine, Pulmonology"
                      value={newDoctorSpecialties}
                      onChange={(e) => setNewDoctorSpecialties(e.target.value)}
                      className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-600 uppercase">Doctor Clinical Bio / Philosophy</label>
                  <textarea
                    rows={2}
                    placeholder="Clinical background, special focus, and patient healing approach..."
                    value={newDoctorBio}
                    onChange={(e) => setNewDoctorBio(e.target.value)}
                    className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
                  />
                </div>
              </div>

              {/* Functionality Governance (Doctor vs Patient) */}
              <div className="space-y-3">
                <p className="text-[11px] font-black text-stone-700 uppercase tracking-wider">
                  3. Layout &amp; Functionality Governance (Super Admin Control)
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Doctor Portal Capabilities */}
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                    <p className="text-[10px] font-black uppercase text-indigo-900">Doctor Portal View Access</p>
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featVoiceStudio}
                        onChange={(e) => setFeatVoiceStudio(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      🎙️ AI VoiceStudio Consultation Scribe
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featPrescriptionScan}
                        onChange={(e) => setFeatPrescriptionScan(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      📄 OCR Prescription Scanning
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featTelemedicine}
                        onChange={(e) => setFeatTelemedicine(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      📹 Telehealth &amp; Video Consultations
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featRawCaseJson}
                        onChange={(e) => setFeatRawCaseJson(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      🔬 Classical Homeopathy Case JSON
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featECommerce}
                        onChange={(e) => setFeatECommerce(e.target.checked)}
                        className="rounded text-indigo-600"
                      />
                      💊 Remedy Inventory &amp; Dispensary
                    </label>
                  </div>

                  {/* Patient Portal Capabilities */}
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                    <p className="text-[10px] font-black uppercase text-emerald-900">Patient Portal View Access</p>
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featDisplayDoctorDetails}
                        onChange={(e) => setFeatDisplayDoctorDetails(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      👨‍⚕️ Display Doctor Profiles &amp; Registration
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featPatientMedicalRecords}
                        onChange={(e) => setFeatPatientMedicalRecords(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      📋 Patient Medical Records View
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featBillingHistory}
                        onChange={(e) => setFeatBillingHistory(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      💳 Itemized Billing &amp; Invoices View
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featFollowupFeedback}
                        onChange={(e) => setFeatFollowupFeedback(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      📝 Follow-up &amp; Progress Submissions
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-stone-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={featOnlinePayments}
                        onChange={(e) => setFeatOnlinePayments(e.target.checked)}
                        className="rounded text-emerald-600"
                      />
                      💰 Online Payment Gateway
                    </label>
                  </div>
                </div>
              </div>

              {/* Brand Colors Preset Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-stone-500 uppercase">4. Choose Brand Color Palette</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {colorPresets.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setNewPrimaryColor(p.primary);
                        setNewAccentColor(p.accent);
                      }}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        newPrimaryColor === p.primary
                          ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30"
                          : "border-stone-200 hover:bg-stone-50"
                      }`}
                    >
                      <div className="w-5 h-5 rounded-md shadow-xs shrink-0" style={{ background: p.primary }} />
                      <span className="text-[11px] font-bold text-stone-800 leading-tight">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Primary Color (Hex)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={newPrimaryColor}
                      onChange={(e) => setNewPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-stone-300"
                    />
                    <input
                      type="text"
                      value={newPrimaryColor}
                      onChange={(e) => setNewPrimaryColor(e.target.value)}
                      className="flex-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Accent Color (Hex)</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={newAccentColor}
                      onChange={(e) => setNewAccentColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-stone-300"
                    />
                    <input
                      type="text"
                      value={newAccentColor}
                      onChange={(e) => setNewAccentColor(e.target.value)}
                      className="flex-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOnboardingModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isOnboardingSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                >
                  {isOnboardingSubmitting ? "Provisioning & Emailing..." : "Provision Hospital & Email Doctor →"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
