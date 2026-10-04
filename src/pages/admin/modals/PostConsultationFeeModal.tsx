import React, { useState } from "react";
import type { UserProfile, ConsultationInvoice } from "../../../types";
import { CLINIC } from "../../../config";
import { formatINR, formatDateISO, formatDateTime } from "../../../utils/format";

interface PostConsultationFeeModalProps {
  isOpen: boolean;
  patient: UserProfile | null;
  onClose: () => void;
  onPostInvoice: (invoice: ConsultationInvoice) => void;
}

export const PostConsultationFeeModal: React.FC<PostConsultationFeeModalProps> = ({
  isOpen,
  patient,
  onClose,
  onPostInvoice,
}) => {
  const [feeAmount, setFeeAmount] = useState<number>(750);
  const [feeType, setFeeType] = useState<ConsultationInvoice["consultationType"]>("In-Person Clinic Visit");
  const [feeDate, setFeeDate] = useState<string>(() => formatDateISO());
  const [feeNotes, setFeeNotes] = useState<string>("Comprehensive clinical consultation & case taking review");
  const [feeInitialStatus, setFeeInitialStatus] = useState<"pending" | "paid">("pending");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen || !patient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newInvoice: ConsultationInvoice = {
      id: `inv-${Date.now().toString(36)}`,
      patientId: patient.id,
      patientName: patient.name,
      doctorName: CLINIC.DOCTOR_TITLE,
      visitDate: feeDate || formatDateISO(),
      amountINR: Number(feeAmount) || 750,
      consultationType: feeType,
      notes: feeNotes.trim() || "Consultation fee for clinical case analysis",
      status: feeInitialStatus,
      issuedAt: formatDateTime(),
      paidAt: feeInitialStatus === "paid" ? formatDateTime() : undefined,
      paymentMethod: feeInitialStatus === "paid" ? "cash" : undefined,
      transactionRef: feeInitialStatus === "paid" ? `CASH-REC-${Math.floor(100000 + Math.random() * 900000)}` : undefined,
    };

    onPostInvoice(newInvoice);
    setSuccessMessage(`✓ Consultation fee of ${formatINR(newInvoice.amountINR)} posted for ${patient.name}!`);
    setTimeout(() => {
      setSuccessMessage(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-3xl max-w-lg w-full card-shadow border border-stone-100 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-fee-title"
      >
        <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-base">💳</span>
              <h3 id="post-fee-title" className="font-bold text-base">Post Consultation Fee</h3>
            </div>
            <p className="text-xs text-stone-300 mt-0.5">
              Patient: <strong className="text-emerald-400">{patient.name}</strong> (#{patient.id})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {successMessage && (
            <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 p-3 rounded-xl font-bold text-center animate-fadeIn">
              {successMessage}
            </div>
          )}

          {/* Consultation Type */}
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Consultation Mode / Type
            </label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(["In-Person Clinic Visit", "Online Tele-Consultation", "Follow-up Review"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFeeType(type)}
                  className={`p-2 rounded-xl text-[11px] font-bold border transition-all text-center cursor-pointer ${
                    feeType === type
                      ? "bg-amber-500 text-stone-950 border-amber-500 shadow-xs"
                      : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {type === "In-Person Clinic Visit" ? "🏥 Clinic" : type === "Online Tele-Consultation" ? "🌐 Tele" : "🔄 Review"}
                </button>
              ))}
            </div>
          </div>

          {/* Fee Amount Selection with Quick Pills */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                Consultation Fee Amount (INR ₹)
              </label>
              <span className="text-[10px] text-stone-400">Standard: ₹750</span>
            </div>

            <div className="flex items-center gap-2 mt-1 mb-2">
              {[500, 750, 1000, 1500].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setFeeAmount(amt)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    feeAmount === amt
                      ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                      : "bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200"
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>

            <div className="relative">
              <span className="absolute left-3 top-2.5 font-bold text-stone-500 text-sm">₹</span>
              <input
                type="number"
                min={0}
                step={50}
                required
                value={feeAmount}
                onChange={(e) => setFeeAmount(Number(e.target.value))}
                className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm font-bold text-stone-800 outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Consultation / Visit Date */}
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Consultation Date
            </label>
            <input
              type="date"
              required
              value={feeDate}
              onChange={(e) => setFeeDate(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>

          {/* Billing & Clinical Notes */}
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Clinical Billing Notes (Shown to Patient)
            </label>
            <textarea
              rows={2}
              value={feeNotes}
              onChange={(e) => setFeeNotes(e.target.value)}
              placeholder="e.g. Classical case analysis, constitutional evaluation, and prescription review"
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs outline-none focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>

          {/* Initial Settlement Status */}
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
              Initial Payment Status
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setFeeInitialStatus("pending")}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  feeInitialStatus === "pending"
                    ? "bg-amber-100 text-amber-900 border-amber-300 shadow-xs"
                    : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100"
                }`}
              >
                <span>⏳</span> Awaiting Online Payment
              </button>
              <button
                type="button"
                onClick={() => setFeeInitialStatus("paid")}
                className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  feeInitialStatus === "paid"
                    ? "bg-emerald-100 text-emerald-900 border-emerald-300 shadow-xs"
                    : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100"
                }`}
              >
                <span>✓</span> Paid at Clinic Desk (Cash)
              </button>
            </div>
            <p className="text-[10px] text-stone-400 mt-1">
              {feeInitialStatus === "pending"
                ? "Patient will see an outstanding payment card upon login and can pay via UPI QR / Card / Netbanking."
                : "Marked as paid immediately. A clinic payment receipt will be generated for the patient."}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 font-bold text-stone-600 hover:bg-stone-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md cursor-pointer transition-all flex items-center gap-1.5"
            >
              <span>💳</span> Post Fee Invoice ({formatINR(feeAmount)}) →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PostConsultationFeeModal;
