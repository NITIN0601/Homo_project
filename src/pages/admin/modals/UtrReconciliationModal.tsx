import React, { useState, useEffect } from "react";
import type { ConsultationInvoice } from "../../../types";

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

  if (!isOpen || !invoice) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full card-shadow border border-stone-100 overflow-hidden flex flex-col shadow-2xl">
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 text-lg">🏦</span>
            <div>
              <h3 className="font-bold text-base leading-tight">Clinic Bank Reconciliation</h3>
              <p className="text-[11px] text-stone-400">
                Invoice #{invoice.id} · {invoice.patientName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Patient &amp; Service</span>
              <strong className="text-stone-900 text-sm">{invoice.patientName}</strong>
              <p className="text-stone-500 text-[11px] mt-0.5">{invoice.consultationType} · {invoice.visitDate}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Consultation Fee</span>
              <span className="text-lg font-black text-emerald-800">₹{invoice.amountINR}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-extrabold text-stone-700 uppercase tracking-wide block">
              12-Digit UPI UTR / Transaction Ref No.
            </label>
            <input
              type="text"
              placeholder="e.g. 428901239845 (from clinic bank / UPI statement)"
              value={adminUtrInput}
              onChange={(e) => setAdminUtrInput(e.target.value.trim())}
              className="w-full p-3 rounded-xl border border-stone-300 font-mono text-sm font-bold bg-white text-stone-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              autoFocus
            />
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Enter or update the 12-digit UTR from the clinic bank account or UPI statement to verify receipt of funds. This reference will appear on the patient's official digital tax receipt.
            </p>
          </div>

          {invoice.patientUpiId && (
            <div className="text-[11px] text-stone-600 bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200/60 font-mono">
              <strong>Patient UPI:</strong> {invoice.patientUpiId}
            </div>
          )}

          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>✓</span> {invoice.status === "paid" ? "Save Updated UTR" : "Confirm Payment & Save UTR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UtrReconciliationModal;
