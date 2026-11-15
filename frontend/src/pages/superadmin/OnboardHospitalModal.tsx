import React, { useState } from "react";
import type { HospitalTenantConfig, HospitalDoctor, HospitalFeatures } from "../../types/tenant";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { FeatureToggleGroup } from "../../components/common/FeatureToggleGroup";
import { useToast } from "../../context/ToastContext";
import {
  sanitizeText,
  sanitizeAlphanumeric,
  sanitizeEmail,
  sanitizePhone,
  sanitizePincode,
  sanitizeArrayOfStrings,
} from "../../utils/sanitize";
import {
  DEFAULT_COLOR_PRESETS,
  DEFAULT_FACILITY_CONFIG,
  DEFAULT_DOCTOR_CONFIG,
  DEFAULT_NEW_TENANT_FEATURES,
  type ColorPreset,
} from "../../config/tenants/constants";

export interface OnboardHospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingSlugs: string[];
  onOnboard: (
    tenant: HospitalTenantConfig,
    doctor: HospitalDoctor,
    features: HospitalFeatures
  ) => Promise<{ inviteUrl: string; emailDelivery?: any } | void>;
}

export interface OnboardFormState {
  hospitalName: string;
  hospitalSlug: string;
  tagline: string;
  phone: string;
  email: string;
  city: string;
  street: string;
  state: string;
  pincode: string;
  primaryColor: string;
  accentColor: string;
  doctorName: string;
  doctorEmail: string;
  doctorPhone: string;
  doctorTitle: string;
  doctorQual: string;
  doctorRegNo: string;
  doctorExp: number;
  doctorSpecialties: string;
  doctorBio: string;
  features: HospitalFeatures;
}

const getInitialFormState = (): OnboardFormState => ({
  hospitalName: "",
  hospitalSlug: "",
  tagline: "",
  phone: DEFAULT_FACILITY_CONFIG.defaultPhone,
  email: DEFAULT_FACILITY_CONFIG.defaultEmail,
  city: DEFAULT_FACILITY_CONFIG.defaultCity,
  street: DEFAULT_FACILITY_CONFIG.defaultStreet,
  state: DEFAULT_FACILITY_CONFIG.defaultState,
  pincode: DEFAULT_FACILITY_CONFIG.defaultPincode,
  primaryColor: DEFAULT_FACILITY_CONFIG.defaultPrimaryColor,
  accentColor: DEFAULT_FACILITY_CONFIG.defaultAccentColor,
  doctorName: "",
  doctorEmail: "",
  doctorPhone: DEFAULT_DOCTOR_CONFIG.defaultPhone,
  doctorTitle: DEFAULT_DOCTOR_CONFIG.defaultTitle,
  doctorQual: DEFAULT_DOCTOR_CONFIG.defaultQualifications,
  doctorRegNo: "",
  doctorExp: DEFAULT_DOCTOR_CONFIG.defaultExperienceYears,
  doctorSpecialties: DEFAULT_DOCTOR_CONFIG.defaultSpecialties,
  doctorBio: "",
  features: { ...DEFAULT_NEW_TENANT_FEATURES },
});

