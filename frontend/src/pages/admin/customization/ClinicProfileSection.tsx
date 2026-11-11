import React from "react";
import type { HospitalTenantConfig } from "../../../types/tenant";
import { Button, Card, Input, Textarea } from "../../../components/ui";

interface ClinicProfileSectionProps {
  formData: HospitalTenantConfig;
  setFormData: React.Dispatch<React.SetStateAction<HospitalTenantConfig>>;
  onSaveHospitalInfo: () => void;
}

export const ClinicProfileSection: React.FC<ClinicProfileSectionProps> = ({
  formData,
  setFormData,
  onSaveHospitalInfo,
}) => {
  return (
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
          placeholder="e.g. Metro Health Clinic"
          required
        />
        <Input
          label="Short Display Name"
          value={formData.shortName}
          onChange={(e) => setFormData((p) => ({ ...p, shortName: e.target.value }))}
          placeholder="e.g. Metro Clinic"
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
          onClick={onSaveHospitalInfo}
        >
          <span>💾</span> Save &amp; Apply Clinic Information
        </Button>
      </div>
    </Card>
  );
};

export default ClinicProfileSection;

