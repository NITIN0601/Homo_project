import React from "react";
import type { HospitalTenantConfig } from "@core/types/tenant";
import { Button, Card, Input, Textarea } from "../../../shared/ui";
import { HospitalIdentityFields, type HospitalIdentityValues } from "./forms/HospitalIdentityFields";

interface HospitalProfileSectionProps {
  formData: HospitalTenantConfig;
  setFormData: React.Dispatch<React.SetStateAction<HospitalTenantConfig>>;
  onSaveHospitalInfo: () => void;
}

export const HospitalProfileSection: React.FC<HospitalProfileSectionProps> = ({
  formData,
  setFormData,
  onSaveHospitalInfo,
}) => {
  const identityValues: HospitalIdentityValues = {
    name: formData.name,
    shortName: formData.shortName,
    tagline: formData.tagline,
    phone: formData.contact.phoneDisplay || formData.contact.phone,
    emergencyPhone: formData.contact.emergencyPhone,
    email: formData.contact.email,
    street: formData.contact.address.street,
    city: formData.contact.address.city,
    state: formData.contact.address.state,
    country: formData.contact.address.country,
    pincode: formData.contact.address.pincode,
  };

  const handleIdentityChange = (field: keyof HospitalIdentityValues, val: string) => {
    setFormData((prev: HospitalTenantConfig) => {
      if (field === "name" || field === "shortName" || field === "tagline") {
        return { ...prev, [field]: val };
      }
      if (field === "phone") {
        return {
          ...prev,
          contact: { ...prev.contact, phone: val, phoneDisplay: val },
        };
      }
      if (field === "emergencyPhone" || field === "email") {
        return {
          ...prev,
          contact: { ...prev.contact, [field]: val },
        };
      }
      return {
        ...prev,
        contact: {
          ...prev.contact,
          address: { ...prev.contact.address, [field]: val },
        },
      };
    });
  };

  return (
    <Card variant="default" className="space-y-4">
      <div className="border-b border-stone-100 pb-3">
        <h3 className="text-stone-900 font-extrabold text-base flex items-center gap-2">
          <span>🏥</span> Facility Information &amp; Classification
        </h3>
        <p className="text-stone-500 text-xs mt-0.5">
          General display information, brand titles, and contact lines with synchronized persistent storage.
        </p>
      </div>

      {/* Facility Classification Toggle */}
      <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
        <label className="text-xs font-bold text-stone-700 block">
          Facility Classification &amp; Terminology
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFormData((p: HospitalTenantConfig) => ({ ...p, facilityType: "hospital" }))}
            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
              (formData.facilityType || "hospital") === "hospital"
                ? "bg-indigo-50/80 border-indigo-500 ring-2 ring-indigo-500/20 text-indigo-950 font-bold"
                : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
            }`}
          >
            <span className="text-lg">🏥</span>
            <div>
              <span className="text-xs">Hospital</span>
              <p className="text-[10px] text-stone-500 font-normal">Identifies as Hospital</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setFormData((p: HospitalTenantConfig) => ({ ...p, facilityType: "clinic" }))}
            className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
              formData.facilityType === "clinic"
                ? "bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold"
                : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
            }`}
          >
            <span className="text-lg">🌿</span>
            <div>
              <span className="text-xs">Clinic</span>
              <p className="text-[10px] text-stone-500 font-normal">Identifies as Clinic</p>
            </div>
          </button>
        </div>
      </div>

      <HospitalIdentityFields
        values={identityValues}
        onChange={handleIdentityChange}
      />

      {/* Google Maps & Business Review Link */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        <Input
          label="Direct Google Maps Review URL (Write Review Intent)"
          value={formData.contact.googleReviewUrl || ""}
          onChange={(e) =>
            setFormData((p: HospitalTenantConfig) => ({
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
            setFormData((p: HospitalTenantConfig) => ({
              ...p,
              contact: { ...p.contact, googlePlaceId: e.target.value },
            }))
          }
          placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
        />
      </div>

      <Textarea
        label="About Facility Overview (Patient Hero &amp; Bio)"
        value={formData.branding.aboutHospitalText || ""}
        onChange={(e) =>
          setFormData((p: HospitalTenantConfig) => ({
            ...p,
            branding: {
              ...p.branding,
              aboutHospitalText: e.target.value,
            },
          }))
        }
        rows={2}
        placeholder="Describe the clinical heritage, methodology, and care principles of this facility..."
      />

      {/* Dynamic Legal & Policy Texts */}
      <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200/80 space-y-3">
        <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wide flex items-center gap-1.5">
          <span>⚖️</span> Facility Legal Policies &amp; Consent Texts
        </h4>
        <Textarea
          label="Medical Emergency Notice"
          value={formData.legal?.emergencyNotice || ""}
          onChange={(e) =>
            setFormData((p: HospitalTenantConfig) => ({
              ...p,
              legal: {
                ...p.legal,
                emergencyNotice: e.target.value,
              },
            }))
          }
          rows={2}
          placeholder="Emergency services disclaimer shown on Terms and booking..."
        />
        <Textarea
          label="Terms &amp; Conditions Agreement"
          value={formData.legal?.termsConditionsText || ""}
          onChange={(e) =>
            setFormData((p: HospitalTenantConfig) => ({
              ...p,
              legal: {
                ...p.legal,
                termsConditionsText: e.target.value,
              },
            }))
          }
          rows={4}
          placeholder="Official Terms of Service for consultations and appointment bookings..."
        />
        <Textarea
          label="Privacy Policy (DPDP &amp; HIPAA)"
          value={formData.legal?.privacyPolicyText || ""}
          onChange={(e) =>
            setFormData((p: HospitalTenantConfig) => ({
              ...p,
              legal: {
                ...p.legal,
                privacyPolicyText: e.target.value,
              },
            }))
          }
          rows={4}
          placeholder="Patient Protected Health Information (PHI) privacy and data retention policy..."
        />
      </div>

      {/* Group Dedicated Action Bar: Save & Apply Hospital Info */}
      <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50 p-3.5 rounded-2xl">
        <p className="text-[11px] text-stone-500">
          Save facility display name, phone, email, Google review links, classification, and legal policies.
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onSaveHospitalInfo}
        >
          <span>💾</span> Save &amp; Apply Hospital Information
        </Button>
      </div>
    </Card>
  );
};

export default HospitalProfileSection;
