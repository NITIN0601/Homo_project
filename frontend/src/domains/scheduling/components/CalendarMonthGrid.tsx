import React from "react";
import CalendarPicker from "./CalendarPicker";
import type { BlockedDateEntry } from "../model/schedulingTypes";

interface CalendarMonthGridProps {
  selectedDate: string;
  startDate: string;
  endDate: string;
  onSelectDate: (date: string) => void;
  onSelectRange: (startDate: string, endDate: string) => void;
  onInspectDateEntry?: (entry: BlockedDateEntry) => void;
  title?: string;
  subtitle?: string;
}

export const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = ({
  selectedDate,
  startDate,
  endDate,
  onSelectDate,
  onSelectRange,
  onInspectDateEntry,
  title = "Patient Portal Calendar Preview",
  subtitle = "Displays dates exactly as patient sees them on booking screen",
}) => {
  return (
    <div className="bg-white rounded-3xl card-shadow border border-stone-100 p-5 space-y-3">
      <div>
        <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
          <span>🗓️</span> {title}
        </h3>
        <p className="text-stone-500 text-xs mt-0.5">
          {subtitle}
        </p>
      </div>

      <div className="border border-stone-200 rounded-2xl overflow-hidden p-2 bg-stone-50/50">
        <CalendarPicker
          adminMode
          selectedDate={selectedDate}
          startDate={startDate}
          endDate={endDate}
          onSelectDate={onSelectDate}
          onSelectRange={onSelectRange}
          onDateClick={(d: string, _isBlocked: boolean, entry?: BlockedDateEntry) => {
            if (entry && onInspectDateEntry) {
              onInspectDateEntry(entry);
            } else {
              onSelectDate(d);
            }
          }}
        />
      </div>
    </div>
  );
};


export default CalendarMonthGrid;
