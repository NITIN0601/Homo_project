import React from "react";

interface CalendarHeaderBannerProps {
  fullDayCount: number;
  timeBlockedCount: number;
}

export const CalendarHeaderBanner: React.FC<CalendarHeaderBannerProps> = ({
  fullDayCount,
  timeBlockedCount,
}) => {
  return (
    <div className="bg-gradient-to-r from-rose-950 via-stone-900 to-rose-900 text-white p-5 rounded-3xl card-shadow border border-rose-600/40 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h2 className="text-base font-extrabold flex items-center gap-2">
          <span>🏖️</span> Doctor Schedule, Out-of-Office &amp; Availability Manager
        </h2>
        <p className="text-xs text-rose-200 mt-0.5">
          Synchronizes instantly with patient booking portal · Block full days, multi-day ranges, or specific time windows
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="bg-rose-900/80 px-3.5 py-1.5 rounded-xl border border-rose-500/40 font-bold text-xs text-rose-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          {fullDayCount} Full Days Blocked
        </span>
        {timeBlockedCount > 0 && (
          <span className="bg-amber-900/80 px-3 py-1.5 rounded-xl border border-amber-500/40 font-bold text-xs text-amber-100 flex items-center gap-1.5">
            <span>⏱️</span>
            {timeBlockedCount} Partial Time Blocks
          </span>
        )}
      </div>
    </div>
  );
};


export default CalendarHeaderBanner;
