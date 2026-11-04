import React, { useState, useMemo } from "react";
import type { PharmacyPurchaseOrder } from "./types";
import { DISPATCH_STATUS_CONFIG, type DispatchStatusKey } from "../../config";

interface DispatchesTabProps {
  orders: PharmacyPurchaseOrder[];
  onOpenBatchModal: () => void;
  onInspectOrder: (order: PharmacyPurchaseOrder) => void;
  onSimulateLogisticsScan: (orderId: string) => void;
  onMarkDeliveredImmediately: (order: PharmacyPurchaseOrder) => void;
}

export const DispatchesTab: React.FC<DispatchesTabProps> = ({
  orders,
  onOpenBatchModal,
  onInspectOrder,
  onSimulateLogisticsScan,
  onMarkDeliveredImmediately,
}) => {
  const [carrierFilter, setCarrierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === "" ||
        order.id.toLowerCase().includes(q) ||
        order.trackingNumber.toLowerCase().includes(q) ||
        order.supplierSummary.toLowerCase().includes(q) ||
        order.courierPartner.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (carrierFilter !== "all" && !order.courierPartner.toLowerCase().includes(carrierFilter.toLowerCase())) {
        return false;
      }
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [orders, searchQuery, carrierFilter, statusFilter]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Real-Time PO Tracking Header Banner */}
      <div className="bg-gradient-to-r from-sky-950 via-indigo-950 to-stone-900 text-white p-5 rounded-3xl card-shadow border border-sky-600/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold flex items-center gap-2">
              <span>🚚</span> Real-Time Pharmacy Purchase Orders &amp; Logistics Tracking Hub
            </h2>
            <span className="bg-sky-500/20 text-sky-200 border border-sky-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
              Live Carrier Simulation Active
            </span>
          </div>
          <p className="text-xs text-sky-200/90 mt-0.5">
            Auto-progresses checkpoints in background · Click "Inspect Route" to preview carrier transit checkpoints
          </p>
        </div>

        <button
          onClick={onOpenBatchModal}
          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-stone-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
        >
          <span>📦</span> New Batch Requisition
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-3xl card-shadow border border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex-1 min-w-[200px] max-w-sm">
          <input
            type="search"
            placeholder="Search by PO ID (#PO-BATCH), Tracking AWB, or Supplier…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2 bg-stone-50 focus:bg-white outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status chips */}
          <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
            {["all", "in_transit", "out_for_delivery", "delivered"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer capitalize ${
                  statusFilter === st ? "bg-white text-stone-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
                }`}
              >
                {st === "all" ? "All Status" : st.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {/* Carrier selector */}
          <select
            value={carrierFilter}
            onChange={(e) => setCarrierFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white font-bold text-xs outline-none"
          >
            <option value="all">All Couriers</option>
            <option value="bluedart">BlueDart Express</option>
            <option value="delhivery">Delhivery</option>
          </select>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-stone-200 p-6 space-y-2">
            <span className="text-3xl">🚚</span>
            <h4 className="font-bold text-stone-800 text-sm">No logistics orders found matching criteria</h4>
            <p className="text-stone-500 text-xs">Try clearing filters or create a new pharmacy batch requisition.</p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const statusCfg = DISPATCH_STATUS_CONFIG[order.status as DispatchStatusKey] || DISPATCH_STATUS_CONFIG.in_transit;

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl card-shadow border border-stone-200/90 p-5 space-y-4 hover:border-sky-300 transition-all text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs bg-stone-900 text-amber-400 px-2.5 py-0.5 rounded">
                        {order.id}
                      </span>
                      <strong className="text-stone-900 text-sm">{order.courierPartner}</strong>
                      <span className="font-mono text-stone-500 text-[11px]">AWB: {order.trackingNumber}</span>
                    </div>
                    <p className="text-stone-500 text-[11px] mt-0.5">
                      Dispatched on {order.timestamp} via{" "}
                      <span className="capitalize font-bold text-stone-700">{order.dispatchChannel}</span> · Supplier:{" "}
                      <strong>{order.supplierSummary}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full font-black text-[11px] flex items-center gap-1.5 ${statusCfg.badgeClass}`}
                    >
                      <span>{statusCfg.icon}</span>
                      <span>{statusCfg.label}</span>
                    </span>
                  </div>
                </div>

                {/* Items in order */}
                <div>
                  <span className="font-extrabold text-[10px] text-stone-400 uppercase tracking-wider block mb-1">
                    Requisition Batch Contents ({order.totalQuantity} Total Units):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {order.items.map((it, idx) => (
                      <span
                        key={idx}
                        className="bg-stone-50 border border-stone-200/80 px-2.5 py-1 rounded-xl text-[11px] text-stone-800 font-semibold"
                      >
                        <strong>{it.medicineName}</strong> {it.potency} —{" "}
                        <span className="text-emerald-700 font-bold">{it.quantity} Units</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Checkpoint Progress Timeline */}
                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-stone-700">
                      Current Milestone:{" "}
                      <span className="text-sky-900 font-black">
                        {order.checkpoints[order.currentCheckpointIdx]?.title || "In Transit"}
                      </span>
                    </span>
                    <span className="text-stone-500 font-mono">
                      Est. Delivery: <strong>{order.estimatedDelivery}</strong>
                    </span>
                  </div>

                  {/* Horizontal progress dots */}
                  <div className="flex items-center justify-between relative pt-2">
                    <div className="absolute top-4 left-3 right-3 h-1 bg-stone-200 -z-0" />
                    <div
                      className="absolute top-4 left-3 h-1 bg-emerald-500 transition-all duration-500 -z-0"
                      style={{
                        width: `${(order.currentCheckpointIdx / (order.checkpoints.length - 1)) * 100}%`,
                      }}
                    />

                    {order.checkpoints.map((cp, idx) => (
                      <div key={idx} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-black shadow-xs ${
                            cp.completed
                              ? "bg-emerald-600 text-white"
                              : cp.current
                              ? "bg-sky-500 text-white animate-pulse ring-2 ring-sky-300"
                              : "bg-stone-300 text-stone-600"
                          }`}
                        >
                          {cp.completed ? "✓" : idx + 1}
                        </div>
                        <span className="text-[9px] text-stone-500 text-center max-w-[80px] line-clamp-1 mt-1 font-medium">
                          {cp.location.split(",")[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
                  <button
                    onClick={() => onInspectOrder(order)}
                    className="text-sky-800 hover:text-sky-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>🔍</span> Inspect Full Logistics Timeline →
                  </button>

                  <div className="flex items-center gap-2">
                    {order.status !== "delivered" && (
                      <>
                        <button
                          onClick={() => onSimulateLogisticsScan(order.id)}
                          className="px-3 py-1.5 rounded-xl bg-sky-100 hover:bg-sky-200 text-sky-900 font-bold text-xs transition-all cursor-pointer active:scale-95"
                          title="Simulate next live GPS waypoint checkpoint scan"
                        >
                          ⚡ Simulate Live Scan
                        </button>
                        <button
                          onClick={() => onMarkDeliveredImmediately(order)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
                          title="Instantly mark delivered and add units directly to live clinic stock inventory"
                        >
                          ✓ Mark Delivered &amp; Restock
                        </button>
                      </>
                    )}
                    {order.status === "delivered" && (
                      <span className="text-emerald-700 font-bold text-xs flex items-center gap-1">
                        <span>✓</span> Restocked into Clinic Dispensary
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DispatchesTab;
