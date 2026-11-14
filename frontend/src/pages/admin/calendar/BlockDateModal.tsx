import React, { useState, useMemo } from "react";
import { Modal } from "../../../components/ui";
import { MORNING_SLOTS, EVENING_SLOTS, ALL_TIME_SLOTS } from "../../../config";
import { useToast } from "../../../context/ToastContext";
import { BLOCKING_REASON_TEMPLATES } from "./constants";

export interface BlockDateTimeConfig {
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  slots?: string[];
}

export interface BlockDateFormProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSubmitBlock: (
    startDate: string,
    endDate: string,
    reason: string,
    type: "ooo" | "holiday" | "leave",
    timeConfig: BlockDateTimeConfig
  ) => void;
  onCancel?: () => void;
}

export const BlockDateForm: React.FC<BlockDateFormProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onSubmitBlock,
  onCancel,
}) => {
  const toast = useToast();

  const [type, setType] = useState<"ooo" | "holiday" | "leave">("ooo");
  const [reason, setReason] = useState(BLOCKING_REASON_TEMPLATES.ooo[0]);
  const [blockDurationType, setBlockDurationType] = useState<"all_day" | "time_based">("all_day");
  const [timePreset, setTimePreset] = useState<"morning" | "evening" | "custom">("morning");
  const [selectedSlots, setSelectedSlots] = useState<string[]>([...MORNING_SLOTS]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:30");

  const allAvailableSlots = ALL_TIME_SLOTS;

  const computedDayCount = useMemo(() => {
    if (!startDate) return 0;
    if (!endDate || endDate <= startDate) return 1;
    const [sY, sM, sD] = startDate.split("-").map(Number);
    const [eY, eM, eD] = endDate.split("-").map(Number);
    const start = new Date(sY, sM - 1, sD, 12, 0, 0);
    const end = new Date(eY, eM - 1, eD, 12, 0, 0);
    const diffTime = end.getTime() - start.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const handleTypeChange = (newType: "ooo" | "holiday" | "leave") => {
    setType(newType);
    const allTemplates = Object.values(BLOCKING_REASON_TEMPLATES).flat();
    if (!reason.trim() || allTemplates.includes(reason)) {
      setReason(BLOCKING_REASON_TEMPLATES[newType][0]);
    }
  };

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
      if (selectedSlots.length === 0) {
        setSelectedSlots(["10:00", "10:30"]);
        setStartTime("10:00");
        setEndTime("10:30");
      }
    }
  };

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;

    if (blockDurationType === "time_based" && selectedSlots.length === 0 && (!startTime || !endTime)) {
      toast.warning("Please select at least one time slot or enter a start/end time window.");
      return;
    }

    const timeConfig: BlockDateTimeConfig =
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

    onSubmitBlock(startDate, endDate, reason, type, timeConfig);
  };

  return (
    <div className="bg-white rounded-3xl card-shadow border border-stone-100 p-5 space-y-4 text-xs">
      <div className="border-b border-stone-100 pb-2.5 flex items-center justify-between">
        <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
          <span>📅</span> Block Clinic Dates &amp; Time Slots
        </h3>
        <span className="text-[11px] text-stone-400 font-medium">Single Day or Date Range</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Date pickers (Start Date & Optional End Date) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              Start Date *
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
              End Date (Optional for Date Range)
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              min={startDate}
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
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as "ooo" | "holiday" | "leave")}
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
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Hospital Rounds, CME Conference, Surgery…"
                className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium"
              />
            </div>
          </div>

          {/* Default Template Suggestions Matching Blocking Type */}
          <div className="p-3 bg-stone-50/80 rounded-2xl border border-stone-200/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-stone-600 uppercase tracking-wider">
                Quick Reason Templates ({type.toUpperCase()}):
              </span>
              <span className="text-[10px] text-stone-400">Click to apply template</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {BLOCKING_REASON_TEMPLATES[type].map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setReason(tpl)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl border transition-all text-left cursor-pointer ${
                    reason === tpl
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

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 font-bold text-xs text-stone-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
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
  );
};

export interface BlockDateModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onSubmitBlock: (
    startDate: string,
    endDate: string,
    reason: string,
    type: "ooo" | "holiday" | "leave",
    timeConfig: BlockDateTimeConfig
  ) => void;
}

export const BlockDateModal: React.FC<BlockDateModalProps> = ({
  isOpen,
  onClose,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onSubmitBlock,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Block Clinic Dates & Time Slots"
      subtitle="Manage Leave, Public Holidays, and Doctor Out of Office availability"
      size="md"
    >
      <div className="p-4 sm:p-6">
        <BlockDateForm
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
          onSubmitBlock={(s, e, r, t, tc) => {
            onSubmitBlock(s, e, r, t, tc);
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </Modal>
  );
};

