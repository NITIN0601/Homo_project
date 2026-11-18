import { useState, useEffect, useCallback } from "react";
import type { InventoryItem } from "../../types";
import { INVENTORY as INV_CONFIG } from "../../config";
import { formatTimeShort, formatDateISO } from "../../utils/format";
import type { BatchOrderItem, PharmacyPurchaseOrder } from "./types";
import { MOCK_PHARMACY_ORDERS as INITIAL_PHARMACY_ORDERS } from "../../data/mocks";

interface UseRequisitionBatchProps {
  inventory: InventoryItem[];
  updateInventory: (item: InventoryItem) => void;
  onSuccessMsg?: (msg: string) => void;
}

export function useRequisitionBatch({
  inventory,
  updateInventory,
  onSuccessMsg,
}: UseRequisitionBatchProps) {
  const [requisitionBatch, setRequisitionBatch] = useState<BatchOrderItem[]>([]);
  const [pharmacyOrders, setPharmacyOrders] = useState<PharmacyPurchaseOrder[]>(INITIAL_PHARMACY_ORDERS);

  // Auto-Progression Real-Time Logistics Simulation Timer (45s pulse)
  useEffect(() => {
    const timer = setInterval(() => {
      setPharmacyOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order.status === "in_transit" && order.currentCheckpointIdx < 3) {
            const nextIdx = order.currentCheckpointIdx + 1;
            const nowTime = formatTimeShort(new Date());
            const updatedCheckpoints = order.checkpoints.map((cp, idx) => {
              if (idx === nextIdx) {
                return { ...cp, completed: true, current: true, time: `Just now (${nowTime})` };
              }
              if (idx < nextIdx) {
                return { ...cp, completed: true, current: false };
              }
              return cp;
            });
            const newStatus = nextIdx === 3 ? "out_for_delivery" : "in_transit";
            return {
              ...order,
              status: newStatus,
              currentCheckpointIdx: nextIdx,
              checkpoints: updatedCheckpoints,
            };
          }
          return order;
        })
      );
    }, 45000);

    return () => clearInterval(timer);
  }, []);

  const toggleAddToBatch = useCallback((item: InventoryItem, qty: number = 50) => {
    setRequisitionBatch((prev) => {
      const exists = prev.find((b) => b.item.id === item.id);
      if (exists) {
        return prev.filter((b) => b.item.id !== item.id);
      }
      return [...prev, { item, quantity: qty }];
    });
  }, []);

  const updateBatchQuantity = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) {
      setRequisitionBatch((prev) => prev.filter((b) => b.item.id !== itemId));
    } else {
      setRequisitionBatch((prev) =>
        prev.map((b) => (b.item.id === itemId ? { ...b, quantity: qty } : b))
      );
    }
  }, []);

  const addAllLowStockToBatch = useCallback(() => {
    const lowItems = inventory.filter((i) => i.stockQty <= INV_CONFIG.LOW_STOCK_THRESHOLD);
    setRequisitionBatch((prev) => {
      const next = [...prev];
      lowItems.forEach((low) => {
        const idx = next.findIndex((b) => b.item.id === low.id);
        if (idx === -1) {
          next.push({ item: low, quantity: 50 });
        }
      });
      return next;
    });
  }, [inventory]);

  const handleSimulateLogisticsScan = useCallback((orderId: string) => {
    setPharmacyOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== orderId) return order;
        if (order.currentCheckpointIdx >= order.checkpoints.length - 1) return order;

        const nextIdx = order.currentCheckpointIdx + 1;
        const nowTime = formatTimeShort(new Date());
        const updatedCheckpoints = order.checkpoints.map((cp, idx) => {
          if (idx === nextIdx) {
            return { ...cp, completed: true, current: true, time: `Live Scan (${nowTime})` };
          }
          if (idx < nextIdx) {
            return { ...cp, completed: true, current: false };
          }
          return cp;
        });

        const newStatus =
          nextIdx >= 4 ? "delivered" : nextIdx === 3 ? "out_for_delivery" : "in_transit";

        if (newStatus === "delivered" && order.status !== "delivered") {
          order.items.forEach((item) => {
            const existing = inventory.find((i) => i.id === item.medicineId);
            if (existing) {
              updateInventory({
                ...existing,
                stockQty: existing.stockQty + item.quantity,
                lastRestocked: formatDateISO(),
              });
            }
          });
        }

        return {
          ...order,
          status: newStatus,
          currentCheckpointIdx: nextIdx,
          checkpoints: updatedCheckpoints,
        };
      })
    );
  }, [inventory, updateInventory]);

  const handleMarkDeliveredImmediately = useCallback((order: PharmacyPurchaseOrder) => {
    setPharmacyOrders((prev) =>
      prev.map((o) => {
        if (o.id !== order.id) return o;
        const deliveredCheckpoints = o.checkpoints.map((cp) => ({
          ...cp,
          completed: true,
          current: false,
        }));
        deliveredCheckpoints[deliveredCheckpoints.length - 1].current = true;
        deliveredCheckpoints[deliveredCheckpoints.length - 1].time = `Delivered Just Now`;
        return {
          ...o,
          status: "delivered",
          currentCheckpointIdx: 4,
          checkpoints: deliveredCheckpoints,
        };
      })
    );

    order.items.forEach((item) => {
      const existing = inventory.find((i) => i.id === item.medicineId);
      if (existing) {
        updateInventory({
          ...existing,
          stockQty: existing.stockQty + item.quantity,
          lastRestocked: formatDateISO(),
        });
      }
    });

    if (onSuccessMsg) {
      onSuccessMsg(`✓ Order #${order.id} delivered and stock inventory updated!`);
    }
  }, [inventory, updateInventory, onSuccessMsg]);

  return {
    requisitionBatch,
    setRequisitionBatch,
    pharmacyOrders,
    setPharmacyOrders,
    toggleAddToBatch,
    updateBatchQuantity,
    addAllLowStockToBatch,
    handleSimulateLogisticsScan,
    handleMarkDeliveredImmediately,
  };
}
