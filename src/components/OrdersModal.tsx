import React from "react";
import { useApp } from "../context/AppContext";
import { formatINR } from "../utils/format";

export const OrdersModal: React.FC = () => {
  const { state, toggleOrdersModal, openTrackingModal } = useApp();
  const { ordersModalOpen, orders, authUser } = state;

  if (!ordersModalOpen) return null;

  // Filter orders for logged-in user if patient, or show all for admin/guest demo
  const userOrders = authUser
    ? orders.filter((o) => o.customerEmail.toLowerCase() === authUser.email.toLowerCase() || authUser.role === "admin")
    : orders;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full card-shadow border border-stone-100 overflow-hidden flex flex-col max-h-[88dvh]"
        style={{ animation: "fadeInUp 0.25s ease" }}
        role="dialog"
        aria-modal="true"
        aria-label="My Orders History"
      >
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-5 bg-stone-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white leading-tight">My Orders & Tracking</h2>
              <p className="text-stone-400 text-xs">
                {authUser ? `Viewing orders for ${authUser.name} (${userOrders.length} orders)` : "Guest & Demo Orders"}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleOrdersModal(false)}
            className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close orders modal"
          >
            ✕
          </button>
        </div>

        {/* Orders List */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4 flex-1">
          {userOrders.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <span className="text-5xl block">🛍️</span>
              <p className="font-bold text-stone-700">No orders placed yet</p>
              <p className="text-xs text-stone-400">Place an order from remedies catalogue to see tracking details here.</p>
            </div>
          ) : (
            userOrders.map((order) => (
              <div
                key={order.id}
                className="bg-stone-50 border border-stone-200/80 rounded-2xl p-5 hover:border-emerald-500/40 transition-all space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/60 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Order Reference</span>
                    <p className="text-sm font-mono font-extrabold text-stone-800">#{order.id}</p>
                    <p className="text-xs text-stone-400">{order.date}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Logistics Status</span>
                    <div className="flex items-center justify-end gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        {order.courierPartner}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items & Price */}
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-stone-500 font-semibold">
                      Items: {order.items.map((i) => `${i.medicine.name} (x${i.quantity})`).join(", ")}
                    </p>
                    <p className="text-xs text-stone-400">
                      Payment: <span className="font-medium text-stone-700">{order.paymentDetails}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-emerald-800">{formatINR(order.totalINR)}</p>
                  </div>
                </div>

                {/* Tracking ID Badge & Track Action */}
                <div className="bg-white border border-stone-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">3rd Party Tracking ID</span>
                    <p className="text-xs font-mono font-bold text-stone-800">{order.trackingId}</p>
                  </div>
                  <button
                    onClick={() => {
                      toggleOrdersModal(false);
                      openTrackingModal(order);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <span>🚚</span> Track Order Live
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-100 border-t border-stone-200 flex justify-end">
          <button
            onClick={() => toggleOrdersModal(false)}
            className="px-5 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
