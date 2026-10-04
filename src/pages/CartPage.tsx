import React, { useState } from "react";
import { useApp } from "../context/AppContext";
import type { CartItem, PlacedOrder } from "../types";
import PhoneInput from "../components/PhoneInput";
import {
  CLINIC,
  LOGISTICS,
  LOGISTICS_HUBS,
  COMMERCE_CONFIG,
  calculateOrderPricing,
  THEME_GRADIENTS,
} from "../config";
import { formatINR, formatDateTime } from "../utils/format";
import { validateFullName, validateEmail, validatePhone } from "../utils/validation";

// ─── Cart row ─────────────────────────────────────────────────────────────────
const CartRow: React.FC<{ item: CartItem; index: number }> = ({ item, index }) => {
  const { updateQty, removeFromCart } = useApp();
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
              transition-colors active:scale-90"
            aria-label={`Decrease ${medicine.name} quantity`}
          >−</button>
          <span className="w-8 text-center text-sm font-bold text-stone-700">
            {quantity}
          </span>
          <button
            onClick={() => updateQty(medicine.id, quantity + 1)}
            className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200
              text-stone-600 font-bold flex items-center justify-center
              transition-colors active:scale-90"
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
            hover:text-red-500 flex items-center justify-center transition-colors"
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

// ─── Order summary sidebar ────────────────────────────────────────────────────
const OrderSummary: React.FC<{
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
        <SummaryRow label="Subtotal"      value={formatINR(subtotal)} />
        <SummaryRow
          label="Shipping"
          value={isFreeShipping ? "Free 🎉" : formatINR(shipping)}
          valueClass={isFreeShipping ? "text-sage-600 font-semibold" : "text-stone-600"}
        />
        <SummaryRow label="GST (5%)"     value={formatINR(tax)} />
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

      <button
        id="checkout-final-btn"
        onClick={onCheckout}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-white btn-shadow
          transition-all duration-200 active:scale-95 flex items-center justify-center gap-2
          focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:outline-none"
        style={{ background: THEME_GRADIENTS.PRIMARY }}
      >
        <span>🔒</span> Proceed to Payment & Checkout
      </button>

      <button
        id="clear-cart-btn"
        onClick={onClear}
        className="w-full py-2 text-xs font-semibold text-stone-400
          hover:text-red-500 transition-colors"
        aria-label="Clear all items from cart"
      >
        Clear Cart
      </button>

      {/* Trust signals */}
      <div className="border-t border-stone-100 pt-3 space-y-1.5 text-xs text-stone-400">
        {["🔒 256-bit SSL Secure Checkout", "🚚 BlueDart & Delhivery Logistics", "🏥 AYUSH Certified Remedies"].map((s) => (
          <p key={s}>{s}</p>
        ))}
      </div>
    </aside>
  );
};

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

