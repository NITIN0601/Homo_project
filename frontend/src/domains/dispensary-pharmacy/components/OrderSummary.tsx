import React from "react";
import { Button } from "../../../shared/ui";
import { calculateOrderPricing } from "../../../core/config";
import { formatINR } from "../../../shared/utils/format";

const SummaryRow: React.FC<{
  label: string;
  value: string;
  bold?: boolean;
  valueClass?: string;
}> = ({ label, value, bold, valueClass }) => (
  <div className="flex justify-between items-center">
    <span className={bold ? "font-bold text-stone-800" : "text-stone-500"}>{label}</span>
    <span className={`${bold ? "font-bold text-stone-800 text-base" : "font-medium text-stone-600"} ${valueClass ?? ""}`}>
      {value}
    </span>
  </div>
);

export const OrderSummary: React.FC<{
  subtotal: number;
  onCheckout: () => void;
  onClear: () => void;
}> = ({ subtotal, onCheckout, onClear }) => {
  const { shipping, tax, total, isFreeShipping, amountNeededForFreeShipping } = calculateOrderPricing(subtotal);

  return (
    <aside
      className="bg-white rounded-2xl card-shadow p-5 space-y-4 h-fit sticky top-[76px]"
      aria-label="Order summary"
    >
      <h2 className="text-stone-800 font-bold text-base">Order Summary</h2>

      <div className="space-y-2.5 text-sm">
        <SummaryRow label="Subtotal" value={formatINR(subtotal)} />
        <SummaryRow
          label="Shipping"
          value={isFreeShipping ? "Free 🎉" : formatINR(shipping)}
          valueClass={isFreeShipping ? "text-sage-600 font-semibold" : "text-stone-600"}
        />
        <SummaryRow label="GST (5%)" value={formatINR(tax)} />
        <div className="h-px bg-stone-100" role="separator" />
        <SummaryRow
          label="Total"
          value={formatINR(total)}
          bold
        />
      </div>

      {!isFreeShipping && (
        <div className="bg-amber-50 rounded-xl px-3 py-2.5 text-xs text-amber-700 font-medium">
          Add {formatINR(amountNeededForFreeShipping)} more for free shipping!
        </div>
      )}

      <Button
        id="checkout-final-btn"
        onClick={onCheckout}
        variant="primary"
        size="lg"
        fullWidth
        className="py-3.5 rounded-xl shadow-md"
      >
        <span>🔒</span> Proceed to Payment & Checkout
      </Button>

      <Button
        id="clear-cart-btn"
        onClick={onClear}
        variant="ghost"
        size="sm"
        fullWidth
        className="text-stone-400 hover:text-rose-500 font-semibold"
      >
        Clear Cart
      </Button>

      {/* Trust signals */}
      <div className="border-t border-stone-100 pt-3 space-y-1.5 text-xs text-stone-400">
        {["🔒 256-bit SSL Secure Checkout", "🚚 BlueDart & Delhivery Logistics", "🏥 AYUSH Certified Remedies"].map((s) => (
          <p key={s}>{s}</p>
        ))}
      </div>
    </aside>
  );
};

export default OrderSummary;
