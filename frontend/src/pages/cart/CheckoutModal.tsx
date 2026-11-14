import React, { useState } from "react";
import type { CartItem, PlacedOrder, AuthUser } from "../../types";
import { Modal } from "../../components/ui";
import { useToast } from "../../context/ToastContext";
import {
  CLINIC,
  LOGISTICS,
  LOGISTICS_HUBS,
  COMMERCE_CONFIG,
  calculateOrderPricing,
  THEME_GRADIENTS,
  type PaymentMethodId,
} from "../../config";
import { formatINR, formatDateTime, splitFullName } from "../../utils/format";
import { validateFullName, validateEmail, validatePhone } from "../../utils/validation";
import { DeliveryAddressForm, type DeliveryAddressData } from "./DeliveryAddressForm";
import { PaymentMethodSelector, type NewCardData } from "./PaymentMethodSelector";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: PlacedOrder) => void;
  cart: CartItem[];
  cartSubtotalINR: number;
  authUser: AuthUser | null;
  isCustomerPaymentsEnabled: boolean;
}

const CheckoutModalBody: React.FC<Omit<CheckoutModalProps, "isOpen">> = ({
  onClose,
  onSubmit,
  cart,
  cartSubtotalINR,
  authUser,
  isCustomerPaymentsEnabled,
}) => {
  const toast = useToast();

  const initialNames = splitFullName(authUser?.name || "Guest Patient");
  const [addressData, setAddressData] = useState<DeliveryAddressData>({
    firstName: authUser?.firstName || initialNames.firstName,
    middleName: authUser?.middleName || initialNames.middleName,
    lastName: authUser?.lastName || initialNames.lastName,
    fullName: authUser?.name || "Guest Patient",
    phone: authUser?.phone || "+91 98765 43210",
    street: authUser?.address?.street || "12 Gandhi Marg",
    city: authUser?.address?.city || CLINIC.ADDRESS.CITY,
    pincode: authUser?.address?.pincode || CLINIC.ADDRESS.PINCODE,
  });

  const [paymentMethod, setPaymentMethod]   = useState<PaymentMethodId>(
    isCustomerPaymentsEnabled ? "gpay" : "cod"
  );
  const [upiId, setUpiId]                   = useState(authUser?.savedUpiId || "patient@okicici");
  const [selectedCardId, setSelectedCardId] = useState<string>(authUser?.savedCards?.[0]?.id || "new");
  const [newCardData, setNewCardData]       = useState<NewCardData>({
    name: "",
    number: "",
    expiry: "",
    cvv: "",
  });

  const [processing, setProcessing] = useState(false);

  const { shipping, tax, total } = calculateOrderPricing(cartSubtotalINR);
  const userCards = authUser?.savedCards || [];

  const handleAddressChange = (updates: Partial<DeliveryAddressData>) => {
    setAddressData((prev) => ({ ...prev, ...updates }));
  };

  const handleNewCardChange = (updates: Partial<NewCardData>) => {
    setNewCardData((prev) => ({ ...prev, ...updates }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const nameVal = validateFullName(addressData.fullName);
    if (!nameVal.isValid) {
      toast.error(nameVal.error || "Please enter a valid full name.");
      return;
    }

    const emailVal = validateEmail(authUser?.email || "guest@example.com");
    if (!emailVal.isValid) {
      toast.error(emailVal.error || "Please enter a valid email address.");
      return;
    }

    const phoneVal = validatePhone(addressData.phone);
    if (!phoneVal.isValid) {
      toast.error(phoneVal.error || "Please enter a valid phone number.");
      return;
    }

    setProcessing(true);

    setTimeout(() => {
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
          const brand = newCardData.number.startsWith("5") ? "Mastercard" : "Visa";
          payDetailsStr = `${brand} (ending in ${newCardData.number.slice(-4) || "9988"})`;
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
        customerName: addressData.fullName,
        customerEmail: authUser?.email || "guest@example.com",
        shippingAddress: `${addressData.street}, ${addressData.city} - ${addressData.pincode}`,
        paymentMethod: paymentMethod,
        paymentDetails: payDetailsStr,
        courierPartner: partner,
        trackingId: randomTrackNumber,
        estimatedDelivery: COMMERCE_CONFIG.ESTIMATED_DELIVERY,
        trackingSteps: [
          { status: "Order Placed & Verified", location: LOGISTICS_HUBS.CLINIC_HUB, timestamp: "Just now", completed: true },
          { status: `Handed over to ${partner}`, location: "Sort Facility Hub", timestamp: "Expected today", completed: false, active: true },
          { status: "In Transit across State Hub", location: "En-Route", timestamp: "Pending", completed: false },
          { status: "Out for Delivery", location: `${addressData.city} Delivery Station`, timestamp: "Pending", completed: false },
          { status: "Package Delivered", location: `${addressData.street}, ${addressData.city}`, timestamp: "Pending", completed: false },
        ],
      };

      setProcessing(false);
      onSubmit(newOrder);
    }, 1000);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Payment & Delivery Details"
      subtitle={authUser ? `User: ${authUser.name} (${authUser.role})` : "Guest Checkout"}
      size="md"
    >
      <form onSubmit={handleFormSubmit} className="p-6 space-y-6 text-xs">
        {/* Delivery Address Section */}
        <DeliveryAddressForm
          data={addressData}
          onChange={handleAddressChange}
        />

        {/* Payment Methods Section */}
        <PaymentMethodSelector
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          isCustomerPaymentsEnabled={isCustomerPaymentsEnabled}
          upiId={upiId}
          onUpiIdChange={setUpiId}
          savedUpiId={authUser?.savedUpiId}
          userCards={userCards}
          selectedCardId={selectedCardId}
          onSelectedCardIdChange={setSelectedCardId}
          newCardData={newCardData}
          onNewCardDataChange={handleNewCardChange}
        />

        {/* Final Submit Button */}
        <div className="pt-4 border-t border-stone-100">
          <button
            type="submit"
            disabled={processing}
            className="w-full py-3.5 rounded-xl font-black text-sm text-white btn-shadow transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            style={{ background: THEME_GRADIENTS.PRIMARY }}
          >
            {processing ? "Processing Order & Generating Tracking ID…" : `Pay ${formatINR(total)} & Place Order →`}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const CheckoutModal: React.FC<CheckoutModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <CheckoutModalBody key={props.authUser?.id || "guest"} {...props} />;
};
