import React, { useState, useMemo } from "react";
import type { InventoryItem } from "../../types";
import type { BatchOrderItem } from "./types";
import { INVENTORY as INV_CONFIG } from "../../config";

interface DispensaryInventoryTabProps {
  inventory: InventoryItem[];
  requisitionBatch: BatchOrderItem[];
  onToggleAddToBatch: (item: InventoryItem, qty?: number) => void;
  onUpdateBatchQuantity: (itemId: string, qty: number) => void;
  onClearBatch: () => void;
  onOpenBatchModal: () => void;
  onOpenExcelModal: () => void;
  onOpenCreatePOModal: () => void;
  onAddAllLowStock: () => void;
}

export const DispensaryInventoryTab: React.FC<DispensaryInventoryTabProps> = ({
  inventory,
  requisitionBatch,
  onToggleAddToBatch,
  onUpdateBatchQuantity,
  onClearBatch,
  onOpenBatchModal,
  onOpenExcelModal,
  onOpenCreatePOModal,
  onAddAllLowStock,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const lowStockItems = useMemo(
    () => inventory.filter((i) => i.stockQty <= INV_CONFIG.LOW_STOCK_THRESHOLD),
    [inventory]
  );

  const totalBatchUnits = useMemo(
    () => requisitionBatch.reduce((sum, b) => sum + b.quantity, 0),
    [requisitionBatch]
  );

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === "" ||
        item.name.toLowerCase().includes(q) ||
        item.potency.toLowerCase().includes(q) ||
        item.supplier.toLowerCase().includes(q) ||
        item.batchNumber.toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;

      return true;
    });
  }, [inventory, searchQuery, categoryFilter]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Active Batch Tray Notification (When multiple items selected) */}
      {requisitionBatch.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-900 to-stone-900 text-white p-4 rounded-3xl card-shadow border border-emerald-500/50 flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-xl font-bold">
              🛒
            </div>
            <div>
              <p className="font-extrabold text-sm text-emerald-200">
                Pharmacy Batch Requisition Active ({requisitionBatch.length} Remedies Selected)
              </p>
              <p className="text-xs text-stone-300">
                Total: <strong>{totalBatchUnits} Units</strong> across{" "}
                {requisitionBatch.map((b) => b.item.name).slice(0, 3).join(", ")}
                {requisitionBatch.length > 3 ? "..." : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClearBatch}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer"
            >
              Clear List
            </button>

            <button
              onClick={onOpenBatchModal}
              className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>📤</span> Review &amp; Dispatch 1 Unified Order ({requisitionBatch.length}) →
            </button>
          </div>
        </div>
      )}

      {/* Inventory Table with Multi-Select Batch Adders */}
      <div className="bg-white rounded-3xl card-shadow border border-stone-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-extrabold text-stone-800 text-sm">📦 Medicine Pharmacy Inventory</h2>
              {lowStockItems.length > 0 ? (
                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  ⚠️ {lowStockItems.length} Low Stock Alert
                </span>
              ) : (
                <span className="bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  ✓ Stock Safe
                </span>
              )}
            </div>
            <p className="text-stone-500 text-xs mt-0.5">
              Select multiple remedies to dispatch in <strong>1 single unified WhatsApp/Email/SMS message</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenExcelModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 hover:border-emerald-600 transition-all cursor-pointer shadow-xs active:scale-95"
              title="Open Excel Synchronization Modal (.xlsx / .csv)"
            >
              <span>📊</span> Excel Sync / Export
            </button>

            <button
              onClick={onOpenCreatePOModal}
              className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs active:scale-95"
              title="Create custom purchase order for supplies or reorders"
            >
              <span>➕</span> Create Purchase Order
            </button>

            <button
              onClick={onAddAllLowStock}
              className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>⚡</span> + Add All Low-Stock to Requisition
            </button>
          </div>
        </div>

        {/* Search & Category Filter toolbar */}
        <div className="px-5 py-3 bg-stone-50/80 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <input
              type="search"
              placeholder="Search by Medicine, Potency, Supplier, or Batch…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-stone-300 px-3 py-1.5 bg-white outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-stone-400 font-bold text-[11px]">Filter:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-stone-200 bg-white font-bold text-xs outline-none"
            >
              <option value="all">All Categories</option>
              <option value="constitutional">Constitutional</option>
              <option value="acute">Acute</option>
              <option value="tissue-salt">Tissue Salt</option>
              <option value="mother-tincture">Mother Tincture</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" aria-label="Medicine Inventory Table">
            <thead>
              <tr className="bg-stone-900 text-stone-200 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Medicine</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Price</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Batch / Expiry</th>
                <th className="py-3 px-4 text-right">Multi-Order Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-xs">
              {filteredInventory.map((item) => {
                const isLow = item.stockQty <= INV_CONFIG.LOW_STOCK_THRESHOLD;
                const batchEntry = requisitionBatch.find((b) => b.item.id === item.id);
                const isInBatch = !!batchEntry;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isInBatch ? "bg-emerald-50/40" : isLow ? "bg-amber-50/50" : "hover:bg-stone-50"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <p className="font-black text-stone-900">{item.name}</p>
                      <p className="text-stone-500 font-mono text-[10px]">
                        {item.potency} · {item.formulation}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-stone-800">
                      {INV_CONFIG.CURRENCY_SYMBOL}{item.priceINR}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-black text-sm ${isLow ? "text-red-600" : "text-emerald-700"}`}>
                          {item.stockQty} Units
                        </span>
                        {isLow && (
                          <span className="text-[9px] font-bold bg-red-100 text-red-800 border border-red-200 px-1.5 py-0.5 rounded-full">
                            LOW STOCK
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-stone-600 font-medium">{item.supplier}</td>
                    <td className="py-3 px-4 text-stone-500 text-[11px]">
                      <span className="font-mono">{item.batchNumber}</span>
                      <span className="block text-[10px] text-stone-400">Exp: {item.expiryDate}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="inline-flex items-center gap-1 bg-stone-50 border border-stone-200 rounded-xl p-1 shadow-2xs">
                          <button
                            onClick={() => {
                              const cur = batchEntry ? batchEntry.quantity : 10;
                              if (cur <= 1) {
                                if (isInBatch) onToggleAddToBatch(item);
                              } else {
                                if (!isInBatch) onToggleAddToBatch(item, cur - 1);
                                else onUpdateBatchQuantity(item.id, cur - 1);
                              }
                            }}
                            className="w-6 h-6 rounded-lg bg-white hover:bg-stone-100 text-stone-700 font-black text-xs flex items-center justify-center border border-stone-200 cursor-pointer"
                            title="Decrease order quantity by 1"
                          >
                            -1
                          </button>

                          <input
                            type="number"
                            min={1}
                            value={batchEntry ? batchEntry.quantity : 10}
                            onChange={(e) => {
                              const v = Math.max(1, parseInt(e.target.value, 10) || 1);
                              if (isInBatch) onUpdateBatchQuantity(item.id, v);
                              else onToggleAddToBatch(item, v);
                            }}
                            className="w-14 p-1 text-center font-bold text-xs border border-stone-300 rounded-lg bg-white"
                            title="Edit quantity"
                          />

                          <button
                            onClick={() => {
                              const cur = batchEntry ? batchEntry.quantity : 10;
                              if (!isInBatch) onToggleAddToBatch(item, cur + 1);
                              else onUpdateBatchQuantity(item.id, cur + 1);
                            }}
                            className="w-6 h-6 rounded-lg bg-white hover:bg-stone-100 text-stone-700 font-black text-xs flex items-center justify-center border border-stone-200 cursor-pointer"
                            title="Increase order quantity by 1"
                          >
                            +1
                          </button>

                          <button
                            onClick={() => {
                              const cur = batchEntry ? batchEntry.quantity : 10;
                              if (!isInBatch) onToggleAddToBatch(item, cur + 5);
                              else onUpdateBatchQuantity(item.id, cur + 5);
                            }}
                            className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] shadow-xs active:scale-95 cursor-pointer"
                            title="Add +5 units"
                          >
                            +5
                          </button>
                        </div>

                        <button
                          onClick={() => onToggleAddToBatch(item)}
                          className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow-xs active:scale-95 ${
                            isInBatch
                              ? "bg-stone-900 text-white hover:bg-stone-800"
                              : "bg-emerald-500 hover:bg-emerald-400 text-stone-950"
                          }`}
                        >
                          {isInBatch ? "✓ In Batch" : "+ Select"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DispensaryInventoryTab;
