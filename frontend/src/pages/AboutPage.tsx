import React, { useEffect } from "react";
import { useApp } from "../context/AppContext";
import {
  CLINIC,
  DOCTOR,
  DOCTOR_BIO,
  CLINICAL_SPECIALISATIONS,
  OFFICE_HOURS,
  THEME_GRADIENTS,
  THEME_COLORS,
} from "../config";
import { api } from "../services/api";

const AboutPage: React.FC = () => {
  const { navigateTo, state, sessionHours } = useApp();
  const { authUser } = state;

  useEffect(() => {
    const handleHashScroll = () => {
      const hash = window.location.hash.replace("#", "");
      if (!hash) return;
      const targetId =
        hash === "services" || hash === "treatments"
          ? "specialisations"
          : hash;
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    // Trigger on initial render or after page transition
    const timer1 = setTimeout(handleHashScroll, 120);
    const timer2 = setTimeout(handleHashScroll, 350);
    window.addEventListener("hashchange", handleHashScroll);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener("hashchange", handleHashScroll);
    };
  }, []);

  return (
    <div className="space-y-10 py-2 max-w-5xl mx-auto" style={{ animation: "fadeInUp 0.4s ease both" }}>
      
      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <div
        className="rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl"
        style={{
          background: THEME_GRADIENTS.HERO,
        }}
      >
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-extrabold uppercase tracking-widest text-emerald-200">
            <span>🌿</span> About {CLINIC.NAME} Homoeopathy Clinic
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Gentle Healing, <br className="hidden sm:inline" />
            <span className="text-emerald-300">Lasting Wellness.</span>
          </h1>

          <p className="text-emerald-100/90 text-xs sm:text-sm font-semibold uppercase tracking-wider">
            {CLINIC.SECONDARY_TAGLINE}
          </p>

          <p className="text-stone-200 text-sm sm:text-base leading-relaxed font-normal text-justify sm:text-left">
            Welcome to <strong>{CLINIC.FULL_NAME}</strong>. Led by <strong>{DOCTOR.NAME}</strong>, {DOCTOR.QUALIFICATIONS}. We provide individualised homoeopathic consultations with detailed case assessment, personalised treatment, and dedicated follow-up care based on each patient’s health history, lifestyle, and individual needs.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigateTo("appointments")}
              className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-sm shadow-xl transition-all active:scale-95 cursor-pointer"
            >
              📅 Book Consultation with {DOCTOR.NAME} →
            </button>

            <button
              onClick={() => api.whatsapp.openChat(undefined, authUser)}
              style={{ background: THEME_COLORS.WHATSAPP_GREEN }}
              className="px-5 py-3.5 rounded-2xl hover:opacity-90 text-white font-extrabold text-sm shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>📱</span> WhatsApp ({CLINIC.PHONE_DISPLAY})
            </button>
          </div>
        </div>

        {/* Decorative Watermark Logo */}
        <img
          src={CLINIC.LOGO_PATH}
          alt=""
          className="absolute -right-10 -bottom-10 h-80 w-80 object-contain opacity-15 pointer-events-none select-none"
        />
      </div>

      {/* ── Key Credentials Bar ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {DOCTOR.CREDENTIAL_CHIPS.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs text-center space-y-1">
            <p className="text-xl sm:text-2xl font-black text-emerald-800">{stat.value}</p>
            <p className="text-xs font-bold text-stone-700">{stat.label}</p>
            <p className="text-[10px] text-stone-400 font-medium">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Doctor Profile Section ───────────────────────────────────────── */}
      <div id="doctor-profile" className="scroll-mt-24 bg-white rounded-3xl p-6 sm:p-10 border border-stone-200/80 card-shadow flex flex-col md:flex-row items-center md:items-start gap-8">
        <div className="relative flex-shrink-0 text-center">
          <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-emerald-950 text-white font-black text-4xl flex items-center justify-center shadow-xl border-4 border-emerald-100 overflow-hidden mx-auto">
            <img
              src={CLINIC.LOGO_PATH}
              alt={DOCTOR.NAME}
              className="w-full h-full object-contain p-4 bg-white"
            />
          </div>
          <span className="inline-block mt-3 bg-emerald-700 text-white text-[11px] font-extrabold uppercase px-3 py-1 rounded-full shadow-sm">
            Homoeopathic Physician
          </span>
        </div>

        <div className="space-y-4 flex-1 text-center md:text-left">
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-stone-800">{DOCTOR_BIO.name}</h2>
            <p className="text-emerald-700 font-bold text-sm mt-0.5">{DOCTOR_BIO.qualifications}</p>
            <p className="text-stone-500 text-xs mt-0.5">{DOCTOR.DESIGNATION} at {DOCTOR.COLLEGE}</p>
          </div>

          <div className="space-y-2.5 text-stone-600 text-xs sm:text-sm leading-relaxed">
            <p className="text-justify sm:text-left">{DOCTOR.BIO_SUMMARY}</p>
            <p className="text-justify sm:text-left">{DOCTOR.APPROACH}</p>
          </div>

          {/* Academic & Professional Credentials Chips */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1 text-xs font-semibold text-stone-700">
            <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
              🎓 {DOCTOR.ALMA_MATER} (UG &amp; PG)
            </span>
            <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
              🏆 {DOCTOR.RANK}
            </span>
            <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
              📜 {DOCTOR.CERTIFICATION}
            </span>
            <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
              👩‍🏫 {DOCTOR.DESIGNATION}, {DOCTOR.COLLEGE_SHORT}
            </span>
            <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full border border-emerald-200">
              ⏳ {DOCTOR.EXPERIENCE_YEARS} Clinical Experience
            </span>
          </div>
        </div>
      </div>

      {/* ── Professional Experience Card ─────────────────────────────────── */}
      <div className="bg-stone-50 rounded-3xl p-6 sm:p-8 border border-stone-200/80 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👩‍⚕️</span>
          <h2 className="text-lg sm:text-xl font-black text-stone-800">Professional Experience</h2>
        </div>
        <p className="text-stone-600 text-xs sm:text-sm leading-relaxed text-justify sm:text-left">
          {DOCTOR.EXPERIENCE_DETAIL}
        </p>
      </div>

      {/* ── Services & Specialisations ──────────────────────────────────── */}
      <div id="specialisations" className="space-y-6 scroll-mt-24">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
            <span>🩺</span> Comprehensive Clinical Practice
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-800">Services &amp; Specialisations</h2>
          <p className="text-stone-600 text-xs sm:text-sm leading-relaxed text-justify sm:text-center">
            I provide individualised homoeopathic consultations, with detailed case assessment, personalised treatment, and follow-up care based on each patient’s health history and individual needs. Each consultation is individualised, with treatment planned according to the patient’s symptoms, medical history, and overall health.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CLINICAL_SPECIALISATIONS.map((spec) => (
            <div
              key={spec.category}
              className="bg-white rounded-2xl p-5 border border-stone-200/80 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-2 rounded-xl bg-emerald-50 border border-emerald-100">{spec.icon}</span>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-800">{spec.category}</h3>
                </div>
                <p className="text-stone-600 text-xs leading-relaxed pl-0.5">
                  {spec.conditions}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Clinic Timings & Schedule ─────────────────────────────────────── */}
      <div id="clinic-schedule" className="scroll-mt-24 bg-white rounded-3xl p-6 sm:p-8 border border-stone-200/80 card-shadow space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🕒</span>
            <div>
              <h3 className="text-lg font-black text-stone-800">Clinic Timings &amp; Consultations</h3>
              <p className="text-stone-500 text-xs">{CLINIC.ADDRESS.SHORT}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
            <p className="font-extrabold text-stone-800 text-sm flex items-center gap-1.5">
              <span>📅</span> {OFFICE_HOURS.MORNING.days}
            </p>
            <div className="space-y-1.5 text-stone-600 pl-1">
              <div>
                <strong className="text-stone-800">{sessionHours.morning.fullSessionName}:</strong>{" "}
                <span className="font-mono font-bold text-stone-900">{sessionHours.morning.display}</span>
                <br />
                <span className="text-emerald-700 font-semibold">({OFFICE_HOURS.MORNING.mode})</span>
              </div>
              <div className="pt-1 border-t border-stone-200/50">
                <strong className="text-stone-800">{sessionHours.evening.fullSessionName}:</strong>{" "}
                <span className="font-mono font-bold text-stone-900">{sessionHours.evening.display}</span>
                <br />
                <span className="text-blue-700 font-semibold">({OFFICE_HOURS.EVENING.mode})</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-2">
            <p className="font-extrabold text-stone-800 text-sm flex items-center gap-1.5">
              <span>🗓️</span> {OFFICE_HOURS.SUNDAY.days}
            </p>
            <div className="space-y-1.5 text-stone-600 pl-1">
              <p>
                <strong className="text-stone-800">Consultation:</strong> {OFFICE_HOURS.SUNDAY.hours}
              </p>
              <p className="text-stone-500 text-[11px] pt-1">
                Patients are kindly requested to book in advance via WhatsApp, phone, or the appointments portal.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Address & Operating Hours Card ───────────────────────────────── */}
      <div id="clinic-location" className="scroll-mt-24 bg-stone-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <span>📍</span> Clinic Address &amp; Appointments
          </div>
          <h3 className="text-xl font-bold text-white">{CLINIC.FULL_NAME}</h3>
          <p className="text-stone-300 text-xs leading-relaxed max-w-lg">
            {CLINIC.ADDRESS.FULL}
          </p>
          <div className="pt-1 space-y-1 text-stone-400 text-xs">
            <p>
              📞 <strong>WhatsApp / Call:</strong>{" "}
              <a href={`tel:${CLINIC.PHONE_TEL}`} className="text-emerald-400 font-bold hover:underline">
                {CLINIC.PHONE_DISPLAY}
              </a>
            </p>
            <p>
              📧 <strong>Email:</strong>{" "}
              <a href={`mailto:${CLINIC.SUPPORT_EMAIL}`} className="text-emerald-400 font-bold hover:underline">
                {CLINIC.SUPPORT_EMAIL}
              </a>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0 w-full md:w-auto">
          <a
            href={CLINIC.ADDRESS.MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-white font-bold text-xs text-center border border-stone-700 transition-all flex items-center justify-center gap-1.5"
          >
            <span>📌</span> Open Google Maps
          </a>
          <button
            onClick={() => navigateTo("appointments")}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs text-center shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Schedule Visit →
          </button>
        </div>
      </div>

    </div>
  );
};

export default AboutPage;
