import React from "react";
import type { SavedCard } from "@core/types";
import { COMMERCE_CONFIG, type PaymentMethodId } from "../../../core/config";

export interface NewCardData {
  name: string;
  number: string;
  expiry: string;
  cvv: string;
}

interface PaymentMethodSelectorProps {
  paymentMethod: PaymentMethodId;
  onPaymentMethodChange: (method: PaymentMethodId) => void;
  isCustomerPaymentsEnabled: boolean;
  upiId: string;
  onUpiIdChange: (upi: string) => void;
  savedUpiId?: string;
  userCards: SavedCard[];
  selectedCardId: string;
  onSelectedCardIdChange: (id: string) => void;
  newCardData: NewCardData;
  onNewCardDataChange: (updates: Partial<NewCardData>) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethod,
  onPaymentMethodChange,
  isCustomerPaymentsEnabled,
  upiId,
  onUpiIdChange,
  savedUpiId,
  userCards,
  selectedCardId,
  onSelectedCardIdChange,
  newCardData,
  onNewCardDataChange,
}) => {
  return (
    <div className="space-y-3 border-t border-stone-100 pt-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-stone-400 flex items-center gap-1.5">
        <span>💳</span> Select Payment Method
        {!isCustomerPaymentsEnabled && (
          <span className="text-[10px] text-amber-700 bg-amber-100 font-bold px-2 py-0.5 rounded-full ml-auto">
            Online Gateway Disabled by Clinic
          </span>
        )}
      </h3>

      <div className={`grid gap-2 ${isCustomerPaymentsEnabled ? "grid-cols-3" : "grid-cols-1"}`}>
        {COMMERCE_CONFIG.PAYMENT_METHODS.filter((m) =>
          isCustomerPaymentsEnabled ? true : m.id === "cod"
        ).map((method) => {
          const isSelected = paymentMethod === method.id;
          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onPaymentMethodChange(method.id)}
              className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                isSelected
                  ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 font-bold text-emerald-800"
                  : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              <span className="text-lg">{method.icon}</span>
              <span className="text-xs">{method.label}</span>
            </button>
          );
        })}
      </div>

      {/* Option Details: GPay / UPI */}
      {paymentMethod === "gpay" && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
          <p className="font-bold text-stone-700">Google Pay &amp; Instant UPI</p>
          {savedUpiId && (
            <div className="bg-emerald-100/60 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs text-emerald-900">
              <span>Saved UPI ID in account: <strong>{savedUpiId}</strong></span>
              <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded">Verified</span>
            </div>
          )}
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">UPI Virtual Payment Address</label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => onUpiIdChange(e.target.value)}
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
                      onChange={() => onSelectedCardIdChange(card.id)}
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
                  onChange={() => onSelectedCardIdChange("new")}
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
                  value={newCardData.name}
                  onChange={(e) => onNewCardDataChange({ name: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-white text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-stone-500 uppercase">Card Number (Visa / MasterCard)</label>
                <input
                  type="text"
                  placeholder="4532 8900 1234 4242"
                  value={newCardData.number}
                  onChange={(e) => onNewCardDataChange({ number: e.target.value })}
                  className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">Expiry (MM/YY)</label>
                  <input
                    type="text"
                    placeholder="12/28"
                    value={newCardData.expiry}
                    onChange={(e) => onNewCardDataChange({ expiry: e.target.value })}
                    className="w-full mt-1 p-2.5 rounded-xl border border-stone-200 bg-white font-mono text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-stone-500 uppercase">CVV</label>
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="123"
                    value={newCardData.cvv}
                    onChange={(e) => onNewCardDataChange({ cvv: e.target.value })}
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
  );
};

export default PaymentMethodSelector;
