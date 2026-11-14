import React from "react";
import { Button } from "../../components/ui";
import type { PlacedOrder } from "../../types";

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
          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Order Confirmed & Dispatched
          </span>
          <h1 className="text-2xl font-black text-stone-800 mt-2">Thank you for your order!</h1>
          <p className="text-stone-500 text-sm mt-1">
            Order Reference: <span className="font-mono font-bold text-stone-800">#{order.id}</span>
          </p>
        </div>

        {/* 3rd Party Logistics Tracking Card */}
        <div className="bg-stone-900 text-white rounded-2xl p-6 text-left space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
            <div>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">3rd Party Logistics Integration</p>
              <p className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                {order.courierPartner}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Official Tracking ID</p>
              <p className="text-base font-mono font-black text-amber-400">{order.trackingId}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-stone-400 font-medium">Estimated Delivery</p>
              <p className="font-bold text-white text-sm">{order.estimatedDelivery}</p>
            </div>
            <div>
              <p className="text-stone-400 font-medium">Payment Mode</p>
              <p className="font-bold text-white text-sm">{order.paymentDetails}</p>
            </div>
          </div>

          <div className="border-t border-stone-800 pt-3 flex items-center justify-between">
            <span className="text-xs text-stone-400">Live dispatch status available 24/7</span>
            <Button
              onClick={() => onTrackPackage(order)}
              variant="primary"
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-stone-950 font-bold border-transparent"
            >
              <span>🚚</span> Track Package Live
            </Button>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Button
            id="continue-shopping-btn"
            onClick={onContinueShopping}
            variant="primary"
            size="md"
            className="px-8 py-3 rounded-2xl"
          >
            🌿 Continue Shopping
          </Button>
        </div>
      </div>
    </div>
  );
};

