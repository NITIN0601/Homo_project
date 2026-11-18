export * from "../../../i18n";

export function bloodPressureCategory(systolic: number, diastolic: number): "Normal" | "Elevated" | "Stage 1" | "Stage 2" | "Crisis" {
  if (systolic > 180 || diastolic > 120) return "Crisis";
  if (systolic >= 140 || diastolic >= 90) return "Stage 2";
  if (systolic >= 130 || diastolic >= 80) return "Stage 1";
  if (systolic >= 120 && diastolic < 80) return "Elevated";
  return "Normal";
}
