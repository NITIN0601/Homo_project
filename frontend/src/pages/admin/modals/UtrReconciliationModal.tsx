import React, { useState, useEffect } from "react";
import type { ConsultationInvoice } from "../../../types";
import { formatINR } from "../../../utils/format";
import { Modal, Input, Button } from "../../../components/ui";

interface UtrReconciliationModalProps {
  isOpen: boolean;
  invoice: ConsultationInvoice | null;
  onClose: () => void;
  onConfirmReconciliation: (invoiceId: string, utrRef: string, isPaid: boolean) => void;
}

export const UtrReconciliationModal: React.FC<UtrReconciliationModalProps> = ({
  isOpen,
  invoice,
  onClose,
  onConfirmReconciliation,
}) => {
  const [adminUtrInput, setAdminUtrInput] = useState<string>("");

  useEffect(() => {
    if (invoice) {
      const ref = invoice.transactionRef || "";
      setAdminUtrInput(ref.startsWith("UPI-UTR-") ? ref.replace("UPI-UTR-", "") : ref);
    } else {
      setAdminUtrInput("");
    }
  }, [invoice]);

  if (!invoice) return null;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const verifiedRef = adminUtrInput.trim()
      ? (adminUtrInput.startsWith("UPI-") || adminUtrInput.startsWith("CARD-") || adminUtrInput.startsWith("NB-")
          ? adminUtrInput
          : `UPI-UTR-${adminUtrInput}`)
      : invoice.transactionRef || `CONFIRMED-${Math.floor(100000 + Math.random() * 900000)}`;

    onConfirmReconciliation(invoice.id, verifiedRef, invoice.status === "paid");
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Clinic Bank Reconciliation"
      subtitle={`Invoice #${invoice.id} · ${invoice.patientName}`}
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="utr-reconciliation-form"
            variant="primary"
            size="sm"
          >
            Save &amp; Confirm Reconciliation
          </Button>
        </div>
      }
    >
      <form id="utr-reconciliation-form" onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Patient &amp; Service</span>
            <strong className="text-stone-900 text-sm">{invoice.patientName}</strong>
            <p className="text-stone-500 text-[11px] mt-0.5">{invoice.consultationType} · {invoice.visitDate}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Consultation Fee</span>
            <span className="text-lg font-black text-emerald-800">{formatINR(invoice.amountINR)}</span>
          </div>
        </div>

        <Input
          label="12-Digit UPI UTR / Transaction Ref No."
          placeholder="e.g. 428901239845 (from clinic bank / UPI statement)"
          value={adminUtrInput}
          onChange={(e) => setAdminUtrInput(e.target.value.trim())}
          helperText="Enter or update the 12-digit UTR from the clinic bank account or UPI statement to verify receipt of funds. This reference will appear on the patient's official digital tax receipt."
        />

        {invoice.patientUpiId && (
          <div className="text-[11px] text-stone-600 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60 font-mono">
            <strong>Patient UPI:</strong> {invoice.patientUpiId}
          </div>
        )}
      </form>
    </Modal>
  );
};

export default UtrReconciliationModal;
