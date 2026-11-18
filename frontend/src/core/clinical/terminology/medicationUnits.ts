import type { MedicationUnit } from "./terminologyTypes";

export const MEDICATION_UNITS: { unit: MedicationUnit; label: string }[] = [
  { unit: "drops", label: "Drops" },
  { unit: "pills", label: "Pills / Globules (Size 30)" },
  { unit: "globules", label: "Globules (Size 40)" },
  { unit: "tablets", label: "Trituration Tablets" },
  { unit: "ml", label: "Milliliters (Mother Tincture)" },
  { unit: "doses", label: "Unit Doses (Single Powder)" },
];
