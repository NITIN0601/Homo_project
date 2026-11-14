import React from "react";
import { formatINR } from "../../utils/format";
import { Badge } from "../ui/Badge";

export interface InvoiceMetricsData {
  totalBilledINR: number;
  totalInvoicesCount: number;
  totalPendingINR: number;
  pendingCount: number;
  processingCount: number;
  totalPaidINR: number;
  paidCount: number;
}

export interface InvoiceSummaryMetricsProps {
  metrics: InvoiceMetricsData;
  className?: string;
}

export const InvoiceSummaryMetrics: React.FC<InvoiceSummaryMetricsProps> = ({
  metrics,
  className = "",
}) => {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {/* 1. Total Invoiced */}
      <div className="bg-white rounded-3xl p-5 card-shadow border border-stone-200/80">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">
          Total Invoiced
        </span>
        <p className="text-2xl font-black text-stone-900 mt-1">{formatINR(metrics.totalBilledINR)}</p>
        <p className="text-[11px] text-stone-500 mt-0.5">{metrics.totalInvoicesCount} Total Invoices</p>
      </div>

      {/* 2. Pending Due */}
      <div
        className={`rounded-3xl p-5 card-shadow border transition-all ${
          metrics.pendingCount > 0
            ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20"
            : "bg-white border-stone-200/80"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
            Pending Due
          </span>
          {metrics.pendingCount > 0 && (
            <Badge variant="warning" size="micro" pulse>
              Action Needed
            </Badge>
          )}
        </div>
        <p className="text-2xl font-black text-amber-900 mt-1">{formatINR(metrics.totalPendingINR)}</p>
        <p className="text-[11px] text-amber-700/80 mt-0.5">{metrics.pendingCount} Awaiting Settlement</p>
      </div>

      {/* 3. Under Verification */}
      <div
        className={`rounded-3xl p-5 card-shadow border transition-all ${
          metrics.processingCount > 0
            ? "bg-sky-50/80 border-sky-300 ring-2 ring-sky-400/20"
            : "bg-white border-stone-200/80"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">
            Under Verification
          </span>
          {metrics.processingCount > 0 && (
            <Badge variant="info" size="micro" pulse>
              In Review
            </Badge>
          )}
        </div>
        <p className="text-2xl font-black text-sky-900 mt-1">{metrics.processingCount}</p>
        <p className="text-[11px] text-sky-700/80 mt-0.5">Payment Details Submitted</p>
      </div>

      {/* 4. Confirmed & Settled */}
      <div className="bg-emerald-50/80 rounded-3xl p-5 card-shadow border border-emerald-300">
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
          Confirmed &amp; Settled
        </span>
        <p className="text-2xl font-black text-emerald-900 mt-1">{formatINR(metrics.totalPaidINR)}</p>
        <p className="text-[11px] text-emerald-700/80 mt-0.5">{metrics.paidCount} Paid &amp; Reconciled</p>
      </div>
    </div>
  );
};

