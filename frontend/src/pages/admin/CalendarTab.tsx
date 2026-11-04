import React, { useState, useMemo, useEffect } from "react";
import CalendarPicker from "../../components/forms/CalendarPicker";
import { formatDateWithWeekday, formatDateISO } from "../../utils/format";
import { Modal } from "../../components/ui";
import { MORNING_SLOTS, EVENING_SLOTS } from "../../config";
import { useApp } from "../../context/AppContext";
import type { BlockedDateEntry } from "./types";

export const BLOCKING_REASON_TEMPLATES: Record<"ooo" | "holiday" | "leave", string[]> = {
  ooo: [
    "Doctor Out of Office — CME & Medical Conference",
    "Doctor Out of Office — Hospital Rounds & Surgery",
    "Doctor Unavailable — Clinical Research Review",
    "Doctor Travel — Out of Station",
  ],
  holiday: [
    "Clinic Closed — Public & Festival Holiday",
    "Clinic Closed — Gazetted National Holiday",
    "Clinic Closed — Regional Festive Observance",
  ],
  leave: [
    "Clinic Maintenance, Sanitization & Upgrade",
    "Doctor Personal Leave — Family Obligation",
    "Facility Audit & Inventory Restock",
  ],
};

interface CalendarTabProps {
  blockedDates: BlockedDateEntry[];
  onBlockDate: (
    date: string,
    reason: string,
    type: "ooo" | "holiday" | "leave",
    timeConfig?: { allDay?: boolean; startTime?: string; endTime?: string; slots?: string[] }
  ) => void;
  onBlockDateRange: (
    start: string,
    end: string,
    reason: string,
    type: "ooo" | "holiday" | "leave",
    timeConfig?: { allDay?: boolean; startTime?: string; endTime?: string; slots?: string[] }
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
  const [newOooType, setNewOooType] = useState<"ooo" | "holiday" | "leave">("ooo");
  const [newOooReason, setNewOooReason] = useState(BLOCKING_REASON_TEMPLATES.ooo[0]);
  
  // Time-based blocking states
  const [blockDurationType, setBlockDurationType] = useState<"all_day" | "time_based">("all_day");
  const [timePreset, setTimePreset] = useState<"morning" | "evening" | "custom">("morning");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([...MORNING_SLOTS]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:30");

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [inspectedBlockedDate, setInspectedBlockedDate] = useState<BlockedDateEntry | null>(null);

  // Inspect Modal editable fields
  const [editInspectReason, setEditInspectReason] = useState("");
  const [editInspectType, setEditInspectType] = useState<"ooo" | "holiday" | "leave">("ooo");
  const [inspectSaveSuccess, setInspectSaveSuccess] = useState(false);

  useEffect(() => {
    if (inspectedBlockedDate) {
      setEditInspectReason(inspectedBlockedDate.reason || "");
      setEditInspectType(inspectedBlockedDate.type || "ooo");
      setInspectSaveSuccess(false);
    }
  }, [inspectedBlockedDate]);

  const handleTypeChange = (type: "ooo" | "holiday" | "leave") => {
    setNewOooType(type);
    const allTemplates = Object.values(BLOCKING_REASON_TEMPLATES).flat();
    if (!newOooReason.trim() || allTemplates.includes(newOooReason)) {
      setNewOooReason(BLOCKING_REASON_TEMPLATES[type][0]);
    }
  };

  const handleSaveInspectNotice = () => {
    if (!inspectedBlockedDate || !editInspectReason.trim()) return;
    const updates = { reason: editInspectReason.trim(), type: editInspectType };
    if (onUpdateBlockedDate) {
      onUpdateBlockedDate(inspectedBlockedDate.id, inspectedBlockedDate.date, updates);
    } else if (updateBlockedDateFallback) {
      updateBlockedDateFallback({ id: inspectedBlockedDate.id, date: inspectedBlockedDate.date }, updates);
    }
    setInspectedBlockedDate((prev) => (prev ? { ...prev, ...updates } : null));
    setInspectSaveSuccess(true);
    setSuccessMsg(`Updated notice for ${inspectedBlockedDate.date} successfully.`);
    setTimeout(() => {
      setInspectSaveSuccess(false);
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

  const allAvailableSlots = useMemo(() => [...MORNING_SLOTS, ...EVENING_SLOTS], []);

  const computedDayCount = useMemo(() => {
    if (!newOooDate) return 0;
    if (!newOooEndDate || newOooEndDate <= newOooDate) return 1;
    const [sY, sM, sD] = newOooDate.split("-").map(Number);
    const [eY, eM, eD] = newOooEndDate.split("-").map(Number);
    const start = new Date(sY, sM - 1, sD, 12, 0, 0);
    const end = new Date(eY, eM - 1, eD, 12, 0, 0);
    const diffTime = end.getTime() - start.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [newOooDate, newOooEndDate]);

  // Handle preset selection
  const handleSelectPreset = (preset: "morning" | "evening" | "custom") => {
    setTimePreset(preset);
    if (preset === "morning") {
      setSelectedSlots([...MORNING_SLOTS]);
      setStartTime("10:00");
      setEndTime("12:30");
    } else if (preset === "evening") {
      setSelectedSlots([...EVENING_SLOTS]);
      setStartTime("17:30");
      setEndTime("19:30");
    } else {
      // keep current selection or default to first 2 morning slots
      if (selectedSlots.length === 0) {
        setSelectedSlots(["10:00", "10:30"]);
        setStartTime("10:00");
        setEndTime("10:30");
      }
    }
  };

  // Toggle individual slot chip
  const handleToggleSlot = (slot: string) => {
    setTimePreset("custom");
    setSelectedSlots((prev) => {
      let updated: string[];
      if (prev.includes(slot)) {
        updated = prev.filter((s) => s !== slot);
      } else {
        updated = [...prev, slot].sort();
      }
      if (updated.length > 0) {
        setStartTime(updated[0]);
        setEndTime(updated[updated.length - 1]);
      }
      return updated;
    });
  };

  const handleSelectAllMorning = () => {
    setTimePreset("custom");
    setSelectedSlots((prev) => {
      const merged = Array.from(new Set([...prev, ...MORNING_SLOTS])).sort();
      if (merged.length > 0) {
        setStartTime(merged[0]);
        setEndTime(merged[merged.length - 1]);
      }
      return merged;
    });
  };

  const handleSelectAllEvening = () => {
    setTimePreset("custom");
    setSelectedSlots((prev) => {
      const merged = Array.from(new Set([...prev, ...EVENING_SLOTS])).sort();
      if (merged.length > 0) {
        setStartTime(merged[0]);
        setEndTime(merged[merged.length - 1]);
      }
      return merged;
    });
  };

  const handleSelectAllSlots = () => {
    setTimePreset("custom");
    setSelectedSlots([...allAvailableSlots]);
    setStartTime(allAvailableSlots[0]);
    setEndTime(allAvailableSlots[allAvailableSlots.length - 1]);
  };

  const handleClearSlots = () => {
    setTimePreset("custom");
    setSelectedSlots([]);
    setStartTime("");
    setEndTime("");
  };

  const handleBlockCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOooDate) return;

    if (blockDurationType === "time_based" && selectedSlots.length === 0 && (!startTime || !endTime)) {
      alert("Please select at least one time slot or enter a start/end time window.");
      return;
    }

    const timeConfig =
      blockDurationType === "time_based"
        ? {
            allDay: false,
            startTime: startTime || (selectedSlots.length > 0 ? selectedSlots[0] : "10:00"),
            endTime: endTime || (selectedSlots.length > 0 ? selectedSlots[selectedSlots.length - 1] : "12:30"),
            slots: selectedSlots,
          }
        : {
            allDay: true,
          };

    const timeSummary =
      blockDurationType === "time_based"
        ? ` [${timeConfig.startTime} – ${timeConfig.endTime} (${selectedSlots.length} slots)]`
        : " [Full Day]";

    if (newOooEndDate && newOooEndDate > newOooDate) {
      onBlockDateRange(newOooDate, newOooEndDate, newOooReason, newOooType, timeConfig);
      setSuccessMsg(
        `Blocked ${computedDayCount} days (${newOooDate} to ${newOooEndDate})${timeSummary} on patient appointment portal.`
      );
    } else {
      onBlockDate(newOooDate, newOooReason, newOooType, timeConfig);
      setSuccessMsg(
        `Blocked ${newOooDate}${timeSummary} as ${newOooType.toUpperCase()} on patient appointment portal.`
      );
    }

    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // Stats
  const fullDayCount = useMemo(() => blockedDates.filter((b) => b.allDay !== false).length, [blockedDates]);
  const timeBlockedCount = useMemo(() => blockedDates.filter((b) => b.allDay === false).length, [blockedDates]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Calendar Header Banner */}
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

      {successMsg && (
        <div className="bg-rose-50 border border-rose-300 text-rose-950 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
          <span>🏖️</span> {successMsg}
        </div>
      )}

      {/* Main Grid: Form on Left, Calendar Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form and Blocked List (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Date Block Form Card */}
          <div className="bg-white rounded-3xl card-shadow border border-stone-100 p-5 space-y-4 text-xs">
            <div className="border-b border-stone-100 pb-2.5 flex items-center justify-between">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                <span>📅</span> Block Clinic Dates &amp; Time Slots
              </h3>
              <span className="text-[11px] text-stone-400 font-medium">Single Day or Date Range</span>
            </div>

            <form onSubmit={handleBlockCalendar} className="space-y-4">
              {/* Date pickers (Start Date & Optional End Date) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newOooDate}
                    onChange={(e) => setNewOooDate(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                    End Date (Optional for Date Range)
                  </label>
                  <input
                    type="date"
                    value={newOooEndDate}
                    onChange={(e) => setNewOooEndDate(e.target.value)}
                    min={newOooDate}
                    className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {computedDayCount > 1 && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-bold text-[11px] flex items-center gap-2">
                  <span>📅</span> Range selection: <strong>{computedDayCount} consecutive calendar days</strong> will be blocked.
                </div>
              )}

              {/* Block Duration Selection: All Day vs Time-Based */}
              <div className="space-y-2 pt-1">
                <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px] block">
                  Block Duration &amp; Scope *
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100/90 rounded-2xl border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setBlockDurationType("all_day")}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      blockDurationType === "all_day"
                        ? "bg-white text-rose-900 shadow-sm border border-stone-200"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <span>🌞</span> All Day (Full Day)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockDurationType("time_based")}
                    className={`py-2 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      blockDurationType === "time_based"
                        ? "bg-white text-rose-900 shadow-sm border border-stone-200"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    <span>⏱️</span> Specific Time / Hours
                  </button>
                </div>
              </div>

              {/* Time-Based Options: Presets & Interactive Slot Chips */}
              {blockDurationType === "time_based" && (
                <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-3.5 animate-fadeIn">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/60 pb-2">
                    <span className="font-extrabold text-amber-950 text-xs flex items-center gap-1.5">
                      <span>⏱️</span> Time Window &amp; Slot Configuration
                    </span>
                    <span className="text-[10px] font-bold text-amber-800">
                      {selectedSlots.length} of {allAvailableSlots.length} slots selected
                    </span>
                  </div>

                  {/* Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold text-stone-600 uppercase">Quick Presets:</span>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset("morning")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        timePreset === "morning"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-white text-stone-700 border border-amber-300 hover:bg-amber-100"
                      }`}
                    >
                      🌅 Morning Session (10:00 – 12:30)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset("evening")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        timePreset === "evening"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-white text-stone-700 border border-amber-300 hover:bg-amber-100"
                      }`}
                    >
                      🌆 Evening Session (17:30 – 19:30)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset("custom")}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        timePreset === "custom"
                          ? "bg-amber-600 text-white shadow-xs"
                          : "bg-white text-stone-700 border border-amber-300 hover:bg-amber-100"
                      }`}
                    >
                      ⚡ Custom Range
                    </button>
                  </div>

