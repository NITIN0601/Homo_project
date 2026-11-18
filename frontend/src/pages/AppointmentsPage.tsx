import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useApp } from "../context/AppContext";
import { useTenant } from "../context/ThemeProvider";
import CalendarPicker from "../components/calendar";
import { Button, Badge, Card, Textarea } from "../components/ui";
import {
  HOSPITAL,
  MORNING_SLOTS,
  EVENING_SLOTS,
  ALL_TIME_SLOTS,
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
import {
  AppointmentSlotPicker,
  AppointmentConfirmationBanner,
  PatientDoctorContinuityBanner,
  AttendingDoctorCard,
  ConsultationScheduleGuide,
  PatientDetailsCard,
} from "./appointments";
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

  if (!v.firstName || !v.firstName.trim()) {
    e.firstName = "First name is required.";
  } else if (v.firstName.trim().length < 2) {
    e.firstName = "First name must be at least 2 characters.";
  }

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

const AppointmentsPage: React.FC = () => {
  const { state, isSlotBooked, isSlotBlocked, bookAppointment, userTzInfo, sessionHours } = useApp();
  const { tenant } = useTenant();
  const { authUser } = state;

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, []);

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

  const [form, setForm] = useState<AppointmentFormValues>(INITIAL);
  const [errors, setErrors] = useState<AppointmentFormErrors>({});
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<AppointmentPayload | null>(null);

  const [continuity, setContinuity] = useState<ContinuityPreferenceResponse | null>(null);
  const [continuityLoading, setContinuityLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorSummary | null>(null);
  const [selectedLocalizedSlot, setSelectedLocalizedSlot] = useState<LocalizedUserSlot | null>(null);

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

    if (selectedLocalizedSlot) {
      if (isUserSlotPassed(selectedLocalizedSlot.isoTimestamp)) {
        setErrors({
          selectedSlot: `The ${selectedLocalizedSlot.userTime12} consultation slot has elapsed. Please select an upcoming slot.`,
        });
        return;
      }

      const activeSlotDate = selectedLocalizedSlot.hospitalDateYMD;
      const activeSlotTime = selectedLocalizedSlot.hospitalSlot24;

      if (isSlotBooked(activeSlotDate, activeSlotTime)) {
        setErrors({
          selectedSlot: `The ${selectedLocalizedSlot.userTime12} consultation slot has already been reserved by another patient. Please choose an available time slot.`,
        });
        return;
      }

      const blk = isSlotBlocked(activeSlotDate, activeSlotTime);
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
    const isOverseasPatient = !userTz.isHospitalTimezone;

    const chosenDoctorName = selectedDoctor?.name || tenant.doctor.name || HOSPITAL.DOCTOR_NAME;
    const chosenDoctorId = selectedDoctor?.id || tenant.doctor.id || "doc-default";
    const contStatus = continuity?.status === "preferred_doctor_available"
      ? "Continuing Care"
      : (continuity?.status === "doctor_inactive"
          ? `Transferred from ${continuity.previous_doctor_name}`
          : (continuity?.previous_doctor_name ? `Alternate for ${continuity.previous_doctor_name}` : "New Patient"));

    const aptDate = selectedLocalizedSlot ? selectedLocalizedSlot.userDateYMD : form.selectedDate;
    const aptTime = selectedLocalizedSlot ? selectedLocalizedSlot.userTime12 : form.selectedSlot;
    const hospitalDate = selectedLocalizedSlot ? selectedLocalizedSlot.hospitalDateYMD : form.selectedDate;
    const hospitalSlot = selectedLocalizedSlot ? selectedLocalizedSlot.hospitalSlot24 : form.selectedSlot;
    const hospitalTime = selectedLocalizedSlot ? selectedLocalizedSlot.hospitalTime12 : form.selectedSlot;
    const isoStartTime = selectedLocalizedSlot
      ? selectedLocalizedSlot.isoTimestamp
      : toISO(form.selectedDate, form.selectedSlot);
    const isoEndTime = selectedLocalizedSlot
      ? new Date(new Date(selectedLocalizedSlot.isoTimestamp).getTime() + 30 * 60000).toISOString()
      : toISO(form.selectedDate, addMinutes(form.selectedSlot, 30));

    const newAppointment: BookedAppointment = {
      id: `apt-${Date.now()}`,
      patientId: authUser?.id || `usr-${Date.now().toString().slice(-4)}`,
      patientName: form.name.trim(),
      patientPhone: form.phone.trim(),
      patientEmail: form.email.trim().toLowerCase(),
      date: aptDate,
      time: aptTime,
      slot: hospitalSlot,
      hospitalDate,
      hospitalSlot,
      hospitalTime,
      userDate: aptDate,
      userTime: aptTime,
      timeZone: userTzInfo.timeZone,
      doctorId: chosenDoctorId,
      doctorName: chosenDoctorName,
      hospitalId: tenant.id,
      continuityStatus: contStatus,
      type: isOverseasPatient ? "Online Tele-Consultation" : "In-Person Hospital Visit",
      chiefReason: form.notes.trim() || "General Consultation & Follow-up",
      status: "Confirmed",
      createdAt: new Date().toISOString(),
    };
    bookAppointment(newAppointment);

    const payload: AppointmentPayload = {
      patientDetails: {
        name:  form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
      },
      startTime: isoStartTime,
      endTime:   isoEndTime,
      providerCalendarId:      selectedDoctor?.calendar_id || HOSPITAL.DOCTOR_EMAIL,
      patientCalendarSyncRequested: form.syncToPatientCal,
      doctorId: chosenDoctorId,
      doctorName: chosenDoctorName,
      hospitalId: tenant.id,
      continuityStatus: contStatus,
    };

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
      hospital_date: hospitalDate,
      hospital_slot: hospitalSlot,
      user_date: aptDate,
      user_time: aptTime,
      user_timezone: userTzInfo.timeZone,
      consultation_type: newAppointment.type,
    });

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
      {/* Page header with Local Clock */}
      <div className="mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-200/80 pb-4">
        <div>
          <h1 className="text-2xl font-black text-stone-800 tracking-tight flex items-center gap-2">
            <span>📅</span> Book a Consultation
          </h1>
          <p className="text-stone-500 text-xs sm:text-sm mt-0.5">
            Select a verified appointment slot with {tenant.name} ({tenant.contact.address.city}).
          </p>
        </div>

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
      <AttendingDoctorCard
        tenant={tenant}
        activeDoctor={activeDoctor}
        selectedDoctor={selectedDoctor}
        onSelectDoctor={(doc) => setSelectedDoctor(doc)}
      />

      {/* ── Dynamic Walk-in vs Scheduled Consultation Guide ─────────── */}
      <ConsultationScheduleGuide
        tenant={tenant}
        activeDoctor={activeDoctor}
        userTzInfo={userTzInfo}
        sessionHours={sessionHours}
      />

      <form id="appointment-form" onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* ── Patient details ────────────────────────── */}
        <PatientDetailsCard
          form={form}
          errors={errors}
          onNameChange={handleNameChange}
          onEmailChange={(val) => update("email", val)}
          onEmailBlur={handleEmailBlur}
          onPhoneChange={(full) => update("phone", full)}
        />

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
