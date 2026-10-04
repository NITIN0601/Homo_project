import type { InventoryItem } from "../../types";

export interface TrackingCheckpoint {
  title: string;
  location: string;
  time: string;
  completed: boolean;
  current?: boolean;
}

export interface PharmacyPurchaseOrder {
  id: string;
  batchReference?: string;
  items: Array<{
    medicineId: string;
    medicineName: string;
    potency: string;
    formulation: string;
    quantity: number;
    supplier: string;
  }>;
  totalQuantity: number;
  supplierSummary: string;
  dispatchChannel: "whatsapp" | "email" | "sms";
  timestamp: string;
  trackingNumber: string;
  courierPartner: string;
  estimatedDelivery: string;
  status: "dispatched" | "in_transit" | "out_for_delivery" | "delivered";
  currentCheckpointIdx: number;
  checkpoints: TrackingCheckpoint[];
}

export interface BatchOrderItem {
  item: InventoryItem;
  quantity: number;
}

export interface DoctorTodoItem {
  id: string;
  task: string;
  category: "Prescription" | "Follow-up" | "Inventory" | "Review";
  priority: "High" | "Normal" | "Routine";
  completed: boolean;
  patientId?: string;
}

export interface BlockedDateEntry {
  id: string;
  date: string;
  reason: string;
  type: "ooo" | "holiday" | "leave";
}
