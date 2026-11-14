import React, { useMemo, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useTenant } from "../../context/ThemeProvider";
import {
  CLINIC,
  OFFICE_HOURS,
  MORNING_SLOTS,
  EVENING_SLOTS,
  ALL_TIME_SLOTS,
  THEME_COLORS,
} from "../../config";
import { formatDateFull } from "../../utils/format";
import {
  isSlotPassed,
  mapClinicSlotToUserTime,
  getMappedSessionHours,
} from "../../utils/timezone";

const TIME_SLOTS: readonly string[] = ALL_TIME_SLOTS;

interface AppointmentSlotPickerProps {
  selectedDate: string;
  selectedSlot: string;
  onSelectSlot: (s: string) => void;
  error?: string;
}

export const AppointmentSlotPicker: React.FC<AppointmentSlotPickerProps> = ({
  selectedDate,
  selectedSlot,
  onSelectSlot,
  error,
}) => {
  const { state, isSlotBooked, isSlotBlocked, userTzInfo, clinicTimeInfo } = useApp();
  const { tenant } = useTenant();
  const clinicTime = clinicTimeInfo;
  const sessionHours = useMemo(
    () => getMappedSessionHours(selectedDate, userTzInfo.timeZone),
    [selectedDate, userTzInfo.timeZone]
  );

  const onSelectSlotRef = useRef(onSelectSlot);
  useEffect(() => {
    onSelectSlotRef.current = onSelectSlot;
  }, [onSelectSlot]);

  // Auto-deselect if the chosen slot elapses or gets blocked while viewing in real time
  useEffect(() => {
    if (selectedDate && selectedSlot) {
      if (isSlotPassed(selectedDate, selectedSlot) || isSlotBlocked(selectedDate, selectedSlot)) {
        onSelectSlotRef.current("");
      }
    }
  }, [clinicTime.formattedTime, selectedDate, selectedSlot, isSlotBlocked]);

  if (!selectedDate) {
    return (
      <div className="bg-stone-50 rounded-2xl border border-stone-200 px-6 py-8 text-center">
        <span className="text-3xl block mb-2" aria-hidden="true">📅</span>
        <p className="text-stone-400 text-sm font-medium">Select a date above to see available slots</p>
      </div>
    );
  }

  const blockedEntries = state.blockedDates.filter((b) => b.date === selectedDate);
  const fullDayBlocked = blockedEntries.find((b) => b.allDay !== false);
  const partialBlocks = blockedEntries.filter((b) => b.allDay === false);

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

  // Check if all slots for this date are either passed, booked, or doctor-blocked
  const allPassedOrBooked = TIME_SLOTS.every(
    (s) => isSlotPassed(selectedDate, s) || isSlotBooked(selectedDate, s) || !!isSlotBlocked(selectedDate, s)
  );

  return (
    <fieldset
      className="bg-white rounded-2xl card-shadow p-5 space-y-4"
      aria-label="Select appointment time"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <legend className="text-xs font-bold uppercase tracking-widest text-stone-400 block">
          🕐 Available Time Slots
          <span className="ml-2 text-stone-700 font-bold normal-case tracking-normal">
            — {formatDateFull(selectedDate + "T00:00:00")}
          </span>
        </legend>
        <span className="text-xs text-stone-500 font-medium">
          Showing in <strong className="text-stone-800 font-mono">{userTzInfo.label}</strong>
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

      {/* Notice if all slots on the date have passed or been booked */}
      {allPassedOrBooked && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 animate-fadeIn">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold text-amber-950">No Available Slots Left for this Date</p>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              All consultation slots for {formatDateFull(selectedDate + "T00:00:00")} have already elapsed, been reserved, or are blocked by doctor schedule.
              Please select tomorrow or an upcoming date on the calendar above.
            </p>
          </div>
        </div>
      )}

      {isSunday && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2">
          <span className="text-base">🗓️</span>
          <div>
            <strong className="font-bold">Sunday Consultations:</strong> Consultations on Sunday are scheduled <em>by prior appointment only</em>. Please select your preferred slot and clinic reception will confirm your consultation.
          </div>
        </div>
      )}

      {/* Session 1 (Morning in IST) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-1">
          <span className="font-extrabold text-stone-700 flex items-center gap-1.5">
            <span>{sessionHours.morning.emoji}</span> {sessionHours.morning.fullSessionName}
            <span className="font-normal text-stone-500">
              ({sessionHours.morning.display})
            </span>
          </span>
          <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
            {OFFICE_HOURS.MORNING.badge}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" role="listbox" aria-label="Morning time slots">
          {MORNING_SLOTS.map((slot) => {
            const booked    = isSlotBooked(selectedDate, slot);
            const passed    = isSlotPassed(selectedDate, slot);
            const slotBlock = isSlotBlocked(selectedDate, slot);
            const disabled  = booked || passed || !!slotBlock;
            const selected  = slot === selectedSlot;
            const mapping   = mapClinicSlotToUserTime(selectedDate, slot, userTzInfo.timeZone);

            const primaryTime = mapping.userShortLabel;
            const tzAbbrev = mapping.userTime12.split(" ").slice(-1)[0] || userTzInfo.label;

            return (
              <button
                key={slot}
                type="button"
                id={`slot-${slot.replace(":", "")}`}
                role="option"
                aria-selected={selected}
                aria-disabled={disabled}
                disabled={disabled}
                onClick={() => !disabled && onSelectSlot(slot)}
                title={
                  slotBlock
                    ? `Doctor Unavailable: ${slotBlock.reason}`
                    : passed
                    ? `Slot (${mapping.userTime12}) has already passed for today`
                    : booked
                    ? "Slot is already reserved by another patient"
                    : `Select ${mapping.userTime12}${mapping.isDifferentDay ? ` · ${mapping.userDayOffsetDesc}` : ""}`
                }
                className="group relative flex flex-col items-center py-2 px-1 sm:py-2.5 sm:px-2 rounded-xl text-xs font-bold
                  text-center transition-all duration-150
                  focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:outline-none"
                style={{
                  background:     slotBlock ? "#fff1f2" : disabled ? THEME_COLORS.STONE_100 : selected ? THEME_COLORS.SAGE_900 : THEME_COLORS.GRAY_50,
                  color:          slotBlock ? "#9f1239" : disabled ? THEME_COLORS.STONE_400 : selected ? THEME_COLORS.WHITE : THEME_COLORS.STONE_700,
                  border:         selected ? `2px solid ${THEME_COLORS.SAGE_900}` : slotBlock ? "1.5px dashed #f43f5e" : disabled ? `1.5px dashed ${THEME_COLORS.STONE_300}` : `2px solid ${THEME_COLORS.STONE_200}`,
                  cursor:         disabled ? "not-allowed" : "pointer",
                  boxShadow:      selected ? `0 4px 12px ${THEME_COLORS.SAGE_ALPHA_25}` : "none",
                }}
                aria-label={`${mapping.userTime12}${mapping.isDifferentDay ? ` — ${mapping.userDayOffsetDesc}` : ""}${slotBlock ? ` — blocked: ${slotBlock.reason}` : booked ? " — reserved by another patient" : passed ? " — time elapsed for today" : ""}`}
              >
                <span className={`font-mono text-[13px] font-bold ${disabled ? "line-through opacity-70" : ""}`}>{primaryTime}</span>
                {slotBlock ? (
                  <span className="text-[8.5px] font-black uppercase tracking-tight text-rose-800 bg-rose-100/90 px-1 py-0.5 rounded mt-0.5 leading-none">
                    Blocked
                  </span>
                ) : passed ? (
                  <span className="text-[9px] font-black uppercase tracking-tight text-amber-700 bg-amber-100/90 px-1 py-0.5 rounded mt-0.5 leading-none">
                    Passed
                  </span>
                ) : booked ? (
                  <span className="text-[9px] font-black uppercase tracking-tight text-rose-700 bg-rose-100/90 px-1 py-0.5 rounded mt-0.5 leading-none">
                    Booked
                  </span>
                ) : (
                  <>
                    <span
                      className="text-[9px] font-semibold uppercase tracking-widest mt-0.5 leading-none"
                      style={{ color: selected ? THEME_COLORS.SAGE_200 : THEME_COLORS.STONE_400 }}
                    >
                      {tzAbbrev}
                    </span>
                    {mapping.isDifferentDay && (
                      <span className="text-[8px] font-black uppercase tracking-tight text-amber-900 bg-amber-200/90 px-1 py-0.2 rounded mt-0.5 leading-none">
                        {mapping.userDayOffsetDesc}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Session 2 (Evening in IST) */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs border-b border-stone-100 pb-1">
          <span className="font-extrabold text-stone-700 flex items-center gap-1.5">
            <span>{sessionHours.evening.emoji}</span> {sessionHours.evening.fullSessionName}
            <span className="font-normal text-stone-500">
              ({sessionHours.evening.display})
            </span>
          </span>
          <span className="text-[10px] text-blue-800 font-bold bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            🚶‍♂️ {OFFICE_HOURS.EVENING.badge}
          </span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2" role="listbox" aria-label="Evening time slots">
          {EVENING_SLOTS.map((slot) => {
            const booked    = isSlotBooked(selectedDate, slot);
            const passed    = isSlotPassed(selectedDate, slot);
            const slotBlock = isSlotBlocked(selectedDate, slot);
            const disabled  = booked || passed || !!slotBlock;
            const selected  = slot === selectedSlot;
            const mapping   = mapClinicSlotToUserTime(selectedDate, slot, userTzInfo.timeZone);

            const primaryTime = mapping.userShortLabel;
            const tzAbbrev = mapping.userTime12.split(" ").slice(-1)[0] || userTzInfo.label;

            return (
              <button
                key={slot}
                type="button"
                id={`slot-${slot.replace(":", "")}`}
                role="option"
                aria-selected={selected}
                aria-disabled={disabled}
                disabled={disabled}
                onClick={() => !disabled && onSelectSlot(slot)}
                title={
                  slotBlock
                    ? `Doctor Unavailable: ${slotBlock.reason}`
                    : passed
                    ? `Slot (${mapping.userTime12}) has already passed for today`
                    : booked
                    ? "Slot is already reserved by another patient"
                    : `Select ${mapping.userTime12}${mapping.isDifferentDay ? ` · ${mapping.userDayOffsetDesc}` : ""}`
                }
                className="group relative flex flex-col items-center py-2 px-1 sm:py-2.5 sm:px-2 rounded-xl text-xs font-bold
                  text-center transition-all duration-150
                  focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:outline-none"
                style={{
                  background:     slotBlock ? "#fff1f2" : disabled ? THEME_COLORS.STONE_100 : selected ? THEME_COLORS.SAGE_900 : THEME_COLORS.GRAY_50,
                  color:          slotBlock ? "#9f1239" : disabled ? THEME_COLORS.STONE_400 : selected ? THEME_COLORS.WHITE : THEME_COLORS.STONE_700,
                  border:         selected ? `2px solid ${THEME_COLORS.SAGE_900}` : slotBlock ? "1.5px dashed #f43f5e" : disabled ? `1.5px dashed ${THEME_COLORS.STONE_300}` : `2px solid ${THEME_COLORS.STONE_200}`,
                  cursor:         disabled ? "not-allowed" : "pointer",
                  boxShadow:      selected ? `0 4px 12px ${THEME_COLORS.SAGE_ALPHA_25}` : "none",
                }}
                aria-label={`${mapping.userTime12}${mapping.isDifferentDay ? ` — ${mapping.userDayOffsetDesc}` : ""}${slotBlock ? ` — blocked: ${slotBlock.reason}` : booked ? " — reserved by another patient" : passed ? " — time elapsed for today" : ""}`}
              >
                <span className={`font-mono text-[13px] font-bold ${disabled ? "line-through opacity-70" : ""}`}>{primaryTime}</span>
                {slotBlock ? (
                  <span className="text-[8.5px] font-black uppercase tracking-tight text-rose-800 bg-rose-100/90 px-1 py-0.5 rounded mt-0.5 leading-none">
                    Blocked
                  </span>
                ) : passed ? (
                  <span className="text-[9px] font-black uppercase tracking-tight text-amber-700 bg-amber-100/90 px-1 py-0.5 rounded mt-0.5 leading-none">
                    Passed
                  </span>
                ) : booked ? (
                  <span className="text-[9px] font-black uppercase tracking-tight text-rose-700 bg-rose-100/90 px-1 py-0.5 rounded mt-0.5 leading-none">
                    Booked
                  </span>
                ) : (
                  <>
                    <span
                      className="text-[9px] font-semibold uppercase tracking-widest mt-0.5 leading-none"
                      style={{ color: selected ? THEME_COLORS.SAGE_200 : THEME_COLORS.STONE_400 }}
                    >
                      {tzAbbrev}
                    </span>
                    {mapping.isDifferentDay && (
                      <span className="text-[8px] font-black uppercase tracking-tight text-amber-900 bg-amber-200/90 px-1 py-0.2 rounded mt-0.5 leading-none">
                        {mapping.userDayOffsetDesc}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-red-500 text-xs font-medium" role="alert">{error}</p>
      )}
    </fieldset>
  );
};

export default AppointmentSlotPicker;

