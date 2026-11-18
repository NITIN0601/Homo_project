import type { InventoryItem } from "@core/types";
export { MOCK_PHARMACY_ORDERS as INITIAL_PHARMACY_ORDERS } from "../../mocks";

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
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  slots?: string[];
  createdAt?: string;
}
