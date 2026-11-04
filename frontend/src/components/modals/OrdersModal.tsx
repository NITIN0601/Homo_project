import React from "react";
import { useApp } from "../../context/AppContext";
import { formatINR } from "../../utils/format";
import { Modal, Button } from "../ui";

export const OrdersModal: React.FC = () => {
  const { state, toggleOrdersModal, openTrackingModal } = useApp();
  const { ordersModalOpen, orders, authUser } = state;

  // Filter orders for logged-in user if patient, or show all for admin/guest demo
  const userOrders = authUser
    ? orders.filter((o) => o.customerEmail.toLowerCase() === authUser.email.toLowerCase() || authUser.role === "admin")
    : orders;

  return (
    <Modal
      isOpen={ordersModalOpen}
      onClose={() => toggleOrdersModal(false)}
      title="My Orders & Tracking"
      subtitle={authUser ? `Viewing orders for ${authUser.name} (${userOrders.length} orders)` : "Guest & Demo Orders"}
      size="lg"
      footer={
        <div className="flex justify-end w-full">
          <Button variant="ghost" onClick={() => toggleOrdersModal(false)}>
            Close
          </Button>
        </div>
      }
    >
      <div className="p-3.5 sm:p-6 space-y-3 sm:space-y-4">
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
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    toggleOrdersModal(false);
                    openTrackingModal(order);
                  }}
                >
                  <span>🚚</span> Track Order Live
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};
