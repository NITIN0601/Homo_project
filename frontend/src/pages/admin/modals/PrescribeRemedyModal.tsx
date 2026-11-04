import React, { useState } from "react";
import type { UserProfile, VisitSummaryRecord } from "../../../types";
import { MEDICINE_CATALOGUE } from "../../../context/AppContext";
import { useTenant } from "../../../context/ThemeProvider";
import { CLINIC } from "../../../config";
import { formatINR, formatDateShort } from "../../../utils/format";
import { Modal, Select, Textarea, Button } from "../../../components/ui";

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
  const { tenant } = useTenant();
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>("m1");
  const [customDosageNote, setCustomDosageNote] = useState<string>("Take 4 globules twice daily post meals for 14 days");
  const [success, setSuccess] = useState(false);

  if (!patient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const medObj = MEDICINE_CATALOGUE.find((m) => m.id === selectedMedicineId);
    if (!medObj) return;

    const newVisit: VisitSummaryRecord = {
      id: `vis-${Date.now()}`,
      visitDate: formatDateShort(new Date()),
      doctorName: tenant.doctor.title || CLINIC.DOCTOR_TITLE,
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

  const medicineOptions = MEDICINE_CATALOGUE.map((m) => ({
    value: m.id,
    label: `${m.name} (${m.potency}) — ${formatINR(m.priceINR)}`,
  }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Prescribe Homeopathy Remedy"
      subtitle={`Patient: ${patient.name}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="prescribe-remedy-form"
            variant="primary"
            size="sm"
          >
            Assign Prescription
          </Button>
        </div>
      }
    >
      <form id="prescribe-remedy-form" onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
        {success && (
          <div className="bg-emerald-100 text-emerald-800 p-3 rounded-xl font-bold text-center">
            ✓ Remedy Prescribed &amp; Assigned to Patient!
          </div>
        )}

        <Select
          label="Select Homeopathy Remedy"
          value={selectedMedicineId}
          onChange={(e) => setSelectedMedicineId(e.target.value)}
          options={medicineOptions}
        />

        <Textarea
          label="Doctor Dosage & Administration Instructions"
          value={customDosageNote}
          onChange={(e) => setCustomDosageNote(e.target.value)}
          rows={3}
          required
        />
      </form>
    </Modal>
  );
};

export default PrescribeRemedyModal;
