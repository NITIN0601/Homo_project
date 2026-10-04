import React, { useState } from "react";
import type { UserProfile, VisitSummaryRecord } from "../../../types";
import { MEDICINE_CATALOGUE } from "../../../context/AppContext";
import { CLINIC } from "../../../config";
import { formatINR, formatDateShort } from "../../../utils/format";

interface PrescribeRemedyModalProps {
  isOpen: boolean;
  patient: UserProfile | null;
  onClose: () => void;
  onPrescribeRemedy: (patientId: string, visit: VisitSummaryRecord, medicineId: string, dosageNote: string) => void;
}

export const PrescribeRemedyModal: React.FC<PrescribeRemedyModalProps> = ({
  isOpen,
  patient,
  onClose,
  onPrescribeRemedy,
}) => {
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>("m1");
  const [customDosageNote, setCustomDosageNote] = useState<string>("Take 4 globules twice daily post meals for 14 days");
  const [success, setSuccess] = useState(false);

  if (!isOpen || !patient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const medObj = MEDICINE_CATALOGUE.find((m) => m.id === selectedMedicineId);
    if (!medObj) return;

    const newVisit: VisitSummaryRecord = {
      id: `vis-${Date.now()}`,
      visitDate: formatDateShort(new Date()),
      doctorName: CLINIC.DOCTOR_TITLE,
      clinicBranch: CLINIC.BRANCHES.OPD,
      chiefDiagnosis: "Clinical Follow-up & Direct Remedy Allocation",
      symptomsObserved: ["Patient Consultation via Doctor Admin Roster"],
      prescribedRemedies: [
        {
          medicineId: medObj.id,
          medicineName: medObj.name,
          potency: medObj.potency,
          dosage: customDosageNote,
          duration: "14 days",
        },
      ],
      clinicalNotes: `Direct prescription assigned via Admin Dashboard: ${customDosageNote}`,
      lifestyleAdvice: "Follow prescribed diet and dosage intervals.",
      followUpDate: "In 14 Days",
    };

    onPrescribeRemedy(patient.id, newVisit, medObj.id, customDosageNote);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-3xl max-w-md w-full card-shadow border border-stone-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="prescribe-remedy-title"
      >
        <div className="px-6 py-4 bg-emerald-900 text-white flex items-center justify-between">
          <div>
            <h3 id="prescribe-remedy-title" className="font-bold text-base">Prescribe Homeopathy Remedy</h3>
            <p className="text-xs text-emerald-200">Patient: {patient.name}</p>
          </div>
          <button onClick={onClose} className="text-white hover:opacity-80 text-lg cursor-pointer">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {success && (
            <div className="bg-emerald-100 text-emerald-800 p-3 rounded-xl font-bold text-center">
              ✓ Remedy Prescribed &amp; Assigned to Patient!
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">Select Homeopathy Remedy</label>
            <select
              value={selectedMedicineId}
              onChange={(e) => setSelectedMedicineId(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold outline-none"
            >
              {MEDICINE_CATALOGUE.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.potency}) — {formatINR(m.priceINR)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">Doctor Dosage &amp; Administration Instructions</label>
            <textarea
              rows={3}
              required
              value={customDosageNote}
              onChange={(e) => setCustomDosageNote(e.target.value)}
              placeholder="e.g. Take 4 globules twice daily post meals for 14 days"
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 font-bold text-stone-600 hover:bg-stone-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-700 text-white font-bold shadow-md hover:bg-emerald-800 cursor-pointer"
            >
              Assign Prescription →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrescribeRemedyModal;
