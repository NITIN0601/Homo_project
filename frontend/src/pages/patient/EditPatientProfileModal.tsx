import React, { useState, useEffect } from "react";
import { Button, Modal, Input } from "../../components/ui";
import { sanitizeText, sanitizeArrayOfStrings } from "../../utils/sanitize";

interface EditPatientProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  initialName: string;
  initialAge: number;
  initialGender: string;
  initialBloodGroup: string;
  initialAllergies: string[];
  initialHistory: string[];
  onSave: (data: {
    patientName: string;
    age: number;
    gender: string;
    bloodGroup: string;
    knownAllergies: string[];
    medicalHistory: string[];
  }) => void;
}

export const EditPatientProfileModal: React.FC<EditPatientProfileModalProps> = ({
  isOpen,
  onClose,
  patientId: _patientId,
  initialName,
  initialAge,
  initialGender,
  initialBloodGroup,
  initialAllergies,
  initialHistory,
  onSave,
}) => {
  const [editPatientName, setEditPatientName] = useState(initialName);
  const [editAge, setEditAge] = useState(initialAge);
  const [editGender, setEditGender] = useState(initialGender);
  const [editBloodGroup, setEditBloodGroup] = useState(initialBloodGroup);
  const [editAllergiesText, setEditAllergiesText] = useState((initialAllergies || []).join(", "));
  const [editHistoryText, setEditHistoryText] = useState((initialHistory || []).join(", "));
  const [editProfileSuccess, setEditProfileSuccess] = useState<string | null>(null);

  useEffect(() => {
    setEditPatientName(initialName);
    setEditAge(initialAge);
    setEditGender(initialGender);
    setEditBloodGroup(initialBloodGroup);
    setEditAllergiesText((initialAllergies || []).join(", "));
    setEditHistoryText((initialHistory || []).join(", "));
  }, [initialName, initialAge, initialGender, initialBloodGroup, initialAllergies, initialHistory]);

  const handleSavePatientProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeText(editPatientName, 120) || initialName;
    const cleanAge = Math.min(Math.max(Number(editAge) || initialAge, 0), 130);
    const allergies = sanitizeArrayOfStrings(editAllergiesText, 30, 80);
    const history = sanitizeArrayOfStrings(editHistoryText, 30, 150);

    onSave({
      patientName: cleanName,
      age: cleanAge,
      gender: sanitizeText(editGender, 30),
      bloodGroup: sanitizeText(editBloodGroup, 10),
      knownAllergies: allergies,
      medicalHistory: history,
    });
    setEditProfileSuccess("✓ Profile details updated successfully!");
    setTimeout(() => {
      setEditProfileSuccess(null);
      onClose();
    }, 1500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Patient Medical Profile"
      subtitle="Update personal details, blood group, allergies, and medical history"
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" form="edit-patient-profile-form">
            Save Profile Updates
          </Button>
        </div>
      }
    >
      <form id="edit-patient-profile-form" onSubmit={handleSavePatientProfile} className="space-y-4 text-xs">
        {editProfileSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold rounded-2xl flex items-center gap-2">
            <span>✓</span> {editProfileSuccess}
          </div>
        )}

        <div className="space-y-3">
          <Input
            label="Full Name *"
            required
            value={editPatientName}
            onChange={(e) => setEditPatientName(e.target.value)}
            placeholder="e.g. Johnathan Doe"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
                Age *
              </label>
              <input
                type="number"
                required
                min={1}
                max={120}
                value={editAge}
                onChange={(e) => setEditAge(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-white font-medium text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
                Gender *
              </label>
              <select
                value={editGender}
                onChange={(e) => setEditGender(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-white font-medium text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
                Blood Group *
              </label>
              <select
                value={editBloodGroup}
                onChange={(e) => setEditBloodGroup(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-white font-medium text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
              Known Allergies (comma-separated)
            </label>
            <textarea
              rows={2}
              value={editAllergiesText}
              onChange={(e) => setEditAllergiesText(e.target.value)}
              placeholder="e.g. Dust Mites, Penicillin, Pollen, Peanuts"
              className="w-full p-2.5 rounded-xl border border-stone-200 bg-white font-medium text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-stone-400 mt-0.5 block">Separate individual allergies with commas.</span>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
              Previous Medical History (comma-separated)
            </label>
            <textarea
              rows={2}
              value={editHistoryText}
              onChange={(e) => setEditHistoryText(e.target.value)}
              placeholder="e.g. Chronic Dyspepsia, Asthma, Hypertension"
              className="w-full p-2.5 rounded-xl border border-stone-200 bg-white font-medium text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <span className="text-[10px] text-stone-400 mt-0.5 block">Separate medical conditions with commas.</span>
          </div>
        </div>
      </form>
    </Modal>
  );
};
export default EditPatientProfileModal;

