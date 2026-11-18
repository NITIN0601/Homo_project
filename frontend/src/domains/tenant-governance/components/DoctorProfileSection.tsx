import React from "react";
import type { HospitalTenantConfig, HospitalDoctor } from "@core/types/tenant";
import { Button, Card, Badge } from "../../../shared/ui";
import { DoctorProfileFields, type DoctorProfileValues } from "./forms/DoctorProfileFields";

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
  const doctorValues: DoctorProfileValues = {
    name: formData.doctor.name,
    title: formData.doctor.title,
    qualifications: formData.doctor.qualifications,
    experienceYears: formData.doctor.experienceYears,
    regNo: formData.doctor.regNo,
    consultationFee: formData.doctor.consultationFee,
    email: formData.doctor.email || formData.contact.email,
    phone: formData.doctor.phone || formData.contact.phone,
    specialties: formData.doctor.specialties || [],
    aboutText: formData.doctor.aboutText || formData.branding.aboutDocText || "",
    sharingPreferences: {
      sharePhoneWithPatients: formData.doctor.sharingPreferences?.shareDirectPhone ?? false,
      shareEmailWithPatients: formData.doctor.sharingPreferences?.shareDirectEmail ?? true,
    },
  };

  const handleDoctorChange = <K extends keyof DoctorProfileValues>(
    field: K,
    val: DoctorProfileValues[K]
  ) => {
    setFormData((prev: HospitalTenantConfig) => {
      let updatedDoctor: HospitalDoctor = { ...prev.doctor };

      if (field === "sharingPreferences") {
        const sp = val as DoctorProfileValues["sharingPreferences"];
        updatedDoctor = {
          ...updatedDoctor,
          sharingPreferences: {
            ...updatedDoctor.sharingPreferences,
            shareDirectPhone: sp?.sharePhoneWithPatients ?? false,
            shareDirectEmail: sp?.shareEmailWithPatients ?? true,
          },
        };
      } else if (field === "aboutText") {
        updatedDoctor = { ...updatedDoctor, aboutText: val as string };
      } else {
        updatedDoctor = { ...updatedDoctor, [field]: val };
      }

      const updatedDoctors = prev.doctors && prev.doctors.length > 0
        ? prev.doctors.map((d: HospitalDoctor) => (d.id === updatedDoctor.id || d.email === updatedDoctor.email ? updatedDoctor : d))
        : [updatedDoctor];

      return {
        ...prev,
        doctor: updatedDoctor,
        doctors: updatedDoctors,
        branding: {
          ...prev.branding,
          aboutDocText: updatedDoctor.aboutText || prev.branding.aboutDocText,
        },
      };
    });
  };

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

      <DoctorProfileFields
        values={doctorValues}
        onChange={handleDoctorChange}
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
