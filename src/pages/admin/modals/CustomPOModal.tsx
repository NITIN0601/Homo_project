import React, { useState } from "react";
import type { PharmacyPurchaseOrder } from "../types";
import { LOGISTICS_HUBS } from "../../../config";
import { formatDateISO, formatDateTime } from "../../../utils/format";

interface CustomPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDispatchPO: (newOrder: PharmacyPurchaseOrder) => void;
}

export const CustomPOModal: React.FC<CustomPOModalProps> = ({
  isOpen,
  onClose,
  onDispatchPO,
}) => {
  const [medicine, setMedicine] = useState("Arsenicum Album");
  const [potency, setPotency] = useState("30C");
  const [qty, setQty] = useState(25);
  const [unit, setUnit] = useState("Vials (30ml)");
  const [vendor, setVendor] = useState("Dr. Reckeweg & Co. Germany");
  const [urgency, setUrgency] = useState<"Normal" | "Urgent" | "Critical">("Urgent");
  const [notes, setNotes] = useState("Urgent clinic dispensary stock replenishment.");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medicine.trim() || qty <= 0) return;

    const poId = `PO-CUSTOM-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingNum = `AWB-${Math.floor(10000000 + Math.random() * 90000000)}-IN`;

    const newOrder: PharmacyPurchaseOrder = {
      id: poId,
      batchReference: `PO-MANUAL-${formatDateISO()}`,
      items: [
        {
          medicineId: `m-custom-${Date.now()}`,
          medicineName: medicine.trim(),
          potency,
          formulation: unit,
          quantity: qty,
          supplier: vendor,
        },
      ],
      totalQuantity: qty,
      supplierSummary: vendor,
      dispatchChannel: "whatsapp",
      timestamp: formatDateTime(),
      trackingNumber: trackingNum,
      courierPartner: "BlueDart Express 🚚",
      estimatedDelivery: "Expected in 2 Days",
      status: "in_transit",
      currentCheckpointIdx: 0,
      checkpoints: [
        {
          title: `Custom PO created for ${medicine} (${potency})`,
          location: LOGISTICS_HUBS.CLINIC_HUB,
          time: "Just now",
          completed: true,
          current: true,
        },
        {
          title: `Dispatched to Distributor (${vendor})`,
          location: LOGISTICS_HUBS.SORT_YESHWANTHPUR,
          time: "Processing",
          completed: false,
        },
        {
          title: "In Transit with Courier",
          location: LOGISTICS_HUBS.BLUEDART_BENGALURU,
          time: "Pending",
          completed: false,
        },
        {
          title: "Out for Delivery to Agastya Clinic",
          location: LOGISTICS_HUBS.SUB_STATION,
          time: "Pending",
          completed: false,
        },
        {
          title: "Restocked into Dispensary Inventory",
          location: LOGISTICS_HUBS.CLINIC_INVENTORY,
          time: "Pending",
          completed: false,
        },
      ],
    };

    onDispatchPO(newOrder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full card-shadow border border-stone-100 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-950 to-indigo-900 text-white flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <span>📦</span> Create Supplies Purchase Order
            </h3>
            <p className="text-purple-200 text-xs mt-0.5">
              Order medicines, potencies, and dispensary supplies from licensed distributors
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-stone-300 hover:text-white text-lg font-mono cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              Medicine / Remedy Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Arsenicum Album, Bryonia Alba, Arnica Montana"
              value={medicine}
              onChange={(e) => setMedicine(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Potency *
              </label>
              <select
                value={potency}
                onChange={(e) => setPotency(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs"
              >
                <option value="30C">30C</option>
                <option value="200CH">200CH</option>
                <option value="1M">1M</option>
                <option value="Q (Mother Tincture)">Q (Mother Tincture)</option>
                <option value="6X (Biochemic)">6X (Biochemic)</option>
              </select>
            </div>

            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Quantity *
              </label>
              <input
                type="number"
                min={1}
                required
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs"
              />
            </div>

            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Unit Packaging
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs"
              >
                <option value="Vials (30ml)">Vials (30ml)</option>
                <option value="Bottles (100ml)">Bottles (100ml)</option>
                <option value="Globules (4g)">Globules (4g)</option>
                <option value="Tablets (25g)">Tablets (25g)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Distributor / Vendor *
              </label>
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs"
              >
                <option value="Dr. Reckeweg & Co. Germany">Dr. Reckeweg & Co. Germany</option>
                <option value="SBL Pvt Ltd India">SBL Pvt Ltd India</option>
                <option value="Dr. Willmar Schwabe India">Dr. Willmar Schwabe India</option>
                <option value="Medisynth Chemicals">Medisynth Chemicals</option>
              </select>
            </div>

            <div>
              <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                Reorder Urgency *
              </label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as any)}
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs"
              >
                <option value="Normal">Routine Stock Refill</option>
                <option value="Urgent">⚡ Urgent Low Stock</option>
                <option value="Critical">🚨 Critical Out of Stock</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              Special Delivery Instructions / Dispatch Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Ensure batch expiry > 2028, pack in insulated container"
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none"
            />
          </div>

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-100 font-bold text-stone-700 hover:bg-stone-200 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>📤</span> Dispatch Purchase Order ({qty} units) →
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomPOModal;
