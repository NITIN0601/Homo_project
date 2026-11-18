import React, { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { useTenant } from "../../context/ThemeProvider";
import type { ConsultationInvoice } from "../../types";
import { HOSPITAL, DOCTOR, INDIAN_BANKS } from "../../config";
import { formatCurrency, formatDateTime } from "../../utils/format";
import { sanitizeText } from "../../utils/sanitize";
import { Button, Modal, Input } from "../../components/ui";
import { paymentGatewayService } from "../../services/paymentGatewayService";

interface PayConsultationModalProps {
  payingInvoice: ConsultationInvoice | null;
  onClose: () => void;
  onPaymentSubmitted: (successData: {
    invoice: ConsultationInvoice;
    txRef: string;
    submittedAt: string;
    method: string;
  }) => void;
}

export const PayConsultationModal: React.FC<PayConsultationModalProps> = ({
  payingInvoice,
  onClose,
  onPaymentSubmitted,
}) => {
  const { state, submitConsultationPayment } = useApp();
  const { authUser } = state;
  const { tenant } = useTenant();

  const [paymentMethodTab, setPaymentMethodTab] = useState<"upi" | "card" | "netbanking">("upi");
  const [selectedUpiApp, setSelectedUpiApp] = useState<"gpay" | "phonepe" | "paytm" | "custom">("gpay");
  const [customPatientUpi, setCustomPatientUpi] = useState<string>(authUser?.savedUpiId || "");
  const [bankSearchQuery, setBankSearchQuery] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<string>("HDFC Bank");
  const [cardNumber, setCardNumber] = useState<string>("4242 •••• •••• 4242");
  const [cardHolder, setCardHolder] = useState<string>(authUser?.name || "John Doe");
  const [cardExpiry, setCardExpiry] = useState<string>("12/28");
  const [cardCvv, setCardCvv] = useState<string>("•••");
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const displayCurrency = payingInvoice?.currency || tenant.currency;
  const displaySymbol = payingInvoice?.currencySymbol || tenant.currencySymbol || "₹";
  const displayAmount = payingInvoice ? (payingInvoice.amount ?? payingInvoice.amountINR) : 0;

  const filteredBanks = useMemo(() => {
    if (!bankSearchQuery.trim()) return INDIAN_BANKS;
    const q = bankSearchQuery.toLowerCase();
    return INDIAN_BANKS.filter(
      (b) => b.name.toLowerCase().includes(q) || b.shortName.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)
    );
  }, [bankSearchQuery]);

  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      const cleanUpi = sanitizeText(customPatientUpi, 100);
      const cleanBank = paymentMethodTab === "netbanking" ? sanitizeText(selectedBank, 80) : undefined;

      const result = await paymentGatewayService.processPayment({
        invoice: payingInvoice,
        paymentMethod: paymentMethodTab,
        patientUpiId: cleanUpi || authUser?.savedUpiId,
        selectedBank: cleanBank,
        currency: displayCurrency,
        amount: displayAmount,
      });

      const submittedAt = formatDateTime();
      submitConsultationPayment(
        payingInvoice.id,
        paymentMethodTab,
        result.transactionRef,
        submittedAt,
        cleanUpi || authUser?.savedUpiId,
        cleanBank
      );

      setIsProcessingPayment(false);
      onPaymentSubmitted({
        invoice: {
          ...payingInvoice,
          status: "processing",
          paymentMethod: paymentMethodTab,
          transactionRef: result.transactionRef,
          submittedAt,
          patientUpiId: cleanUpi || authUser?.savedUpiId,
          selectedBank: cleanBank,
        },
        txRef: result.transactionRef,
        submittedAt,
        method: paymentMethodTab.toUpperCase(),
      });
      onClose();
    } catch (err: any) {
      setIsProcessingPayment(false);
      setPaymentError(err?.message || "Payment could not be processed. Please try again.");
    }
  };

  return (
    <Modal
      isOpen={Boolean(payingInvoice)}
      onClose={onClose}
      title="Settle Consultation Fee"
      subtitle={payingInvoice ? `Invoice #${payingInvoice.id} · ${tenant.name || HOSPITAL.FULL_NAME}` : undefined}
      size="md"
      footer={
        payingInvoice ? (
          <div className="flex items-center justify-between gap-3 w-full">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isProcessingPayment}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              form="patient-settle-fee-form"
              variant="primary"
              isLoading={isProcessingPayment}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-black"
            >
              <span>📤 Submit Payment for Verification</span>
              <span>({formatCurrency(displayAmount, displayCurrency, displaySymbol)}) →</span>
            </Button>
          </div>
        ) : undefined
      }
    >
      {payingInvoice && (
        <div className="flex flex-col">
          {/* Bill Summary Banner */}
          <div className="bg-amber-500/10 border-b border-amber-200 px-6 py-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                {payingInvoice.consultationType}
              </span>
              <p className="text-xs text-stone-700 font-semibold mt-0.5">
                Consultant: {payingInvoice.doctorName} ({payingInvoice.visitDate})
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Total Amount</span>
              <span className="text-xl font-black text-stone-900">{formatCurrency(displayAmount, displayCurrency, displaySymbol)}</span>
            </div>
          </div>

          {paymentError && (
            <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <span>⚠️</span>
              <span>{paymentError}</span>
            </div>
          )}

          {/* Payment Method Selector Tabs */}
          <div className="px-6 pt-4 pb-2 border-b border-stone-100 flex items-center gap-2 bg-stone-50/50">
            <button
              type="button"
              onClick={() => setPaymentMethodTab("upi")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${paymentMethodTab === "upi"
                  ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-100"
                }`}
            >
              <span>📱</span> UPI / QR Code
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethodTab("card")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${paymentMethodTab === "card"
                  ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-100"
                }`}
            >
              <span>💳</span> Credit / Debit Card
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethodTab("netbanking")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${paymentMethodTab === "netbanking"
                  ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                  : "bg-white border-stone-200 text-stone-600 hover:bg-stone-100"
                }`}
            >
              <span>🏦</span> Net Banking
            </button>
          </div>

          {/* Interactive Form Body */}
          <form id="patient-settle-fee-form" onSubmit={handlePayInvoice} className="space-y-4 text-xs">
            {/* ── UPI Tab ─────────────────────────────────────────────────── */}
            {paymentMethodTab === "upi" && (
              <div className="space-y-4">
                <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                  <div className="w-28 h-28 bg-white border border-stone-300 rounded-xl p-2 shadow-xs flex flex-col items-center justify-center flex-shrink-0">
                    <div className="w-full h-full bg-stone-900 p-1 rounded grid grid-cols-4 gap-0.5">
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-amber-400 rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-stone-900 rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-emerald-400 rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-stone-900 rounded-xs" />
                      <div className="bg-white rounded-xs" />
                      <div className="bg-white rounded-xs" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                      Hospital Direct UPI ID
                    </span>
                    <p className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 inline-block">
                      {DOCTOR.UPI_ID}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Scan with GPay, PhonePe, Paytm, or BHIM to send {formatCurrency(displayAmount, displayCurrency, displaySymbol)} directly to {tenant.doctor.title || HOSPITAL.DOCTOR_TITLE}.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5">
                    Select UPI App / Provider:
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "gpay", label: "Google Pay", icon: "🟢", handle: "@oksbi" },
                      { id: "phonepe", label: "PhonePe", icon: "🟣", handle: "@ybl" },
                      { id: "paytm", label: "Paytm", icon: "🔵", handle: "@paytm" },
                      { id: "custom", label: "Any VPA / BHIM", icon: "⚡", handle: "" },
                    ].map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => {
                          setSelectedUpiApp(app.id as "gpay" | "phonepe" | "paytm" | "custom");
                          if (app.handle && (!customPatientUpi || !customPatientUpi.includes("@"))) {
                            const base = customPatientUpi.replace(/@.*/, "") || "patient";
                            setCustomPatientUpi(`${base}${app.handle}`);
                          }
                        }}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${selectedUpiApp === app.id
                            ? "bg-amber-500/10 border-amber-500 text-stone-900 font-bold shadow-xs"
                            : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                          }`}
                      >
                        <div className="text-base">{app.icon}</div>
                        <div className="text-[10px] leading-tight truncate">{app.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Patient UPI ID / VPA"
                  placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                  value={customPatientUpi}
                  onChange={(e) => setCustomPatientUpi(e.target.value)}
                  helperText={customPatientUpi ? "UPI collect request will be sent to this ID." : "Enter your personal VPA to receive the payment collect request."}
                />
              </div>
            )}

            {/* ── Card Tab ────────────────────────────────────────────────── */}
            {paymentMethodTab === "card" && (
              <div className="space-y-3">
                <Input
                  label="Card Number"
                  required
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                />
                <Input
                  label="Cardholder Name"
                  required
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Expiry Date"
                    required
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                  />
                  <Input
                    label="CVV / CVC"
                    type="password"
                    required
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ── Net Banking Tab (All Indian Banks Supported) ────────────── */}
            {paymentMethodTab === "netbanking" && (
              <div className="space-y-3">
                <Input
                  label={`Select Any Indian Bank (${INDIAN_BANKS.length} Available)`}
                  placeholder="Search bank name (e.g. SBI, Canara, Bank of Baroda, Axis...)"
                  value={bankSearchQuery}
                  onChange={(e) => setBankSearchQuery(e.target.value)}
                  helperText={`Selected: ${selectedBank}`}
                />

                <div>
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    Popular Banks:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {INDIAN_BANKS.filter(b => b.category === "popular").map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setSelectedBank(bank.name)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${selectedBank === bank.name
                            ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                            : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                          }`}
                      >
                        {bank.shortName}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                    All Scheduled Indian Commercial Banks:
                  </label>
                  <select
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold outline-none focus:border-amber-500 focus:bg-white transition-all"
                  >
                    {bankSearchQuery.trim() ? (
                      filteredBanks.length > 0 ? (
                        filteredBanks.map((b) => (
                          <option key={b.id} value={b.name}>
                            {b.name} ({b.code}) — {b.category.replace("_", " ").toUpperCase()}
                          </option>
                        ))
                      ) : (
                        <option value="">No matching banks found</option>
                      )
                    ) : (
                      <>
                        <optgroup label="Popular & Public Sector Banks">
                          {filteredBanks.filter((b) => b.category === "popular" || b.category === "public").map((b) => (
                            <option key={b.id} value={b.name}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Private Sector Banks">
                          {filteredBanks.filter((b) => b.category === "private").map((b) => (
                            <option key={b.id} value={b.name}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Small Finance & Digital Payments Banks">
                          {filteredBanks.filter((b) => b.category === "small_finance" || b.category === "payments").map((b) => (
                            <option key={b.id} value={b.name}>
                              {b.name} ({b.code})
                            </option>
                          ))}
                        </optgroup>
                      </>
                    )}
                  </select>
                </div>
              </div>
            )}
          </form>
        </div>
      )}
    </Modal>
  );
};

export default PayConsultationModal;

