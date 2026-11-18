import React, { useState, useMemo } from "react";
import { formatDateISO } from "../../utils/format";
import { useApp } from "../../context/AppContext";
import type { BlockedDateEntry } from "./types";
import { BLOCKING_REASON_TEMPLATES } from "./calendarConstants";
import { CalendarHeaderBanner } from "./CalendarHeaderBanner";
import { CalendarMonthGrid } from "./CalendarMonthGrid";
import { BlockDateForm } from "./BlockDateForm";
import { BlockedDateList } from "./BlockedDateList";
import { InspectBlockedDateModal } from "./InspectBlockedDateModal";
import type { BlockDateTimeConfig } from "./BlockDateModal";

export { BLOCKING_REASON_TEMPLATES };

interface CalendarTabProps {
  blockedDates: BlockedDateEntry[];
  onBlockDate: (
    date: string,
    reason: string,
    type: "ooo" | "holiday" | "leave",
    timeConfig?: BlockDateTimeConfig
  ) => void;
  onBlockDateRange: (
    start: string,
    end: string,
    reason: string,
    type: "ooo" | "holiday" | "leave",
    timeConfig?: BlockDateTimeConfig
  ) => void;
  onUnblockDate: (id?: string, date?: string) => void;
  onUpdateBlockedDate?: (
    id: string | undefined,
    date: string | undefined,
    updates: { reason?: string; type?: "ooo" | "holiday" | "leave" }
  ) => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({
  blockedDates,
  onBlockDate,
  onBlockDateRange,
  onUnblockDate,
  onUpdateBlockedDate,
}) => {
  const { updateBlockedDate: updateBlockedDateFallback } = useApp();

  const [newOooDate, setNewOooDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDateISO(d);
  });
  const [newOooEndDate, setNewOooEndDate] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [inspectedBlockedDate, setInspectedBlockedDate] = useState<BlockedDateEntry | null>(null);

  const handleSaveInspectNotice = (
    id: string | undefined,
    date: string | undefined,
    updates: { reason?: string; type?: "ooo" | "holiday" | "leave" }
  ) => {
    if (onUpdateBlockedDate) {
      onUpdateBlockedDate(id, date, updates);
    } else if (updateBlockedDateFallback) {
      updateBlockedDateFallback({ id, date }, updates);
    }
    setInspectedBlockedDate((prev) => (prev ? { ...prev, ...updates } : null));
    setSuccessMsg(`Updated notice for ${date} successfully.`);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 3500);
  };

  const handleUnblock = (entry: BlockedDateEntry) => {
    onUnblockDate(entry.id, entry.date);
    const scopeDesc =
      entry.allDay !== false
        ? "Full Day"
        : `${entry.startTime || "Custom"}–${entry.endTime || "Custom"}${entry.slots ? ` (${entry.slots.length} slots)` : ""}`;
    setSuccessMsg(`Unblocked ${entry.date} (${scopeDesc}) from doctor schedule.`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleBlockSubmitted = (
    startDate: string,
    endDate: string,
    reason: string,
    type: "ooo" | "holiday" | "leave",
    timeConfig: BlockDateTimeConfig
  ) => {
    const isRange = endDate && endDate > startDate;
    const timeSummary =
      timeConfig.allDay === false
        ? ` [${timeConfig.startTime} – ${timeConfig.endTime}${timeConfig.slots ? ` (${timeConfig.slots.length} slots)` : ""}]`
        : " [Full Day]";

    if (isRange) {
      onBlockDateRange(startDate, endDate, reason, type, timeConfig);
      setSuccessMsg(`Blocked date range (${startDate} to ${endDate})${timeSummary} on patient appointment portal.`);
    } else {
      onBlockDate(startDate, reason, type, timeConfig);
      setSuccessMsg(`Blocked ${startDate}${timeSummary} as ${type.toUpperCase()} on patient appointment portal.`);
    }

    setTimeout(() => setSuccessMsg(null), 5000);
  };

  const fullDayCount = useMemo(() => blockedDates.filter((b) => b.allDay !== false).length, [blockedDates]);
  const timeBlockedCount = useMemo(() => blockedDates.filter((b) => b.allDay === false).length, [blockedDates]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Calendar Header Banner */}
      <CalendarHeaderBanner
        fullDayCount={fullDayCount}
        timeBlockedCount={timeBlockedCount}
      />

      {successMsg && (
        <div className="bg-rose-50 border border-rose-300 text-rose-950 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
          <span>🏖️</span> {successMsg}
        </div>
      )}

      {/* Main Grid: Form & List on Left (7 cols), Visual Calendar Grid on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form and Blocked List (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <BlockDateForm
            startDate={newOooDate}
            endDate={newOooEndDate}
            onStartDateChange={setNewOooDate}
            onEndDateChange={setNewOooEndDate}
            onSubmitBlock={handleBlockSubmitted}
          />

          <BlockedDateList
            blockedDates={blockedDates}
            onInspect={setInspectedBlockedDate}
            onUnblock={handleUnblock}
          />
        </div>

        {/* Visual Calendar Month Grid Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <CalendarMonthGrid
            selectedDate={newOooDate}
            startDate={newOooDate}
            endDate={newOooEndDate}
            onSelectDate={(d: string) => setNewOooDate(d)}
            onSelectRange={(start: string, end: string) => {
              setNewOooDate(start);
              setNewOooEndDate(end);
            }}
            onInspectDateEntry={(entry) => setInspectedBlockedDate(entry)}
          />
        </div>
      </div>

      {/* Inspect Blocked Date Modal */}
      <InspectBlockedDateModal
        entry={inspectedBlockedDate}
        isOpen={!!inspectedBlockedDate}
        onClose={() => setInspectedBlockedDate(null)}
        onUnblock={handleUnblock}
        onSaveNotice={handleSaveInspectNotice}
      />
    </div>
  );
};

export default CalendarTab;