                  {/* Start Time & End Time Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                        Start Time *
                      </label>
                      <input
                        type="time"
                        required={blockDurationType === "time_based"}
                        value={startTime}
                        onChange={(e) => {
                          setStartTime(e.target.value);
                          setTimePreset("custom");
                        }}
                        className="w-full mt-1 p-2 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                        End Time *
                      </label>
                      <input
                        type="time"
                        required={blockDurationType === "time_based"}
                        value={endTime}
                        onChange={(e) => {
                          setEndTime(e.target.value);
                          setTimePreset("custom");
                        }}
                        className="w-full mt-1 p-2 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Interactive Consultation Slot Chips */}
                  <div className="space-y-2 pt-1 border-t border-amber-200/50">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold text-stone-700 uppercase tracking-wider">
                        Toggle Specific Consultation Slots to Block:
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <button
                          type="button"
                          onClick={handleSelectAllMorning}
                          className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                        >
                          +Morning
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={handleSelectAllEvening}
                          className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                        >
                          +Evening
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={handleSelectAllSlots}
                          className="text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                        >
                          All
                        </button>
                        <span>·</span>
                        <button
                          type="button"
                          onClick={handleClearSlots}
                          className="text-rose-700 hover:text-rose-900 font-bold underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Morning slots */}
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 block mb-1">Morning Slots:</span>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {MORNING_SLOTS.map((s) => {
                          const isSelected = selectedSlots.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleToggleSlot(s)}
                              className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                                isSelected
                                  ? "bg-rose-700 text-white border-rose-800 shadow-xs scale-102"
                                  : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                              }`}
                            >
                              <span>{isSelected ? "⛔" : "⚪"}</span>
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Evening slots */}
                    <div>
                      <span className="text-[10px] font-bold text-stone-500 block mb-1">Evening Slots:</span>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        {EVENING_SLOTS.map((s) => {
                          const isSelected = selectedSlots.includes(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => handleToggleSlot(s)}
                              className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                                isSelected
                                  ? "bg-rose-700 text-white border-rose-800 shadow-xs scale-102"
                                  : "bg-white text-stone-700 border-stone-300 hover:bg-stone-50"
                              }`}
                            >
                              <span>{isSelected ? "⛔" : "⚪"}</span>
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Blocking Type & Reason */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                      Blocking Type *
                    </label>
                    <select
                      value={newOooType}
                      onChange={(e) => handleTypeChange(e.target.value as any)}
                      className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs"
                    >
                      <option value="ooo">🏖️ Doctor Out of Office (OOO)</option>
                      <option value="holiday">🎉 Public / Festival Holiday</option>
                      <option value="leave">🌿 Clinic Maintenance / Personal Leave</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                      Reason (Displayed to Patients) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newOooReason}
                      onChange={(e) => setNewOooReason(e.target.value)}
                      placeholder="e.g. Hospital Rounds, CME Conference, Surgery…"
                      className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                    />
                  </div>
                </div>

                {/* Default Template Suggestions Matching Blocking Type */}
                <div className="p-3 bg-stone-50/80 rounded-2xl border border-stone-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-stone-600 uppercase tracking-wider">
                      Quick Reason Templates ({newOooType.toUpperCase()}):
                    </span>
                    <span className="text-[10px] text-stone-400">Click to apply template</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {BLOCKING_REASON_TEMPLATES[newOooType].map((tpl) => (
                      <button
                        key={tpl}
                        type="button"
                        onClick={() => setNewOooReason(tpl)}
                        className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all text-left cursor-pointer ${
                          newOooReason === tpl
                            ? "bg-rose-950 text-white border-rose-950 font-bold shadow-xs scale-[1.02]"
                            : "bg-white hover:bg-stone-100 text-stone-700 border-stone-200"
                        }`}
                      >
                        {tpl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  {blockDurationType === "all_day" ? (
                    <>
                      <span>🏖️</span> Block Selected Dates ({computedDayCount} {computedDayCount === 1 ? "Day" : "Days"} — Full Day)
                    </>
                  ) : (
                    <>
                      <span>⏱️</span> Block Selected Time Slots ({computedDayCount} {computedDayCount === 1 ? "Day" : "Days"} × {selectedSlots.length} Slots)
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Active Blocked Dates Roster */}
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
                        onClick={() => setInspectedBlockedDate(entry)}
                        className="text-stone-600 hover:text-stone-900 font-bold text-[11px] cursor-pointer px-2 py-1"
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUnblock(entry)}
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
        </div>

        {/* Embedded Calendar Picker preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl card-shadow border border-stone-100 p-5 space-y-3">
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                <span>🗓️</span> Patient Portal Calendar Preview
              </h3>
              <p className="text-stone-500 text-xs mt-0.5">
                Displays dates exactly as patient sees them on booking screen
              </p>
            </div>

            <div className="border border-stone-200 rounded-2xl overflow-hidden p-2 bg-stone-50/50">
              <CalendarPicker
                adminMode
                selectedDate={newOooDate}
                startDate={newOooDate}
                endDate={newOooEndDate}
                onSelectDate={(d: string) => setNewOooDate(d)}
                onSelectRange={(start: string, end: string) => {
                  setNewOooDate(start);
                  setNewOooEndDate(end);
                }}
                onDateClick={(d: string, _isBlocked: boolean, entry?: any) => {
                  if (entry) {
                    setInspectedBlockedDate(entry);
                  } else {
                    setNewOooDate(d);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Inspect Blocked Date Modal */}
      {inspectedBlockedDate && (
        <Modal
          isOpen={!!inspectedBlockedDate}
          onClose={() => setInspectedBlockedDate(null)}
          title="Blocked Schedule Details & Patient Notice"
          subtitle="Manage Doctor Availability and update the notice displayed to patients"
          size="md"
          footer={
            <div className="flex items-center justify-between gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  handleUnblock(inspectedBlockedDate);
                  setInspectedBlockedDate(null);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition-colors cursor-pointer text-xs active:scale-95"
              >
                🗑️ Unblock Entry
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setInspectedBlockedDate(null)}
                  className="px-4 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition-colors cursor-pointer text-xs"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveInspectNotice}
                  disabled={!editInspectReason.trim()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold transition-colors cursor-pointer text-xs active:scale-95 shadow-sm flex items-center gap-1.5"
                >
                  <span>💾</span> Save Changes
                </button>
              </div>
            </div>
          }
        >
          <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 text-xs">
            {inspectSaveSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-2 animate-fadeIn">
                <span>✓</span> Notice updated successfully! Live schedule reflects changes immediately.
              </div>
            )}

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
                <div>
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Date</span>
                  <p className="font-bold text-stone-900 mt-0.5">
                    {formatDateWithWeekday(inspectedBlockedDate.date)}
                  </p>
                  <p className="text-[11px] font-mono text-stone-500">{inspectedBlockedDate.date}</p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Scope</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${
                      inspectedBlockedDate.allDay !== false
                        ? "bg-rose-100 text-rose-900 border border-rose-300"
                        : "bg-blue-100 text-blue-900 border border-blue-300"
                    }`}
                  >
                    {inspectedBlockedDate.allDay !== false ? "🌞 Full Day Block" : "⏱️ Time-Based Block"}
                  </span>
                </div>
              </div>

              {inspectedBlockedDate.allDay === false && (
                <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                      Blocked Hours Window
                    </span>
                    <p className="font-mono font-bold text-blue-950 mt-0.5 text-xs">
                      {inspectedBlockedDate.startTime || "Custom"} – {inspectedBlockedDate.endTime || "Custom"}
                    </p>
                  </div>

                  {inspectedBlockedDate.slots && inspectedBlockedDate.slots.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                        Blocked Consultation Slots ({inspectedBlockedDate.slots.length}):
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {inspectedBlockedDate.slots.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-md bg-white text-blue-900 border border-blue-200 font-mono font-bold text-[11px] shadow-xs"
                          >
                            ⛔ {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Editable Blocking Type */}
              <div>
                <label className="text-[10px] font-extrabold text-stone-600 uppercase tracking-wider block mb-1">
                  Blocking Category / Type *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditInspectType("ooo");
                      const allTpls = Object.values(BLOCKING_REASON_TEMPLATES).flat();
                      if (!editInspectReason.trim() || allTpls.includes(editInspectReason)) {
                        setEditInspectReason(BLOCKING_REASON_TEMPLATES.ooo[0]);
                      }
                    }}
                    className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      editInspectType === "ooo"
                        ? "bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-400/40"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    🏖️ Out of Office
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditInspectType("holiday");
                      const allTpls = Object.values(BLOCKING_REASON_TEMPLATES).flat();
                      if (!editInspectReason.trim() || allTpls.includes(editInspectReason)) {
                        setEditInspectReason(BLOCKING_REASON_TEMPLATES.holiday[0]);
                      }
                    }}
                    className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      editInspectType === "holiday"
                        ? "bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-400/40"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    🎉 Holiday
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditInspectType("leave");
                      const allTpls = Object.values(BLOCKING_REASON_TEMPLATES).flat();
                      if (!editInspectReason.trim() || allTpls.includes(editInspectReason)) {
                        setEditInspectReason(BLOCKING_REASON_TEMPLATES.leave[0]);
                      }
                    }}
                    className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                      editInspectType === "leave"
                        ? "bg-purple-50 border-purple-400 text-purple-950 ring-2 ring-purple-400/40"
                        : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    🌿 Leave / Maint.
                  </button>
                </div>
              </div>

              {/* Editable Reason */}
              <div>
                <label className="text-[10px] font-extrabold text-stone-600 uppercase tracking-wider block mb-1">
                  Reason (Displayed to Patients) *
                </label>
                <textarea
                  rows={2}
                  value={editInspectReason}
                  onChange={(e) => setEditInspectReason(e.target.value)}
                  placeholder="e.g. CME Conference, Emergency Surgery, Regional Holiday…"
                  className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                />

                {/* Template Suggestions matching selected type */}
                <div className="mt-2 space-y-1">
                  <span className="text-[10px] font-semibold text-stone-500">
                    Template suggestions for {editInspectType.toUpperCase()}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {BLOCKING_REASON_TEMPLATES[editInspectType].map((tpl) => (
                      <button
                        key={tpl}
                        type="button"
                        onClick={() => setEditInspectReason(tpl)}
                        className={`text-[10.5px] px-2.5 py-1 rounded-lg border transition-all text-left cursor-pointer ${
                          editInspectReason === tpl
                            ? "bg-stone-900 text-white border-stone-900 font-bold shadow-xs"
                            : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                        }`}
                      >
                        {tpl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CalendarTab;
