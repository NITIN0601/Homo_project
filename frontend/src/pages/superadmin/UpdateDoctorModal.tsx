import React, { useState, useEffect, useMemo } from "react";
import type { HospitalTenantConfig, HospitalDoctor } from "../../types/tenant";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { DoctorProfileFields, type DoctorProfileValues } from "../../components/forms";

export interface UpdateDoctorModalProps {
  isOpen: boolean;
  onClose: () => void;
  hospital: HospitalTenantConfig | null;
  onSaveDoctor: (
    hospitalId: string,
    doctorId: string,
    updatedDoctor: HospitalDoctor
  ) => Promise<void> | void;
}

interface UpdateDoctorBodyProps {
  hospital: HospitalTenantConfig;
  onClose: () => void;
  onSaveDoctor: (
    hospitalId: string,
    doctorId: string,
    updatedDoctor: HospitalDoctor
  ) => Promise<void> | void;
}

const UpdateDoctorBody: React.FC<UpdateDoctorBodyProps> = ({
  hospital,
  onClose,
  onSaveDoctor,
}) => {
  const doctorRoster: HospitalDoctor[] = useMemo(() => {
    if (hospital.doctors && hospital.doctors.length > 0) {
      return hospital.doctors;
    }
    return [hospital.doctor];
  }, [hospital]);

  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const activeDoc = doctorRoster[selectedDocIndex] || hospital.doctor;

  const [formData, setFormData] = useState<HospitalDoctor>(() => ({
    ...activeDoc,
    specialties: activeDoc.specialties || [],
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const doc = doctorRoster[selectedDocIndex] || hospital.doctor;
    setFormData({
      ...doc,
      specialties: doc.specialties || [],
    });
    setError(null);
  }, [selectedDocIndex, doctorRoster, hospital.doctor]);

  const doctorValues: DoctorProfileValues = {
    name: formData.name,
    title: formData.title,
    qualifications: formData.qualifications || "",
    experienceYears: formData.experienceYears || 0,
    regNo: formData.regNo || "",
    consultationFee: formData.consultationFee || 750,
    email: formData.email || hospital.contact.email,
    phone: formData.phone || hospital.contact.phone,
    specialties: formData.specialties || [],
    aboutText: formData.aboutText || "",
    sharingPreferences: {
      sharePhoneWithPatients: formData.sharingPreferences?.shareDirectPhone ?? false,
      shareEmailWithPatients: formData.sharingPreferences?.shareDirectEmail ?? true,
    },
  };

  const handleDoctorChange = <K extends keyof DoctorProfileValues>(
    field: K,
    val: DoctorProfileValues[K]
  ) => {
    setFormData((prev) => {
      if (field === "sharingPreferences") {
        const sp = val as DoctorProfileValues["sharingPreferences"];
        return {
          ...prev,
          sharingPreferences: {
            ...prev.sharingPreferences,
            shareDirectPhone: sp?.sharePhoneWithPatients ?? false,
            shareDirectEmail: sp?.shareEmailWithPatients ?? true,
          },
        };
      }
      return {
        ...prev,
        [field]: val,
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Doctor full name is required.");
      return;
    }
    if (!formData.title.trim()) {
      setError("Medical title or designation is required.");
      return;
    }

    const updated: HospitalDoctor = {
      ...formData,
      experienceYears: Number(formData.experienceYears) || 0,
      consultationFee: Number(formData.consultationFee) || 0,
    };

    setIsSaving(true);
    setError(null);
    try {
      const docId = updated.id || updated.email || `doc_${hospital.id}`;
      await onSaveDoctor(hospital.id, docId, updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to update doctor profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Doctor Selector if multiple */}
      {doctorRoster.length > 1 && (
        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200">
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Select Physician to Edit ({doctorRoster.length} doctors at {hospital.name}):
          </label>
          <div className="flex flex-wrap gap-2">
            {doctorRoster.map((doc, idx) => (
              <button
                key={doc.id || doc.email || idx}
                type="button"
                onClick={() => setSelectedDocIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedDocIndex === idx
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                }`}
              >
                🩺 {doc.name || `Doctor #${idx + 1}`}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-semibold">
          ⚠️ {error}
        </div>
      )}

      <DoctorProfileFields
        values={doctorValues}
        onChange={handleDoctorChange}
        disabled={isSaving}
      />

      {/* Modal Actions */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-500 text-white"
        >
          {isSaving ? "Saving..." : "Save Doctor Credentials"}
        </Button>
      </div>
    </form>
  );
};

export const UpdateDoctorModal: React.FC<UpdateDoctorModalProps> = ({
  isOpen,
  onClose,
  hospital,
  onSaveDoctor,
}) => {
  if (!hospital) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={
        <div className="flex items-center gap-2">
          <span className="text-xl">🩺</span>
          <span>Update Physician Credentials</span>
        </div>
      }
      subtitle={`Manage doctor credentials, qualifications, fees, and bio for ${hospital.name}`}
    >
      <UpdateDoctorBody
        hospital={hospital}
        onClose={onClose}
        onSaveDoctor={onSaveDoctor}
      />
    </Modal>
  );
};

export default UpdateDoctorModal;
