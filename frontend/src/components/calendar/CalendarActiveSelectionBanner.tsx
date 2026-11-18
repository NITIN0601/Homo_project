import React from "react";
import type { DynamicHoliday } from "../../services/holidayService";
import { formatDateWithWeekday, formatDateFull } from "../../utils/format";

interface CalendarActiveSelectionBannerProps {
  adminMode?: boolean;
  selectedDate?: string;
  startDate?: string;
  endDate?: string;
  holidaysMap: Map<string, DynamicHoliday>;
  onClearDate?: () => void;
  onClearRange?: () => void;
}

export const CalendarActiveSelectionBanner: React.FC<CalendarActiveSelectionBannerProps> = ({
  adminMode,
  selectedDate,
  startDate,
  endDate,
  holidaysMap,
  onClearDate,
  onClearRange,
}) => {
  if (adminMode && (startDate || selectedDate)) {
    const activeStart = startDate || selectedDate || "";
    const activeEnd = endDate || "";

    return (
      <div
        className="mx-5 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1 shadow-2xs animate-fadeIn"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="text-xl">🗓️</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                Active Calendar Selection
              </p>
              <p className="text-emerald-950 font-extrabold text-xs flex items-center flex-wrap gap-2">
                {activeEnd && activeStart && activeEnd > activeStart ? (
                  <span>
                    {formatDateWithWeekday(activeStart + "T00:00:00")} → {formatDateWithWeekday(activeEnd + "T00:00:00")}
                    <span className="ml-2 font-mono text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-black">
                      Range Selected
                    </span>
                  </span>
                ) : (
                  <span>
                    {formatDateWithWeekday(activeStart + "T00:00:00")}
                    <span className="ml-2 font-mono text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-black">
                      Single Day
                    </span>
                  </span>
                )}
              </p>
            </div>
          </div>
          {onClearRange && (
            <button
              type="button"
              onClick={onClearRange}
              className="text-stone-400 hover:text-stone-600 transition-colors p-1 cursor-pointer"
              title="Clear Selection"
              aria-label="Clear selection"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!adminMode && selectedDate) {
    const isSunday = new Date(selectedDate + "T00:00:00").getDay() === 0;
    const selectedFestival = holidaysMap.get(selectedDate);

    return (
      <div
        className="mx-5 mb-4 bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2 shadow-2xs"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="text-xl">📅</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                Selected Consultation Date
              </p>
              <p className="text-stone-900 font-extrabold text-sm flex items-center flex-wrap gap-2">
                <span>{formatDateFull(selectedDate + "T00:00:00")}</span>
                {isSunday && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                    Sunday (Prior Appointment Only)
                  </span>
                )}
                {selectedFestival && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1">
                    <span>{selectedFestival.emoji || "🪔"}</span>
                    <span>{selectedFestival.name}</span>
                  </span>
                )}
              </p>
            </div>
          </div>
          {onClearDate && (
            <button
              type="button"
              onClick={onClearDate}
              className="ml-auto text-stone-400 hover:text-stone-600 transition-colors p-1 cursor-pointer"
              aria-label="Clear selected date"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};
