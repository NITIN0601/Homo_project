import React, { useState, useEffect } from "react";
import type { HospitalTenantConfig, HospitalDoctor } from "../../types/tenant";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";

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
  // Roster of available doctors (lead doctor + any additional hospital doctors)
  const doctorRoster: HospitalDoctor[] = React.useMemo(() => {
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
    sharingPreferences: {
      shareBio: activeDoc.sharingPreferences?.shareBio ?? true,
      shareSpecialties: activeDoc.sharingPreferences?.shareSpecialties ?? true,
      shareQualifications: activeDoc.sharingPreferences?.shareQualifications ?? true,
      shareDirectPhone: activeDoc.sharingPreferences?.shareDirectPhone ?? false,
    },
  }));

  const [specialtiesInput, setSpecialtiesInput] = useState(
    () => (activeDoc.specialties || []).join(", ")
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync formData when selected doctor changes
  useEffect(() => {
    const doc = doctorRoster[selectedDocIndex] || hospital.doctor;
    setFormData({
      ...doc,
      specialties: doc.specialties || [],
      sharingPreferences: {
        shareBio: doc.sharingPreferences?.shareBio ?? true,
        shareSpecialties: doc.sharingPreferences?.shareSpecialties ?? true,
        shareQualifications: doc.sharingPreferences?.shareQualifications ?? true,
        shareDirectPhone: doc.sharingPreferences?.shareDirectPhone ?? false,
      },
    });
    setSpecialtiesInput((doc.specialties || []).join(", "));
    setError(null);
  }, [selectedDocIndex, doctorRoster, hospital.doctor]);

  const handleTextChange = (
    field: keyof HospitalDoctor,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSharingToggle = (
    field: keyof NonNullable<HospitalDoctor["sharingPreferences"]>
  ) => {
    setFormData((prev) => ({
      ...prev,
      sharingPreferences: {
        ...prev.sharingPreferences,
        [field]: !prev.sharingPreferences?.[field],
      },
    }));
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

    const cleanSpecialties = specialtiesInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: HospitalDoctor = {
      ...formData,
      specialties: cleanSpecialties,
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

      {/* Primary Credentials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Doctor Full Name *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => handleTextChange("name", e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Dr. Priya Sharma"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Medical Title / Designation *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => handleTextChange("title", e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. Senior Homeopath & Medical Officer"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Medical Council Registration No.
          </label>
          <input
            type="text"
            value={formData.regNo || ""}
            onChange={(e) => handleTextChange("regNo", e.target.value)}
            className="w-full text-xs font-mono px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. HOM-DL-2015-8849"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Qualifications &amp; Degrees
          </label>
          <input
            type="text"
            value={formData.qualifications || ""}
            onChange={(e) => handleTextChange("qualifications", e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. BHMS, MD (Hom), SCPH"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Years of Clinical Experience
          </label>
          <input
            type="number"
            min={0}
            max={70}
            value={formData.experienceYears}
            onChange={(e) => handleTextChange("experienceYears", Number(e.target.value))}
            className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Consultation Fee (₹ INR)
          </label>
          <input
            type="number"
            min={0}
            step={50}
            value={formData.consultationFee ?? 500}
            onChange={(e) => handleTextChange("consultationFee", Number(e.target.value))}
            className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Doctor Email Address
          </label>
          <input
            type="email"
            value={formData.email || ""}
            onChange={(e) => handleTextChange("email", e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            placeholder="doctor@hospital.ehr"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Direct Contact Phone
          </label>
          <input
            type="tel"
            value={formData.phone || ""}
            onChange={(e) => handleTextChange("phone", e.target.value)}
            className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            placeholder="+91 98765 43210"
          />
        </div>
      </div>

      {/* Clinical Specialties */}
      <div>
        <label className="block text-xs font-bold text-stone-700 mb-1">
          Clinical Specialties (comma-separated)
        </label>
        <input
          type="text"
          value={specialtiesInput}
          onChange={(e) => setSpecialtiesInput(e.target.value)}
          className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          placeholder="Classical Homeopathy, Pediatric Care, Chronic Autoimmune, Dermatological Care"
        />
        <p className="text-[10px] text-stone-400 mt-1">
          Separate each specialty with a comma. These appear as verified specialty badges on patient booking portals.
        </p>
      </div>

      {/* Clinical Biography */}
      <div>
        <label className="block text-xs font-bold text-stone-700 mb-1">
          Doctor Bio &amp; Practice Philosophy
        </label>
        <textarea
          rows={3}
          value={formData.aboutText || ""}
          onChange={(e) => handleTextChange("aboutText", e.target.value)}
          className="w-full text-xs font-medium p-3 rounded-xl border border-stone-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          placeholder="Brief clinical background, research publications, or patient-care philosophy..."
        />
      </div>

      {/* Patient Portal Visibility Toggles */}
      <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
        <h4 className="text-xs font-extrabold uppercase tracking-wider text-stone-600">
          Patient Portal Visibility &amp; Sharing
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-stone-200/70 hover:bg-stone-50">
            <input
              type="checkbox"
              checked={formData.sharingPreferences?.shareBio ?? true}
              onChange={() => handleSharingToggle("shareBio")}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-stone-800">Display Bio to Patients</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-stone-200/70 hover:bg-stone-50">
            <input
              type="checkbox"
              checked={formData.sharingPreferences?.shareSpecialties ?? true}
              onChange={() => handleSharingToggle("shareSpecialties")}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-stone-800">Show Specialties</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-stone-200/70 hover:bg-stone-50">
            <input
              type="checkbox"
              checked={formData.sharingPreferences?.shareQualifications ?? true}
              onChange={() => handleSharingToggle("shareQualifications")}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-stone-800">Show Qualifications</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-white border border-stone-200/70 hover:bg-stone-50">
            <input
              type="checkbox"
              checked={formData.sharingPreferences?.shareDirectPhone ?? false}
              onChange={() => handleSharingToggle("shareDirectPhone")}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span className="font-medium text-stone-800">Public Doctor Phone</span>
          </label>
        </div>
      </div>

      {/* Modal Actions */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={isSaving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
        >
          {isSaving ? "Saving Doctor..." : `💾 Update ${formData.name || "Doctor"}`}
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
