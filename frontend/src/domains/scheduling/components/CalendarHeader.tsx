import React from "react";
import { THEME_GRADIENTS } from "../../../core/config";
import { MONTHS } from "../model/calendarTypes";

interface CalendarHeaderProps {
  viewYear: number;
  viewMonth: number;
  yearOptions: number[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onSelectMonth: (month: number) => void;
  onSelectYear: (year: number) => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  viewYear,
  viewMonth,
  yearOptions,
  onPrevMonth,
  onNextMonth,
  onSelectMonth,
  onSelectYear,
}) => {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{ background: THEME_GRADIENTS.PRIMARY }}
    >
      {/* Prev month */}
      <button
        type="button"
        onClick={onPrevMonth}
        id="cal-prev-month"
        className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/30
          flex items-center justify-center text-white transition-colors
          focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
        aria-label="Previous month"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Month + Year selectors */}
      <div className="flex items-center gap-2">
        <select
          id="cal-month-select"
          value={viewMonth}
          onChange={(e) => onSelectMonth(Number(e.target.value))}
          className="bg-white/15 hover:bg-white/25 text-white text-sm font-bold
            rounded-lg px-3 py-1.5 border border-white/20
            focus:outline-none focus:ring-2 focus:ring-white/60
            transition-colors cursor-pointer appearance-none text-center"
          aria-label="Select month"
          style={{ colorScheme: "dark" }}
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i} className="text-stone-800 bg-white font-medium">
              {m}
            </option>
          ))}
        </select>

        <select
          id="cal-year-select"
          value={viewYear}
          onChange={(e) => onSelectYear(Number(e.target.value))}
          className="bg-white/15 hover:bg-white/25 text-white text-sm font-bold
            rounded-lg px-3 py-1.5 border border-white/20
            focus:outline-none focus:ring-2 focus:ring-white/60
            transition-colors cursor-pointer appearance-none text-center"
          aria-label="Select year"
          style={{ colorScheme: "dark" }}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y} className="text-stone-800 bg-white font-medium">
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Next month */}
      <button
        type="button"
        onClick={onNextMonth}
        id="cal-next-month"
        className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/30
          flex items-center justify-center text-white transition-colors
          focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
        aria-label="Next month"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
};
