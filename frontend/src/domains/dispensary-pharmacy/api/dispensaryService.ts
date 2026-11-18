import { apiFetch, USE } from "../../../core/api/client/httpClient";
import type { InventoryItem } from "@core/types";

export const dispensaryService = {
  orders: {
    create: async (orderPayload: Record<string, unknown>) => {
      if (USE) return apiFetch("/orders/create", { method: "POST", body: JSON.stringify(orderPayload) });
      return { success: true, orderId: `ORD-${Date.now()}` };
    },

    trackShipment: async (trackingId: string) => {
      if (USE) return apiFetch(`/logistics/track/${trackingId}`);
      return null; // mock tracking uses state from AppContext
    },
  },

  // ── Inventory (Admin) ─────────────────────────────────────────────────────────
  inventory: {
    getAll: async (): Promise<InventoryItem[]> => {
      if (USE) return apiFetch("/inventory");
      return []; // falls back to AppContext MOCK_INVENTORY in UI
    },

    update: async (item: InventoryItem): Promise<InventoryItem> => {
      if (USE) return apiFetch(`/inventory/${item.id}`, { method: "PUT", body: JSON.stringify(item) });
      return item; // optimistic UI update — state already updated via dispatch
    },

    restock: async (itemId: string, qty: number): Promise<{ success: boolean }> => {
      if (USE) return apiFetch(`/inventory/${itemId}/restock`, { method: "POST", body: JSON.stringify({ qty }) });
      return { success: true };
    },
  },
};

export default dispensaryService;
