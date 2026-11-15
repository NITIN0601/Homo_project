import React, { useState, useMemo } from "react";
import type { HospitalTenantConfig, HospitalDoctor, HospitalFeatures } from "../../types/tenant";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
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
  DEFAULT_FACILITY_CONFIG,
  DEFAULT_DOCTOR_CONFIG,
  DEFAULT_NEW_TENANT_FEATURES,
  type ColorPreset,
} from "../../config/tenants/constants";
import {
  inferTimezoneFromLocation,
  getTimezoneOffsetString,
  getTimezoneAbbreviation,
} from "../../utils/timezone";
import { inferCurrencyFromCountry } from "../../utils/currency";
import {
  FacilityDetailsStep,
  FacilityScheduleStep,
  DoctorCredentialsStep,
  FacilityGovernanceStep,
  FacilityBrandingStep,
  type OnboardFormState,
  type OnboardHospitalModalProps,
} from "./onboard";

export type { OnboardFormState, OnboardHospitalModalProps };

const getInitialFormState = (): OnboardFormState => ({
  hospitalName: "",
  hospitalSlug: "",
  tagline: "",
  phone: DEFAULT_FACILITY_CONFIG.defaultPhone,
  email: DEFAULT_FACILITY_CONFIG.defaultEmail,
  country: "India",
  state: "Karnataka",
  city: "Bengaluru",
  street: DEFAULT_FACILITY_CONFIG.defaultStreet,
  pincode: "560003",
  timezone: "Asia/Kolkata",
  timezoneManualOverride: false,
  primaryColor: DEFAULT_FACILITY_CONFIG.defaultPrimaryColor,
  accentColor: DEFAULT_FACILITY_CONFIG.defaultAccentColor,
  logoUrl: DEFAULT_FACILITY_CONFIG.defaultLogoUrl || "/generic-clinic-logo.svg",
  bannerUrl: DEFAULT_FACILITY_CONFIG.defaultBannerUrl || "/assets/banner.jpg",
  aboutClinicText: "",
  doctorName: "",
  doctorEmail: "",
  doctorPhone: DEFAULT_DOCTOR_CONFIG.defaultPhone,
  doctorTitle: DEFAULT_DOCTOR_CONFIG.defaultTitle,
  doctorQual: DEFAULT_DOCTOR_CONFIG.defaultQualifications,
  doctorRegNo: "",
  doctorExp: DEFAULT_DOCTOR_CONFIG.defaultExperienceYears,
  doctorSpecialties: DEFAULT_DOCTOR_CONFIG.defaultSpecialties,
  doctorBio: "",
  doctorFee: 750,
  morningHours: "10:00 AM – 01:30 PM",
  eveningHours: "05:00 PM – 08:30 PM",
  availableDays: "Monday – Saturday",
  sundayPolicy: "Prior Appointment Only",
  features: { ...DEFAULT_NEW_TENANT_FEATURES },
});

