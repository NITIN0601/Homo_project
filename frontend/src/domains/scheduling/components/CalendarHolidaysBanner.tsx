import React from "react";
import type { DynamicHoliday } from "../api/holidayService";
import { MONTHS } from "../model/calendarTypes";
import { formatDateWithWeekday } from "../../../shared/utils/format";
import { isDatePastHospitalTime } from "../../../core/timezone";

interface CalendarHolidaysBannerProps {
  monthFestivals: DynamicHoliday[];
  viewMonth: number;
  viewYear: number;
  isSyncingHolidays: boolean;
  syncFeedbackMsg: string | null;
  isLoadingHolidays: boolean;
  onSyncHolidays: () => void;
}

export const CalendarHolidaysBanner: React.FC<CalendarHolidaysBannerProps> = ({
  monthFestivals,
  viewMonth,
  viewYear,
  isSyncingHolidays,
  syncFeedbackMsg,
  isLoadingHolidays,
  onSyncHolidays,
}) => {
  if (monthFestivals.length === 0) return null;

  return (
    <div className="mx-5 my-2.5 p-3 rounded-xl bg-orange-50/80 border border-orange-200/90 text-xs animate-fadeIn">
      <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
        <div className="flex items-center gap-1.5 font-black text-orange-950">
          <span className="text-sm">🪔</span>
          <span>Indian Calendar Festivals &amp; Holidays ({MONTHS[viewMonth]} {viewYear})</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={onSyncHolidays}
            disabled={isSyncingHolidays}
            title="Sync Google Calendar Holidays into local storage"
            className="text-[10px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
          >
            <span>{isSyncingHolidays ? "🔄 Syncing..." : "🔄 1st Jan Sync"}</span>
          </button>
          {syncFeedbackMsg && (
            <span className="text-[10px] font-bold text-emerald-700 animate-fadeIn">
              {syncFeedbackMsg}
            </span>
          )}
          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isLoadingHolidays ? "bg-amber-500 animate-ping" : "bg-emerald-500 animate-pulse"}`} />
            <span>{isLoadingHolidays ? "Syncing..." : "Google Calendar Feed"}</span>
          </span>
          <span className="text-[10px] font-semibold text-orange-800 bg-orange-100/90 px-2 py-0.5 rounded-full border border-orange-200">
            {monthFestivals.length} {monthFestivals.length === 1 ? "Festival" : "Festivals"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
        {monthFestivals.map((f) => {
          const isPast = isDatePastHospitalTime(f.date);
          return (
            <div
              key={f.date + f.name}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-2xs ${
                isPast
                  ? "text-stone-500 bg-stone-100/70 border-stone-200 opacity-60"
                  : "text-orange-900 bg-white/80 border-orange-100"
              }`}
            >
              <span className={`font-mono font-bold whitespace-nowrap ${isPast ? "text-stone-600" : "text-orange-950"}`}>
                {f.emoji || "🪔"} {formatDateWithWeekday(f.date + "T00:00:00")}:
              </span>
              <span className="truncate font-semibold">{f.name}</span>
              {isPast && (
                <span className="ml-auto text-[8px] font-black uppercase tracking-wider text-stone-400 bg-stone-200/80 px-1 py-0.2 rounded">
                  Past
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
