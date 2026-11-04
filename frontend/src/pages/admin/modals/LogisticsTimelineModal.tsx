import React from "react";
import type { PharmacyPurchaseOrder } from "../types";
import { Modal, Button } from "../../../components/ui";

interface LogisticsTimelineModalProps {
  isOpen: boolean;
  order: PharmacyPurchaseOrder | null;
  onClose: () => void;
}

export const LogisticsTimelineModal: React.FC<LogisticsTimelineModalProps> = ({
  isOpen,
  order,
  onClose,
}) => {
  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Real-Time Logistics Scan Checkpoints"
      subtitle={`PO #${order.id} · AWB: ${order.trackingNumber}`}
      size="md"
      footer={
        <div className="flex justify-end w-full">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
          >
            Close Timeline
          </Button>
        </div>
      }
    >
      <div className="p-6 space-y-4 text-xs">
        <div className="space-y-4 relative pl-4 border-l-2 border-emerald-500/40 ml-2">
          {order.checkpoints.map((cp, idx) => (
            <div key={idx} className="relative">
              <div
                className={`absolute -left-[23px] top-0 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                  cp.current
                    ? "bg-emerald-500 animate-pulse ring-4 ring-emerald-200"
                    : cp.completed
                    ? "bg-emerald-600"
                    : "bg-stone-300"
                }`}
              />
              <div>
                <p className={`font-black ${cp.completed ? "text-stone-900" : "text-stone-400"}`}>
                  {cp.title}
                </p>
                <p className="text-stone-500 text-[11px] mt-0.5">
                  📍 {cp.location} · <span className="font-mono">{cp.time}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export default LogisticsTimelineModal;
