import React from "react";
import { useApp } from "../context/AppContext";

// ─── CartIcon ─────────────────────────────────────────────────────────────────
/**
 * Standalone cart icon with animated badge.
 * - Reads cartTotalItems from context (SSOT).
 * - Clicking toggles the cart drawer.
 * - Meets the 44×44px touch target requirement.
 */
const CartIcon: React.FC = () => {
  const { cartTotalItems, toggleCart } = useApp();

  return (
    <button
      id="cart-icon-btn"
      onClick={toggleCart}
      className="relative touch-target rounded-xl text-stone-600
        hover:text-sage-800 hover:bg-sage-50
        transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:outline-none"
      aria-label={`Shopping cart — ${cartTotalItems} item${cartTotalItems !== 1 ? "s" : ""}`}
      aria-haspopup="dialog"
      type="button"
    >
      {/* Cart SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
      </svg>

      {/* Badge — animated, live region */}
      {cartTotalItems > 0 && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px]
            flex items-center justify-center rounded-full
            bg-red-500 text-white text-[10px] font-bold px-1 leading-none
            transition-transform duration-200 scale-100"
          style={{ animation: "pulse-dot 2s ease-in-out infinite" }}
          aria-live="polite"
          aria-atomic="true"
          role="status"
        >
          {cartTotalItems > 99 ? "99+" : cartTotalItems}
        </span>
      )}
    </button>
  );
};

export default CartIcon;
