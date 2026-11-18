import React from "react";
import { Input, Textarea } from "../ui";

export interface DoctorProfileValues {
  name: string;
  title: string;
  qualifications: string;
  experienceYears: number | string;
  regNo: string;
  consultationFee?: number | string;
  email: string;
  phone: string;
  specialties: string[];
  aboutText: string;
  sharingPreferences?: {
    sharePhoneWithPatients?: boolean;
    shareEmailWithPatients?: boolean;
  };
}

interface DoctorProfileFieldsProps {
  values: DoctorProfileValues;
  onChange: <K extends keyof DoctorProfileValues>(field: K, value: DoctorProfileValues[K]) => void;
  disabled?: boolean;
}

export const DoctorProfileFields: React.FC<DoctorProfileFieldsProps> = ({
  values,
  onChange,
  disabled = false,
}) => {
  const [newSpecialty, setNewSpecialty] = React.useState("");

  const handleAddSpecialty = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ("key" in e && e.key !== "Enter") return;
    e.preventDefault();
    const trimmed = newSpecialty.trim();
    if (trimmed && !values.specialties.includes(trimmed)) {
      onChange("specialties", [...values.specialties, trimmed]);
      setNewSpecialty("");
    }
  };

  const handleRemoveSpecialty = (item: string) => {
    onChange(
      "specialties",
      values.specialties.filter((s) => s !== item)
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <Input
          label="Doctor Full Name"
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="e.g. Dr. K. S. Sharma"
          required
          disabled={disabled}
        />
        <Input
          label="Official Title & Suffix"
          value={values.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="e.g. Dr. K. S. Sharma, MD, Chief Physician"
          required
          disabled={disabled}
        />
        <Input
          label="Medical Registration No"
          value={values.regNo}
          onChange={(e) => onChange("regNo", e.target.value)}
          placeholder="e.g. KMC-54321 / REG-098"
          required
          disabled={disabled}
        />
        <Input
          label="Degrees & Qualifications"
          value={values.qualifications}
          onChange={(e) => onChange("qualifications", e.target.value)}
          placeholder="e.g. MBBS, MD, BHMS"
          required
          disabled={disabled}
        />
        <Input
          label="Years of Experience"
          type="number"
          min="0"
          value={String(values.experienceYears ?? "")}
          onChange={(e) => onChange("experienceYears", Number(e.target.value) || 0)}
          placeholder="e.g. 15"
          disabled={disabled}
        />
        <Input
          label="Consultation Fee (Base)"
          type="number"
          min="0"
          value={String(values.consultationFee ?? "")}
          onChange={(e) => onChange("consultationFee", Number(e.target.value) || 0)}
          placeholder="e.g. 750"
          disabled={disabled}
        />
        <Input
          label="Doctor Direct Email"
          type="email"
          value={values.email}
          onChange={(e) => onChange("email", e.target.value)}
          placeholder="doctor@hospital.com"
          required
          disabled={disabled}
        />
        <Input
          label="Doctor Direct Phone"
          value={values.phone}
          onChange={(e) => onChange("phone", e.target.value)}
          placeholder="+91 98450 12345"
          disabled={disabled}
        />
      </div>

      {/* Specialties Tags */}
      <div>
        <label className="text-xs font-bold text-stone-700 block mb-1.5">
          Specialties &amp; Clinical Focus Areas
        </label>
        <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-stone-50 border border-stone-200 rounded-2xl min-h-[46px]">
          {values.specialties.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full text-xs font-bold"
            >
              <span>{item}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => handleRemoveSpecialty(item)}
                  className="w-4 h-4 rounded-full bg-emerald-200 hover:bg-emerald-300 flex items-center justify-center text-[10px] text-emerald-800"
                >
                  ×
                </button>
              )}
            </span>
          ))}
          {!disabled && (
            <div className="flex items-center gap-1 flex-1 min-w-[140px]">
              <input
                type="text"
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                onKeyDown={handleAddSpecialty}
                placeholder="Add specialty + enter..."
                className="text-xs bg-transparent border-none outline-none text-stone-800 px-2 py-1 w-full"
              />
              {newSpecialty.trim() && (
                <button
                  type="button"
                  onClick={handleAddSpecialty}
                  className="px-2 py-0.5 bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer"
                >
                  + Add
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Physician Biography */}
      <Textarea
        label="Physician Biography & Clinical Experience"
        value={values.aboutText}
        onChange={(e) => onChange("aboutText", e.target.value)}
        rows={3}
        placeholder="Brief description of the doctor's approach, clinical focus, and background..."
        disabled={disabled}
      />

      {/* Contact Sharing Preferences */}
      <div className="p-3 bg-stone-50/80 rounded-2xl border border-stone-200/80 space-y-2">
        <span className="text-[11px] font-black uppercase tracking-wider text-stone-600 block">
          Patient Contact Visibility Controls
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={values.sharingPreferences?.sharePhoneWithPatients ?? false}
              onChange={(e) =>
                onChange("sharingPreferences", {
                  ...values.sharingPreferences,
                  sharePhoneWithPatients: e.target.checked,
                })
              }
              disabled={disabled}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-stone-700">Display doctor direct phone to confirmed patients</span>
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={values.sharingPreferences?.shareEmailWithPatients ?? true}
              onChange={(e) =>
                onChange("sharingPreferences", {
                  ...values.sharingPreferences,
                  shareEmailWithPatients: e.target.checked,
                })
              }
              disabled={disabled}
              className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs text-stone-700">Display doctor direct email on consult receipts</span>
          </label>
        </div>
      </div>
    </div>
  );
};
