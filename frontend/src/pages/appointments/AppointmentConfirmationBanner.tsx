import React, { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button, Badge } from "../../components/ui";
import { CLINIC, THEME_GRADIENTS } from "../../config";
import { api } from "../../services/api";
import type { AppointmentPayload } from "../../types";

interface AppointmentConfirmationBannerProps {
  payload: AppointmentPayload;
  onReset: () => void;
}

export const AppointmentConfirmationBanner: React.FC<AppointmentConfirmationBannerProps> = ({
  payload,
  onReset,
}) => {
  const { state, dispatch, userTzInfo } = useApp();
  const [resending, setResending] = useState(false);
  const [resentSuccess, setResentSuccess] = useState(false);
  const [claimPassword, setClaimPassword] = useState("");
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const isOverseas = !userTzInfo.isClinicTimezone;

  const formattedAppointmentTime =
    new Date(payload.startTime).toLocaleString("en-US", {
      timeZone: userTzInfo.timeZone,
      dateStyle: "full",
      timeStyle: "short",
    }) + ` ${userTzInfo.label}`;

  const handleClaimAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimPassword || claimPassword.length < 6) {
      setClaimError("Password must be at least 6 characters.");
      return;
    }
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await api.auth.register({
        name: payload.patientDetails.name,
        email: payload.patientDetails.email,
        phone: payload.patientDetails.phone,
        password: claimPassword,
        role: "patient",
      });
      if (res && res.profile) {
        dispatch({ type: "LOGIN", payload: res.profile });
        setClaimed(true);
      }
    } catch (err: any) {
      setClaimError(err?.message || "Could not register. Try logging in if account already exists.");
    } finally {
      setClaiming(false);
    }
  };

  const handleGoogleClaim = async () => {
    setClaiming(true);
    setClaimError(null);
    try {
      const res = await api.auth.google({
        email: payload.patientDetails.email,
        name: payload.patientDetails.name,
        portal_intent: "patient",
        hospital_id: state.tenant?.id || "default",
      });
      if (res && res.profile) {
        dispatch({ type: "LOGIN", payload: res.profile });
        setClaimed(true);
      }
    } catch (err: any) {
      setClaimError(err?.message || "Could not activate profile with Google.");
    } finally {
      setClaiming(false);
    }
  };

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
            { l: "Doctor",                  v: payload.doctorName || CLINIC.DOCTOR_NAME },
            { l: "Clinic Location",         v: `${CLINIC.ADDRESS.SHORT}, ${CLINIC.ADDRESS.STATE}` },
            { l: "Consult Type",            v: isOverseas ? "International Tele-Consultation" : "In-Clinic / Tele-Consultation" },
          ].map(({ l, v }) => (
            <div key={l} className="flex justify-between text-xs py-1 border-b border-stone-200/50 last:border-none">
              <span className="text-stone-400 font-medium">{l}</span>
              <span className="text-stone-800 font-semibold text-right ml-4">{v}</span>
            </div>
          ))}
        </div>

        {/* Guest Mode: Progressive Account Activation Card */}
        {!state.authUser && (
          <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <span>🔐</span> Activate Patient Portal Profile
              </span>
              <Badge variant="success" size="sm">
                Optional
              </Badge>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              Create a password to access your prescriptions, consultation notes, and bills for <strong>{payload.patientDetails.email}</strong> anytime.
            </p>

            {claimed ? (
              <div className="bg-white border border-emerald-300 rounded-xl p-3 text-xs text-emerald-800 font-bold text-center animate-fadeIn">
                ✓ Portal profile successfully activated! You are now logged in.
              </div>
            ) : (
              <form onSubmit={handleClaimAccount} className="space-y-2">
                {claimError && (
                  <p className="text-[11px] text-rose-600 font-medium">⚠️ {claimError}</p>
                )}
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Create a password (min 6 chars)"
                    value={claimPassword}
                    onChange={(e) => setClaimPassword(e.target.value)}
                    className="flex-1 bg-white text-xs border border-emerald-300 rounded-xl px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={claiming}
                    className="shrink-0 text-xs rounded-xl"
                  >
                    Activate Profile
                  </Button>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleGoogleClaim}
                    disabled={claiming}
                    className="w-full py-2 px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 font-bold text-[11px] text-stone-700 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.42 7.33 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.58 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>1-Click Activate with Google (No Password Needed)</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

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

export default AppointmentConfirmationBanner;

