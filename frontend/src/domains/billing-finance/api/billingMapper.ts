import type { ConsultationInvoiceStatus } from "../model/billingTypes";

export function formatInvoiceStatus(status: ConsultationInvoiceStatus): string {
  switch (status) {
    case "paid": return "Paid";
    case "pending": return "Pending";
    case "processing": return "Processing";
    default: return String(status);
  }
}
