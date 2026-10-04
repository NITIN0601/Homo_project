import React from "react";
import type { PharmacyPurchaseOrder } from "../types";

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
  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full card-shadow border border-stone-100 overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 bg-stone-900 text-white flex justify-between items-center">
          <div>
            <h3 className="font-bold text-base">Real-Time Logistics Scan Checkpoints</h3>
            <p className="text-xs text-stone-400 font-mono">
              PO #{order.id} · AWB: {order.trackingNumber}
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

        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
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

        <div className="px-6 py-3 bg-stone-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 text-white font-bold text-xs cursor-pointer hover:bg-stone-900"
          >
            Close Timeline
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogisticsTimelineModal;
