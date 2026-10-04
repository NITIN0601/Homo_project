import React from "react";
import { useApp } from "../context/AppContext";
import { THEME_GRADIENTS } from "../config";
import { formatINR } from "../utils/format";

export const TrackingModal: React.FC = () => {
  const { state, closeTrackingModal } = useApp();
  const { trackingModalOrder: order } = state;

  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full card-shadow border border-stone-100 overflow-hidden flex flex-col max-h-[90dvh]"
        style={{ animation: "fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
        role="dialog"
        aria-modal="true"
        aria-label={`Tracking for Order ${order.id}`}
      >
        {/* Header with 3rd party logistics branding */}
        <div
          className="px-4 py-3.5 sm:px-6 sm:py-5 text-white flex items-center justify-between"
          style={{ background: THEME_GRADIENTS.PRIMARY }}
        >
          <div>
            <div className="flex items-center gap-2 text-sage-200 text-xs font-bold uppercase tracking-wider">
              <span>3rd Party Logistics Partner</span>
              <span>•</span>
              <span className="text-white font-black bg-white/20 px-2 py-0.5 rounded">
                {order.courierPartner}
              </span>
            </div>
            <h2 className="text-base sm:text-xl font-extrabold text-white mt-1 flex items-center gap-2">
              Tracking ID: <span className="font-mono text-sage-100">{order.trackingId}</span>
            </h2>
          </div>
          <button
            onClick={closeTrackingModal}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close tracking modal"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Status summary banner */}
          <div className="bg-sage-50 border border-sage-200/60 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-sage-600 font-bold uppercase tracking-wider">Estimated Delivery</p>
              <p className="text-lg font-black text-sage-900">{order.estimatedDelivery}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500 font-medium">Order ID</p>
              <p className="text-sm font-mono font-bold text-stone-800">#{order.id}</p>
            </div>
          </div>

          {/* Live tracking timeline */}
          <div className="space-y-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-4">
              Real-Time Shipment Journey
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
              {order.trackingSteps.map((step, idx) => (
                <div key={idx} className="relative flex items-start gap-4">
                  {/* Step Icon Indicator */}
                  <div
                    className={`absolute -left-6 top-0.5 w-5.5 h-5.5 rounded-full flex items-center justify-center border-2 text-[10px] font-bold transition-all ${
                      step.completed
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : step.active
                        ? "bg-amber-500 border-amber-500 text-white animate-bounce"
                        : "bg-white border-stone-300 text-stone-500"
                    }`}
                  >
                    {step.completed ? "✓" : idx + 1}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm font-bold ${step.completed || step.active ? "text-stone-800" : "text-stone-500"}`}>
                        {step.status}
                      </p>
                      <span className="text-[11px] font-mono text-stone-500">{step.timestamp}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5 flex items-center gap-1">
                      <span>📍</span> {step.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Payment details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-stone-100 pt-4 text-xs">
            <div className="bg-stone-50 rounded-xl p-3.5 space-y-1">
              <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">Shipping Address</span>
              <p className="font-semibold text-stone-800">{order.customerName}</p>
              <p className="text-stone-600 leading-tight">{order.shippingAddress}</p>
            </div>
            <div className="bg-stone-50 rounded-xl p-3.5 space-y-1">
              <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">Payment Method</span>
              <p className="font-semibold text-stone-800 capitalize">{order.paymentMethod}</p>
              <p className="text-stone-600">{order.paymentDetails}</p>
              <p className="font-bold text-sage-800 mt-1 text-sm">Total: {formatINR(order.totalINR)}</p>
            </div>
          </div>

          {/* Ordered items pill list */}
          <div className="border-t border-stone-100 pt-4">
            <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Package Contents ({order.items.length} items)</p>
            <div className="flex flex-wrap gap-2">
              {order.items.map((it, i) => (
                <div key={i} className="bg-stone-100 text-stone-800 text-xs px-3 py-1.5 rounded-lg font-medium">
                  {it.medicine.name} ({it.medicine.potency}) × {it.quantity}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-100 flex justify-end">
          <button
            onClick={closeTrackingModal}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-stone-800 text-white hover:bg-stone-900 transition-colors"
          >
            Close Tracker
          </button>
        </div>
      </div>
    </div>
  );
};
