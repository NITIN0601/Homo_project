import type { ClinicalObservationType } from "./terminologyTypes";

export const CLINICAL_OBSERVATIONS: ClinicalObservationType[] = [
  { code: "8867-4", name: "Heart Rate", unit: "beats/min", category: "vital-signs" },
  { code: "8480-6", name: "Systolic Blood Pressure", unit: "mmHg", category: "vital-signs" },
  { code: "8462-4", name: "Diastolic Blood Pressure", unit: "mmHg", category: "vital-signs" },
  { code: "8310-5", name: "Body Temperature", unit: "°C", category: "vital-signs" },
  { code: "29463-7", name: "Body Weight", unit: "kg", category: "vital-signs" },
  { code: "8302-2", name: "Body Height", unit: "cm", category: "vital-signs" },
  { code: "59408-5", name: "Oxygen Saturation in Arterial Blood", unit: "%", category: "vital-signs" },
];
