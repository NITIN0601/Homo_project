import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import CalendarPicker from "../components/CalendarPicker";
import PhoneInput from "../components/PhoneInput";
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

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(
  v: AppointmentFormValues,
  isSlotBookedFn?: (date: string, slot: string) => boolean
): AppointmentFormErrors {
  const e: AppointmentFormErrors = {};
  const nameVal = validateFullName(v.name);
  if (!nameVal.isValid) e.name = nameVal.error;
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
  const { state, isSlotBooked, userTzInfo, clinicTimeInfo } = useApp();
  const clinicTime = clinicTimeInfo;
  const sessionHours = useMemo(
    () => getMappedSessionHours(selectedDate, userTzInfo.timeZone),
    [selectedDate, userTzInfo.timeZone]
  );

  // Auto-deselect if the chosen slot elapses while viewing in real time
  useEffect(() => {
    if (selectedDate && selectedSlot && isSlotPassed(selectedDate, selectedSlot)) {
      onSelectSlot("");
    }
  }, [clinicTime, selectedDate, selectedSlot, onSelectSlot]);

  if (!selectedDate) {
    return (
      <div className="bg-stone-50 rounded-2xl border border-stone-200 px-6 py-8 text-center">
        <span className="text-3xl block mb-2" aria-hidden="true">📅</span>
        <p className="text-stone-400 text-sm font-medium">Select a date above to see available slots</p>
      </div>
    );
  }

  const blockedEntry = state.blockedDates.find((b) => b.date === selectedDate);
  if (blockedEntry) {
    return (
      <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center animate-fadeIn">
        <span className="text-3xl block mb-2" aria-hidden="true">🏖️</span>
        <h3 className="text-rose-900 font-bold text-base mb-1">Doctor Out of Office / Unavailable</h3>
        <p className="text-rose-700 text-xs font-medium mb-3">
          {CLINIC.DOCTOR_NAME} is unavailable on{" "}
          <strong className="font-bold underline">
            {formatDateFull(selectedDate + "T00:00:00")}
          </strong>
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-100 text-rose-800 text-xs font-bold border border-rose-200">
          <span>Reason:</span> <span>{blockedEntry.reason}</span>
        </div>
        <p className="text-stone-500 text-xs mt-3">
          Appointments cannot be scheduled on doctor blocked dates. Please select an alternate date on the calendar above.
        </p>
      </div>
    );
  }

  const isSunday = new Date(selectedDate + "T00:00:00").getDay() === 0;

  // Check if all slots for this date are either passed or booked
  const allPassedOrBooked = TIME_SLOTS.every(
    (s) => isSlotPassed(selectedDate, s) || isSlotBooked(selectedDate, s)
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

      {/* Notice if all slots on the date have passed or been booked */}
      {allPassedOrBooked && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5 animate-fadeIn">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="font-bold text-amber-950">No Available Slots Left for this Date</p>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              All consultation slots for {formatDateFull(selectedDate + "T00:00:00")} have already elapsed or been reserved.
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
            const booked   = isSlotBooked(selectedDate, slot);
            const passed   = isSlotPassed(selectedDate, slot);
            const disabled = booked || passed;
            const selected = slot === selectedSlot;
            const mapping  = mapClinicSlotToUserTime(selectedDate, slot, userTzInfo.timeZone);

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
                  passed
                    ? `Slot (${mapping.userTime12}) has already passed for today`
                    : booked
                    ? "Slot is already reserved by another patient"
                    : `Select ${mapping.userTime12}${mapping.isDifferentDay ? ` · ${mapping.userDayOffsetDesc}` : ""}`
                }
                className="group relative flex flex-col items-center py-2 px-1 sm:py-2.5 sm:px-2 rounded-xl text-xs font-bold
                  text-center transition-all duration-150
                  focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:outline-none"
                style={{
                  background:     disabled ? THEME_COLORS.STONE_100 : selected ? THEME_COLORS.SAGE_900 : THEME_COLORS.GRAY_50,
                  color:          disabled ? THEME_COLORS.STONE_400 : selected ? THEME_COLORS.WHITE : THEME_COLORS.STONE_700,
                  border:         selected ? `2px solid ${THEME_COLORS.SAGE_900}` : disabled ? `1.5px dashed ${THEME_COLORS.STONE_300}` : `2px solid ${THEME_COLORS.STONE_200}`,
                  cursor:         disabled ? "not-allowed" : "pointer",
                  boxShadow:      selected ? `0 4px 12px ${THEME_COLORS.SAGE_ALPHA_25}` : "none",
                }}
                aria-label={`${mapping.userTime12}${mapping.isDifferentDay ? ` — ${mapping.userDayOffsetDesc}` : ""}${booked ? " — reserved by another patient" : passed ? " — time elapsed for today" : ""}`}
              >
                <span className={`font-mono text-[13px] font-bold ${disabled ? "line-through opacity-70" : ""}`}>{primaryTime}</span>
                {passed ? (
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
            const booked   = isSlotBooked(selectedDate, slot);
            const passed   = isSlotPassed(selectedDate, slot);
            const disabled = booked || passed;
            const selected = slot === selectedSlot;
            const mapping  = mapClinicSlotToUserTime(selectedDate, slot, userTzInfo.timeZone);

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
                  passed
                    ? `Slot (${mapping.userTime12}) has already passed for today`
                    : booked
                    ? "Slot is already reserved by another patient"
                    : `Select ${mapping.userTime12}${mapping.isDifferentDay ? ` · ${mapping.userDayOffsetDesc}` : ""}`
                }
                className="group relative flex flex-col items-center py-2 px-1 sm:py-2.5 sm:px-2 rounded-xl text-xs font-bold
                  text-center transition-all duration-150
                  focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:outline-none"
                style={{
                  background:     disabled ? THEME_COLORS.STONE_100 : selected ? THEME_COLORS.SAGE_900 : THEME_COLORS.GRAY_50,
                  color:          disabled ? THEME_COLORS.STONE_400 : selected ? THEME_COLORS.WHITE : THEME_COLORS.STONE_700,
                  border:         selected ? `2px solid ${THEME_COLORS.SAGE_900}` : disabled ? `1.5px dashed ${THEME_COLORS.STONE_300}` : `2px solid ${THEME_COLORS.STONE_200}`,
                  cursor:         disabled ? "not-allowed" : "pointer",
                  boxShadow:      selected ? `0 4px 12px ${THEME_COLORS.SAGE_ALPHA_25}` : "none",
                }}
                aria-label={`${mapping.userTime12}${mapping.isDifferentDay ? ` — ${mapping.userDayOffsetDesc}` : ""}${booked ? " — reserved by another patient" : passed ? " — time elapsed for today" : ""}`}
              >
                <span className={`font-mono text-[13px] font-bold ${disabled ? "line-through opacity-70" : ""}`}>{primaryTime}</span>
                {passed ? (
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
            <span className="bg-emerald-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Sent &amp; Delivered
            </span>
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
            <button
              onClick={handleResendEmail}
              disabled={resending}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <span>{resending ? "⏳ Sending…" : "📧 Resend Email Confirmation"}</span>
            </button>
            <button
              onClick={handleWhatsAppConfirm}
              style={{ background: THEME_COLORS.WHATSAPP_GREEN }}
              className="px-3 py-1.5 rounded-xl hover:opacity-90 text-white font-extrabold text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <span>📱</span> Receive on WhatsApp
            </button>
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
        <button
          id="book-another-btn"
          onClick={onReset}
          className="w-full py-3.5 rounded-2xl font-bold text-sm text-white btn-shadow
            active:scale-95 transition-all cursor-pointer"
          style={{ background: THEME_GRADIENTS.PRIMARY_SHORT }}
        >
          Book Another Appointment →
        </button>
      </div>
    </div>
  );
};

// ─── Field wrapper ─────────────────────────────────────────────────────────────
const Field: React.FC<{ id: string; label: string; error?: string; children: React.ReactNode }> = ({
  id, label, error, children,
}) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-xs font-bold uppercase tracking-widest text-stone-400">
      {label}
    </label>
    {children}
    {error && <p id={`${id}-error`} className="text-red-500 text-xs font-medium" role="alert">{error}</p>}
  </div>
);

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
  const { state, isSlotBooked, bookAppointment, userTzInfo, sessionHours } = useApp();
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

  const INITIAL: AppointmentFormValues = {
    name:             authUser?.name  ?? "",
    email:            authUser?.email ?? "",
    phone:            "",
    selectedDate:     "",
    selectedSlot:     "",
    syncToPatientCal: true,
    notes:            "",
  };

  const [form,      setForm]      = useState<AppointmentFormValues>(INITIAL);
  const [errors,    setErrors]    = useState<AppointmentFormErrors>({});
  const [loading,   setLoading]   = useState(false);
  const [confirmed, setConfirmed] = useState<AppointmentPayload | null>(null);

  const update = useCallback(
    <K extends keyof AppointmentFormValues>(k: K, v: AppointmentFormValues[K]) => {
      setForm((p) => ({ ...p, [k]: v }));
      setErrors((p) => ({ ...p, [k]: undefined }));
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate(form, isSlotBooked);
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
          Consultation with <strong>{CLINIC.DOCTOR_NAME}</strong> at {CLINIC.ADDRESS.SHORT}.
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
              href={CLINIC.ADDRESS.MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold underline decoration-blue-400 hover:text-blue-950 inline-flex items-center gap-1 cursor-pointer"
              title="Open Agastya Homoeopathy Clinic (Malleshwaram, Bengaluru) on Google Maps"
            >
              <span>{CLINIC.FULL_NAME} ({CLINIC.ADDRESS.SHORT})</span>
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
            {sessionHours.morning.sessionLabel} consultations (<strong>{sessionHours.morning.display}</strong>) and all <strong>Sunday</strong> visits with <strong>{CLINIC.DOCTOR_NAME}</strong> require prior booking using the calendar below.
          </p>
        </div>
      </div>

      <form id="appointment-form" onSubmit={handleSubmit} noValidate className="space-y-5">

        {/* ── Patient details ────────────────────────── */}
        <div className="bg-white rounded-2xl card-shadow p-5 space-y-4">
          <h2 className="text-sm font-bold text-stone-700 flex items-center gap-2">
            <span aria-hidden="true">👤</span> Patient Details
          </h2>
          <Field id="name" label="Full Name" error={errors.name}>
            <input
              id="name" type="text" value={form.name}
              onChange={(e) => update("name", e.target.value)}
              placeholder="e.g. John Doe" autoComplete="name" aria-required="true"
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm
                text-stone-800 bg-stone-50 placeholder:text-stone-300
                focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-sage-400 transition-all"
            />
          </Field>
          <Field id="email" label="Email Address" error={errors.email}>
            <input
              id="email" type="email" value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="john@example.com" autoComplete="email" aria-required="true"
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm
                text-stone-800 bg-stone-50 placeholder:text-stone-300
                focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-sage-400 transition-all"
            />
          </Field>
          <Field id="phone" label="Phone Number *" error={errors.phone}>
            <PhoneInput
              id="phone"
              value={form.phone}
              onChange={(full) => update("phone", full)}
              defaultIso="IND"
            />
          </Field>
        </div>

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
          onSelectSlot={(s) => update("selectedSlot", s)}
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
            className="w-5 h-5 accent-sage-700 rounded flex-shrink-0"
          />
          <div>
            <p className="text-stone-800 font-semibold text-sm">📅 Add to my Google Calendar</p>
            <p className="text-stone-400 text-xs mt-0.5">
              A native Calendar invite will be sent to your email — no extra login needed.
            </p>
          </div>
        </label>

        {/* ── Notes ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl card-shadow p-5">
          <Field id="notes" label="Additional Notes (optional)">
            <textarea
              id="notes" value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Describe your chief complaints or any specific concerns…"
              rows={3}
              className="w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm
                text-stone-800 bg-stone-50 placeholder:text-stone-300 resize-none
                focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-sage-400 transition-all"
            />
          </Field>
        </div>

        {/* ── Submit ─────────────────────────────────── */}
        <button
          id="appt-submit"
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl font-bold text-base text-white btn-shadow
            transition-all duration-200 active:scale-95
            disabled:opacity-60 disabled:cursor-not-allowed
            focus-visible:ring-2 focus-visible:ring-sage-400 focus-visible:outline-none"
          style={{ background: THEME_GRADIENTS.PRIMARY }}
          aria-busy={loading}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                aria-hidden="true" style={{ animation: "spin-slow 0.9s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Booking your appointment…
            </span>
          ) : "Confirm Appointment →"}
        </button>
      </form>
    </div>
  );
};

export default AppointmentsPage;
