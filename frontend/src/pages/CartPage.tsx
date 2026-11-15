import React, { useState } from "react";
import { useCart, useAuth, useNavigation } from "../context";
import { useTenant } from "../context/ThemeProvider";
import { useFeatureGate } from "../hooks";
import type { PlacedOrder } from "../types";
import { Button } from "../components/ui";
import { api } from "../services/api";
import {
  CartItemList,
  OrderSummary,
  OrderSuccessView,
  CheckoutModal,
} from "./cart";

const CartPage: React.FC = () => {
  const { cart, cartSubtotalINR, clearCart, placeOrder, openTrackingModal } = useCart();
  const { authUser } = useAuth();
  const { navigateTo } = useNavigation();
  const { tenant } = useTenant();

  // Checkout modal & payment state
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [placedOrderDetails, setPlacedOrderDetails]   = useState<PlacedOrder | null>(null);

  const isECommerceEnabled = useFeatureGate("enableECommerce");
  const isCustomerPaymentsEnabled = useFeatureGate("enableCustomerPayments");

  const handleOrderSubmitted = (order: PlacedOrder) => {
    placeOrder(order);
    setPlacedOrderDetails(order);
    setIsCheckoutModalOpen(false);

    // Dynamically sync order to backend persistence
    api.orders.create(order as unknown as Record<string, unknown>).catch((err) => {
      console.warn("Backend order sync notice:", err);
    });
  };

  // Order Placed Success View with 3rd Party Logistics Tracking ID
  if (placedOrderDetails) {
    return (
      <OrderSuccessView
        order={placedOrderDetails}
        onContinueShopping={() => {
          setPlacedOrderDetails(null);
          navigateTo("home");
        }}
        onTrackPackage={(order) => openTrackingModal(order)}
      />
    );
  }

  if (!isECommerceEnabled) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4 animate-fadeIn">
        <span className="text-5xl block">🏥</span>
        <h2 className="text-xl font-bold text-stone-800">In-Clinic Consultations Only</h2>
        <p className="text-stone-500 text-sm">
          {tenant.name} dispenses remedies directly during clinical consultations. Online parcel dispatch is not active for this hospital center.
        </p>
        <Button variant="primary" onClick={() => navigateTo("appointments")}>
          Book Consultation →
        </Button>
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
        <Button
          id="shop-now-btn"
          onClick={() => navigateTo("home")}
          variant="primary"
          size="md"
          className="px-8 py-3 rounded-xl"
        >
          Shop Remedies
        </Button>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeInUp 0.4s ease both" }}>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">🛒 Your Cart &amp; Checkout</h1>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Cart table */}
        <CartItemList items={cart} />

        {/* Order summary sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <OrderSummary
            subtotal={cartSubtotalINR}
            onCheckout={() => setIsCheckoutModalOpen(true)}
            onClear={clearCart}
          />
        </div>
      </div>

      {/* Payment & Delivery Checkout Modal using shared Modal primitive */}
      <CheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        onSubmit={handleOrderSubmitted}
        cart={cart}
        cartSubtotalINR={cartSubtotalINR}
        authUser={authUser}
        isCustomerPaymentsEnabled={isCustomerPaymentsEnabled}
      />
    </div>
  );
};

export { CartPage };
export default CartPage;
