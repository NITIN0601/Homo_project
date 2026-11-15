import React, { useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useClinic } from "../hooks/useClinic";
import {
  CLINICAL_SPECIALISATIONS,
  THEME_GRADIENTS,
  THEME_COLORS,
  OFFICE_HOURS,
} from "../config";
import { api } from "../services/api";

const AboutPage: React.FC = () => {
  const { navigateTo, state, sessionHours } = useApp();
  const clinic = useClinic();
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

  const shouldDisplayDoctors = clinic.features.displayDoctorDetails !== false;

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
            <span>🌿</span> About {clinic.name}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Gentle Healing, <br className="hidden sm:inline" />
            <span className="text-emerald-300">Lasting Wellness.</span>
          </h1>

          <p className="text-emerald-100/90 text-xs sm:text-sm font-semibold uppercase tracking-wider">
            {clinic.tagline}
          </p>

          <p className="text-stone-200 text-sm sm:text-base leading-relaxed font-normal text-justify sm:text-left">
            {clinic.aboutClinicText}
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigateTo("appointments")}
              className="px-6 py-3.5 rounded-2xl bg-[var(--brand-accent,#10b981)] hover:opacity-90 text-stone-950 font-black text-sm shadow-xl transition-all active:scale-95 cursor-pointer"
            >
              📅 Book Consultation →
            </button>

            <button
              onClick={() => api.whatsapp.openChat(undefined, authUser)}
              style={{ background: THEME_COLORS.WHATSAPP_GREEN }}
              className="px-5 py-3.5 rounded-2xl hover:opacity-90 text-white font-extrabold text-sm shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <span>📱</span> WhatsApp ({clinic.phone})
            </button>
          </div>
        </div>

        {/* Decorative Watermark Logo */}
        <img
          src={clinic.logoUrl}
          alt=""
          className="absolute -right-10 -bottom-10 h-80 w-80 object-contain opacity-15 pointer-events-none select-none"
        />
      </div>

      {/* ── Key Facility & Clinical Credentials Bar ─────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs text-center space-y-1">
          <p className="text-xl sm:text-2xl font-black" style={{ color: clinic.branding.primaryColor }}>
            {clinic.doctors.length}
          </p>
          <p className="text-xs font-bold text-stone-700">
            {clinic.doctors.length === 1 ? "Attending Physician" : "Specialist Clinicians"}
          </p>
          <p className="text-[10px] text-stone-400 font-medium">
            {clinic.doctors.length === 1 ? "Clinical Lead" : "Affiliated Medical Staff"}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs text-center space-y-1">
          <p className="text-xl sm:text-2xl font-black" style={{ color: clinic.branding.primaryColor }}>
            {clinic.primaryDoctorExperience}
          </p>
          <p className="text-xs font-bold text-stone-700">Clinical Practice</p>
          <p className="text-[10px] text-stone-400 font-medium">Lead Doctor Experience</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs text-center space-y-1">
          <p className="text-xl sm:text-2xl font-black" style={{ color: clinic.branding.primaryColor }}>
            100%
          </p>
          <p className="text-xs font-bold text-stone-700">Individualised Care</p>
          <p className="text-[10px] text-stone-400 font-medium">Holistic Case Analysis</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs text-center space-y-1">
          <p className="text-xl sm:text-2xl font-black truncate px-1" style={{ color: clinic.branding.primaryColor }}>
            {clinic.address.city}
          </p>
          <p className="text-xs font-bold text-stone-700">Facility Location</p>
          <p className="text-[10px] text-stone-400 font-medium">{clinic.address.state}</p>
        </div>
      </div>

      {/* ── Hospital Medical Team Section (Single & Multi-Doctor Dynamic Support) ──────── */}
      {shouldDisplayDoctors ? (
        <div id="doctor-profile" className="space-y-6 scroll-mt-24">
          <div className="text-center space-y-1 max-w-xl mx-auto">
            <span className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
              {clinic.doctors.length === 1 ? "Attending Physician" : `${clinic.shortName} Medical Faculty`}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-stone-800">
              {clinic.doctors.length === 1 ? "Meet Our Consulting Physician" : "Meet Our Specialist Doctors"}
            </h2>
            <p className="text-stone-500 text-xs sm:text-sm">
              {clinic.doctors.length === 1
                ? `Individualized clinical consultations and compassionate care led by ${clinic.primaryDoctorName}.`
                : "Certified medical practitioners dedicated to compassionate, root-cause patient healing."}
            </p>
          </div>

          <div className="space-y-6">
            {clinic.doctors.map((doc, idx) => {
              const isAssignedDoctor =
                Boolean(authUser) &&
                (authUser?.assigned_doctor_id === doc.id ||
                  authUser?.assigned_doctor_name === doc.name);
              const shareBio =
                clinic.features.allowDoctorCustomBio !== false &&
                doc.sharingPreferences?.shareBio !== false;
              const shareSpecialties =
                clinic.features.allowDoctorSpecialties !== false &&
                doc.sharingPreferences?.shareSpecialties !== false;
              const shareQualifications =
                doc.sharingPreferences?.shareQualifications !== false;
              const shareDirectPhone =
                clinic.features.allowDoctorDirectContact !== false &&
                doc.sharingPreferences?.shareDirectPhone === true &&
                Boolean(doc.phone);

              return (
                <div
                  key={doc.id || `doc-${idx}`}
                  className={`bg-white rounded-3xl p-6 sm:p-10 border card-shadow flex flex-col md:flex-row items-center md:items-start gap-8 transition-all hover:border-stone-300 relative ${
                    isAssignedDoctor
                      ? "border-emerald-500/80 ring-2 ring-emerald-500/20"
                      : "border-stone-200/80"
                  }`}
                >
                  {isAssignedDoctor && (
                    <div className="absolute top-4 right-6 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm flex items-center gap-1.5">
                      <span>⭐</span> Your Assigned Physician
                    </div>
                  )}

                  {/* Doctor Avatar / Icon */}
                  <div className="relative flex-shrink-0 text-center">
                    <div
                      className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl text-white font-black text-3xl flex items-center justify-center shadow-xl border-4 border-stone-100 overflow-hidden mx-auto"
                      style={{ background: clinic.branding.primaryDarkColor || "#0f172a" }}
                    >
                      {doc.avatarUrl ? (
                        <img src={doc.avatarUrl} alt={doc.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl">👨‍⚕️</span>
                      )}
                    </div>
                    {shareQualifications && (
                      <span
                        className="inline-block mt-3 text-white text-[11px] font-extrabold uppercase px-3 py-1 rounded-full shadow-sm"
                        style={{ background: clinic.branding.primaryColor }}
                      >
                        {doc.regNo ? `Reg: ${doc.regNo}` : "Verified Physician"}
                      </span>
                    )}
                  </div>

                  {/* Doctor Bio & Credentials */}
                  <div className="space-y-4 flex-1 text-center md:text-left">
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-stone-800">
                        {doc.name}
                      </h3>
                      <p className="font-bold text-sm mt-0.5" style={{ color: clinic.branding.primaryColor }}>
                        {doc.title}
                      </p>
                      <p className="text-stone-500 text-xs mt-0.5">
                        {shareQualifications ? doc.qualifications : "Consulting Physician"} • {doc.experienceYears} Years Clinical Experience
                      </p>
                    </div>

                    <div className="space-y-2 text-stone-600 text-xs sm:text-sm leading-relaxed">
                      <p className="text-justify sm:text-left">
                        {shareBio
                          ? doc.aboutText ||
                            "Comprehensive clinical practitioner focused on individualized constitutional case analysis and proactive preventive medicine."
                          : `Clinical practitioner at ${clinic.name} providing individualized patient consultations and integrative care.`}
                      </p>
                    </div>

                    {/* Doctor Specialties Chips */}
                    {shareSpecialties && doc.specialties && doc.specialties.length > 0 && (
                      <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1 text-xs font-semibold">
                        {doc.specialties.map((spec) => (
                          <span
                            key={spec}
                            className="px-3 py-1 rounded-full border bg-stone-50 border-stone-200 text-stone-700"
                          >
                            ✦ {spec}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="pt-2 flex flex-wrap items-center justify-center md:justify-start gap-3">
                      <button
                        onClick={() => navigateTo("appointments")}
                        className="px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm hover:opacity-90 transition-all cursor-pointer"
                        style={{ background: clinic.branding.primaryColor }}
                      >
                        Book with {doc.name.split(" ")[0] || "Doctor"} →
                      </button>

                      {shareDirectPhone && doc.phone && (
                        <a
                          href={`tel:${doc.phone}`}
                          className="px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs transition-colors inline-flex items-center gap-1.5"
                        >
                          <span>📞</span> Direct: {doc.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-stone-50 rounded-3xl p-6 sm:p-8 border border-stone-200 text-center space-y-2">
          <span className="text-3xl">🏥</span>
          <h3 className="text-base font-bold text-stone-800">Hospital Medical Board</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Consultations at {clinic.name} are provided by board-certified physicians following centralized facility protocols.
          </p>
        </div>
      )}

      {/* ── Services & Specialisations ──────────────────────────────────── */}
      <div id="specialisations" className="space-y-6 scroll-mt-24">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 text-stone-800 text-xs font-bold border border-stone-200">
            <span>🩺</span> Comprehensive Clinical Practice
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-stone-800">Services &amp; Specialisations</h2>
          <p className="text-stone-600 text-xs sm:text-sm leading-relaxed text-justify sm:text-center">
            {clinic.name} provides individualised consultations, with detailed case assessment, personalised treatment, and follow-up care based on each patient’s health history and individual needs.
          </p>

          {clinic.specialties && clinic.specialties.length > 0 && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {clinic.specialties.map((spec) => (
                <span
                  key={spec}
                  className="px-3.5 py-1.5 rounded-full bg-white border border-stone-200/90 text-stone-800 text-xs font-bold shadow-2xs flex items-center gap-1.5"
                >
                  <span className="text-emerald-600">✦</span> {spec}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CLINICAL_SPECIALISATIONS.map((spec) => (
            <div
              key={spec.category}
              className="bg-white rounded-2xl p-5 border border-stone-200/80 hover:border-emerald-500 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl p-2 rounded-xl bg-stone-50 border border-stone-100">{spec.icon}</span>
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
              <h3 className="text-lg font-black text-stone-800">Facility Timings &amp; Consultations</h3>
              <p className="text-stone-500 text-xs">{clinic.address.short}</p>
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
            <span>📍</span> Hospital Facility Address &amp; Appointments
          </div>
          <h3 className="text-xl font-bold text-white">{clinic.name}</h3>
          <p className="text-stone-300 text-xs leading-relaxed max-w-lg">
            {clinic.address.full}
          </p>
          <div className="pt-1 space-y-1 text-stone-400 text-xs">
            <p>
              📞 <strong>WhatsApp / Call:</strong>{" "}
              <a href={`tel:${clinic.phoneTel}`} className="text-emerald-400 font-bold hover:underline">
                {clinic.phone}
              </a>
            </p>
            <p>
              📧 <strong>Email:</strong>{" "}
              <a href={`mailto:${clinic.email}`} className="text-emerald-400 font-bold hover:underline">
                {clinic.email}
              </a>
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0 w-full md:w-auto">
          <a
            href={clinic.address.mapsUrl}
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
