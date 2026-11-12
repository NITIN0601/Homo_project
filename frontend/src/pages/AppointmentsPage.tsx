import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { useTenant } from "../context/ThemeProvider";
import CalendarPicker from "../components/forms/CalendarPicker";
import PhoneInput from "../components/forms/PhoneInput";
import { Button, Badge, Card, Input, Textarea } from "../components/ui";
import {
  CLINIC,
  MORNING_SLOTS,
  EVENING_SLOTS,
} from "../config";
import { api } from "../services/api";
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
} from "../utils/timezone";
import type {
  AppointmentFormValues,
  AppointmentFormErrors,
  AppointmentPayload,
  BookedAppointment,
  ContinuityPreferenceResponse,
  DoctorSummary,
} from "../types";
import { AppointmentSlotPicker } from "./appointments/AppointmentSlotPicker";
import { AppointmentConfirmationBanner } from "./appointments/AppointmentConfirmationBanner";
import { PatientDoctorContinuityBanner } from "./appointments/PatientDoctorContinuityBanner";

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

  // ── Continuity of Care: Returning doctor preference & fallback state ────────
  const [continuity, setContinuity] = useState<ContinuityPreferenceResponse | null>(null);
  const [continuityLoading, setContinuityLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorSummary | null>(null);

  // Automatically evaluate previous physician continuity when email, phone, or date changes
  useEffect(() => {
    const ident = form.email.trim() || form.phone.trim() || authUser?.email || authUser?.phone;
    if (!ident) return;

    let isSubscribed = true;
    const fetchContinuity = async () => {
      setContinuityLoading(true);
      const res = await api.appointments.checkContinuityPreference(
        tenant.id,
        ident,
        form.selectedDate || undefined,
        form.selectedSlot || undefined
      );
      if (isSubscribed && res) {
        setContinuity(res);
        if (!selectedDoctor) {
          if (res.status === "doctor_inactive" && res.recommended_alternate) {
            setSelectedDoctor(res.recommended_alternate);
          } else if (res.preferred_doctor) {
            setSelectedDoctor(res.preferred_doctor);
          }
        }
      }
      if (isSubscribed) setContinuityLoading(false);
    };

    const timer = setTimeout(fetchContinuity, 350);
    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [form.email, form.phone, form.selectedDate, form.selectedSlot, tenant.id, authUser]);

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

    const chosenDoctorName = selectedDoctor?.name || tenant.doctor.name || CLINIC.DOCTOR_NAME;
    const chosenDoctorId = selectedDoctor?.id || tenant.doctor.id || "doc-default";
    const contStatus = continuity?.status === "preferred_doctor_available"
      ? "Continuing Care"
      : (continuity?.status === "doctor_inactive"
          ? `Transferred from ${continuity.previous_doctor_name}`
          : (continuity?.previous_doctor_name ? `Alternate for ${continuity.previous_doctor_name}` : "New Patient"));

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
      doctorId: chosenDoctorId,
      doctorName: chosenDoctorName,
      hospitalId: tenant.id,
      continuityStatus: contStatus,
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
      providerCalendarId:      selectedDoctor?.calendar_id || CLINIC.DOCTOR_EMAIL,
      patientCalendarSyncRequested: form.syncToPatientCal,
      doctorId: chosenDoctorId,
      doctorName: chosenDoctorName,
      hospitalId: tenant.id,
      continuityStatus: contStatus,
    };

    // Live Calendar Event & Confirmation Dispatch via Backend/Vite
    await api.appointments.book({
      user_email: payload.patientDetails.email,
      user_name: payload.patientDetails.name,
      start_time: payload.startTime,
      end_time: payload.endTime,
      summary: `Homoeopathy Consultation with ${chosenDoctorName} — ${tenant.name}`,
      description: `Clinical consultation with ${chosenDoctorName} at ${tenant.name} (${tenant.contact.address.city}).\nType: ${newAppointment.type}\nContinuity: ${contStatus}\nReason: ${newAppointment.chiefReason}`,
      phone: payload.patientDetails.phone,
      patient_id: newAppointment.patientId,
    });

    // Send confirmation email via API
    await api.email.sendNotification({
      email: payload.patientDetails.email,
      subject: `Appointment Booking Confirmed — ${tenant.name}`,
      body: `Dear ${payload.patientDetails.name},\nYour appointment with ${chosenDoctorName} at ${tenant.name} (${tenant.contact.address.street}, ${tenant.contact.address.city}) has been confirmed.\nDate & Time: ${mapping.userDateWithTime}\nContinuity: ${contStatus}\nConsultation Type: ${newAppointment.type}\nPhone / WhatsApp: ${tenant.contact.phone}`,
    });

    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setConfirmed(payload);
  };

  if (confirmed) {
    return (
      <div className="py-4">
        <AppointmentConfirmationBanner payload={confirmed} onReset={() => { setForm(INITIAL); setConfirmed(null); }} />
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

        {/* ── Patient Doctor Continuity & Care Preference ── */}
        <PatientDoctorContinuityBanner
          continuity={continuity}
          loading={continuityLoading}
          selectedDoctor={selectedDoctor}
          onSelectDoctor={(doc) => setSelectedDoctor(doc)}
          onSelectDate={(d) => {
            update("selectedDate", d);
            update("selectedSlot", "");
          }}
        />

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
        <AppointmentSlotPicker
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
