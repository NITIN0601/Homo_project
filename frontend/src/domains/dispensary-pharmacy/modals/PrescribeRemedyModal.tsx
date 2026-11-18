import React, { useState } from "react";
import type { UserProfile, VisitSummaryRecord } from "@core/types";
import { MEDICINE_CATALOGUE } from "@app/store";
import { useTenant } from "@core/tenancy";
import { HOSPITAL } from "../../../core/config";
import { formatINR, formatDateShort } from "../../../shared/utils/format";
import { Modal, Select, Textarea, Button, Input } from "../../../shared/ui";
import { auditService } from "../../../core/observability";

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
  const [dosageQuantity, setDosageQuantity] = useState<string>("4");
  const [dosageUnit, setDosageUnit] = useState<string>("globules");
  const [customDosageNote, setCustomDosageNote] = useState<string>("twice daily post meals for 14 days");
  const [success, setSuccess] = useState(false);

  if (!patient) return null;

  const fullInstructions = `Take ${dosageQuantity} ${dosageUnit} ${customDosageNote}`.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const medObj = MEDICINE_CATALOGUE.find((m) => m.id === selectedMedicineId);
    if (!medObj) return;

    const newVisit: VisitSummaryRecord = {
      id: `vis-${Date.now()}`,
      visitDate: formatDateShort(new Date()),
      doctorName: tenant.doctor.title || HOSPITAL.DOCTOR_TITLE,
      hospitalBranch: HOSPITAL.BRANCHES.OPD,
      chiefDiagnosis: "Clinical Follow-up & Direct Remedy Allocation",
      symptomsObserved: ["Patient Consultation via Doctor Admin Roster"],
      prescribedRemedies: [
        {
          medicineId: medObj.id,
          medicineName: medObj.name,
          potency: medObj.potency,
          dosage: fullInstructions,
          duration: "14 days",
        },
      ],
      clinicalNotes: `Direct prescription assigned via Admin Dashboard: ${fullInstructions}`,
      lifestyleAdvice: "Follow prescribed diet and dosage intervals.",
      followUpDate: "In 14 Days",
    };

    onPrescribeRemedy(patient.id, newVisit, medObj.id, fullInstructions);
    auditService.logAction("PRESCRIBED_REMEDY", {
      targetPatientId: patient.id,
      details: {
        medicineId: medObj.id,
        medicineName: medObj.name,
        dosageQuantity,
        dosageUnit,
        instructions: fullInstructions,
      },
    });

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
      <form id="prescribe-remedy-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
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

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Dosage Amount"
            type="number"
            min="1"
            max="100"
            value={dosageQuantity}
            onChange={(e) => setDosageQuantity(e.target.value)}
            required
          />
          <Select
            label="Clinical Unit"
            value={dosageUnit}
            onChange={(e) => setDosageUnit(e.target.value)}
            options={[
              { value: "globules", label: "globules (standard pills)" },
              { value: "drops", label: "drops (liquid dilution)" },
              { value: "tablets", label: "tablets (trituration)" },
              { value: "ml", label: "ml (mother tincture)" },
              { value: "powder packets", label: "powder packets" },
            ]}
          />
        </div>

        <Textarea
          label="Doctor Administration Instructions"
          value={customDosageNote}
          onChange={(e) => setCustomDosageNote(e.target.value)}
          rows={2}
          required
        />
      </form>
    </Modal>
  );
};

export default PrescribeRemedyModal;
