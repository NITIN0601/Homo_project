import React from "react";
import { useApp } from "../context/AppContext";
import { CLINIC, DOCTOR, OFFICE_HOURS, CARE_AREA_PILLS } from "../config";

/**
 * HomePage — Phase 1 Patient Landing
 * Strictly adheres to SSOT values, direct links to Book Appointment,
 * About, and Visit Summaries, and provides verified Clinic Address & Hours.
 */
const HomePage: React.FC = () => {
  const { state, navigateTo, sessionHours } = useApp();
  const { authUser } = state;
  const isAdmin = authUser?.role === "admin";

  const quickLinks = [
    { icon: "📅", label: "Book Appointment",  page: "appointments"  as const, desc: "Schedule in-person or tele-consultation" },
    ...(authUser ? [{ icon: "📋", label: "My Clinical Summary", page: "visit-summary" as const, desc: "View doctor notes & prescription timeline" }] : []),
    { icon: "🌿", label: "About Clinic",       page: "about"         as const, desc: "Doctor credentials & clinic philosophy" },
    ...(isAdmin ? [{ icon: "🔒", label: "Admin Console", page: "admin-dashboard" as const, desc: "Doctor clinical roster & inventory" }] : []),
  ];

  return (
    <div className="max-w-3xl mx-auto flex flex-col items-center text-center gap-8 py-8 px-4" style={{ animation: "fadeInUp 0.3s ease both" }}>
      {/* Hero mark */}
      <img
        src={CLINIC.LOGO_PATH}
        alt={CLINIC.LOGO_ALT}
        className="w-24 h-24 object-contain drop-shadow-md"
        width={96}
        height={96}
      />

      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black text-stone-800 leading-tight">
          {CLINIC.FULL_NAME}
        </h1>
        <p className="text-emerald-800 font-semibold text-sm tracking-wide">
          {CLINIC.TAGLINE}
        </p>
        <p className="text-stone-500 text-xs sm:text-sm leading-relaxed max-w-lg mx-auto">
          Under the expert clinical care of <strong>{DOCTOR.NAME}</strong> ({DOCTOR.QUALIFICATIONS}). {DOCTOR.DESIGNATION} at {DOCTOR.COLLEGE} with {DOCTOR.EXPERIENCE_YEARS} of dedicated clinical experience.
        </p>
        {authUser && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold mt-2">
            <span>👋</span> Welcome, {authUser.name}!
          </div>
        )}
      </div>

      {/* Areas We Treat Quick Pills (from clinic flyer) */}
      <div className="w-full bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-center space-y-2">
        <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
          🌿 Key Clinical Care Areas
        </p>
        <div className="flex flex-wrap justify-center gap-1.5 text-xs font-medium text-emerald-800">
          {CARE_AREA_PILLS.map((tag) => (
            <span key={tag} className="px-2.5 py-1 bg-white rounded-full border border-emerald-200 shadow-2xs">
              • {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Quick navigation cards (Dynamically justified for 2 tiles when unauthenticated) */}
      <div
        className={`grid grid-cols-1 ${
          quickLinks.length === 2
            ? "sm:grid-cols-2 max-w-2xl mx-auto"
            : quickLinks.length === 4
            ? "sm:grid-cols-2 lg:grid-cols-4"
            : "sm:grid-cols-3"
        } gap-4 w-full`}
      >
        {quickLinks.map(({ icon, label, page, desc }) => (
          <button
            key={page}
            onClick={() => navigateTo(page)}
            className="flex flex-col items-center text-center p-5 bg-white border border-stone-200/80 rounded-2xl hover:border-emerald-500 hover:shadow-lg transition-all active:scale-95 cursor-pointer group"
            aria-label={`Go to ${label}`}
          >
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform" role="img" aria-hidden="true">{icon}</span>
            <span className="text-sm font-black text-stone-800">{label}</span>
            <span className="text-[11px] text-stone-500 mt-1 leading-snug">{desc}</span>
          </button>
        ))}
      </div>

      {/* Clinic Location & Office Hours SSOT Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left">
        {/* Location & Contact Card */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
            <span className="text-xl">📍</span>
            <div>
              <p className="font-extrabold text-stone-800 text-xs uppercase tracking-wider">Clinic Location &amp; Contact</p>
              <p className="text-stone-400 text-[10px]">{CLINIC.BRANCHES.MALLESHWARAM}</p>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-stone-600">
            <p className="font-bold text-stone-800">{CLINIC.ADDRESS.STREET}</p>
            <p>{CLINIC.ADDRESS.CITY_STATE} – {CLINIC.ADDRESS.PINCODE}</p>
            <div className="pt-1.5 border-t border-stone-100 space-y-1">
              <p className="flex items-center gap-2">
                <span className="text-stone-400">📞 Phone / WhatsApp:</span>
                <a href={`tel:${CLINIC.PHONE_TEL}`} className="font-bold text-emerald-800 hover:underline">
                  {CLINIC.PHONE_DISPLAY}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-stone-400">✉️ Email:</span>
                <a href={`mailto:${CLINIC.SUPPORT_EMAIL}`} className="font-bold text-emerald-800 hover:underline">
                  {CLINIC.SUPPORT_EMAIL}
                </a>
              </p>
            </div>
          </div>

          <a
            href={CLINIC.ADDRESS.MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors"
          >
            <span>🗺️</span> View on Google Maps ↗
          </a>
        </div>

        {/* Office Hours Card */}
        <div className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs space-y-3 text-left">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">🕒</span>
              <div>
                <p className="font-extrabold text-stone-800 text-xs uppercase tracking-wider">Consultation Hours</p>
                <p className="text-stone-400 text-[10px]">In-Person &amp; Tele-Health</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-start py-1 border-b border-stone-50">
              <div>
                <span className="text-stone-600 font-medium block">
                  {sessionHours.morning.daySpanLabel}
                </span>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  📅 {OFFICE_HOURS.MORNING.badge}
                </span>
              </div>
              <div className="text-right">
                <strong className="font-bold text-stone-800 text-xs block font-mono">
                  {sessionHours.morning.display}
                </strong>
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  ({OFFICE_HOURS.MORNING.mode})
                </span>
              </div>
            </div>

            <div className="flex justify-between items-start py-1 border-b border-stone-50">
              <div>
                <span className="text-stone-600 font-medium block">
                  {sessionHours.evening.daySpanLabel}
                </span>
                <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  🚶‍♂️ {OFFICE_HOURS.EVENING.badge}
                </span>
              </div>
              <div className="text-right">
                <strong className="font-bold text-stone-800 text-xs block font-mono">
                  {sessionHours.evening.display}
                </strong>
                <span className="text-[10px] text-stone-500 font-medium block">
                  ({OFFICE_HOURS.EVENING.mode})
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-stone-600 font-medium">Sunday</span>
              <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] border border-emerald-200">
                {OFFICE_HOURS.SUNDAY.hours}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-blue-900 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 font-medium leading-relaxed">
            🚶‍♂️ <strong>Walk-in Policy:</strong> {sessionHours.walkin.policy}
          </p>

          <p className="text-[11px] text-stone-500 pt-1 border-t border-stone-100 italic">
            💬 {OFFICE_HOURS.EMERGENCY}
          </p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
