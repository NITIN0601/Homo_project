import { createContext, useContext } from "react";
import type {
  VisitSummaryRecord,
  PatientMedicalFile,
  InventoryItem,
  ConsultationInvoice,
  ConsultationInvoiceStatus,
} from "@core/types";

export interface ClinicalContextValue {
  visitSummaries: Record<string, PatientMedicalFile>;
  inventory: InventoryItem[];
  consultationInvoices: ConsultationInvoice[];
  addVisitSummary: (patientId: string, visit: VisitSummaryRecord) => void;
  updatePatientMedicalFile: (patientId: string, updates: Partial<PatientMedicalFile>) => void;
  updateInventory: (item: InventoryItem) => void;
  postConsultationInvoice: (invoice: ConsultationInvoice) => void;
  submitConsultationPayment: (
    invoiceId: string,
    paymentMethod: ConsultationInvoice["paymentMethod"],
    transactionRef: string,
    submittedAt: string,
    patientUpiId?: string,
    selectedBank?: string
  ) => void;
  confirmConsultationPayment: (invoiceId: string, paidAt: string, transactionRef?: string) => void;
  updateInvoiceTransactionRef: (invoiceId: string, transactionRef: string) => void;
  payConsultationInvoice: (
    invoiceId: string,
    paymentMethod: ConsultationInvoice["paymentMethod"],
    transactionRef: string,
    paidAt: string
  ) => void;
  updateInvoiceStatus: (invoiceId: string, status: ConsultationInvoiceStatus) => void;
}

export const ClinicalContext = createContext<ClinicalContextValue | null>(null);

export function useClinical(): ClinicalContextValue {
  const ctx = useContext(ClinicalContext);
  if (!ctx) {
    throw new Error("useClinical must be used within an AppProvider or ClinicalProvider");
  }
  return ctx;
}