// ─── CartPage ─────────────────────────────────────────────────────────────────
const CartPage: React.FC = () => {
  const { state, cartSubtotalINR, clearCart, navigateTo, placeOrder, openTrackingModal } = useApp();
  const { cart, authUser } = state;

  // Checkout modal & payment state
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [placedOrderDetails, setPlacedOrderDetails]   = useState<PlacedOrder | null>(null);

  // Form State for Checkout
  const [name, setName]               = useState(authUser?.name || "Guest Patient");
  const [email, _setEmail]             = useState(authUser?.email || "guest@agastyahomoeo.com");
  const [phone, setPhone]             = useState(authUser?.phone || "+91 98765 43210");
  const [street, setStreet]           = useState(authUser?.address?.street || "12 Gandhi Marg");
  const [city, setCity]               = useState(authUser?.address?.city || CLINIC.ADDRESS.CITY);
  const [pincode, setPincode]         = useState(authUser?.address?.pincode || CLINIC.ADDRESS.PINCODE);

  // Payment Options State
  const [paymentMethod, setPaymentMethod]   = useState<"gpay" | "card" | "cod">("gpay");
  const [upiId, setUpiId]                   = useState(authUser?.savedUpiId || "patient@okicici");
  const [selectedCardId, setSelectedCardId] = useState<string>(authUser?.savedCards?.[0]?.id || "new");

  // New Card Inputs
  const [newCardName, setNewCardName]     = useState("");
  const [newCardNumber, setNewCardNumber] = useState("");
  const [newCardExpiry, setNewCardExpiry] = useState("");
  const [newCardCvv, setNewCardCvv]       = useState("");

  const [processing, setProcessing]       = useState(false);

  const { shipping, tax, total } = calculateOrderPricing(cartSubtotalINR);

  const userCards = authUser?.savedCards || [];

  // Generate 3rd Party Logistics Tracking ID
  const handlePlaceOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nameVal = validateFullName(name);
    if (!nameVal.isValid) {
      alert(nameVal.error);
      return;
    }

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      alert(emailVal.error);
      return;
    }

    const phoneVal = validatePhone(phone);
    if (!phoneVal.isValid) {
      alert(phoneVal.error);
      return;
    }

    setProcessing(true);

    setTimeout(() => {
      // Pick random 3rd party logistics partner from SSOT
      const partner = LOGISTICS.PARTNERS[Math.floor(Math.random() * LOGISTICS.PARTNERS.length)];
      const prefix = partner.startsWith("BlueDart") ? "BD" : partner.startsWith("Delhivery") ? "DEL" : "SR";
      const randomTrackNumber = `${prefix}-${Math.floor(10000000 + Math.random() * 90000000)}-IN`;

      let payDetailsStr = "Cash on Delivery";
      if (paymentMethod === "gpay") {
        payDetailsStr = `Google Pay / UPI (${upiId})`;
      } else if (paymentMethod === "card") {
        if (selectedCardId !== "new") {
          const cardObj = userCards.find((c) => c.id === selectedCardId);
          payDetailsStr = `${cardObj?.brand || "Visa"} (${cardObj?.cardNumber || "**** 4242"})`;
        } else {
          const brand = newCardNumber.startsWith("5") ? "Mastercard" : "Visa";
          payDetailsStr = `${brand} (ending in ${newCardNumber.slice(-4) || "9988"})`;
        }
      }

      const newOrder: PlacedOrder = {
        id: `ORD-${Math.floor(10000 + Math.random() * 90000)}`,
        date: formatDateTime(),
        items: [...cart],
        subtotalINR: cartSubtotalINR,
        shippingINR: shipping,
        taxINR: tax,
        totalINR: total,
        customerName: name,
        customerEmail: email,
        shippingAddress: `${street}, ${city} - ${pincode}`,
        paymentMethod: paymentMethod,
        paymentDetails: payDetailsStr,
        courierPartner: partner,
        trackingId: randomTrackNumber,
        estimatedDelivery: COMMERCE_CONFIG.ESTIMATED_DELIVERY,
        trackingSteps: [
          { status: "Order Placed & Verified", location: LOGISTICS_HUBS.CLINIC_HUB, timestamp: "Just now", completed: true },
          { status: `Handed over to ${partner}`, location: "Sort Facility Hub", timestamp: "Expected today", completed: false, active: true },
          { status: "In Transit across State Hub", location: "En-Route", timestamp: "Pending", completed: false },
          { status: "Out for Delivery", location: `${city} Delivery Station`, timestamp: "Pending", completed: false },
          { status: "Package Delivered", location: `${street}, ${city}`, timestamp: "Pending", completed: false },
        ],
      };

      placeOrder(newOrder);
      setPlacedOrderDetails(newOrder);
      setProcessing(false);
      setIsCheckoutModalOpen(false);
    }, 1000);
  };

  // Order Placed Success View with 3rd Party Logistics Tracking ID
  if (placedOrderDetails) {
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
              Order Reference: <span className="font-mono font-bold text-stone-800">#{placedOrderDetails.id}</span>
            </p>
          </div>

          {/* 3rd Party Logistics Tracking Card */}
          <div className="bg-stone-900 text-white rounded-2xl p-6 text-left space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-800 pb-3">
              <div>
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">3rd Party Logistics Integration</p>
                <p className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                  {placedOrderDetails.courierPartner}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Official Tracking ID</p>
                <p className="text-base font-mono font-black text-amber-400">{placedOrderDetails.trackingId}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-stone-400 font-medium">Estimated Delivery</p>
                <p className="font-bold text-white text-sm">{placedOrderDetails.estimatedDelivery}</p>
              </div>
              <div>
                <p className="text-stone-400 font-medium">Payment Mode</p>
                <p className="font-bold text-white text-sm">{placedOrderDetails.paymentDetails}</p>
              </div>
            </div>

            <div className="border-t border-stone-800 pt-3 flex items-center justify-between">
              <span className="text-xs text-stone-400">Live dispatch status available 24/7</span>
              <button
                onClick={() => openTrackingModal(placedOrderDetails)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-stone-950 transition-all flex items-center gap-1.5 active:scale-95 shadow-md"
              >
                <span>🚚</span> Track Package Live
              </button>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <button
              id="continue-shopping-btn"
              onClick={() => { setPlacedOrderDetails(null); navigateTo("home"); }}
              className="px-8 py-3 rounded-2xl font-bold text-sm text-white btn-shadow active:scale-95 transition-all"
              style={{ background: THEME_GRADIENTS.PRIMARY_SHORT }}
            >
              🌿 Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div
        className="max-w-sm mx-auto text-center py-20 space-y-4"
        style={{ animation: "fadeInUp 0.4s ease both" }}
      >
        <span className="text-6xl block" role="img" aria-label="Empty basket">🧺</span>
        <h1 className="text-xl font-bold text-stone-700">Your cart is empty</h1>
        <p className="text-stone-400 text-sm">Browse our remedies and add items to begin.</p>
        <button
          id="shop-now-btn"
          onClick={() => navigateTo("home")}
          className="px-8 py-3 rounded-xl font-bold text-sm text-white active:scale-95 transition-all btn-shadow"
          style={{ background: THEME_GRADIENTS.PRIMARY_SHORT }}
        >
          Shop Remedies
        </button>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeInUp 0.4s ease both" }}>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">🛒 Your Cart & Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Cart table */}
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
                {cart.map((item, i) => (
                  <CartRow key={item.medicine.id} item={item} index={i} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order summary sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <OrderSummary
            subtotal={cartSubtotalINR}
            onCheckout={() => setIsCheckoutModalOpen(true)}
            onClear={clearCart}
          />
        </div>
      </div>

      {/* ─── PAYMENT & CHECKOUT MODAL ─────────────────────────────────────────── */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-white rounded-3xl max-w-xl w-full card-shadow border border-stone-100 overflow-hidden flex flex-col max-h-[90vh]"
            style={{ animation: "fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Payment & Delivery Details"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-stone-900 text-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Payment & Delivery Details</h2>
                <p className="text-stone-400 text-xs">
                  {authUser ? `User: ${authUser.name} (${authUser.role})` : "Guest Checkout"}
                </p>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handlePlaceOrderSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Delivery Address Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                  <span>📍</span> Delivery Address
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full mt-1 p-2.5 rounded-xl border text-xs outline-none transition-all ${
                        name && name.trim().length < 2
                          ? "border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400"
                          : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      }`}
                    />
                    {name && name.trim().length < 2 && (
                      <p className="text-[9px] text-red-500 font-semibold mt-0.5">⚠️ Min 2 characters</p>
                    )}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Phone Number</label>
                    <PhoneInput
                      value={phone}
                      onChange={(full) => setPhone(full)}
                      defaultIso="IND"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Street Address</label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">City</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Pincode</label>
                    <input
                      type="text"
                      required
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className={`w-full mt-1 p-2.5 rounded-xl border text-xs outline-none transition-all ${
                        pincode && !/^\d{6}$/.test(pincode)
                          ? "border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400"
                          : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      }`}
                    />
                    {pincode && !/^\d{6}$/.test(pincode) && (
                      <p className="text-[9px] text-red-500 font-semibold mt-0.5">⚠️ Pincode must be 6 digits</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Payment Methods Section */}
              <div className="space-y-3 border-t border-stone-100 pt-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
                  <span>💳</span> Select Payment Method
                </h3>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("gpay")}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === "gpay"
                        ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 font-bold text-emerald-800"
                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <span className="text-lg">🟢</span>
                    <span className="text-xs">Google Pay / UPI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === "card"
                        ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 font-bold text-emerald-800"
                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <span className="text-lg">💳</span>
                    <span className="text-xs">Visa / Mastercard</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cod")}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === "cod"
                        ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 font-bold text-emerald-800"
                        : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <span className="text-lg">💵</span>
                    <span className="text-xs">Cash on Delivery</span>
                  </button>
                </div>

                {/* Option Details: GPay / UPI */}
                {paymentMethod === "gpay" && (
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
                    <p className="font-bold text-stone-700">Google Pay & Instant UPI</p>
                    {authUser?.savedUpiId && (
                      <div className="bg-emerald-100/60 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-900">
                        <span>Saved UPI ID in account: <strong>{authUser.savedUpiId}</strong></span>
                        <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">Verified</span>
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase">UPI Virtual Payment Address</label>
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@okicici"
                        className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-white text-xs font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Option Details: Card Payment */}
                {paymentMethod === "card" && (
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
                    <p className="font-bold text-stone-700">Credit / Debit Card (Visa / MasterCard)</p>

                    {/* Saved Cards if logged in */}
                    {userCards.length > 0 && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-500 uppercase">Saved Cards in Profile</label>
                        {userCards.map((card) => (
                          <label
                            key={card.id}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                              selectedCardId === card.id
                                ? "border-emerald-600 bg-emerald-50/80 font-bold text-emerald-900"
                                : "border-stone-200 bg-white text-stone-700"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name="saved_card"
                                checked={selectedCardId === card.id}
                                onChange={() => setSelectedCardId(card.id)}
                                className="accent-emerald-600"
                              />
                              <span className="text-base">{card.brand === "Visa" ? "💳 Visa" : "💳 MasterCard"}</span>
                              <span className="font-mono text-xs">{card.cardNumber}</span>
                            </div>
                            <span className="text-[10px] text-stone-400 font-mono">Exp {card.expiry}</span>
                          </label>
                        ))}

                        <label
                          className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                            selectedCardId === "new"
                              ? "border-emerald-600 bg-emerald-50/80 font-bold text-emerald-900"
                              : "border-stone-200 bg-white text-stone-700"
                          }`}
                        >
                          <input
                            type="radio"
                            name="saved_card"
                            checked={selectedCardId === "new"}
                            onChange={() => setSelectedCardId("new")}
                            className="accent-emerald-600"
                          />
                          <span>+ Add New Visa / MasterCard</span>
                        </label>
                      </div>
                    )}

                    {/* New Card Form */}
                    {(selectedCardId === "new" || userCards.length === 0) && (
                      <div className="space-y-3 pt-2 border-t border-stone-200/60">
                        <div>
                          <label className="text-[10px] font-bold text-stone-500 uppercase">Cardholder Name</label>
                          <input
                            type="text"
                            placeholder="John Doe"
                            value={newCardName}
                            onChange={(e) => setNewCardName(e.target.value)}
                            className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-stone-500 uppercase">Card Number (Visa / MasterCard)</label>
                          <input
                            type="text"
                            placeholder="4532 8900 1234 4242"
                            value={newCardNumber}
                            onChange={(e) => setNewCardNumber(e.target.value)}
                            className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 uppercase">Expiry (MM/YY)</label>
                            <input
                              type="text"
                              placeholder="12/28"
                              value={newCardExpiry}
                              onChange={(e) => setNewCardExpiry(e.target.value)}
                              className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-stone-500 uppercase">CVV</label>
                            <input
                              type="password"
                              maxLength={4}
                              placeholder="123"
                              value={newCardCvv}
                              onChange={(e) => setNewCardCvv(e.target.value)}
                              className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Option Details: Cash on Delivery */}
                {paymentMethod === "cod" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 text-xs">
                    <p className="font-bold mb-1">Cash on Delivery Selected</p>
                    <p>Pay cash or UPI directly to the courier agent upon doorstep delivery.</p>
                  </div>
                )}
              </div>

              {/* Final Submit Button */}
              <div className="pt-4 border-t border-stone-100">
                <button
                  type="submit"
                  disabled={processing}
                  className="w-full py-3.5 rounded-xl font-black text-sm text-white btn-shadow transition-all active:scale-95 flex items-center justify-center gap-2"
                  style={{ background: THEME_GRADIENTS.PRIMARY }}
                >
                  {processing ? "Processing Order & Generating Tracking ID…" : `Pay ${formatINR(total)} & Place Order →`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
