import type { VisitSummaryRecord } from "../model/clinicalTypes";

export function formatVisitDateDisplay(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }
  } catch {}
  return dateStr;
}

export function summarizeVisit(visit: VisitSummaryRecord): string {
  return `${visit.chiefDiagnosis} (${visit.prescribedRemedies.length} remedies prescribed)`;
}
