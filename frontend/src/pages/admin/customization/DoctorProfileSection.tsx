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
        <div className="sm:col-span-1">
          <Input
            label="Direct Clinical Phone / Contact"
            value={formData.doctor.phone || ""}
            onChange={(e) =>
              setFormData((p) => ({
                ...p,
                doctor: { ...p.doctor, phone: e.target.value },
              }))
            }
            placeholder="+91 98765 43210"
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Specialties & Focus Areas (comma-separated)"
            value={formData.doctor.specialties?.join(", ") || ""}
            onChange={(e) => {
              const list = e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              setFormData((p) => ({
                ...p,
                doctor: { ...p.doctor, specialties: list },
              }));
            }}
            placeholder="e.g. Chronic Skin Disorders, Pediatric Allergies, Autoimmune"
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

      {/* Patient Portal Visibility & Sharing Preferences */}
      <div className="border border-stone-200/80 rounded-2xl p-4 bg-stone-50/60 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <span>👁️</span> Patient Portal Sharing &amp; Visibility Controls
            </h4>
            <p className="text-[11px] text-stone-500 mt-0.5">
              Choose what details are displayed to entitled patients on their patient portal &amp; booking screens.
            </p>
          </div>
          {(formData.features.allowDoctorCustomBio === false ||
            formData.features.allowDoctorSpecialties === false ||
            formData.features.allowDoctorDirectContact === false) && (
            <Badge variant="warning" size="sm">
              Super Admin Override Active
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-stone-200/70 cursor-pointer hover:bg-stone-50 transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              checked={formData.doctor.sharingPreferences?.shareBio ?? true}
              disabled={formData.features.allowDoctorCustomBio === false}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  doctor: {
                    ...p.doctor,
                    sharingPreferences: {
                      ...p.doctor.sharingPreferences,
                      shareBio: e.target.checked,
                    },
                  },
                }))
              }
            />
            <div className="text-xs">
              <span className="font-bold text-stone-800 block">Share Clinical Bio &amp; Philosophy</span>
              <span className="text-[11px] text-stone-500">
                {formData.features.allowDoctorCustomBio === false
                  ? "Disabled by Super Admin facility policy"
                  : "Allow patients to read your detailed clinical biography"}
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-stone-200/70 cursor-pointer hover:bg-stone-50 transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              checked={formData.doctor.sharingPreferences?.shareSpecialties ?? true}
              disabled={formData.features.allowDoctorSpecialties === false}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  doctor: {
                    ...p.doctor,
                    sharingPreferences: {
                      ...p.doctor.sharingPreferences,
                      shareSpecialties: e.target.checked,
                    },
                  },
                }))
              }
            />
            <div className="text-xs">
              <span className="font-bold text-stone-800 block">Share Specialties &amp; Clinical Focus</span>
              <span className="text-[11px] text-stone-500">
                {formData.features.allowDoctorSpecialties === false
                  ? "Disabled by Super Admin facility policy"
                  : "Highlight your key therapeutic focus areas to patients"}
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-stone-200/70 cursor-pointer hover:bg-stone-50 transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              checked={formData.doctor.sharingPreferences?.shareQualifications ?? true}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  doctor: {
                    ...p.doctor,
                    sharingPreferences: {
                      ...p.doctor.sharingPreferences,
                      shareQualifications: e.target.checked,
                    },
                  },
                }))
              }
            />
            <div className="text-xs">
              <span className="font-bold text-stone-800 block">Share Qualifications &amp; Reg. Number</span>
              <span className="text-[11px] text-stone-500">
                Display medical degree suffixes and medical council registration ID
              </span>
            </div>
          </label>

          <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-stone-200/70 cursor-pointer hover:bg-stone-50 transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
              checked={formData.doctor.sharingPreferences?.shareDirectPhone ?? false}
              disabled={formData.features.allowDoctorDirectContact === false}
              onChange={(e) =>
                setFormData((p) => ({
                  ...p,
                  doctor: {
                    ...p.doctor,
                    sharingPreferences: {
                      ...p.doctor.sharingPreferences,
                      shareDirectPhone: e.target.checked,
                    },
                  },
                }))
              }
            />
            <div className="text-xs">
              <span className="font-bold text-stone-800 block">Share Direct Phone / WhatsApp</span>
              <span className="text-[11px] text-stone-500">
                {formData.features.allowDoctorDirectContact === false
                  ? "Disabled by Super Admin (Hospital central phone used instead)"
                  : "Allow assigned patients to contact you directly"}
              </span>
            </div>
          </label>
        </div>
      </div>

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

