import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useApp } from "../context/AppContext";
import { useTenant } from "../context/ThemeProvider";
import CalendarPicker from "../components/forms/CalendarPicker";
import PhoneInput from "../components/forms/PhoneInput";
import { Button, Badge, Card, Input, Textarea } from "../components/ui";
import {
  CLINIC,
  OFFICE_HOURS,
  MORNING_SLOTS,
  EVENING_SLOTS,
  THEME_COLORS,
  THEME_GRADIENTS,
} from "../config";
import { api } from "../services/api";
import { formatDateFull } from "../utils/format";
import {
  validateFullName,
  validateEmail,
  validatePhone,
  VALIDATION_MESSAGES,
} from "../utils/validation";
import {
  getClinicTimeInfo,
  isSlotPassed,
  mapClinicSlotToUserTime,
  getMappedSessionHours,
} from "../utils/timezone";
import type {
  AppointmentFormValues,
  AppointmentFormErrors,
  AppointmentPayload,
  BookedAppointment,
} from "../types";

// ─── Time slots (Imported from Central Config SSOT) ──────────────────────────
export { MORNING_SLOTS, EVENING_SLOTS };
const TIME_SLOTS: readonly string[] = [...MORNING_SLOTS, ...EVENING_SLOTS];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toISO(date: string, time: string): string {
  return `${date}T${time}:00+05:30`;
}

function addMinutes(time: string, mins: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
}