const getFormStateFromTenant = (t: HospitalTenantConfig): OnboardFormState => ({
  hospitalName: t.name || "",
  hospitalSlug: t.id || "",
  tagline: t.tagline || "",
  phone: t.contact?.phone || DEFAULT_FACILITY_CONFIG.defaultPhone,
  email: t.contact?.email || DEFAULT_FACILITY_CONFIG.defaultEmail,
  country: t.contact?.address?.country || "India",
  state: t.contact?.address?.state || "Karnataka",
  city: t.contact?.address?.city || "Bengaluru",
  street: t.contact?.address?.street || DEFAULT_FACILITY_CONFIG.defaultStreet,
  pincode: t.contact?.address?.pincode || "560003",
  timezone: t.hours?.timezone || "Asia/Kolkata",
  timezoneManualOverride: true,
  primaryColor: t.branding?.primaryColor || DEFAULT_FACILITY_CONFIG.defaultPrimaryColor,
  accentColor: t.branding?.accentColor || DEFAULT_FACILITY_CONFIG.defaultAccentColor,
  logoUrl: t.branding?.logoUrl || "/generic-clinic-logo.svg",
  bannerUrl: t.branding?.bannerUrl || "/assets/banner.jpg",
  aboutClinicText: t.branding?.aboutClinicText || "",
  doctorName: t.doctor?.name || "",
  doctorEmail: t.doctor?.email || "",
  doctorPhone: t.doctor?.phone || DEFAULT_DOCTOR_CONFIG.defaultPhone,
  doctorTitle: t.doctor?.title || DEFAULT_DOCTOR_CONFIG.defaultTitle,
  doctorQual: t.doctor?.qualifications || DEFAULT_DOCTOR_CONFIG.defaultQualifications,
  doctorRegNo: t.doctor?.regNo || "",
  doctorExp: t.doctor?.experienceYears || DEFAULT_DOCTOR_CONFIG.defaultExperienceYears,
  doctorSpecialties: Array.isArray(t.doctor?.specialties)
    ? t.doctor.specialties.join(", ")
    : (t.doctor?.specialties || DEFAULT_DOCTOR_CONFIG.defaultSpecialties),
  doctorBio: t.doctor?.aboutText || "",
  doctorFee: t.doctor?.consultationFee || 750,
  morningHours: t.hours?.morningDisplay || "10:00 AM – 01:30 PM",
  eveningHours: t.hours?.eveningDisplay || "05:00 PM – 08:30 PM",
  availableDays: t.hours?.availableDays || "Monday – Saturday",
  sundayPolicy: (t.hours?.sundayPolicy as any) || "Prior Appointment Only",
  features: { ...t.features },
});

