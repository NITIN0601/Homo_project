import React from "react";
import { useTenant } from "@core/tenancy";
import type { ConsultationInvoice } from "@core/types";
import { HOSPITAL } from "../../../core/config";
import { formatCurrency } from "../../../shared/utils/format";
import { Button, Modal } from "../../../shared/ui";

interface PaymentSubmittedModalProps {
  paymentSuccessData: {
    invoice: ConsultationInvoice;
    txRef: string;
    submittedAt: string;
    method: string;
  } | null;
  onClose: () => void;
}

export const PaymentSubmittedModal: React.FC<PaymentSubmittedModalProps> = ({
  paymentSuccessData,
  onClose,
}) => {
  const { tenant } = useTenant();

  return (
    <Modal
      isOpen={Boolean(paymentSuccessData)}
      onClose={onClose}
      title="Payment Submitted Successfully"
      subtitle="Status: Under Doctor Verification"
      size="sm"
    >
      {paymentSuccessData && (
        <div className="text-center space-y-4 text-xs">
          <div className="w-16 h-16 rounded-full bg-sky-100 text-sky-800 text-3xl font-black flex items-center justify-center mx-auto shadow-inner">
            ⏳
          </div>

          <div>
            <p className="text-xs text-stone-500 mt-1">
              Your payment submission of <strong className="text-stone-900">{formatCurrency(paymentSuccessData.invoice.amount ?? paymentSuccessData.invoice.amountINR, paymentSuccessData.invoice.currency || tenant.currency, paymentSuccessData.invoice.currencySymbol || tenant.currencySymbol)}</strong> has been recorded and forwarded to the doctor.
            </p>
          </div>

          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-left space-y-1.5 font-mono">
            <div className="flex justify-between text-stone-600">
              <span>Transaction Ref:</span>
              <span className="font-bold text-stone-900">{paymentSuccessData.txRef}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Payment Mode:</span>
              <span className="font-bold text-stone-900">{paymentSuccessData.method}</span>
            </div>
            <div className="flex justify-between text-stone-600">
              <span>Submitted At:</span>
              <span className="font-bold text-stone-900">{paymentSuccessData.submittedAt}</span>
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 text-left space-y-1">
            <p className="font-bold">🛡️ Doctor Confirmation Policy:</p>
            <p className="text-[10px] text-amber-800">
              Per hospital audit compliance, payments remain in <strong>"Under Processing / Verification"</strong> until confirmed by {tenant.doctor.title || HOSPITAL.DOCTOR_TITLE}. Once the doctor confirms the credit in the hospital console, your status will update to <strong>"Confirmed"</strong> and your official digital tax receipt will unlock.
            </p>
          </div>

          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={onClose}
          >
            Return to Medical Records
          </Button>
        </div>
      )}
    </Modal>
  );
};

export default PaymentSubmittedModal;

