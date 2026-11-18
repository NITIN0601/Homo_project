import type { ConsultationInvoice, ConsultationInvoiceStatus } from "@core/types";

export type { ConsultationInvoice, ConsultationInvoiceStatus };

export type PaymentMethod = NonNullable<ConsultationInvoice["paymentMethod"]>;

export interface PaymentTransaction {
  id: string;
  invoiceId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: "initiated" | "success" | "failed";
  timestamp: string;
}
