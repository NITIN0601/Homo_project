import React, { useState, useMemo } from "react";
import type { BatchOrderItem, PharmacyPurchaseOrder } from "../types";
import { useTenant } from "../../../context/ThemeProvider";
import { CLINIC, THEME_COLORS, LOGISTICS_HUBS } from "../../../config";
import { formatDateISO, formatDateTime } from "../../../utils/format";
import { Modal, Button } from "../../../components/ui";

interface ConsolidatedBatchOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisitionBatch: BatchOrderItem[];
  onUpdateBatchQuantity: (itemId: string, qty: number) => void;
  onToggleAddToBatch: (item: any) => void;
  onDispatchOrder: (order: PharmacyPurchaseOrder) => void;
}

export const ConsolidatedBatchOrderModal: React.FC<ConsolidatedBatchOrderModalProps> = ({
  isOpen,
  onClose,
  requisitionBatch,
  onUpdateBatchQuantity,
  onToggleAddToBatch,
  onDispatchOrder,
}) => {
  const { tenant } = useTenant();
  const [dispatchChannel, setDispatchChannel] = useState<"whatsapp" | "email" | "sms">("whatsapp");

  const totalBatchUnits = useMemo(() => {
    return requisitionBatch.reduce((sum, b) => sum + b.quantity, 0);
  }, [requisitionBatch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requisitionBatch.length === 0) return;

    const poId = `PO-BATCH-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingNum = `BD-${Math.floor(10000000 + Math.random() * 90000000)}-IN`;
    const courier = "BlueDart Express 🚚";
    const supplier = Array.from(new Set(requisitionBatch.map((b) => b.item.supplier))).join(", ");

    const newOrder: PharmacyPurchaseOrder = {
      id: poId,
      batchReference: `REQ-${formatDateISO()}`,
      items: requisitionBatch.map((b) => ({
        medicineId: b.item.id,
        medicineName: b.item.name,
        potency: b.item.potency,
        formulation: b.item.formulation,
        quantity: b.quantity,
        supplier: b.item.supplier,
      })),
      totalQuantity: totalBatchUnits,
      supplierSummary: supplier,
      dispatchChannel,
      timestamp: formatDateTime(),
      trackingNumber: trackingNum,
      courierPartner: courier,
      estimatedDelivery: "Tomorrow, 05:00 PM",
      status: "in_transit",
      currentCheckpointIdx: 1,
      checkpoints: [
        {
          title: "PO Dispatched & Acknowledged by Pharmacy",
          location: LOGISTICS_HUBS.CLINIC_HUB,
          time: "Just now",
          completed: true,
        },
        {
          title: `Handed to Courier Partner (${courier})`,
          location: LOGISTICS_HUBS.BLUEDART_BENGALURU,
          time: "Dispatched",
          completed: true,
          current: true,
        },
        {
          title: "In Transit across State Logistics Sort Facility",
          location: LOGISTICS_HUBS.SORT_YESHWANTHPUR,
          time: "Expected 08:00 PM",
          completed: false,
        },
        {
          title: `Out for Delivery to ${tenant.shortName || CLINIC.NAME}`,
          location: LOGISTICS_HUBS.SUB_STATION,
          time: "Tomorrow Morning",
          completed: false,
        },
        {
          title: "Package Received & Restocked into Clinic Inventory",
          location: LOGISTICS_HUBS.CLINIC_INVENTORY,
          time: "Pending",
          completed: false,
        },
      ],
    };

    onDispatchOrder(newOrder);
    onClose();
  };

  const clinicName = tenant.name || CLINIC.FULL_NAME;
  const doctorTitle = tenant.doctor.title || CLINIC.DOCTOR_TITLE;
  const clinicAddress = `${tenant.contact.address.street || CLINIC.ADDRESS.STREET}, ${tenant.contact.address.city || CLINIC.ADDRESS.CITY}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Consolidated Pharmacy Purchase Order"
      subtitle={`${requisitionBatch.length} Remedies · ${totalBatchUnits} Total Units · Dispatched in 1 Unified Message`}
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="batch-order-form"
            variant="primary"
            size="sm"
          >
            Dispatch Consolidated Order ({totalBatchUnits} Units) →
          </Button>
        </div>
      }
    >
      <form id="batch-order-form" onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
        <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200 space-y-1">
          <p><strong>Doctor:</strong> {doctorTitle}</p>
          <p><strong>Delivery Clinic:</strong> {clinicName} ({clinicAddress})</p>
          <p><strong>Doctor Phone:</strong> {tenant.contact.phoneDisplay || CLINIC.PHONE_DISPLAY}</p>
        </div>

        {/* Table of Selected Remedies */}
        <div>
          <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">
            Requisition Items List ({requisitionBatch.length} Selected)
          </label>
          <div className="mt-1.5 border border-stone-200 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 text-stone-600 text-[10px] font-bold uppercase">
                  <th className="py-2.5 px-3">Remedy &amp; Formulation</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3 text-center">Order Quantity (Units)</th>
                  <th className="py-2.5 px-3 text-right">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {requisitionBatch.map((b) => (
                  <tr key={b.item.id} className="hover:bg-stone-50/50">
                    <td className="py-2.5 px-3">
                      <strong className="text-stone-900">{b.item.name}</strong> {b.item.potency}
                      <span className="block text-[10px] text-stone-400">{b.item.formulation}</span>
                    </td>
                    <td className="py-2.5 px-3 text-stone-600">{b.item.supplier}</td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="inline-flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onUpdateBatchQuantity(b.item.id, Math.max(1, b.quantity - 1))}
                          className="w-6 h-6 rounded bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center hover:bg-stone-200 cursor-pointer"
                          title="Decrease by 1"
                        >
                          -1
                        </button>
                        <input
                          type="number"
                          min={1}
                          required
                          value={b.quantity}
                          onChange={(e) => onUpdateBatchQuantity(b.item.id, Math.max(1, parseInt(e.target.value, 10) || 1))}
                          className="w-16 p-1 text-center font-bold text-xs border border-stone-300 rounded-lg bg-white"
                          title="Edit order quantity"
                        />
                        <button
                          type="button"
                          onClick={() => onUpdateBatchQuantity(b.item.id, b.quantity + 1)}
                          className="w-6 h-6 rounded bg-stone-100 text-stone-700 font-bold text-xs flex items-center justify-center hover:bg-stone-200 cursor-pointer"
                          title="Increase by 1"
                        >
                          +1
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateBatchQuantity(b.item.id, b.quantity + 5)}
                          className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] shadow-xs active:scale-95 cursor-pointer"
                          title="Increase by 5 quantity"
                        >
                          +5
                        </button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onToggleAddToBatch(b.item)}
                        className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Single Dispatch Channel Selector */}
        <div>
          <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
            Select Dispatch Channel (Sends 1 Single Consolidated Message) *
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setDispatchChannel("whatsapp")}
              className={`py-2.5 px-2 rounded-xl font-bold text-center transition-all cursor-pointer ${
                dispatchChannel === "whatsapp"
                  ? "text-white shadow-sm ring-2 ring-emerald-600"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
              style={dispatchChannel === "whatsapp" ? { backgroundColor: THEME_COLORS.WHATSAPP_GREEN } : undefined}
            >
              💬 WhatsApp (1 Message)
            </button>
            <button
              type="button"
              onClick={() => setDispatchChannel("email")}
              className={`py-2.5 px-2 rounded-xl font-bold text-center transition-all cursor-pointer ${
                dispatchChannel === "email"
                  ? "bg-sky-700 text-white shadow-sm ring-2 ring-sky-600"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              ✉️ Email (1 PO Email)
            </button>
            <button
              type="button"
              onClick={() => setDispatchChannel("sms")}
              className={`py-2.5 px-2 rounded-xl font-bold text-center transition-all cursor-pointer ${
                dispatchChannel === "sms"
                  ? "bg-stone-900 text-white shadow-sm ring-2 ring-stone-700"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200"
              }`}
            >
              📱 SMS / Clipboard
            </button>
          </div>
        </div>

        {/* Live Preview of Consolidated Message */}
        <div>
          <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
            Consolidated Message Preview:
          </label>
          <div className="bg-stone-900 text-emerald-300 font-mono text-[11px] p-3 rounded-xl border border-stone-800 whitespace-pre-wrap max-h-36 overflow-y-auto">
            {`🏥 PURCHASE ORDER — ${clinicName}\n` +
              `Doctor: ${doctorTitle}\n` +
              `Address: ${clinicAddress}\n\n` +
              `REQUISITION LIST (${requisitionBatch.length} Items):\n` +
              requisitionBatch.map((b, i) => `${i + 1}. ${b.item.name} ${b.item.potency} — ${b.quantity} Units`).join("\n") +
              `\n\nTotal: ${totalBatchUnits} Units. Please confirm dispatch.`}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ConsolidatedBatchOrderModal;
