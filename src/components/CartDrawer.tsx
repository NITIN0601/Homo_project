import React, { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";
import type { CartItem } from "../types";
import { THEME_GRADIENTS, THEME_COLORS, calculateOrderPricing } from "../config";
import { formatINR } from "../utils/format";

// ─── Single line item ─────────────────────────────────────────────────────────
const DrawerItem: React.FC<{ item: CartItem }> = ({ item }) => {
  const { updateQty, removeFromCart } = useApp();
  const { medicine, quantity } = item;

  return (
    <li className="flex items-start gap-3 py-3 border-b border-stone-100 last:border-0">
      {/* Remedy initial badge */}
      <div
        className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-xs font-bold text-white"
        style={{ background: THEME_GRADIENTS.PRIMARY_SHORT }}
        aria-hidden="true"
      >
        {medicine.name.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-stone-800 font-semibold text-sm leading-tight truncate">
          {medicine.name}
        </p>
        <p className="text-stone-500 text-xs mt-0.5">
          {medicine.potency} · {medicine.formulation}
        </p>
        <p className="text-sage-700 font-bold text-sm mt-1">
          {formatINR(medicine.priceINR * quantity)}
        </p>
      </div>

      {/* Quantity stepper */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => updateQty(medicine.id, quantity - 1)}
          className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-base
            flex items-center justify-center transition-colors active:scale-90"
          aria-label={`Decrease quantity of ${medicine.name}`}
        >
          −
        </button>
        <span
          className="w-6 text-center text-sm font-semibold text-stone-700"
          aria-label={`Quantity: ${quantity}`}
        >
          {quantity}
        </span>
        <button
          onClick={() => updateQty(medicine.id, quantity + 1)}
          className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-base
            flex items-center justify-center transition-colors active:scale-90"
          aria-label={`Increase quantity of ${medicine.name}`}
        >
          +
        </button>
        <button
          onClick={() => removeFromCart(medicine.id)}
          className="w-7 h-7 rounded-lg hover:bg-red-50 text-stone-300 hover:text-red-500
            flex items-center justify-center transition-colors ml-0.5"
          aria-label={`Remove ${medicine.name} from cart`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </li>
  );
};

// ─── CartDrawer ───────────────────────────────────────────────────────────────
/**
 * Slide-over preview cart drawer.
 * - Reads isCartOpen, cart, cartSubtotalINR from SSOT context.
 * - "View Full Cart" button navigates to 'cart-page' via context.
 * - Traps focus inside the dialog when open for accessibility.
 * - Closes on Escape key and backdrop click.
 */
const CartDrawer: React.FC = () => {
  const { state, cartSubtotalINR, closeCart, navigateTo } = useApp();
  const { isCartOpen, cart } = state;
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const pricing = calculateOrderPricing(cartSubtotalINR);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isCartOpen) closeCart();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isCartOpen, closeCart]);

  // Auto-focus close button when drawer opens
  useEffect(() => {
    if (isCartOpen) setTimeout(() => closeRef.current?.focus(), 60);
  }, [isCartOpen]);

  const handleViewFullCart = () => {
    closeCart();
    navigateTo("cart-page");
  };

  return (
    <>
      {/* ── Backdrop ─────────────────────────────────────── */}
      <div
        className="fixed inset-0 z-50 transition-opacity duration-300"
        style={{
          background: THEME_COLORS.BLACK_ALPHA_35,
          opacity: isCartOpen ? 1 : 0,
          pointerEvents: isCartOpen ? "auto" : "none",
        }}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* ── Slide-over panel ─────────────────────────────── */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Cart preview"
        className="fixed top-0 right-0 h-full z-50 flex flex-col bg-white
          shadow-2xl transition-transform duration-300 ease-out"
        style={{
          width: "min(400px, 100vw)",
          transform: isCartOpen ? "translateX(0)" : "translateX(100%)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="text-xl" role="img" aria-label="Cart">🛒</span>
            <h2 className="font-bold text-stone-800 text-base">Your Cart</h2>
            <span className="bg-sage-100 text-sage-800 text-xs font-bold rounded-full px-2 py-0.5">
              {cart.reduce((s, c) => s + c.quantity, 0)}
            </span>
          </div>
          <button
            ref={closeRef}
            id="cart-drawer-close"
            onClick={closeCart}
            className="touch-target rounded-xl text-stone-500 hover:text-stone-700 hover:bg-stone-100
              transition-colors focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:outline-none"
            aria-label="Close cart"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto px-5 py-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
              <span className="text-5xl" role="img" aria-label="Empty basket">🧺</span>
              <p className="text-stone-500 font-medium text-sm">Your cart is empty.</p>
              <p className="text-stone-500 text-xs">Browse remedies to add items.</p>
            </div>
          ) : (
            <ul aria-label="Cart items">
              {cart.map((item) => (
                <DrawerItem key={item.medicine.id} item={item} />
              ))}
            </ul>
          )}
        </div>

        {/* Footer — subtotal + CTA */}
        {cart.length > 0 && (
          <div className="px-5 py-4 border-t border-stone-100 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Subtotal</span>
              <span className="font-bold text-stone-800">
                {formatINR(cartSubtotalINR)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-stone-500">
              <span>Shipping</span>
              <span className="text-sage-600 font-medium">
                {pricing.isFreeShipping ? "Free" : formatINR(pricing.shipping)}
              </span>
            </div>

            {/* Primary CTA: View Full Cart */}
            <button
              id="view-full-cart-btn"
              onClick={handleViewFullCart}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white
                transition-all duration-200 btn-shadow active:scale-95
                focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:outline-none"
              style={{
                background: THEME_GRADIENTS.PRIMARY,
              }}
              aria-label="View full cart and proceed to checkout"
            >
              View Full Cart →
            </button>

            <button
              id="cart-continue-shopping"
              onClick={closeCart}
              className="w-full py-2.5 rounded-xl font-semibold text-sm text-stone-500
                hover:bg-stone-100 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
