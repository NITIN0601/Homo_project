import type { InventoryItem } from "../../types";
import { MOCK_MEDICINES } from "./medicines";

export const MOCK_INVENTORY: InventoryItem[] = MOCK_MEDICINES.map((m, i) => ({
  id:            m.id,
  name:          m.name,
  potency:       m.potency,
  formulation:   m.formulation,
  priceINR:      m.priceINR,
  category:      m.category,
  stockQty:      [45, 12, 88, 5, 30, 67, 9, 22][i] ?? 50,
  reorderQty:    10,
  supplier:      ["SBL Pvt Ltd", "Boiron India", "Reckeweg India", "SBL Pvt Ltd",
                  "Schwabe India", "SBL Pvt Ltd", "Reckeweg India", "Schwabe India"][i] ?? "SBL Pvt Ltd",
  lastRestocked: "2026-09-20",
  expiryDate:    "2028-03-01",
  batchNumber:   `BTH-${m.id.toUpperCase()}-2026`,
  isActive:      true,
}));

