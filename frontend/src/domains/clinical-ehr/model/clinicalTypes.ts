import type {
  HomeopathicCaseRecord,
  HomeopathicChiefComplaint,
  HomeopathicPrescribedRemedy,
  VisitSummaryRecord,
  PatientMedicalFile,
  PatientClinicalMedia,
} from "@core/types";

export type {
  HomeopathicCaseRecord,
  HomeopathicChiefComplaint,
  HomeopathicPrescribedRemedy,
  VisitSummaryRecord,
  PatientMedicalFile,
  PatientClinicalMedia,
};

export interface ClinicalEncounterDraft {
  patientId: string;
  notes: string;
  chiefComplaint: string;
  remedies: HomeopathicPrescribedRemedy[];
  timestamp: string;
}
