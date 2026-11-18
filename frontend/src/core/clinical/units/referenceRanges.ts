export interface ClinicalReferenceRange {
  code: string;
  name: string;
  min: number;
  max: number;
  unit: string;
}

export const VITAL_REFERENCE_RANGES: ClinicalReferenceRange[] = [
  { code: "8867-4", name: "Heart Rate", min: 60, max: 100, unit: "bpm" },
  { code: "8480-6", name: "Systolic BP", min: 90, max: 120, unit: "mmHg" },
  { code: "8462-4", name: "Diastolic BP", min: 60, max: 80, unit: "mmHg" },
  { code: "8310-5", name: "Temperature", min: 36.5, max: 37.5, unit: "°C" },
  { code: "59408-5", name: "Oxygen Saturation", min: 95, max: 100, unit: "%" },
];