export const OnboardHospitalModal: React.FC<OnboardHospitalModalProps> = ({
  isOpen,
  onClose,
  existingSlugs,
  onOnboard,
}) => {
  const toast = useToast();
  const [form, setForm] = useState<OnboardFormState>(getInitialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = <K extends keyof OnboardFormState>(key: K, value: OnboardFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleApplyPreset = (preset: ColorPreset) => {
    setForm((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      accentColor: preset.accent,
    }));
  };

  const handleFeatureToggle = (key: keyof HospitalFeatures, value: boolean) => {
    setForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanHospitalName = sanitizeText(form.hospitalName, 120);
    const cleanSlug = sanitizeAlphanumeric(form.hospitalSlug.toLowerCase(), true, 50).replace(/_/g, "-");
    const cleanDocName = sanitizeText(form.doctorName, 120);
    const cleanDocEmail = sanitizeEmail(form.doctorEmail);

    if (!cleanHospitalName || !cleanSlug || !cleanDocName || !cleanDocEmail) {
      toast.error("Please fill in Hospital Name, Slug, Lead Doctor Name, and Doctor Email.");
      return;
    }

    if (existingSlugs.includes(cleanSlug)) {
      toast.error("A hospital with this slug already exists.");
      return;
    }

    setIsSubmitting(true);
    try {
      const doctorConfig: HospitalDoctor = {
        id: `doc-${cleanSlug}-01`,
        name: cleanDocName,
        title: sanitizeText(form.doctorTitle, 80) || DEFAULT_DOCTOR_CONFIG.defaultTitle,
        qualifications: sanitizeText(form.doctorQual, 80) || DEFAULT_DOCTOR_CONFIG.defaultQualifications,
        experienceYears: Math.min(Math.max(Number(form.doctorExp) || DEFAULT_DOCTOR_CONFIG.defaultExperienceYears, 0), 70),
        regNo: sanitizeAlphanumeric(form.doctorRegNo, true, 50) || `MED-${cleanSlug.toUpperCase()}-001`,
        aboutText: sanitizeText(form.doctorBio, 500) || `Primary clinical lead and consultant for ${cleanHospitalName}.`,
        specialties: sanitizeArrayOfStrings(form.doctorSpecialties, 20, 50),
        phone: sanitizePhone(form.doctorPhone),
        email: cleanDocEmail,
      };

      const newTenant: HospitalTenantConfig = {
        id: cleanSlug,
        slug: cleanSlug,
        domain: `${cleanSlug}.ehr.local`,
        subdomains: [cleanSlug],
        name: cleanHospitalName,
        shortName: cleanHospitalName.split(" ")[0] || "Clinic",
        tagline: sanitizeText(form.tagline, 150) || "Compassionate Healthcare with Clinical Precision",
        doctor: doctorConfig,
        doctors: [doctorConfig],
        specialties: doctorConfig.specialties,
        contact: {
          phone: sanitizePhone(form.phone),
          phoneDisplay: sanitizePhone(form.phone),
          email: sanitizeEmail(form.email),
          emergencyPhone: sanitizePhone(form.phone),
          address: {
            street: sanitizeText(form.street, 150) || DEFAULT_FACILITY_CONFIG.defaultStreet,
            city: sanitizeText(form.city, 60),
            state: sanitizeText(form.state, 60) || DEFAULT_FACILITY_CONFIG.defaultState,
            pincode: sanitizePincode(form.pincode) || DEFAULT_FACILITY_CONFIG.defaultPincode,
            country: DEFAULT_FACILITY_CONFIG.defaultCountry,
          },
          mapsUrl: `https://maps.google.com/?q=${encodeURIComponent(`${cleanHospitalName} ${form.city}`)}`,
          googleReviewUrl: "",
        },
        branding: {
          primaryColor: form.primaryColor,
          primaryDarkColor: DEFAULT_FACILITY_CONFIG.defaultDarkColor,
          accentColor: form.accentColor,
          neutralBg: "#fafaf9",
          cardRadius: DEFAULT_FACILITY_CONFIG.defaultCardRadius,
          buttonRadius: DEFAULT_FACILITY_CONFIG.defaultButtonRadius,
          logoUrl: DEFAULT_FACILITY_CONFIG.defaultLogoUrl,
          fontSans: DEFAULT_FACILITY_CONFIG.defaultFontSans,
          aboutDocText: doctorConfig.aboutText,
          aboutClinicText: sanitizeText(form.tagline, 150)
            ? `${cleanHospitalName} — ${sanitizeText(form.tagline, 150)}`
            : `${cleanHospitalName} provides comprehensive patient consultations and evidence-based clinical care.`,
        },
        features: form.features,
      };

      await onOnboard(newTenant, doctorConfig, form.features);
      setForm(getInitialFormState());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Onboard New Hospital Facility"
      subtitle="Configure hospital branding, lead physician credentials, and access permissions."
    >
      <form onSubmit={handleSubmit} className="space-y-6 py-2">
        {/* 1. Facility Details */}
        <div className="space-y-3">
          <p className="text-[11px] font-black text-stone-700 uppercase tracking-wider">
            1. Facility Details &amp; Location
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase">Hospital Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Manipal Integrative Health"
                value={form.hospitalName}
                onChange={(e) => updateField("hospitalName", e.target.value)}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase">Tenant Slug / ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. manipal-care"
                value={form.hospitalSlug}
                onChange={(e) => updateField("hospitalSlug", e.target.value)}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">Hospital Tagline</label>
            <input
              type="text"
              placeholder="e.g. Advanced Integrative Care & Lasting Wellness"
              value={form.tagline}
              onChange={(e) => updateField("tagline", e.target.value)}
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase">Facility City *</label>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase">Contact Phone *</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase">Facility Admin Email *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">Street Address</label>
            <input
              type="text"
              placeholder="e.g. 123 Healthcare Blvd, Medical Wing"
              value={form.street}
              onChange={(e) => updateField("street", e.target.value)}
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-stone-50 focus:bg-white outline-none"
            />
          </div>
        </div>

        {/* 2. Lead Doctor Section */}
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
                value={form.doctorName}
                onChange={(e) => updateField("doctorName", e.target.value)}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-600 uppercase">
                Doctor Login Email * (For Google Sign-In)
              </label>
              <input
                type="email"
                required
                placeholder="e.g. doctor.sharma@hospital.org"
                value={form.doctorEmail}
                onChange={(e) => updateField("doctorEmail", e.target.value)}
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
                value={form.doctorTitle}
                onChange={(e) => updateField("doctorTitle", e.target.value)}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-600 uppercase">Medical Reg. Number</label>
              <input
                type="text"
                placeholder="e.g. MCI-2012-8841"
                value={form.doctorRegNo}
                onChange={(e) => updateField("doctorRegNo", e.target.value)}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-600 uppercase">Experience (Years)</label>
              <input
                type="number"
                min={1}
                max={60}
                value={form.doctorExp}
                onChange={(e) => updateField("doctorExp", Number(e.target.value))}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-600 uppercase">Qualifications &amp; Degrees</label>
            <input
              type="text"
              placeholder="e.g. MD, MBBS, Fellowship in Telemedicine"
              value={form.doctorQual}
              onChange={(e) => updateField("doctorQual", e.target.value)}
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-stone-600 uppercase">Doctor Direct Phone</label>
              <input
                type="text"
                placeholder="+91 98450 12345"
                value={form.doctorPhone}
                onChange={(e) => updateField("doctorPhone", e.target.value)}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-600 uppercase">Specialties (comma-separated)</label>
              <input
                type="text"
                placeholder="e.g. General Medicine, Pulmonology"
                value={form.doctorSpecialties}
                onChange={(e) => updateField("doctorSpecialties", e.target.value)}
                className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-600 uppercase">Doctor Clinical Bio / Philosophy</label>
            <textarea
              rows={2}
              placeholder="Clinical background, special focus, and patient healing approach..."
              value={form.doctorBio}
              onChange={(e) => updateField("doctorBio", e.target.value)}
              className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
            />
          </div>
        </div>

        {/* 3. Functionality Governance */}
        <div className="space-y-3">
          <p className="text-[11px] font-black text-stone-700 uppercase tracking-wider">
            3. Layout &amp; Functionality Governance (Super Admin Control)
          </p>
          <FeatureToggleGroup features={form.features} onChange={handleFeatureToggle} category="all" />
        </div>

        {/* 4. Brand Color Palette */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-stone-500 uppercase">4. Choose Brand Color Palette</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {DEFAULT_COLOR_PRESETS.map((p) => {
              const isSelected = form.primaryColor === p.primary;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/30"
                      : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <div className="w-5 h-5 rounded-md shadow-xs shrink-0" style={{ background: p.primary }} />
                  <span className="text-[11px] font-bold text-stone-800 leading-tight">{p.label}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase">Primary Color (Hex)</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) => updateField("primaryColor", e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-stone-300"
                />
                <input
                  type="text"
                  value={form.primaryColor}
                  onChange={(e) => updateField("primaryColor", e.target.value)}
                  className="flex-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-stone-500 uppercase">Accent Color (Hex)</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={form.accentColor}
                  onChange={(e) => updateField("accentColor", e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-stone-300"
                />
                <input
                  type="text"
                  value={form.accentColor}
                  onChange={(e) => updateField("accentColor", e.target.value)}
                  className="flex-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
          >
            {isSubmitting ? "Provisioning & Emailing..." : "Provision Hospital & Email Doctor →"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

