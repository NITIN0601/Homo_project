import { serverFetch } from "./httpClient";
import { STORAGE_KEYS } from "../config";
import type { ConsultationInvoice } from "../types";

export const billingService = {
  invoices: {
    getAll: async (): Promise<ConsultationInvoice[]> => {
      try {
        return await serverFetch<ConsultationInvoice[]>("/api/consultation-invoices");
      } catch {
        const raw = localStorage.getItem(STORAGE_KEYS.CONSULTATION_INVOICES);
        return raw ? JSON.parse(raw) : [];
      }
    },
    create: async (invoice: ConsultationInvoice) => {
      try {
        return await serverFetch("/api/consultation-invoices", {
          method: "POST",
          body: JSON.stringify(invoice),
        });
      } catch {
        return null;
      }
    },
    update: async (invoiceId: string, updates: Partial<ConsultationInvoice>) => {
      try {
        return await serverFetch(`/api/consultation-invoices/${invoiceId}`, {
          method: "PUT",
          body: JSON.stringify(updates),
        });
      } catch {
        return null;
      }
    },
  },
};

export default billingService;
