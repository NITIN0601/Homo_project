import React from "react";
import { Button } from "../../../shared/ui";
import type { PlacedOrder } from "@core/types";

interface OrderSuccessViewProps {
  order: PlacedOrder;
  onContinueShopping: () => void;
  onTrackPackage: (order: PlacedOrder) => void;
}

export const OrderSuccessView: React.FC<OrderSuccessViewProps> = ({
  order,
  onContinueShopping,
  onTrackPackage,
}) => {
  return (
    <div
      className="max-w-2xl mx-auto py-8 space-y-6"
      style={{ animation: "fadeInUp 0.4s ease both" }}
      role="status"
      aria-live="polite"
    >
      <div className="bg-white rounded-3xl p-8 card-shadow border border-stone-100 text-center space-y-5">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto shadow-inner">
          ✓
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">
            Order Confirmed &amp; Dispatched to Pharmacy
          </span>
          <h1 className="text-2xl font-bold text-stone-800 mt-1">Thank you for your order!</h1>
          <p className="text-stone-400 text-sm mt-1">
            Order Reference: <strong className="text-stone-700 font-mono">{order.id}</strong>
          </p>
        </div>

        {/* Tracking Highlights Pill */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-left space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Tracking Number:</span>
            <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded-md border border-emerald-300 text-emerald-950">
              {order.trackingId}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span>Logistics Partner:</span>
            <span className="font-semibold text-stone-800">{order.courierPartner}</span>
          </div>
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span>Est. Delivery:</span>
            <span className="font-semibold text-emerald-800">{order.estimatedDelivery}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            id="track-shipment-btn"
            onClick={() => onTrackPackage(order)}
            variant="outline"
            fullWidth
            className="rounded-xl border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-bold"
          >
            📦 Track Live Shipment
          </Button>
          <Button
            id="continue-shopping-btn"
            onClick={onContinueShopping}
            variant="primary"
            fullWidth
            className="rounded-xl font-bold"
          >
            Continue Browsing Remedies →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccessView;
