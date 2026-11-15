import React, { useMemo, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useTenant } from "../../context/ThemeProvider";
import {
  CLINIC,
  THEME_COLORS,
} from "../../config";
import { formatDateFull } from "../../utils/format";
import {
  getClinicDateOperatingStatus,
} from "../../utils/schedulingEngine";
import type { LocalizedUserSlot } from "../../utils/timezone";
import type { HospitalDoctor } from "../../types/tenant";
import type { DoctorSummary } from "../../types";

interface AppointmentSlotPickerProps {
  selectedDate: string;
  selectedSlot: string;
  onSelectSlot: (s: string, localizedSlot?: LocalizedUserSlot) => void;
  onSelectDate?: (d: string) => void;
  selectedLocalizedSlotKey?: string;
  selectedDoctor?: HospitalDoctor | DoctorSummary | null;
  error?: string;
}

export const AppointmentSlotPicker: React.FC<AppointmentSlotPickerProps> = ({
  selectedDate,
  selectedSlot,
  onSelectSlot,
  onSelectDate,
  selectedLocalizedSlotKey,
  selectedDoctor,
  error,
}) => {
  const { state, userTzInfo, clinicTimeInfo } = useApp();
  const { tenant } = useTenant();

  // Extract booked slots across dates
  const bookedSlots = useMemo(() => {
    return state.appointments
      .filter((a) => a.status !== "Cancelled")
      .flatMap((a) => [
        a.clinicSlot || a.slot || a.time,
        `${a.clinicDate || a.date}_${a.clinicSlot || a.slot || a.time}`,
      ])
      .filter(Boolean);
  }, [state.appointments]);

  const activeDoc = selectedDoctor || tenant.doctor;

  // Modular Scheduling Engine: compute date availability, elapsed status, and localized slots
  const operatingStatus = useMemo(
    () =>
      getClinicDateOperatingStatus(
        selectedDate,
        userTzInfo.timeZone,
        bookedSlots,
        state.blockedDates,
        tenant.hours,
        activeDoc
      ),
    [selectedDate, userTzInfo.timeZone, bookedSlots, state.blockedDates, tenant.hours, activeDoc]
  );

  const onSelectSlotRef = useRef(onSelectSlot);
  useEffect(() => {
    onSelectSlotRef.current = onSelectSlot;
  }, [onSelectSlot]);

  // Selected slot object
  const selectedSlotObj = useMemo(() => {
    if (!selectedSlot || operatingStatus.slots.length === 0) return null;
    return operatingStatus.slots.find(
      (s) =>
        (selectedLocalizedSlotKey ? s.slotKey === selectedLocalizedSlotKey : s.clinicSlot24 === selectedSlot)
    ) || null;
  }, [selectedSlot, selectedLocalizedSlotKey, operatingStatus.slots]);

  // Auto-deselect if the chosen slot elapses or gets blocked while viewing in real time
  useEffect(() => {
    if (selectedSlotObj && selectedSlotObj.disabled) {
      onSelectSlotRef.current("");
    }
  }, [clinicTimeInfo.formattedTime, selectedSlotObj]);

  if (!selectedDate) {
    return (
      <div className="bg-stone-50 rounded-2xl border border-stone-200 px-6 py-8 text-center">
        <span className="text-3xl block mb-2" aria-hidden="true">📅</span>
        <p className="text-stone-400 text-sm font-medium">Select a date above to see available consultation slots</p>
      </div>
    );
  }

  // Doctor full-day Out of Office block
  const fullDayBlocked = state.blockedDates.find((b) => b.date === selectedDate && b.allDay !== false);
  const partialBlocks = state.blockedDates.filter((b) => b.date === selectedDate && b.allDay === false);

  if (fullDayBlocked) {
    return (
      <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center animate-fadeIn">
        <span className="text-3xl block mb-2" aria-hidden="true">🏖️</span>
        <h3 className="text-rose-900 font-bold text-base mb-1">Doctor Out of Office / Unavailable All Day</h3>
        <p className="text-rose-700 text-xs font-medium mb-3">
          {tenant.doctor?.name || CLINIC.DOCTOR_NAME} is unavailable on{" "}
          <strong className="font-bold underline">
            {formatDateFull(selectedDate + "T00:00:00")}
          </strong>
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200">
          <span>Reason:</span> <span>{fullDayBlocked.reason}</span>
        </div>
        <p className="text-stone-500 text-xs mt-3">
          Appointments cannot be scheduled on doctor blocked dates. Please select an alternate date on the calendar above.
        </p>
      </div>
    );
  }

  const isSunday = new Date(selectedDate + "T00:00:00").getDay() === 0;

  return (
    <fieldset
      className="bg-white rounded-2xl card-shadow p-5 space-y-4"
      aria-label="Select appointment time"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <legend className="text-xs font-bold uppercase tracking-widest text-stone-400 block">
          🕐 Available Consultation Times
          <span className="ml-2 text-stone-700 font-bold normal-case tracking-normal">
            — {formatDateFull(selectedDate + "T00:00:00")}
          </span>
        </legend>
        <span className="text-xs text-stone-500 font-medium">
          Times shown in <strong className="text-stone-800 font-mono">{userTzInfo.label || userTzInfo.timeZone}</strong>
        </span>
      </div>

      {/* Doctor Partial Hours Block Notice */}
      {partialBlocks.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2.5 animate-fadeIn">
          <span className="text-lg">⏱️</span>
          <div>
            <p className="font-extrabold text-amber-950">Doctor Availability Notice (Partial Day Blocked)</p>
            <p className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
              {tenant.doctor?.name || "The doctor"} is unavailable for specific hours:{" "}
              {partialBlocks.map((b) => `${b.startTime || "Custom"}–${b.endTime || "Custom"} (${b.reason})`).join("; ")}.
              Remaining consultation slots are open for appointment booking.
            </p>
          </div>
        </div>
      )}

      {/* Notice if all slots on the date have passed or are unavailable */}
      {operatingStatus.allSlotsUnavailable && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1.5 animate-fadeIn shadow-2xs">
          <div className="flex items-center gap-2 font-black text-amber-950 text-sm">
            <span className="text-xl">⚠️</span>
            <span>
              {operatingStatus.isClinicDayEnded && operatingStatus.isTodayInUserTz
                ? "No Available Appointments for Today"
                : "No Available Slots for this Date"}
            </span>
          </div>
          <p className="text-amber-800 text-xs font-medium">
            Please choose an upcoming date on the calendar above to view open consultation slots.
          </p>
          {operatingStatus.suggestedNextDate && onSelectDate && (
            <button
              type="button"
              onClick={() => onSelectDate(operatingStatus.suggestedNextDate!)}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
            >
              📅 Jump to Next Available Date ({operatingStatus.suggestedNextDate})
            </button>
          )}
        </div>
      )}

      {(isSunday || operatingStatus.hasSundaySlots) && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
          <span className="text-base">🗓️</span>
          <div>
            <strong className="font-bold">Sunday Consultations:</strong> Consultations on Sunday are scheduled <em>by prior appointment only</em>. Please select your preferred slot and clinic reception will confirm your consultation.
          </div>
        </div>
      )}

      {/* Slots grouped by diurnal period */}
      {operatingStatus.periodGroups.map((group) => (
        <div key={group.period} className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-1">
            <span className="font-extrabold text-stone-700 flex items-center gap-1.5">
              <span>{group.emoji}</span> {group.period}
            </span>
          </div>

          <div
            className="grid grid-cols-3 sm:grid-cols-6 gap-2"
            role="listbox"
            aria-label={`${group.period} time slots`}
          >
            {group.slots.map((slot) => {
              const selected =
                selectedLocalizedSlotKey
                  ? slot.slotKey === selectedLocalizedSlotKey
                  : slot.clinicSlot24 === selectedSlot;

              return (
                <button
                  key={slot.slotKey}
                  type="button"
                  id={`slot-${slot.clinicSlot24.replace(":", "")}`}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={slot.disabled}
                  disabled={slot.disabled}
                  onClick={() =>
                    !slot.disabled &&
                    onSelectSlot(slot.clinicSlot24, {
                      slotKey: slot.slotKey,
                      userDateYMD: slot.userDateYMD,
                      userTime12: slot.userTime12,
                      userShortLabel: slot.userShortLabel,
                      userTime24: `${String(slot.userHour24).padStart(2, "0")}:${String(slot.userMinute).padStart(2, "0")}`,
                      userHour24: slot.userHour24,
                      userMinute: slot.userMinute,
                      clinicDateYMD: slot.clinicDateYMD,
                      clinicSlot24: slot.clinicSlot24,
                      clinicTime12: slot.clinicTime12,
                      isoTimestamp: slot.isoTimestamp,
                      epochMs: slot.epochMs,
                      period: slot.period,
                      periodEmoji: slot.periodEmoji,
                    })
                  }
                  title={
                    slot.blockedReason
                      ? `Doctor Unavailable: ${slot.blockedReason}`
                      : slot.hasPassed
                      ? `Slot (${slot.userTime12}) has already elapsed for this date`
                      : slot.isBooked
                      ? "Slot is already reserved by another patient"
                      : `Select ${slot.userTime12}`
                  }
                  className="group relative flex flex-col items-center py-2.5 px-2 rounded-xl text-xs font-bold
                    text-center transition-all duration-150
                    focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none cursor-pointer"
                  style={{
                    background: slot.blockedReason
                      ? "#fff1f2"
                      : slot.disabled
                      ? THEME_COLORS.STONE_100
                      : selected
                      ? THEME_COLORS.SAGE_900
                      : THEME_COLORS.GRAY_50,
                    color: slot.blockedReason
                      ? "#9f1239"
                      : slot.disabled
                      ? THEME_COLORS.STONE_400
                      : selected
                      ? THEME_COLORS.WHITE
                      : THEME_COLORS.STONE_800,
                    border: selected
                      ? `2px solid ${THEME_COLORS.SAGE_900}`
                      : slot.blockedReason
                      ? "1.5px dashed #f43f5e"
                      : slot.disabled
                      ? `1.5px dashed ${THEME_COLORS.STONE_300}`
                      : `1.5px solid ${THEME_COLORS.STONE_200}`,
                    cursor: slot.disabled ? "not-allowed" : "pointer",
                    boxShadow: selected ? `0 4px 12px ${THEME_COLORS.SAGE_ALPHA_25}` : "none",
                  }}
                  aria-label={`${slot.userTime12}${
                    slot.blockedReason
                      ? ` — blocked: ${slot.blockedReason}`
                      : slot.isBooked
                      ? " — reserved by another patient"
                      : slot.hasPassed
                      ? " — time elapsed"
                      : ""
                  }`}
                >
                  <span
                    className={`font-mono text-[13px] font-bold ${
                      slot.disabled ? "line-through opacity-70" : ""
                    }`}
                  >
                    {slot.userTime12}
                  </span>

                  {slot.blockedReason ? (
                    <span className="text-[8.5px] font-black uppercase tracking-tight text-rose-800 bg-rose-100/90 px-1 py-0.5 rounded mt-0.5 leading-none">
                      Blocked
                    </span>
                  ) : slot.hasPassed ? (
                    <span className="text-[9px] font-black uppercase tracking-tight text-amber-700 bg-amber-100/90 px-1 py-0.5 rounded mt-0.5 leading-none">
                      Passed
                    </span>
                  ) : slot.isBooked ? (
                    <span className="text-[9px] font-black uppercase tracking-tight text-rose-700 bg-rose-100/90 px-1 py-0.5 rounded mt-0.5 leading-none">
                      Booked
                    </span>
                  ) : slot.isSundayPriorAppt ? (
                    <span className={`text-[8.5px] font-bold uppercase tracking-tight px-1 py-0.5 rounded mt-0.5 leading-none ${
                      selected ? "bg-emerald-800 text-emerald-100" : "bg-amber-100 text-amber-900"
                    }`}>
                      Prior Appt
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Selected Slot Confirmation Bar */}
      {selectedSlotObj && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2 animate-fadeIn shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black">
              ✓
            </span>
            <span className="text-stone-700 font-medium">Selected Consultation Time:</span>
            <strong className="text-emerald-950 font-bold font-mono text-sm">
              {selectedSlotObj.userTime12}
            </strong>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
            {userTzInfo.label || userTzInfo.timeZone}
          </span>
        </div>
      )}

      {error && (
        <p className="mt-2 text-red-500 text-xs font-medium" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
};

export default AppointmentSlotPicker;
