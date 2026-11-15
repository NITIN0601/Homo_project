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
  ALL_TIME_SLOTS,
  THEME_GRADIENTS,
} from "../config";
import { api } from "../services/api";
import {
  validateFullName,
  validateEmail,
  validatePhone,
  VALIDATION_MESSAGES,
} from "../utils/validation";
import {
  isSlotPassed,
  isUserSlotPassed,
  type LocalizedUserSlot,
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
import { DashboardErrorBoundary } from "../components/common/DashboardErrorBoundary";

// ─── Time slots (Imported from Central Config SSOT) ──────────────────────────
export { MORNING_SLOTS, EVENING_SLOTS, ALL_TIME_SLOTS };
const TIME_SLOTS: readonly string[] = ALL_TIME_SLOTS;

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
  }

  // Validate slot availability using public verification callbacks
  if (isSlotBookedFn && v.selectedDate && v.selectedSlot && isSlotBookedFn(v.selectedDate, v.selectedSlot)) {
    e.selectedSlot = "This slot is already reserved by another patient. Please choose another available slot.";
  }
  if (isSlotBlockedFn && v.selectedDate && v.selectedSlot) {
    const blk = isSlotBlockedFn(v.selectedDate, v.selectedSlot);
    if (blk) {
      e.selectedSlot = typeof blk === "object" && blk?.reason
        ? `Doctor is unavailable during this slot: ${blk.reason}. Please select another time.`
        : "Doctor is unavailable during this time slot. Please choose another slot.";
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
  const [selectedLocalizedSlot, setSelectedLocalizedSlot] = useState<LocalizedUserSlot | null>(null);

  // Active consulting physician for customized hours, bio, and slot generation
  const activeDoctor = useMemo(() => {
    return selectedDoctor
      ? {
          id: selectedDoctor.id,
          name: selectedDoctor.name,
          title: selectedDoctor.title || "Consulting Physician",
          qualifications: tenant.doctor.qualifications,
          regNo: tenant.doctor.regNo,
          experienceYears: tenant.doctor.experienceYears,
          specialties: selectedDoctor.specialties || tenant.doctor.specialties,
          aboutText: tenant.doctor.aboutText,
          consultationFee: (selectedDoctor as any).consultationFee || tenant.doctor.consultationFee,
          availability: (selectedDoctor as any).availability || tenant.doctor.availability,
        }
      : tenant.doctor;
  }, [selectedDoctor, tenant.doctor]);

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
    (s: string, localizedSlot?: LocalizedUserSlot) => {
      update("selectedSlot", s);
      if (localizedSlot) {
        setSelectedLocalizedSlot(localizedSlot);
      }
    },
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

    // Defensive check against real-time expiration or scheduling conflict
    if (selectedLocalizedSlot) {
      if (isUserSlotPassed(selectedLocalizedSlot.isoTimestamp)) {
        setErrors({
          selectedSlot: `The ${selectedLocalizedSlot.userTime12} consultation slot has elapsed. Please select an upcoming slot.`,
        });
        return;
      }

      if (isSlotBooked(selectedLocalizedSlot.clinicDateYMD, selectedLocalizedSlot.clinicSlot24)) {
        setErrors({
          selectedSlot: `The ${selectedLocalizedSlot.userTime12} consultation slot has already been reserved by another patient. Please choose an available time slot.`,
        });
        return;
      }

      const blk = isSlotBlocked(selectedLocalizedSlot.clinicDateYMD, selectedLocalizedSlot.clinicSlot24);
      if (blk) {
        setErrors({
          selectedSlot: `The ${selectedLocalizedSlot.userTime12} time slot is currently blocked by doctor schedule (${blk.reason}). Please choose an available time slot.`,
        });
        return;
      }
    } else if (isSlotPassed(form.selectedDate, form.selectedSlot)) {
      setErrors({
        selectedSlot: "The selected consultation slot has elapsed. Please select an upcoming slot.",
      });
      return;
    }

    setLoading(true);

    const userTz = userTzInfo;
    const isOverseasPatient = !userTz.isClinicTimezone;

    const chosenDoctorName = selectedDoctor?.name || tenant.doctor.name || CLINIC.DOCTOR_NAME;
    const chosenDoctorId = selectedDoctor?.id || tenant.doctor.id || "doc-default";
    const contStatus = continuity?.status === "preferred_doctor_available"
      ? "Continuing Care"
      : (continuity?.status === "doctor_inactive"
          ? `Transferred from ${continuity.previous_doctor_name}`
          : (continuity?.previous_doctor_name ? `Alternate for ${continuity.previous_doctor_name}` : "New Patient"));

    const aptDate = selectedLocalizedSlot ? selectedLocalizedSlot.userDateYMD : form.selectedDate;
    const aptTime = selectedLocalizedSlot ? selectedLocalizedSlot.userTime12 : form.selectedSlot;
    const clinicDate = selectedLocalizedSlot ? selectedLocalizedSlot.clinicDateYMD : form.selectedDate;
    const clinicSlot = selectedLocalizedSlot ? selectedLocalizedSlot.clinicSlot24 : form.selectedSlot;
    const clinicTime = selectedLocalizedSlot ? selectedLocalizedSlot.clinicTime12 : form.selectedSlot;
    const isoStartTime = selectedLocalizedSlot
      ? selectedLocalizedSlot.isoTimestamp
      : toISO(form.selectedDate, form.selectedSlot);
    const isoEndTime = selectedLocalizedSlot
      ? new Date(new Date(selectedLocalizedSlot.isoTimestamp).getTime() + 30 * 60000).toISOString()
      : toISO(form.selectedDate, addMinutes(form.selectedSlot, 30));

    // 1. Immediately persist to global SSOT and localStorage to lock slot for all patients
    const newAppointment: BookedAppointment = {
      id: `apt-${Date.now()}`,
      patientId: authUser?.id || `usr-${Date.now().toString().slice(-4)}`,
      patientName: form.name.trim(),
      patientPhone: form.phone.trim(),
      patientEmail: form.email.trim().toLowerCase(),
      date: aptDate,
      time: aptTime,
      slot: clinicSlot,
      clinicDate,
      clinicSlot,
      clinicTime,
      userDate: aptDate,
      userTime: aptTime,
      timeZone: userTzInfo.timeZone,
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
      startTime: isoStartTime,
      endTime:   isoEndTime,
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
      hospital_id: tenant.id,
      doctor_id: chosenDoctorId,
      calendar_id: payload.providerCalendarId,
      continuity_status: contStatus,
      clinic_date: clinicDate,
      clinic_slot: clinicSlot,
      user_date: aptDate,
      user_time: aptTime,
      user_timezone: userTzInfo.timeZone,
      consultation_type: newAppointment.type,
    });

    // Send confirmation email via API
    await api.email.sendNotification({
      email: payload.patientDetails.email,
      subject: `Appointment Booking Confirmed — ${tenant.name}`,
      body: `Dear ${payload.patientDetails.name},\nYour appointment with ${chosenDoctorName} at ${tenant.name} (${tenant.contact.address.street}, ${tenant.contact.address.city}) has been confirmed.\nDate & Time: ${aptDate} at ${aptTime} (${userTzInfo.label || userTzInfo.timeZone})\nContinuity: ${contStatus}\nConsultation Type: ${newAppointment.type}\nPhone / WhatsApp: ${tenant.contact.phone}`,
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
      {/* Page header with Live Clinic Clock & Timezone Sync */}
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black text-stone-800 tracking-tight flex items-center gap-2">
            <span>📅</span> Book a Consultation
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Select a verified appointment slot with {tenant.name} ({tenant.contact.address.city}).
          </p>
        </div>

        {/* Single Local Time Clock - Clean & Patient-Centric (Never Confusing Dual Clocks) */}
        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 border border-emerald-200/90 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-emerald-950 flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Your Time:</span>
            <strong className="font-bold">{userTzInfo.formattedTime}</strong>
            <span className="text-emerald-700 text-[10px]">({userTzInfo.label})</span>
          </div>
        </div>
      </div>

      {/* ── Attending Doctor Profile & Clinical Credentials Card ── */}
      <div className="mb-6 bg-white border border-stone-200/90 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div className="flex items-start gap-3.5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-sm flex-shrink-0"
                  style={{ background: THEME_GRADIENTS.PRIMARY }}
                >
                  {activeDoctor.name
                    .replace(/^Dr\.\s*/i, "")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "DR"}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-stone-900 leading-tight">
                      {activeDoctor.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      🩺 Attending Physician
                    </span>
                  </div>
                  <p className="text-stone-500 text-xs mt-0.5 font-medium">
                    {activeDoctor.title} {activeDoctor.qualifications ? `· ${activeDoctor.qualifications}` : ""}
                  </p>
                  <p className="text-[11px] text-stone-400 mt-0.5 font-medium flex flex-wrap items-center gap-2">
                    {activeDoctor.regNo && <span>Reg: <strong className="text-stone-600 font-semibold">{activeDoctor.regNo}</strong></span>}
                    {activeDoctor.experienceYears && (
                      <span>· Experience: <strong className="text-stone-600 font-semibold">{activeDoctor.experienceYears}+ Years</strong></span>
                    )}
                    <span>· Fee: <strong className="text-emerald-700 font-bold">{tenant.currencySymbol || "₹"}{activeDoctor.consultationFee || activeDoctor.availability?.consultationFee || 750}</strong></span>
                  </p>
                </div>
              </div>

              {/* Multi-Doctor Switcher if multiple doctors exist */}
              {tenant.doctors && tenant.doctors.length > 1 && (
                <div className="flex items-center gap-1.5 self-start sm:self-center">
                  <span className="text-[10px] font-bold text-stone-400 uppercase">Doctor:</span>
                  <div className="inline-flex rounded-xl bg-stone-100 p-1">
                    {tenant.doctors.map((d) => {
                      const isSelected = (selectedDoctor?.name || tenant.doctor.name) === d.name;
                      return (
                        <button
                          key={d.name}
                          type="button"
                          onClick={() => {
                            setSelectedDoctor({
                              id: d.id || "doc-default",
                              name: d.name,
                              title: d.title,
                              calendar_id: d.email,
                              specialties: d.specialties || [],
                              is_active: true,
                            });
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-white text-stone-900 shadow-2xs font-extrabold"
                              : "text-stone-500 hover:text-stone-800"
                          }`}
                        >
                          {d.name.split(" ")[1] || d.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Specialties & Clinical Philosophy */}
            {activeDoctor.specialties && activeDoctor.specialties.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mr-1">
                  Clinical Focus:
                </span>
                {activeDoctor.specialties.map((spec) => (
                  <span
                    key={spec}
                    className="px-2.5 py-0.5 rounded-full bg-stone-100 border border-stone-200/70 text-stone-700 text-[11px] font-semibold"
                  >
                    ✦ {spec}
                  </span>
                ))}
              </div>
            )}

            {activeDoctor.aboutText && (
              <p className="text-stone-600 text-xs leading-relaxed font-normal bg-stone-50/70 rounded-xl p-3 border border-stone-100">
                {activeDoctor.aboutText}
              </p>
            )}
          </div>

      {/* ── Dynamic Walk-in vs Scheduled Consultation Guide ─────────── */}
      {(() => {
        const isTelemedicineClinic = tenant.features.enableTelemedicine && tenant.hours?.walkinAllowed === false;
        const doctorSchedule = activeDoctor.availability?.schedule;
        const hasWalkins = !isTelemedicineClinic && (doctorSchedule?.walkinDays ? doctorSchedule.walkinDays.length > 0 : true);
        const morningHoursDisplay = !userTzInfo.isClinicTimezone
          ? sessionHours.morning.display
          : (activeDoctor.availability?.morningHours || sessionHours.morning.display);
        const eveningHoursDisplay = !userTzInfo.isClinicTimezone
          ? sessionHours.evening.display
          : (activeDoctor.availability?.eveningHours || sessionHours.evening.display);
        const walkinDaysDisplay = doctorSchedule?.walkinDays?.join(", ") || tenant.hours?.walkinDaysSummary || "Monday to Saturday";
        const apptDaysDisplay = doctorSchedule?.appointmentOnlyDays?.join(", ") || tenant.hours?.appointmentDaysSummary || "Morning sessions & Sundays";
        const offDaysList = doctorSchedule?.offDays || [];

        if (isTelemedicineClinic || !hasWalkins) {
          return (
            <div className="bg-sky-50/90 border border-sky-200/90 rounded-2xl p-4 text-xs space-y-1.5 shadow-2xs mb-6">
              <div className="flex items-center gap-2 font-extrabold text-sky-950">
                <span className="text-base">🌐</span>
                <span>Scheduled Consultations Only (Tele-Care &amp; Dedicated Appointments)</span>
              </div>
              <p className="text-sky-900 leading-relaxed text-[11px]">
                All consultations with <strong>{activeDoctor.name}</strong> at {tenant.name} are scheduled strictly by prior appointment ({morningHoursDisplay} &amp; {eveningHoursDisplay}) to ensure dedicated, unhurried clinical care.
                {offDaysList.length > 0 && <span className="block mt-1 font-semibold text-sky-950">🏖️ Weekly Off: {offDaysList.join(", ")}</span>}
              </p>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="bg-blue-50/90 border border-blue-200/90 rounded-2xl p-4 text-xs space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 font-extrabold text-blue-950">
                <span className="text-base">🚶‍♂️</span>
                <span>Walk-in OPD ({eveningHoursDisplay})</span>
              </div>
              <p className="text-blue-900 leading-relaxed text-[11px]">
                Walk-ins welcomed directly at{" "}
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
                during {walkinDaysDisplay}. Tokens issued at reception upon arrival.
              </p>
            </div>

            <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-4 text-xs space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 font-extrabold text-emerald-950">
                <span className="text-base">📅</span>
                <span>Prior Appointment Only ({morningHoursDisplay})</span>
              </div>
              <p className="text-emerald-900 leading-relaxed text-[11px]">
                {apptDaysDisplay} with <strong>{activeDoctor.name}</strong> require prior booking using the calendar below.
                {offDaysList.length > 0 && <span className="block mt-1 font-semibold text-emerald-950">🏖️ Weekly Off: {offDaysList.join(", ")}</span>}
              </p>
            </div>
          </div>
        );
      })()}

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

        {/* ── Auto-Detected Local Timezone Indicator ── */}
        <div className="bg-white rounded-2xl border border-stone-200 card-shadow p-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🌐</span>
            <div>
              <p className="font-bold text-stone-900 text-xs sm:text-sm">
                Consultation Availability in Your Local Time
              </p>
              <p className="text-stone-500 text-[11px]">
                Times and calendar are automatically synced to your detected location ({userTzInfo.label || userTzInfo.regionName}).
              </p>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-1 rounded-full border border-emerald-200 flex-shrink-0">
            📍 {userTzInfo.label || userTzInfo.regionName}
          </span>
        </div>

        {/* ── Calendar picker ────────────────────────── */}
        <div>
          <CalendarPicker
            selectedDate={form.selectedDate}
            onSelectDate={(d) => {
              update("selectedDate", d);
              update("selectedSlot", "");
              setSelectedLocalizedSlot(null);
            }}
            bookedDates={fullyBookedDates}
            error={errors.selectedDate}
          />
        </div>

        {/* ── Time slot grid ─────────────────────────── */}
        <DashboardErrorBoundary featureName="Consultation Time Slot Selector">
          <AppointmentSlotPicker
            selectedDate={form.selectedDate}
            selectedSlot={form.selectedSlot}
            onSelectSlot={handleSelectSlot}
            onSelectDate={(d) => {
              update("selectedDate", d);
              update("selectedSlot", "");
              setSelectedLocalizedSlot(null);
            }}
            selectedLocalizedSlotKey={selectedLocalizedSlot?.slotKey}
            selectedDoctor={activeDoctor}
            error={errors.selectedSlot}
          />
        </DashboardErrorBoundary>

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
