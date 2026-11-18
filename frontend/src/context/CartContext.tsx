import { createContext, useContext } from "react";
import type { CartItem, Medicine, PlacedOrder } from "../types";

export interface CartContextValue {
  cart: CartItem[];
  isCartOpen: boolean;
  cartTotalItems: number;
  cartSubtotalINR: number;
  orders: PlacedOrder[];
  trackingModalOrder: PlacedOrder | null;
  ordersModalOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addToCart: (medicine: Medicine) => void;
  removeFromCart: (medicineId: string) => void;
  updateQty: (medicineId: string, quantity: number) => void;
  clearCart: () => void;
  placeOrder: (order: PlacedOrder) => void;
  openTrackingModal: (order: PlacedOrder) => void;
  closeTrackingModal: () => void;
  toggleOrdersModal: (open?: boolean) => void;
}

export const CartContext = createContext<CartContextValue | null>(null);

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within an AppProvider or CartProvider");
  }
  return ctx;
}
