import type { ClinicalCode } from "./terminologyTypes";

export const COMMON_DIAGNOSES: ClinicalCode[] = [
  { system: "ICD-10", code: "J00", display: "Acute nasopharyngitis [common cold]" },
  { system: "ICD-10", code: "J45.909", display: "Unspecified asthma, uncomplicated" },
  { system: "ICD-10", code: "K21.9", display: "Gastro-esophageal reflux disease without esophagitis" },
  { system: "ICD-10", code: "L20.9", display: "Atopic dermatitis, unspecified" },
  { system: "ICD-10", code: "M79.3", display: "Panniculitis, unspecified" },
  { system: "ICD-10", code: "R53.83", display: "Other fatigue" },
  { system: "HOMEO-REPERTORY", code: "HR-001", display: "Fastidious anxiety with chilliness" },
  { system: "HOMEO-REPERTORY", code: "HR-002", display: "Thirstless fever with burning pain" },
];
