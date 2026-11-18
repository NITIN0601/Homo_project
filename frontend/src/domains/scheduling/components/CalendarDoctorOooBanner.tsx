import React from "react";
import type { BlockedCalendarDate } from "@core/types";
import { formatDateWithWeekday } from "../../../shared/utils/format";

interface CalendarDoctorOooBannerProps {
  monthBlockedDates: BlockedCalendarDate[];
}

export const CalendarDoctorOooBanner: React.FC<CalendarDoctorOooBannerProps> = ({
  monthBlockedDates,
}) => {
  if (monthBlockedDates.length === 0) return null;

  return (
    <div className="mx-5 my-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200/90 text-xs animate-fadeIn">
      <div className="flex items-center gap-1.5 font-black text-rose-950 mb-1">
        <span>🏖️</span>
        <span>Doctor Availability &amp; Out of Office (OOO) Schedule</span>
      </div>
      <div className="space-y-1 text-rose-800 text-[11px] font-medium">
        {monthBlockedDates.map((b) => (
          <div key={b.id || b.date} className="flex items-start gap-1.5">
            <span className="font-bold font-mono text-rose-900 whitespace-nowrap">
              • {formatDateWithWeekday(b.date + "T00:00:00")}
              {b.allDay === false ? ` [⏱️ ${b.startTime || "Custom"}–${b.endTime || "Custom"}]` : " [🌞 Full Day]"}:
            </span>
            <span>{b.reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
