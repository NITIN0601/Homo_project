export interface ClinicalCode {
  system: "ICD-10" | "SNOMED-CT" | "HOMEO-REPERTORY";
  code: string;
  display: string;
}

export type MedicationUnit = "drops" | "pills" | "globules" | "ml" | "tablets" | "doses";

export interface ClinicalObservationType {
  code: string;
  name: string;
  unit: string;
  category: "vital-signs" | "laboratory" | "exam";
}
