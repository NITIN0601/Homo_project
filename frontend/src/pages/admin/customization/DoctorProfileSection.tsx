import React from "react";
import type { HospitalTenantConfig } from "../../../types/tenant";
import { Button, Card, Badge, Input, Textarea } from "../../../components/ui";

interface DoctorProfileSectionProps {
  formData: HospitalTenantConfig;
  setFormData: React.Dispatch<React.SetStateAction<HospitalTenantConfig>>;
  onSaveDoctorProfile: () => void;
}

export const DoctorProfileSection: React.FC<DoctorProfileSectionProps> = ({
  formData,
  setFormData,
  onSaveDoctorProfile,
}) => {
  return (
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
          onClick={onSaveDoctorProfile}
        >
          <span>💾</span> Save &amp; Apply Doctor Profile
        </Button>
      </div>
    </Card>
  );
};

export default DoctorProfileSection;