// ─── Name splitting helper ────────────────────────────────────────────────────
export function splitFullName(fullName: string): { firstName: string; middleName: string; lastName: string } {
  const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", middleName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], middleName: "", lastName: "" };
  if (parts.length === 2) return { firstName: parts[0], middleName: "", lastName: parts[1] };
  return {
    firstName: parts[0],
    middleName: parts.slice(1, -1).join(" "),
    lastName: parts[parts.length - 1],
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(
  v: AppointmentFormValues,
  isSlotBookedFn?: (date: string, slot: string) => boolean,
  isSlotBlockedFn?: (date: string, slot: string) => any
): AppointmentFormErrors {
  const e: AppointmentFormErrors = {};

  // First name is compulsory
  if (!v.firstName || !v.firstName.trim()) {
    e.firstName = "First name is required.";
  } else if (v.firstName.trim().length < 2) {
    e.firstName = "First name must be at least 2 characters.";
  }

  // Last name is compulsory
  if (!v.lastName || !v.lastName.trim()) {
    e.lastName = "Last name is required.";
  } else if (v.lastName.trim().length < 2) {
    e.lastName = "Last name must be at least 2 characters.";
  }

  const combinedName =
    [v.firstName, v.middleName, v.lastName].filter(Boolean).join(" ").trim() || v.name;
  const nameVal = validateFullName(combinedName);
  if (!nameVal.isValid && !e.firstName && !e.lastName) e.name = nameVal.error;

  const emailVal = validateEmail(v.email);
  if (!emailVal.isValid) e.email = emailVal.error;

  const phoneVal = validatePhone(v.phone);
  if (!phoneVal.isValid) e.phone = phoneVal.error;
  if (!v.selectedDate) e.selectedDate = VALIDATION_MESSAGES.DATE_REQUIRED;
  if (!v.selectedSlot || !TIME_SLOTS.includes(v.selectedSlot)) {
    e.selectedSlot = VALIDATION_MESSAGES.SLOT_REQUIRED;
  } else if (v.selectedDate) {
    const mapping = mapClinicSlotToUserTime(v.selectedDate, v.selectedSlot);
    if (isSlotPassed(v.selectedDate, v.selectedSlot)) {
      const clinicTime = getClinicTimeInfo();
      const localDesc = mapping.isDifferentTimezone ? ` (${mapping.userTime12} in your timezone)` : "";
      e.selectedSlot = `The ${mapping.clinicTime12}${localDesc} slot has already elapsed for today (Clinic operational clock: ${clinicTime.formattedTime}). Please select an upcoming slot or future date.`;
    } else if (isSlotBookedFn && isSlotBookedFn(v.selectedDate, v.selectedSlot)) {
      e.selectedSlot = `The ${mapping.clinicTime12} time slot has already been reserved by another patient. Please choose an available time slot.`;
    } else if (isSlotBlockedFn) {
      const blk = isSlotBlockedFn(v.selectedDate, v.selectedSlot);
      if (blk) {
        e.selectedSlot = `The ${mapping.clinicTime12} time slot is currently blocked by doctor schedule (${blk.reason}). Please choose an available time slot.`;
      }
    }
  }
  return e;
}

const TimeSlotGrid: React.FC<{
  selectedDate: string;
  selectedSlot: string;
  onSelectSlot: (s: string) => void;
  error?: string;
}> = ({ selectedDate, selectedSlot, onSelectSlot, error }) => {
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

      {/* Session 1 (Morning in IST / Dynamic diurnal period in user's timezone) */}
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

            // Primary display label in user's active timezone
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

      {/* Session 2 (Evening in IST / Dynamic diurnal period in user's timezone) */}
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

            // Primary display label in user's active timezone
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

// ─── Confirmation banner ──────────────────────────────────────────────────────
const ConfirmationBanner: React.FC<{
  payload: AppointmentPayload;
  onReset: () => void;
}> = ({ payload, onReset }) => {
  const { userTzInfo } = useApp();
  const [resending, setResending] = useState(false);
  const [resentSuccess, setResentSuccess] = useState(false);
  const isOverseas = !userTzInfo.isClinicTimezone;

  const formattedAppointmentTime =
    new Date(payload.startTime).toLocaleString("en-US", {
      timeZone: userTzInfo.timeZone,
      dateStyle: "full",
      timeStyle: "short",
    }) + ` ${userTzInfo.label}`;

  const handleResendEmail = async () => {
    setResending(true);
    await api.email.sendNotification({
      email: payload.patientDetails.email,
      subject: `Appointment Confirmed — ${CLINIC.FULL_NAME}`,
      body: `Dear ${payload.patientDetails.name}, your appointment with ${CLINIC.DOCTOR_NAME} at ${CLINIC.FULL_NAME} (${CLINIC.ADDRESS.SHORT}) is confirmed for ${formattedAppointmentTime}.`,
    });
    setResending(false);
    setResentSuccess(true);
    setTimeout(() => setResentSuccess(false), 4000);
  };

  const handleWhatsAppConfirm = () => {
    const waMessage = `Hi ${CLINIC.NAME}! I have booked an appointment.\n\nPatient: ${payload.patientDetails.name}\nDate & Time: ${formattedAppointmentTime}\nDoctor: ${CLINIC.DOCTOR_NAME}\nClinic: ${CLINIC.ADDRESS.SHORT}`;
    api.whatsapp.openChat(waMessage);
  };

  return (
    <div
      className="max-w-xl mx-auto bg-white rounded-3xl card-shadow overflow-hidden border border-stone-100"
      style={{ animation: "fadeInUp 0.4s ease both" }}
      role="status"
      aria-live="polite"
    >
      {/* Header Banner */}
      <div
        className="px-6 py-6 text-white text-center sm:text-left flex flex-col sm:flex-row items-center gap-4"
        style={{ background: THEME_GRADIENTS.PRIMARY }}
      >
        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl flex-shrink-0 border border-white/30">
          ✅
        </div>
        <div>
          <h2 className="font-extrabold text-xl leading-tight">Appointment Confirmed!</h2>
          <p className="text-emerald-100 text-xs mt-1">
            Official confirmation &amp; GCal invite generated for <strong>{payload.patientDetails.email}</strong>
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Email Dispatch Notification Box */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <span>✉️</span> Confirmation Email Status
            </span>
            <Badge variant="success" size="sm">
              Sent &amp; Delivered
            </Badge>
          </div>

          {/* Email Preview Card */}
          <div className="bg-white rounded-xl p-3.5 border border-emerald-100 text-xs text-stone-700 space-y-1.5 font-sans">
            <p className="font-bold text-stone-900">
              Subject: <span className="text-emerald-800">Appointment Booking Confirmed — {CLINIC.NAME}</span>
            </p>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              Dear <strong>{payload.patientDetails.name}</strong>,<br />
              Your consultation with <strong>{CLINIC.DOCTOR_NAME}</strong> is scheduled for <strong>{formattedAppointmentTime}</strong> at <strong>{CLINIC.ADDRESS.SHORT}</strong>. A Google Calendar invite (.ics) has been dispatched to {payload.patientDetails.email}.
            </p>
          </div>

          {/* Resend / Actions Row */}
          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
            <Button
              onClick={handleResendEmail}
              isLoading={resending}
              variant="ghost"
              size="sm"
              className="text-emerald-800 hover:text-emerald-950 underline px-0"
            >
              📧 Resend Email Confirmation
            </Button>
            <Button
              onClick={handleWhatsAppConfirm}
              variant="primary"
              size="sm"
              className="bg-[#25D366] hover:bg-[#20bd5a] text-white border-transparent"
            >
              <span>📱</span> Receive on WhatsApp
            </Button>
          </div>

          {resentSuccess && (
            <p className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-3 py-1 rounded-lg animate-fadeIn text-center">
              ✓ Confirmation email resent successfully to {payload.patientDetails.email}!
            </p>
          )}
        </div>

        {/* Appointment Details Grid */}
        <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-100">
          {[
            { l: "Patient Name",            v: payload.patientDetails.name },
            { l: "Email Address",           v: payload.patientDetails.email },
            { l: "Phone Number",            v: payload.patientDetails.phone },
            { l: "Appointment Date & Time", v: formattedAppointmentTime },
            { l: "Doctor",                  v: CLINIC.DOCTOR_NAME },
            { l: "Clinic Location",         v: `${CLINIC.ADDRESS.SHORT}, ${CLINIC.ADDRESS.STATE}` },
            { l: "Consult Type",            v: isOverseas ? "International Tele-Consultation" : "In-Clinic / Tele-Consultation" },
          ].map(({ l, v }) => (
            <div key={l} className="flex justify-between text-xs py-1 border-b border-stone-200/50 last:border-none">
              <span className="text-stone-400 font-medium">{l}</span>
              <span className="text-stone-800 font-semibold text-right ml-4">{v}</span>
            </div>
          ))}
        </div>

        {payload.patientCalendarSyncRequested && (
          <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200/60 rounded-2xl px-4 py-3">
            <span className="text-xl">📅</span>
            <div className="text-xs">
              <p className="text-emerald-900 font-bold">Google Calendar Sync Active</p>
              <p className="text-emerald-700 text-[11px]">
                Event added to calendar. Reminder notification set 15 mins prior.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 pb-6 pt-2">
        <Button
          id="book-another-btn"
          onClick={onReset}
          variant="primary"
          size="lg"
          fullWidth
          className="py-3.5 rounded-2xl"
        >
          Book Another Appointment →
        </Button>
      </div>
    </div>
  );
};

// ─── AppointmentsPage ─────────────────────────────────────────────────────────
/**
 * GOOGLE CALENDAR INTEGRATION NOTES (backend):
 * ────────────────────────────────────────────
 * Frontend POSTs `AppointmentPayload` → POST /api/appointments.
 *
 * Backend (Node/FastAPI) then:
 * 1. Authenticates via service account (or provider OAuth refresh token).
 * 2. Calls calendar.events.insert on providerCalendarId with the patient
 *    email as an attendee (sendUpdates:"all") → native GCal invite sent.
 * 3. If patientCalendarSyncRequested → inserts on patient's own calendar
 *    using their OAuth refresh token (one-time consent flow required).
 * 4. Stores returned calendarEventId in DB for reschedule/cancel support.
 *
 * The frontend NEVER holds OAuth tokens.
 */
const AppointmentsPage: React.FC = () => {
  const { state, isSlotBooked, isSlotBlocked, bookAppointment, userTzInfo, sessionHours } = useApp();
  const { tenant } = useTenant();
  const { authUser } = state;

  // Always bring patient directly to the top of the appointment scheduling form
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);

  // Dynamically calculate dates where all consultation slots are booked
  const fullyBookedDates = useMemo(() => {
    const counts: Record<string, number> = {};
    state.appointments.forEach((apt) => {
      if (apt.status === "Cancelled") return;
      counts[apt.date] = (counts[apt.date] || 0) + 1;
    });
    return Object.keys(counts).filter((d) => counts[d] >= TIME_SLOTS.length);
  }, [state.appointments]);

  const initialNames = useMemo(() => splitFullName(authUser?.name ?? ""), [authUser?.name]);

  const INITIAL: AppointmentFormValues = {
    name:             authUser?.name  ?? "",
    firstName:        initialNames.firstName,
    middleName:       initialNames.middleName,
    lastName:         initialNames.lastName,
    email:            authUser?.email ?? "",
    phone:            authUser?.phone ?? "",
    selectedDate:     "",
    selectedSlot:     "",
    syncToPatientCal: true,
    notes:            "",
  };

  const [form,      setForm]      = useState<AppointmentFormValues>(INITIAL);
  const [errors,    setErrors]    = useState<AppointmentFormErrors>({});
  const [loading,   setLoading]   = useState(false);
  const [confirmed, setConfirmed] = useState<AppointmentPayload | null>(null);

  // Automatically synchronize customer profile details into form when logged in
  useEffect(() => {
    if (authUser) {
      const names = splitFullName(authUser.name || "");
      setForm((p) => ({
        ...p,
        name: authUser.name || p.name,
        firstName: names.firstName || p.firstName || "",
        middleName: names.middleName || p.middleName || "",
        lastName: names.lastName || p.lastName || "",
        email: authUser.email || p.email,
        phone: authUser.phone || p.phone,
      }));
    }
  }, [authUser]);

  const update = useCallback(
    <K extends keyof AppointmentFormValues>(k: K, v: AppointmentFormValues[K]) => {
      setForm((p) => ({ ...p, [k]: v }));
      setErrors((p) => ({ ...p, [k]: undefined }));
    },
    []
  );

  const handleNameChange = useCallback(
    (field: "firstName" | "middleName" | "lastName", val: string) => {
      setForm((prev) => {
        const updated = { ...prev, [field]: val };
        const combined = [updated.firstName, updated.middleName, updated.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
        return { ...updated, name: combined };
      });
      setErrors((prev) => ({ ...prev, [field]: undefined, name: undefined }));
    },
    []
  );

  const handleEmailBlur = useCallback(() => {
    if (!form.email || !form.email.trim()) {
      setErrors((prev) => ({ ...prev, email: VALIDATION_MESSAGES.EMAIL_INVALID }));
    } else {
      const res = validateEmail(form.email);
      if (!res.isValid) {
        setErrors((prev) => ({ ...prev, email: res.error }));
      } else {
        setErrors((prev) => ({ ...prev, email: undefined }));
      }
    }
  }, [form.email]);

  const handleSelectSlot = useCallback(
    (s: string) => update("selectedSlot", s),
    [update]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form, isSlotBooked, isSlotBlocked);
    if (Object.keys(errs).length) {
      setErrors(errs);
      document.getElementById(Object.keys(errs)[0])?.focus();
      return;
    }

    // Defensive check against real-time expiration (e.g. crossing 6:00 PM in India while form is open)
    if (isSlotPassed(form.selectedDate, form.selectedSlot)) {
      const clinicTime = getClinicTimeInfo();
      const mapping = mapClinicSlotToUserTime(form.selectedDate, form.selectedSlot);
      const localText = mapping.isDifferentTimezone ? ` (${mapping.userTime12} in your local timezone)` : "";
      setErrors({
        selectedSlot: `The ${mapping.clinicTime12}${localText} slot has elapsed for today in India (Clinic operational clock: ${clinicTime.formattedTime}). Please select an upcoming slot.`,
      });
      return;
    }

    // Defensive check against double-booking / conflict allocation
    if (isSlotBooked(form.selectedDate, form.selectedSlot)) {
      const mapping = mapClinicSlotToUserTime(form.selectedDate, form.selectedSlot);
      setErrors({
        selectedSlot: `The ${mapping.clinicTime12} time slot has already been reserved by another patient. Please choose an available time slot.`,
      });
      return;
    }

    setLoading(true);

    const userTz = userTzInfo;
    const isOverseasPatient = !userTz.isClinicTimezone;
    const mapping = mapClinicSlotToUserTime(form.selectedDate, form.selectedSlot, userTz.timeZone);

    // 1. Immediately persist to global SSOT and localStorage to lock slot for all patients
    const newAppointment: BookedAppointment = {
      id: `apt-${Date.now()}`,
      patientId: authUser?.id || `usr-${Date.now().toString().slice(-4)}`,
      patientName: form.name.trim(),
      patientPhone: form.phone.trim(),
      patientEmail: form.email.trim().toLowerCase(),
      date: form.selectedDate,
      time: mapping.userTime12,
      slot: form.selectedSlot,
      type: isOverseasPatient ? "Online Tele-Consultation" : "In-Person Clinic Visit",
      chiefReason: form.notes.trim() || "General Consultation & Follow-up",
      status: "Confirmed",
      createdAt: new Date().toISOString(),
    };
    bookAppointment(newAppointment);

    // 2. Prepare payload for calendar and notification delivery
    const payload: AppointmentPayload = {
      patientDetails: {
        name:  form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      },
      startTime: toISO(form.selectedDate, form.selectedSlot),
      endTime:   toISO(form.selectedDate, addMinutes(form.selectedSlot, 30)),
      providerCalendarId:      CLINIC.DOCTOR_EMAIL,
      patientCalendarSyncRequested: form.syncToPatientCal,
    };

    // Live Calendar Event & Confirmation Dispatch via Backend/Vite
    await api.appointments.book({
      user_email: payload.patientDetails.email,
      user_name: payload.patientDetails.name,
      start_time: payload.startTime,
      end_time: payload.endTime,
      summary: `Homoeopathy Consultation — ${CLINIC.FULL_NAME}`,
      description: `Clinical consultation with ${CLINIC.DOCTOR_NAME} at ${CLINIC.ADDRESS.SHORT}.\nType: ${newAppointment.type}\nReason: ${newAppointment.chiefReason}`,
      phone: payload.patientDetails.phone,
      patient_id: newAppointment.patientId,
    });

    // Send confirmation email via API
    await api.email.sendNotification({
      email: payload.patientDetails.email,
      subject: `Appointment Booking Confirmed — ${CLINIC.FULL_NAME}`,
      body: `Dear ${payload.patientDetails.name},\nYour appointment with ${CLINIC.DOCTOR_NAME} at ${CLINIC.FULL_NAME} (${CLINIC.ADDRESS.SHORT}) has been confirmed.\nDate & Time: ${mapping.userDateWithTime}\nConsultation Type: ${newAppointment.type}\nClinic Address: ${CLINIC.ADDRESS.FULL}\nPhone / WhatsApp: ${CLINIC.PHONE_DISPLAY}`,
    });

    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setConfirmed(payload);
  };

  if (confirmed) {
    return (
      <div className="py-4">
        <ConfirmationBanner payload={confirmed} onReset={() => { setForm(INITIAL); setConfirmed(null); }} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto" style={{ animation: "fadeInUp 0.4s ease both" }}>
      {/* Page header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-stone-800">📅 Book an Appointment</h1>
        <p className="text-stone-500 text-sm mt-1">
          Consultation with <strong>{tenant.doctor.name}</strong> at {tenant.name} ({tenant.contact.address.city}).
        </p>
      </div>

      {/* ── Walk-in vs Scheduled Consultation Guide ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="bg-blue-50/90 border border-blue-200/90 rounded-2xl p-4 text-xs space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 font-extrabold text-blue-950">
            <span className="text-base">🚶‍♂️</span>
            <span>Evening Walk-in OPD ({sessionHours.evening.display})</span>
          </div>
          <p className="text-blue-900 leading-relaxed text-[11px]">
            Walk-ins are welcomed directly at{" "}
            <a
              href={tenant.contact.mapsUrl || CLINIC.ADDRESS.MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline decoration-blue-400 hover:text-blue-950 inline-flex items-center gap-1 cursor-pointer"
              title={`Open ${tenant.name} on Google Maps`}
            >
              <span>{tenant.name} ({tenant.contact.address.street}, {tenant.contact.address.city})</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="opacity-80">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>{" "}
            Monday to Saturday. Tokens are issued at reception upon arrival.
          </p>
        </div>

        <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-4 text-xs space-y-1.5 shadow-2xs">
          <div className="flex items-center gap-2 font-extrabold text-emerald-950">
            <span className="text-base">📅</span>
            <span>Prior Appointment Only ({sessionHours.morning.display})</span>
          </div>
          <p className="text-emerald-900 leading-relaxed text-[11px]">
            {sessionHours.morning.sessionLabel} consultations (<strong>{sessionHours.morning.display}</strong>) and all <strong>Sunday</strong> visits with <strong>{tenant.doctor.name}</strong> require prior booking using the calendar below.
          </p>
        </div>
      </div>

      <form id="appointment-form" onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* ── Patient details ────────────────────────── */}
        <Card variant="default" className="space-y-4 overflow-visible">
          <h2 className="text-sm font-bold text-stone-700 flex items-center gap-2">
            <span aria-hidden="true">👤</span> Patient Details
          </h2>

          {/* First Name (compulsory), Middle Name (optional), Last Name (compulsory) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              id="firstName"
              label="First Name"
              value={form.firstName || ""}
              onChange={(e) => handleNameChange("firstName", e.target.value)}
              placeholder="e.g. John"
              autoComplete="given-name"
              required
              errorMessage={errors.firstName}
            />
            <Input
              id="middleName"
              label="Middle Name"
              value={form.middleName || ""}
              onChange={(e) => handleNameChange("middleName", e.target.value)}
              placeholder="(Optional) e.g. Robert"
              autoComplete="additional-name"
              errorMessage={errors.middleName}
            />
            <Input
              id="lastName"
              label="Last Name"
              value={form.lastName || ""}
              onChange={(e) => handleNameChange("lastName", e.target.value)}
              placeholder="e.g. Doe"
              autoComplete="family-name"
              required
              errorMessage={errors.lastName}
            />
          </div>

          {form.name && (
            <p className="text-[11px] text-stone-500 font-medium -mt-1">
              Full Name: <strong className="text-emerald-950">{form.name}</strong>
            </p>
          )}

          <Input
            id="email"
            label="Email Address"
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            onBlur={handleEmailBlur}
            placeholder="john@example.com"
            autoComplete="email"
            required
            errorMessage={errors.email}
          />
          <div className="space-y-1">
            <label htmlFor="phone" className="block text-[11px] sm:text-xs font-bold text-stone-700 tracking-wide uppercase select-none">
              Phone Number <span className="text-rose-500 ml-1">*</span>
            </label>
            <PhoneInput
              id="phone"
              value={form.phone}
              onChange={(full) => update("phone", full)}
              defaultIso="IND"
            />
            {errors.phone && (
              <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1 animate-fadeIn">
                <span>⚠️</span>
                <span>{errors.phone}</span>
              </p>
            )}
          </div>
        </Card>

        {/* ── Calendar picker ────────────────────────── */}
        <div>
          <CalendarPicker
            selectedDate={form.selectedDate}
            onSelectDate={(d) => { update("selectedDate", d); update("selectedSlot", ""); }}
            bookedDates={fullyBookedDates}
            error={errors.selectedDate}
          />
        </div>

        {/* ── Time slot grid ─────────────────────────── */}
        <TimeSlotGrid
          selectedDate={form.selectedDate}
          selectedSlot={form.selectedSlot}
          onSelectSlot={handleSelectSlot}
          error={errors.selectedSlot}
        />

        {/* ── Calendar sync toggle ───────────────────── */}
        <label
          htmlFor="sync-cal"
          className="flex items-center gap-3 bg-white rounded-2xl card-shadow px-5 py-4 cursor-pointer"
        >
          <input
            id="sync-cal"
            type="checkbox"
            checked={form.syncToPatientCal}
            onChange={(e) => update("syncToPatientCal", e.target.checked)}
            className="w-5 h-5 accent-emerald-700 rounded flex-shrink-0"
          />
          <div>
            <p className="text-stone-800 font-semibold text-sm">📅 Add to my Google Calendar</p>
            <p className="text-stone-400 text-xs mt-0.5">
              A native Calendar invite will be sent to your email — no extra login needed.
            </p>
          </div>
        </label>

        {/* ── Notes with Clinical Pre-Consultation Triage ─────────────────────────── */}
        <Card variant="default" className="space-y-3">
          <Textarea
            id="notes"
            label="Chief Complaints / Symptoms & Reason for Consultation"
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            placeholder="Describe your chief complaints or symptoms (e.g. acute headache, indigestion, joint stiffness)…"
            rows={3}
          />
          {form.notes && form.notes.trim().length > 5 && (
            <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-emerald-950 font-medium">
                <span className="font-extrabold text-emerald-800">⚡ Clinical Pre-Consultation Triage:</span>
                <span>
                  {form.notes.toLowerCase().includes("bleeding") || form.notes.toLowerCase().includes("chest pain")
                    ? "⚠️ High Urgency Acute Care Advised"
                    : form.notes.toLowerCase().includes("headache") || form.notes.toLowerCase().includes("bloating") || form.notes.toLowerCase().includes("pain")
                    ? "Recommended: In-Person Classical Homoeopathy Review"
                    : "Standard OPD Consultation"}
                </span>
              </div>
              <Badge variant="success" size="sm">
                Clinical Triage
              </Badge>
            </div>
          )}
        </Card>

        {/* ── Submit ─────────────────────────────────── */}
        <Button
          id="appt-submit"
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={loading}
          className="py-4 text-base rounded-2xl shadow-md"
        >
          Confirm Appointment →
        </Button>
      </form>
    </div>
  );
};

export default AppointmentsPage;
