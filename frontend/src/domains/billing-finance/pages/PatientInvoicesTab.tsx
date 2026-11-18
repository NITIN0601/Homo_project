import React from "react";
import { useTenant } from "../../../core/tenancy/branding/ThemeProvider";
import type { ConsultationInvoice } from "@core/types";
import { HOSPITAL } from "../../../core/config";
import { formatCurrency } from "../../../shared/utils/format";
import { Button, Badge } from "../../../shared/ui";
import { InvoiceSummaryMetrics } from "../components/InvoiceSummaryMetrics";
import { InvoiceStatusBadge } from "../components/InvoiceStatusBadge";

interface PatientInvoicesTabProps {
  patientInvoices: ConsultationInvoice[];
  pendingInvoices: ConsultationInvoice[];
  processingInvoices: ConsultationInvoice[];
  paidInvoices: ConsultationInvoice[];
  totalBilledINR: number;
  totalPendingINR: number;
  totalPaidINR: number;
  onPayInvoice: (invoice: ConsultationInvoice) => void;
  onViewReceipt: (invoice: ConsultationInvoice) => void;
}

export const PatientInvoicesTab: React.FC<PatientInvoicesTabProps> = ({
  patientInvoices,
  pendingInvoices,
  processingInvoices,
  paidInvoices,
  totalBilledINR,
  totalPendingINR,
  totalPaidINR,
  onPayInvoice,
  onViewReceipt,
}) => {
  const { tenant } = useTenant();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Financial Summary KPI Cards (SSOT Shared Primitive) */}
      <InvoiceSummaryMetrics
        metrics={{
          totalBilledINR,
          totalInvoicesCount: patientInvoices.length,
          totalPendingINR,
          pendingCount: pendingInvoices.length,
          processingCount: processingInvoices.length,
          totalPaidINR,
          paidCount: paidInvoices.length,
        }}
        currency={tenant.currency}
        currencySymbol={tenant.currencySymbol}
      />

      {/* ── Consultation Fees & Online Invoicing ───────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
            <span>💳</span> Consultation Fees & Invoicing ({patientInvoices.length} Records)
          </h2>
          {pendingInvoices.length > 0 && (
            <Badge variant="warning" size="sm" pulse>
              {pendingInvoices.length} Payment Due
            </Badge>
          )}
        </div>

        {/* Urgent / Outstanding Consultation Fee Alert Card */}
        {pendingInvoices.length > 0 && (
          <div className="space-y-3">
            {pendingInvoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border-2 border-amber-400 rounded-3xl p-5 card-shadow transition-all space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 font-black flex items-center justify-center text-lg shadow-xs">
                      💳
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-xs font-black text-amber-900 uppercase tracking-wider">
                          Doctor Consultation Fee Posted
                        </span>
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                          #{inv.id}
                        </span>
                        <Badge variant="warning" size="micro">
                          Action Required
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">
                        Consultant: <strong>{inv.doctorName}</strong> · Visit Date: <strong>{inv.visitDate}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                        Amount Due
                      </span>
                      <span className="text-xl font-black text-stone-900">
                        {formatCurrency(inv.amount ?? inv.amountINR, inv.currency || tenant.currency, inv.currencySymbol || tenant.currencySymbol)}
                      </span>
                    </div>

                    {tenant.features.enableCustomerPayments ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onPayInvoice(inv)}
                        className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-black"
                      >
                        <span>💳</span> Settle Fee Online ({formatCurrency(inv.amount ?? inv.amountINR, inv.currency || tenant.currency, inv.currencySymbol || tenant.currencySymbol)}) →
                      </Button>
                    ) : (
                      <div className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded-xl text-xs font-semibold border border-stone-200">
                        🏥 Settle at reception desk
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-600 bg-white/70 p-3 rounded-2xl border border-amber-100">
                  <div>
                    <strong>Consultation Mode:</strong> {inv.consultationType}
                  </div>
                  <div>
                    <strong>Clinical Billing Notes:</strong> {inv.notes || "Case taking evaluation & totality assessment"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Processing Invoices — Submitted by Patient, Awaiting Doctor Confirmation ── */}
        {processingInvoices.length > 0 && (
          <div className="space-y-3">
            {processingInvoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-white border-2 border-sky-400 rounded-3xl p-5 card-shadow transition-all space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white font-black flex items-center justify-center text-lg shadow-xs animate-pulse">
                      ⏳
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-xs font-black text-sky-900 uppercase tracking-wider">
                          Payment Under Doctor Verification
                        </span>
                        <span className="bg-sky-100 text-sky-900 border border-sky-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                          #{inv.id}
                        </span>
                        <Badge variant="info" size="micro" pulse>
                          Status: Processing Verification
                        </Badge>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">
                        Consultant: <strong>{inv.doctorName}</strong> · Visit Date: <strong>{inv.visitDate}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                      Submitted Amount
                    </span>
                    <span className="text-xl font-black text-stone-900">
                      {formatCurrency(inv.amount ?? inv.amountINR, inv.currency || tenant.currency, inv.currencySymbol || tenant.currencySymbol)}
                    </span>
                  </div>
                </div>

                {/* 3-Step Lifecycle Visualizer */}
                <div className="bg-white/90 p-3.5 rounded-2xl border border-sky-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between text-[11px] font-bold gap-2">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <span>✓</span> 1. Consultation Fee Posted
                    </span>
                    <span className="text-sky-700 flex items-center gap-1 font-extrabold">
                      <span>⏳</span> 2. Payment Details Submitted (Current)
                    </span>
                    <span className="text-stone-400 flex items-center gap-1">
                      <span>🔒</span> 3. Doctor Confirmed & Receipt
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-600 w-1/3" />
                    <div className="bg-sky-500 w-1/3 animate-pulse" />
                    <div className="bg-stone-300 w-1/3" />
                  </div>
                </div>

                {/* Submission Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-700 bg-white/70 p-3 rounded-2xl border border-sky-100 font-mono">
                  <div>
                    <strong>Payment Mode:</strong> {inv.paymentMethod?.toUpperCase()}
                    {inv.selectedBank && ` · ${inv.selectedBank}`}
                  </div>
                  <div>
                    <strong>Txn / UTR Ref:</strong> <span className="font-bold text-stone-900">{inv.transactionRef}</span>
                  </div>
                  {inv.patientUpiId && (
                    <div>
                      <strong>Patient UPI:</strong> {inv.patientUpiId}
                    </div>
                  )}
                  <div>
                    <strong>Submitted At:</strong> {inv.submittedAt}
                  </div>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-[11px] text-sky-900 flex items-start gap-2">
                  <span className="text-base flex-shrink-0">ℹ️</span>
                  <p>
                    Your payment details have been forwarded to {tenant.doctor.title || HOSPITAL.DOCTOR_TITLE}'s hospital console. Once the hospital confirms the credit in their bank/UPI accounts, your status will update to <strong>"Confirmed"</strong> and your official digital tax receipt will unlock automatically.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Previously Paid / Settled Invoices List */}
        {paidInvoices.length > 0 && (
          <div className="bg-white rounded-3xl p-5 card-shadow border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <h3 className="font-bold text-stone-800 text-xs flex items-center gap-2">
                <span>🧾</span> Official Paid Consultation Receipts ({paidInvoices.length})
              </h3>
              <span className="text-[11px] text-stone-400">Digital Tax-Exempt Healthcare Receipts</span>
            </div>

            <div className="divide-y divide-stone-100">
              {paidInvoices.map((inv) => (
                <div key={inv.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                        #{inv.id}
                      </span>
                      <strong className="text-stone-900 font-bold">{formatCurrency(inv.amount ?? inv.amountINR, inv.currency || tenant.currency, inv.currencySymbol || tenant.currencySymbol)}</strong>
                      <span className="text-stone-500">· {inv.consultationType}</span>
                      <InvoiceStatusBadge status={inv.status} size="micro" />
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Visit Date: {inv.visitDate} · Settled on: {inv.paidAt || inv.issuedAt}
                      {inv.transactionRef && <span className="font-mono ml-2">(Ref: {inv.transactionRef})</span>}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onViewReceipt(inv)}
                  >
                    <span>🧾</span> View Receipt
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {patientInvoices.length === 0 && (
          <div className="bg-white rounded-3xl p-5 card-shadow border border-stone-200/80 text-center py-6 text-xs text-stone-500 space-y-1">
            <span>✨</span>
            <p className="font-semibold text-stone-700">All Consultation Accounts Up to Date</p>
            <p className="text-[11px] text-stone-400">
              When your doctor posts a consultation fee after your visit, it will appear here for 1-click settlement.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientInvoicesTab;