export const OnboardHospitalModal: React.FC<OnboardHospitalModalProps> = ({
  isOpen,
  onClose,
  existingSlugs,
  initialTenant,
  onOnboard,
}) => {
  const toast = useToast();
  const isEditing = Boolean(initialTenant);
  const [form, setForm] = useState<OnboardFormState>(() =>
    initialTenant ? getFormStateFromTenant(initialTenant) : getInitialFormState()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form state when modal opens or initialTenant changes
  React.useEffect(() => {
    if (isOpen) {
      if (initialTenant) {
        setForm(getFormStateFromTenant(initialTenant));
      } else {
        setForm(getInitialFormState());
      }
    }
  }, [isOpen, initialTenant]);

  const detectedTz = useMemo(() => {
    return inferTimezoneFromLocation(form.country, form.state, form.city);
  }, [form.country, form.state, form.city]);

  const detectedCurrency = useMemo(() => {
    return inferCurrencyFromCountry(form.country);
  }, [form.country]);

  const activeTimezoneDetails = useMemo(() => {
    const tz = form.timezone || detectedTz.timeZone;
    return {
      timeZone: tz,
      label: getTimezoneAbbreviation(tz),
      offset: getTimezoneOffsetString(tz),
    };
  }, [form.timezone, detectedTz]);

  const cleanSlug = useMemo(() => {
    return sanitizeAlphanumeric(form.hospitalSlug.toLowerCase(), true, 50).replace(/_/g, "-");
  }, [form.hospitalSlug]);

  const slugError = useMemo(() => {
    if (!cleanSlug) return null;
    if (isEditing && initialTenant && cleanSlug === initialTenant.id.toLowerCase()) return null;
    return existingSlugs.includes(cleanSlug) ? "A hospital with this slug already exists" : null;
  }, [cleanSlug, existingSlugs, isEditing, initialTenant]);

  const updateField = <K extends keyof OnboardFormState>(key: K, value: OnboardFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleLocationChange = (field: "country" | "state" | "city", value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (!prev.timezoneManualOverride) {
        const nextCountry = field === "country" ? value : prev.country;
        const nextState = field === "state" ? value : prev.state;
        const nextCity = field === "city" ? value : prev.city;
        const det = inferTimezoneFromLocation(nextCountry, nextState, nextCity);
        next.timezone = det.timeZone;
      }
      return next;
    });
  };

  const handleTimezoneChange = (tz: string) => {
    setForm((prev) => ({
      ...prev,
      timezone: tz,
      timezoneManualOverride: true,
    }));
  };

  const handleResetTimezoneToAuto = () => {
    setForm((prev) => ({
      ...prev,
      timezone: detectedTz.timeZone,
      timezoneManualOverride: false,
    }));
  };

  const handleApplyPreset = (preset: ColorPreset) => {
    setForm((prev) => ({
      ...prev,
      primaryColor: preset.primary,
      accentColor: preset.accent,
    }));
  };

  const handleFeatureToggle = (key: keyof HospitalFeatures, value: boolean) => {
    setForm((prev) => {
      const nextFeatures = { ...prev.features, [key]: value };
      if (key === "enableOnlinePayments") {
        nextFeatures.enableCustomerPayments = value;
      } else if (key === "enableCustomerPayments") {
        nextFeatures.enableOnlinePayments = value;
      }
      return {
        ...prev,
        features: nextFeatures,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanHospitalName = sanitizeText(form.hospitalName, 120);
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
      const effectiveTz = form.timezone || detectedTz.timeZone;
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
        consultationFee: Number(form.doctorFee) || 750,
        availability: {
          timezone: effectiveTz,
          days: form.availableDays,
          morningHours: form.morningHours,
          eveningHours: form.eveningHours,
          consultationFee: Number(form.doctorFee) || 750,
        },
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
        currency: detectedCurrency.code,
        currencySymbol: detectedCurrency.symbol,
        hours: {
          timezone: effectiveTz,
          morningDisplay: form.morningHours,
          eveningDisplay: form.eveningHours,
          availableDays: form.availableDays,
          sundayPolicy: form.sundayPolicy,
          consultationSlotMinutes: 30,
        },
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
            country: sanitizeText(form.country, 60) || "India",
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
          logoUrl: form.logoUrl.trim() || DEFAULT_FACILITY_CONFIG.defaultLogoUrl,
          bannerUrl: form.bannerUrl.trim() || DEFAULT_FACILITY_CONFIG.defaultBannerUrl,
          fontSans: DEFAULT_FACILITY_CONFIG.defaultFontSans,
          aboutDocText: doctorConfig.aboutText,
          aboutClinicText: sanitizeText(form.aboutClinicText, 500) || (sanitizeText(form.tagline, 150)
            ? `${cleanHospitalName} — ${sanitizeText(form.tagline, 150)}`
            : `${cleanHospitalName} provides comprehensive patient consultations and evidence-based clinical care.`),
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
      title={isEditing ? `✏️ Edit Hospital: ${initialTenant?.name}` : "Onboard New Hospital Facility"}
      subtitle={
        isEditing
          ? "Update hospital branding, lead physician credentials, and access permissions."
          : "Configure hospital branding, lead physician credentials, and access permissions."
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6 py-2">
        <FacilityDetailsStep
          form={form}
          updateField={updateField}
          handleLocationChange={handleLocationChange}
          handleTimezoneChange={handleTimezoneChange}
          handleResetTimezoneToAuto={handleResetTimezoneToAuto}
          detectedTz={detectedTz}
          detectedCurrency={detectedCurrency}
          activeTimezoneDetails={activeTimezoneDetails}
          slugError={slugError}
          isEditing={isEditing}
        />

        <FacilityScheduleStep
          form={form}
          updateField={updateField}
          activeTimezoneDetails={activeTimezoneDetails}
        />

        <DoctorCredentialsStep
          form={form}
          updateField={updateField}
          activeTimezoneDetails={activeTimezoneDetails}
          detectedCurrency={detectedCurrency}
        />

        <FacilityGovernanceStep
          form={form}
          handleFeatureToggle={handleFeatureToggle}
        />

        <FacilityBrandingStep
          form={form}
          updateField={updateField}
          handleApplyPreset={handleApplyPreset}
        />

        {/* Actions */}
        <div className="pt-4 border-t border-stone-100 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isSubmitting || !!slugError}
            className="bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
          >
            {isSubmitting
              ? isEditing
                ? "Saving Changes..."
                : "Provisioning & Emailing..."
              : isEditing
              ? "💾 Save Changes"
              : "Provision Hospital & Email Doctor →"}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
