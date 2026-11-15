import React from "react";
import { useTenant } from "../../../context/ThemeProvider";
import type { ConsultationInvoice } from "../../../types";
import { CLINIC, DOCTOR } from "../../../config";
import { formatCurrency } from "../../../utils/format";
import { Button, Modal } from "../../../components/ui";

interface ReceiptModalProps {
  invoice: ConsultationInvoice | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  invoice,
  onClose,
}) => {
  const { tenant } = useTenant();

  if (!invoice) return null;

  const currencyCode = invoice.currency || tenant.currency || "INR";
  const currencySymbol = invoice.currencySymbol || tenant.currencySymbol || "₹";
  const amount = invoice.amount ?? invoice.amountINR;

  return (
    <Modal
      isOpen={Boolean(invoice)}
      onClose={onClose}
      title={tenant.name || CLINIC.FULL_NAME}
      subtitle="Official Healthcare Tax-Exempt Receipt"
      size="lg"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button
            variant="primary"
            size="sm"
            onClick={() => window.print()}
          >
            <span>🖨️</span> Print / Save Receipt
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      }
    >
      {invoice && (
        <div className="p-6 space-y-4 text-xs">
          {/* Doctor & Patient Info Block */}
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-stone-200">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Attending Physician</span>
              <p className="font-bold text-stone-900 text-sm">{invoice.doctorName}</p>
              <p className="text-stone-500">{tenant.doctor.title || DOCTOR.TITLE} · {tenant.contact.phoneDisplay || CLINIC.PHONE_DISPLAY}</p>
              <p className="text-stone-500 text-[11px]">{tenant.contact.address.street || CLINIC.ADDRESS.STREET}, {tenant.contact.address.city || CLINIC.ADDRESS.CITY}</p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Patient Name</span>
              <p className="font-bold text-stone-900 text-sm">{invoice.patientName}</p>
              <p className="text-stone-500 font-mono">ID: #{invoice.patientId}</p>
              <p className="text-stone-500 text-[11px]">Visit Date: {invoice.visitDate}</p>
            </div>
          </div>

          {/* Receipt Metadata */}
          <div className="grid grid-cols-3 gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-200 font-mono text-[11px]">
            <div>
              <span className="text-stone-400 block text-[9px] uppercase">Receipt No.</span>
              <strong className="text-stone-900">REC-{invoice.id.toUpperCase()}</strong>
            </div>
            <div>
              <span className="text-stone-400 block text-[9px] uppercase">Payment Mode</span>
              <strong className="text-stone-900 uppercase">{invoice.paymentMethod || "ONLINE UPI"}</strong>
            </div>
            <div>
              <span className="text-stone-400 block text-[9px] uppercase">Transaction Ref</span>
              <strong className="text-stone-900 truncate block">{invoice.transactionRef || "TX-VERIFIED"}</strong>
            </div>
          </div>

          {/* Itemized Table */}
          <div className="border border-stone-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-stone-100 text-stone-600 text-[10px] uppercase font-bold">
                <tr>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Amount ({currencyCode})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr>
                  <td className="p-3">
                    <strong className="text-stone-900 block">{invoice.consultationType}</strong>
                    <span className="text-[11px] text-stone-500">{invoice.notes || "Case taking evaluation & analysis"}</span>
                  </td>
                  <td className="p-3 text-right font-mono">1</td>
                  <td className="p-3 text-right font-bold text-stone-900">{formatCurrency(amount, currencyCode, currencySymbol)}</td>
                </tr>
                <tr className="bg-stone-50/50 text-stone-500 text-[11px]">
                  <td className="p-3" colSpan={2}>Healthcare Services / Professional Consultation</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(0, currencyCode, currencySymbol)}</td>
                </tr>
              </tbody>
              <tfoot className="bg-stone-900 text-white font-bold">
                <tr>
                  <td className="p-3 text-sm" colSpan={2}>Total Amount Paid</td>
                  <td className="p-3 text-right text-base text-amber-400 font-mono">
                    {formatCurrency(amount, currencyCode, currencySymbol)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <p className="text-[10px] text-stone-400 text-center italic">
            This is a computer-generated digital receipt issued under Notification No. 12/2017-Central Tax (Rate). No physical signature required.
          </p>
        </div>
      )}
    </Modal>
  );
};

export default ReceiptModal;

