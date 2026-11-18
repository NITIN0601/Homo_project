import React from "react";
import { useCart } from "../../context/CartContext";
import type { CartItem } from "../../types";
import { THEME_GRADIENTS } from "../../config";
import { formatINR } from "../../utils/format";

export const CartRow: React.FC<{ item: CartItem; index: number }> = ({ item, index }) => {
  const { updateQty, removeFromCart } = useCart();
  const { medicine, quantity } = item;

  return (
    <tr
      className="border-b border-stone-100 hover:bg-stone-50/60 transition-colors"
      style={{ animation: `fadeInUp 0.3s ease both`, animationDelay: `${index * 0.05}s` }}
    >
      {/* Remedy */}
      <td className="py-4 pl-5 pr-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center
              text-sm font-bold text-white select-none shadow-sm"
            style={{ background: THEME_GRADIENTS.PRIMARY_SHORT }}
            aria-hidden="true"
          >
            {medicine.name.charAt(0)}
          </div>
          <div>
            <p className="text-stone-800 font-semibold text-sm">{medicine.name}</p>
            <p className="text-stone-400 text-xs">{medicine.potency} · {medicine.formulation}</p>
          </div>
        </div>
      </td>

      {/* Unit price */}
      <td className="py-4 px-3 text-stone-600 text-sm font-medium whitespace-nowrap">
        {formatINR(medicine.priceINR)}
      </td>

      {/* Quantity stepper */}
      <td className="py-4 px-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => updateQty(medicine.id, quantity - 1)}
            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200
              text-stone-600 font-bold flex items-center justify-center
              transition-colors active:scale-90 cursor-pointer"
            aria-label={`Decrease ${medicine.name} quantity`}
          >−</button>
          <span className="w-8 text-center text-sm font-bold text-stone-700">
            {quantity}
          </span>
          <button
            onClick={() => updateQty(medicine.id, quantity + 1)}
            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200
              text-stone-600 font-bold flex items-center justify-center
              transition-colors active:scale-90 cursor-pointer"
            aria-label={`Increase ${medicine.name} quantity`}
          >+</button>
        </div>
      </td>

      {/* Line total */}
      <td className="py-4 px-3 text-sage-800 font-bold text-sm whitespace-nowrap">
        {formatINR(medicine.priceINR * quantity)}
      </td>

      {/* Remove */}
      <td className="py-4 pr-5 pl-3">
        <button
          onClick={() => removeFromCart(medicine.id)}
          className="w-8 h-8 rounded-lg hover:bg-red-50 text-stone-300
            hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer"
          aria-label={`Remove ${medicine.name} from cart`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4h6v2" />
          </svg>
        </button>
      </td>
    </tr>
  );
};

export const CartItemList: React.FC<{ items: CartItem[] }> = ({ items }) => {
  return (
    <div className="flex-1 bg-white rounded-2xl card-shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full" aria-label="Cart items">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50/80">
              <th className="text-left py-3 pl-5 pr-3 text-xs font-bold uppercase tracking-widest text-stone-400">
                Remedy
              </th>
              <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-widest text-stone-400">
                Unit Price
              </th>
              <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-widest text-stone-400">
                Qty
              </th>
              <th className="text-left py-3 px-3 text-xs font-bold uppercase tracking-widest text-stone-400">
                Total
              </th>
              <th className="py-3 pr-5 pl-3 w-10" aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <CartRow key={item.medicine.id} item={item} index={i} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
