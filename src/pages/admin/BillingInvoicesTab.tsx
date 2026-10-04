import React, { useState, useMemo } from "react";
import type { ConsultationInvoice, UserProfile } from "../../types";
import { formatINR, formatDateTime } from "../../utils/format";

interface BillingInvoicesTabProps {
  invoices: ConsultationInvoice[];
  patientList: UserProfile[];
  onOpenReconcileModal: (invoice: ConsultationInvoice) => void;
  onConfirmPayment: (invoiceId: string, paidAt: string, transactionRef?: string) => void;
  onUpdateStatus: (invoiceId: string, status: "pending" | "processing" | "paid") => void;
  onOpenPostFeeModal: (patient: UserProfile) => void;
}

export const BillingInvoicesTab: React.FC<BillingInvoicesTabProps> = ({
  invoices,
  patientList,
  onOpenReconcileModal,
  onConfirmPayment,
  onUpdateStatus,
  onOpenPostFeeModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "processing" | "paid">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Summary Metrics
  const stats = useMemo(() => {
    const totalBilled = invoices.reduce((sum, inv) => sum + (inv.amountINR || 0), 0);
    const paidInvoices = invoices.filter((i) => i.status === "paid");
    const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.amountINR || 0), 0);
    const processingInvoices = invoices.filter((i) => i.status === "processing");
    const totalProcessing = processingInvoices.reduce((sum, inv) => sum + (inv.amountINR || 0), 0);
    const pendingInvoices = invoices.filter((i) => i.status === "pending");
    const totalPending = pendingInvoices.reduce((sum, inv) => sum + (inv.amountINR || 0), 0);

    return {
      totalBilled,
      totalPaid,
      paidCount: paidInvoices.length,
      totalProcessing,
      processingCount: processingInvoices.length,
      totalPending,
      pendingCount: pendingInvoices.length,
      totalCount: invoices.length,
    };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === "" ||
        inv.id.toLowerCase().includes(q) ||
        inv.patientName.toLowerCase().includes(q) ||
        inv.patientId.toLowerCase().includes(q) ||
        (inv.transactionRef && inv.transactionRef.toLowerCase().includes(q)) ||
        (inv.patientUpiId && inv.patientUpiId.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (typeFilter !== "all" && inv.consultationType !== typeFilter) return false;

      return true;
    });
  }, [invoices, searchQuery, statusFilter, typeFilter]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & KPI Summary Banner */}
      <div className="bg-gradient-to-r from-stone-900 via-emerald-950 to-stone-900 text-white p-5 rounded-3xl card-shadow border border-emerald-800/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-xl">
              💳
            </span>
            <div>
              <h2 className="text-base font-extrabold tracking-tight">
                Clinic Billing &amp; Consultation Invoices Hub
              </h2>
              <p className="text-xs text-stone-300 mt-0.5">
                Centralized financial reconciliation, 12-digit UPI UTR audit, and payment settlements
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {patientList.length > 0 && (
            <button
              onClick={() => onOpenPostFeeModal(patientList[0])}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>➕</span> Post Consultation Fee
            </button>
          )}
        </div>
      </div>

      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl card-shadow border bg-white border-stone-200 space-y-1">
          <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">
            Total Billed
          </span>
          <p className="text-xl font-black text-stone-900">{formatINR(stats.totalBilled)}</p>
          <p className="text-[11px] text-stone-500">{stats.totalCount} Invoices Total</p>
        </div>

        <div className="p-4 rounded-2xl card-shadow border bg-emerald-50/50 border-emerald-200 space-y-1">
          <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
            ✓ Collected &amp; Settled
          </span>
          <p className="text-xl font-black text-emerald-900">{formatINR(stats.totalPaid)}</p>
          <p className="text-[11px] text-emerald-700">{stats.paidCount} Paid Invoices</p>
        </div>

        <div className="p-4 rounded-2xl card-shadow border bg-sky-50/60 border-sky-300 space-y-1">
          <span className="text-[10px] font-extrabold text-sky-900 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            Verification Needed
          </span>
          <p className="text-xl font-black text-sky-950">{formatINR(stats.totalProcessing)}</p>
          <p className="text-[11px] text-sky-800">{stats.processingCount} Awaiting UTR Verification</p>
        </div>

        <div className="p-4 rounded-2xl card-shadow border bg-amber-50/50 border-amber-200 space-y-1">
          <span className="text-[10px] font-extrabold text-amber-800 uppercase tracking-wider block">
            ⏳ Awaiting Payment
          </span>
          <p className="text-xl font-black text-amber-900">{formatINR(stats.totalPending)}</p>
          <p className="text-[11px] text-amber-700">{stats.pendingCount} Pending Invoices</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl card-shadow border border-stone-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] max-w-md">
          <input
            type="search"
            placeholder="Search by Invoice ID (#inv-101), Patient, UTR Ref, or UPI ID…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2.5 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status chips */}
          <div className="flex items-center gap-1 bg-stone-100 p-1.5 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === "all" ? "bg-white text-emerald-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              All ({invoices.length})
            </button>
            <button
              onClick={() => setStatusFilter("processing")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === "processing" ? "bg-sky-600 text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              🔔 Verification ({stats.processingCount})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === "pending" ? "bg-amber-500 text-stone-950 shadow-xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              ⏳ Pending ({stats.pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("paid")}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                statusFilter === "paid" ? "bg-emerald-700 text-white shadow-xs" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              ✓ Settled ({stats.paidCount})
            </button>
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-stone-50 border border-stone-300 text-stone-700 outline-none"
          >
            <option value="all">All Consultation Types</option>
            <option value="In-Person Clinic Visit">In-Person Clinic Visit</option>
            <option value="Online Tele-Consultation">Online Tele-Consultation</option>
            <option value="Follow-up Review">Follow-up Review</option>
          </select>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-stone-200 p-6 space-y-2">
            <span className="text-3xl">🧾</span>
            <h4 className="font-bold text-stone-800 text-sm">No invoices found matching current filters</h4>
            <p className="text-stone-500 text-xs">Try adjusting your search query or status filter.</p>
          </div>
        ) : (
          filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className={`p-4 rounded-2xl border transition-all text-xs flex flex-wrap items-center justify-between gap-4 ${
                inv.status === "paid"
                  ? "bg-emerald-50/30 border-emerald-200/90"
                  : inv.status === "processing"
                  ? "bg-sky-50/70 border-sky-300 shadow-xs"
                  : "bg-amber-50/30 border-amber-200/90"
              }`}
            >
              <div className="space-y-1.5 min-w-[280px]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-[10px] bg-stone-900 text-amber-400 px-2.5 py-0.5 rounded-md">
                    #{inv.id}
                  </span>
                  <span className="font-extrabold text-stone-900 text-base">
                    {formatINR(inv.amountINR)}
                  </span>
                  <strong className="text-stone-800 text-xs">· {inv.patientName}</strong>
                  <span className="font-mono text-stone-400 text-[11px]">({inv.patientId})</span>
                  <span className="text-[11px] font-semibold text-stone-600 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                    {inv.consultationType}
                  </span>

                  {/* Status Badge */}
                  {inv.status === "paid" && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] flex items-center gap-1">
                      <span>✓</span> Confirmed &amp; Settled
                    </span>
                  )}
                  {inv.status === "processing" && (
                    <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-900 border border-sky-300 font-extrabold text-[10px] flex items-center gap-1 animate-pulse">
                      <span>🔔</span> Verification Required
                    </span>
                  )}
                  {inv.status === "pending" && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] flex items-center gap-1">
                      <span>⏳</span> Awaiting Patient Payment
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-stone-600">
                  <strong>Visit Date:</strong> {inv.visitDate} · <strong>Notes:</strong> {inv.notes || "Clinical consultation review"}
                </p>

                {/* Patient Payment Submission Details (if processing) */}
                {inv.status === "processing" && (
                  <div className="p-3 bg-white rounded-xl border border-sky-200 text-stone-800 text-[11px] space-y-1.5 shadow-2xs">
                    <p className="font-bold text-sky-900 flex items-center gap-1.5">
                      <span>📩</span> Patient Payment Submission Details:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[10px] font-mono text-stone-600">
                      <div><strong>Method:</strong> {inv.paymentMethod?.toUpperCase()}</div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <strong>Txn / UTR:</strong>
                        <span className="text-stone-900 font-bold">{inv.transactionRef || "Pending"}</span>
                      </div>
                      {inv.patientUpiId && <div><strong>UPI ID:</strong> {inv.patientUpiId}</div>}
                      {inv.selectedBank && <div><strong>Bank:</strong> {inv.selectedBank}</div>}
                    </div>
                  </div>
                )}

                {inv.status === "paid" && (
                  <div className="text-[10px] text-emerald-800 flex flex-wrap items-center gap-2 font-mono">
                    <span>Confirmed at: {inv.paidAt || inv.issuedAt}</span>
                    {inv.paymentMethod && <span>via {inv.paymentMethod.toUpperCase()}</span>}
                    {inv.transactionRef && (
                      <span className="flex items-center gap-1">
                        (Ref: {inv.transactionRef})
                      </span>
                    )}
                    {inv.selectedBank && <span>[{inv.selectedBank}]</span>}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {inv.status === "processing" && (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenReconcileModal(inv)}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                      title="Verify funds received in clinic account and record 12-digit UTR"
                    >
                      <span>✓</span> Confirm &amp; Enter UTR
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onConfirmPayment(
                          inv.id,
                          formatDateTime(new Date())
                        )
                      }
                      className="px-3 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                      title="Quick confirm with current reference"
                    >
                      Quick Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(inv.id, "pending")}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 text-[11px] font-semibold cursor-pointer"
                      title="Re-request payment"
                    >
                      Re-request
                    </button>
                  </>
                )}

                {inv.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => onOpenReconcileModal(inv)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                    title="Mark invoice as paid and enter UTR / cash receipt ref"
                  >
                    <span>✓</span> Mark Paid &amp; Record UTR
                  </button>
                )}

                {inv.status === "paid" && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenReconcileModal(inv)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition-colors cursor-pointer"
                      title="Edit 12-digit UTR or Transaction Reference"
                    >
                      ✏️ Edit UTR
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(inv.id, "pending")}
                      className="text-[10px] text-stone-400 hover:text-stone-700 underline cursor-pointer"
                      title="Revert status to pending"
                    >
                      Mark Pending
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default BillingInvoicesTab;
