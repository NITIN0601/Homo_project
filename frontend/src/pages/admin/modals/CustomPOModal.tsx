import React, { useState } from "react";
import type { PharmacyPurchaseOrder } from "../types";
import { LOGISTICS_HUBS } from "../../../config";
import { formatDateISO, formatDateTime } from "../../../utils/format";
import { Modal, Input, Select, Textarea, Button } from "../../../components/ui";

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
          title: "Out for Delivery to Clinic",
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Supplies Purchase Order"
      subtitle="Order medicines, potencies, and dispensary supplies from licensed distributors"
      size="md"
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
            form="custom-po-form"
            variant="primary"
            size="sm"
            className="bg-purple-700 hover:bg-purple-800 text-white font-black"
          >
            <span>📤</span> Dispatch Purchase Order ({qty} units) →
          </Button>
        </div>
      }
    >
      <form id="custom-po-form" onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
        <Input
          label="Medicine / Remedy Name *"
          required
          placeholder="e.g. Arsenicum Album, Bryonia Alba, Arnica Montana"
          value={medicine}
          onChange={(e) => setMedicine(e.target.value)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select
            label="Potency *"
            value={potency}
            onChange={(e) => setPotency(e.target.value)}
            options={[
              { value: "30C", label: "30C" },
              { value: "200CH", label: "200CH" },
              { value: "1M", label: "1M" },
              { value: "Q (Mother Tincture)", label: "Q (Mother Tincture)" },
              { value: "6X (Biochemic)", label: "6X (Biochemic)" },
            ]}
          />

          <Input
            label="Quantity *"
            type="number"
            min={1}
            required
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
          />

          <Select
            label="Unit Packaging"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            options={[
              { value: "Vials (30ml)", label: "Vials (30ml)" },
              { value: "Bottles (100ml)", label: "Bottles (100ml)" },
              { value: "Globules (4g)", label: "Globules (4g)" },
              { value: "Tablets (25g)", label: "Tablets (25g)" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Distributor / Vendor *"
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
            options={[
              { value: "Dr. Reckeweg & Co. Germany", label: "Dr. Reckeweg & Co. Germany" },
              { value: "SBL Pvt Ltd India", label: "SBL Pvt Ltd India" },
              { value: "Dr. Willmar Schwabe India", label: "Dr. Willmar Schwabe India" },
              { value: "Medisynth Chemicals", label: "Medisynth Chemicals" },
            ]}
          />

          <Select
            label="Reorder Urgency *"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value as any)}
            options={[
              { value: "Normal", label: "Routine Stock Refill" },
              { value: "Urgent", label: "⚡ Urgent Low Stock" },
              { value: "Critical", label: "🚨 Critical Out of Stock" },
            ]}
          />
        </div>

        <Textarea
          label="Special Delivery Instructions / Dispatch Notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Ensure batch expiry > 2028, pack in insulated container"
        />
      </form>
    </Modal>
  );
};

export default CustomPOModal;
