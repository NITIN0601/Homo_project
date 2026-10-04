import React from "react";
import { ChevronRightIcon } from "./Icons";
import { COMMERCE_CONFIG, type OrderStatusKey } from "../config";
import { formatINR } from "../utils/format";

// ─── Order data ───────────────────────────────────────────────
type OrderStatus = OrderStatusKey;

interface Order {
  id: string;
  product: string;
  potency: string;
  qty: number;
  date: string;
  amount: string;
  status: OrderStatus;
}

const ORDERS: Order[] = [
  {
    id: "AYU-ORD-1041",
    product: "Arnica Montana",
    potency: "30C",
    qty: 2,
    date: "24 Sep 2026",
    amount: formatINR(320),
    status: "Delivered",
  },
  {
    id: "AYU-ORD-1037",
    product: "Nux Vomica",
    potency: "200C",
    qty: 1,
    date: "10 Sep 2026",
    amount: formatINR(180),
    status: "Delivered",
  },
  {
    id: "AYU-ORD-1029",
    product: "Lycopodium Clavatum",
    potency: "1M",
    qty: 1,
    date: "28 Aug 2026",
    amount: formatINR(420),
    status: "Delivered",
  },
  {
    id: "AYU-ORD-1051",
    product: "Sulphur",
    potency: "30C",
    qty: 3,
    date: "26 Sep 2026",
    amount: formatINR(285),
    status: "Shipped",
  },
  {
    id: "AYU-ORD-1055",
    product: "Belladonna",
    potency: "6C",
    qty: 1,
    date: "28 Sep 2026",
    amount: formatINR(150),
    status: "Processing",
  },
];

const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
  const s = COMMERCE_CONFIG.ORDER_STATUSES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.bg} ${s.text}`}
      aria-label={`Order status: ${status}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`}
        aria-hidden="true"
      />
      {status}
    </span>
  );
};

// ─── Cart summary (mock) ──────────────────────────────────────
const CART_ITEMS = [
  { product: "Pulsatilla", potency: "30C", qty: 1, price: formatINR(210) },
  { product: "Natrum Mur",  potency: "200C", qty: 2, price: formatINR(380) },
];

// ─── Component ────────────────────────────────────────────────
const PurchaseLedger: React.FC = () => (
  <article
    className="bg-white rounded-2xl card-shadow overflow-hidden"
    aria-label="Recent purchases and cart"
  >
    {/* Header */}
    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-stone-100">
      <div className="flex items-center gap-2">
        <span className="text-xl" role="img" aria-label="Receipt">🧾</span>
        <h2 className="text-stone-800 font-bold text-base">Recent Orders</h2>
      </div>
      <button
        id="view-all-orders-btn"
        className="flex items-center gap-1 text-sage-600 text-xs font-semibold hover:text-sage-800 transition-colors touch-target"
        aria-label="View all orders"
      >
        View all
        <ChevronRightIcon />
      </button>
    </div>

    {/* Order list */}
    <ul className="divide-y divide-stone-50" role="list">
      {ORDERS.map((order, idx) => (
        <li
          key={order.id}
          className="px-5 py-3.5 hover:bg-stone-50/60 transition-colors cursor-pointer"
          style={{ animationDelay: `${idx * 0.05}s` }}
          role="listitem"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-stone-800 font-semibold text-sm truncate">
                {order.product}{" "}
                <span className="text-stone-500 font-normal">{order.potency}</span>
              </p>
              <p className="text-stone-500 text-xs mt-0.5">
                {order.date} · Qty {order.qty} · <span className="font-medium text-stone-600">{order.amount}</span>
              </p>
              <p className="text-stone-300 text-[10px] mt-0.5 font-mono">{order.id}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <StatusBadge status={order.status} />
            </div>
          </div>
        </li>
      ))}
    </ul>

    {/* Cart lookup section */}
    <div className="mx-5 mb-5 mt-1">
      <div className="bg-gradient-to-br from-sage-50 to-stone-50 rounded-xl border border-sage-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl" role="img" aria-label="Shopping bag">🛒</span>
          <h3 className="text-stone-700 font-bold text-sm">Current Cart</h3>
          <span className="ml-auto bg-sage-900 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {CART_ITEMS.length}
          </span>
        </div>
        <ul className="space-y-2">
          {CART_ITEMS.map((item) => (
            <li key={item.product} className="flex items-center justify-between text-sm">
              <span className="text-stone-700 font-medium">
                {item.product}{" "}
                <span className="text-stone-500 text-xs">{item.potency}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-stone-500 text-xs">×{item.qty}</span>
                <span className="text-sage-700 font-semibold">{item.price}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t border-sage-100 flex items-center justify-between">
          <span className="text-stone-500 text-xs font-medium">Subtotal</span>
          <span className="text-sage-900 font-bold text-base">₹590</span>
        </div>
        <button
          id="checkout-btn"
          className="mt-3 w-full bg-sage-900 hover:bg-sage-700 text-white font-semibold text-sm rounded-xl py-3 transition-all duration-200 btn-shadow active:scale-95"
          aria-label="Proceed to checkout"
        >
          Proceed to Checkout →
        </button>
      </div>
    </div>
  </article>
);

export default PurchaseLedger;
