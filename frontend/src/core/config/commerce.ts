/**
 * ─── Commerce, Orders & Pricing SSOT Configuration ───────────────────────────
 * Single Source of Truth for free shipping thresholds, delivery fees, tax rates,
 * currency formatting tokens, and order calculation logic.
 */

export const COMMERCE_CONFIG = {
  // Shipping thresholds & charges
  FREE_SHIPPING_THRESHOLD: 499,
  STANDARD_SHIPPING_FEE: 49,

  // Taxation (GST for homeopathic medicines)
  TAX_RATE: 0.05, // 5% GST

  // Delivery timelines
  ESTIMATED_DELIVERY: "In 2-3 Business Days",
  ESTIMATED_DELIVERY_DAYS_MIN: 2,
  ESTIMATED_DELIVERY_DAYS_MAX: 3,

  // Currency
  CURRENCY_SYMBOL: "₹",
  CURRENCY_CODE: "INR",
  CURRENCY_LOCALE: "en-IN",

  // Payment methods
  DEFAULT_PAYMENT_METHOD: "cod" as const,
  PAYMENT_METHODS: [
    {
      id: "cod",
      label: "Cash on Delivery",
      description: "Pay cash or UPI directly to the courier agent upon doorstep delivery.",
      icon: "💵",
    },
    {
      id: "gpay",
      label: "Google Pay / UPI",
      description: "Instant UPI payment with GPay, PhonePe, or Paytm.",
      icon: "⚡",
    },
    {
      id: "card",
      label: "Credit / Debit Card",
      description: "Pay with Visa, Mastercard, RuPay, or Maestro.",
      icon: "💳",
    },
  ] as const,

  // Order status badge styling tokens
  ORDER_STATUSES: {
    Delivered:  { label: "Delivered", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", icon: "✓" },
    Shipped:    { label: "Shipped", bg: "bg-sky-50", text: "text-sky-700", dot: "bg-sky-500", icon: "🚚" },
    Processing: { label: "Processing", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", icon: "⏳" },
    Pending:    { label: "Pending", bg: "bg-stone-100", text: "text-stone-600", dot: "bg-stone-400", icon: "🕒" },
  } as const,
} as const;

export type OrderStatusKey = keyof typeof COMMERCE_CONFIG.ORDER_STATUSES;

export type PaymentMethodId = (typeof COMMERCE_CONFIG.PAYMENT_METHODS)[number]["id"];

/**
 * Pure calculation function for order pricing (SSOT)
 * Calculates subtotal, shipping fee, tax amount, total, and free shipping qualification.
 */
export function calculateOrderPricing(subtotal: number) {
  const isFreeShipping = subtotal >= COMMERCE_CONFIG.FREE_SHIPPING_THRESHOLD;
  const shipping = isFreeShipping ? 0 : COMMERCE_CONFIG.STANDARD_SHIPPING_FEE;
  const tax = Math.round(subtotal * COMMERCE_CONFIG.TAX_RATE);
  const total = subtotal + shipping + tax;
  const amountNeededForFreeShipping = isFreeShipping
    ? 0
    : COMMERCE_CONFIG.FREE_SHIPPING_THRESHOLD - subtotal;

  return {
    subtotal,
    shipping,
    tax,
    total,
    isFreeShipping,
    amountNeededForFreeShipping,
  };
}
