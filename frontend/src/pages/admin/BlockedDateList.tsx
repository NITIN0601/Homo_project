import React from "react";
import type { BlockedDateEntry } from "./types";

export interface BlockedDateListProps {
  blockedDates: BlockedDateEntry[];
  onInspect: (entry: BlockedDateEntry) => void;
  onUnblock: (entry: BlockedDateEntry) => void;
}

export const BlockedDateList: React.FC<BlockedDateListProps> = ({
  blockedDates,
  onInspect,
  onUnblock,
}) => {
  return (
    <div className="bg-white rounded-3xl card-shadow border border-stone-100 p-5 space-y-3 text-xs">
      <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
        <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
          <span>📋</span> Blocked Dates &amp; Time Slots Roster ({blockedDates.length})
        </h3>
        <span className="text-[11px] text-stone-400">Live synchronized</span>
      </div>

      {blockedDates.length === 0 ? (
        <p className="text-stone-400 italic py-4 text-center">No calendar dates or hours currently blocked.</p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {blockedDates.map((entry) => (
            <div
              key={entry.id || `${entry.date}_${entry.startTime || ""}`}
              className="p-3 rounded-2xl border border-stone-200 bg-stone-50/70 hover:bg-white flex items-center justify-between gap-3 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <strong className="text-stone-900 text-xs font-mono">{entry.date}</strong>
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                      entry.type === "holiday"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : entry.type === "leave"
                        ? "bg-purple-100 text-purple-900 border border-purple-300"
                        : "bg-rose-100 text-rose-900 border border-rose-300"
                    }`}
                  >
                    {entry.type || "OOO"}
                  </span>

                  {entry.allDay !== false ? (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-stone-200 text-stone-800 border border-stone-300">
                      🌞 Full Day
                    </span>
                  ) : (
                    <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
                      <span>⏱️</span>
                      {entry.startTime || "Custom"} – {entry.endTime || "Custom"}
                      {entry.slots && entry.slots.length > 0 ? ` (${entry.slots.length} slots)` : ""}
                    </span>
                  )}
                </div>
                <p className="text-stone-600 text-[11px]">{entry.reason}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onInspect(entry)}
                  className="text-stone-600 hover:text-stone-900 font-bold text-[11px] cursor-pointer px-2 py-1"
                >
                  Inspect
                </button>
                <button
                  type="button"
                  onClick={() => onUnblock(entry)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-bold cursor-pointer transition-colors active:scale-95"
                >
                  Unblock
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

