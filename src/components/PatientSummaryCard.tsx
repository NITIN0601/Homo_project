import React from "react";
import { StarIcon, UserIcon } from "./Icons";

// ─── Patient data ─────────────────────────────────────────────
const PATIENT = {
  name: "John Doe",
  age: 38,
  gender: "Male",
  remedy: "Lycopodium",
  potency: "200C",
  bloodGroup: "O+",
  constitution: "Hepatic / Nervous",
  lastVisit: "18 Sep 2026",
  nextAppointment: "12 Oct 2026",
  rating: 4.8,
};

// ─── Metric Pill ─────────────────────────────────────────────
const Metric: React.FC<{ label: string; value: string; accent?: boolean }> = ({
  label,
  value,
  accent,
}) => (
  <div
    className={`flex flex-col items-center justify-center rounded-xl px-3 py-3 text-center flex-1
      ${accent
        ? "bg-sage-900 text-white"
        : "bg-sage-50 text-stone-800 border border-sage-100"
      }`}
  >
    <span
      className={`text-[11px] font-semibold uppercase tracking-widest mb-1 ${
        accent ? "text-sage-300" : "text-stone-500"
      }`}
    >
      {label}
    </span>
    <span className={`text-[15px] font-bold leading-tight ${accent ? "text-white" : "text-stone-800"}`}>
      {value}
    </span>
  </div>
);

// ─── Component ────────────────────────────────────────────────
const PatientSummaryCard: React.FC = () => (
  <article
    className="bg-white rounded-2xl card-shadow overflow-hidden"
    aria-label="Patient summary card"
  >
    {/* Header strip */}
    <div className="bg-gradient-to-r from-sage-900 to-sage-700 px-5 py-4 flex items-center gap-4">
      {/* Avatar */}
      <div
        className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center flex-shrink-0 text-white font-bold text-lg select-none"
        aria-label="Patient avatar: JD"
      >
        JD
      </div>
      <div className="flex-1 min-w-0">
        <h2 className="text-white font-bold text-base leading-tight truncate">
          {PATIENT.name}
        </h2>
        <p className="text-sage-200 text-xs font-medium mt-0.5">
          {PATIENT.age} yrs · {PATIENT.gender} · {PATIENT.bloodGroup}
        </p>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-amber-300">
            <StarIcon />
          </span>
          <span className="text-white text-xs font-semibold">{PATIENT.rating}</span>
          <span className="text-sage-300 text-xs ml-1">Verified Patient</span>
        </div>
      </div>
      <div className="flex-shrink-0">
        <span className="bg-white/20 text-white text-xs font-semibold rounded-full px-2.5 py-1">
          Active
        </span>
      </div>
    </div>

    {/* Body */}
    <div className="p-5">
      {/* Constitutional remedy highlight */}
      <div className="flex items-center gap-3 bg-sage-50 rounded-xl px-4 py-3 mb-4 border border-sage-100">
        <span className="text-2xl" role="img" aria-label="Leaf">🌿</span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-stone-500 mb-0.5">
            Constitutional Remedy
          </p>
          <p className="text-sage-900 font-bold text-base">
            {PATIENT.remedy}{" "}
            <span className="text-sage-600 font-semibold text-sm">{PATIENT.potency}</span>
          </p>
          <p className="text-stone-500 text-xs mt-0.5">{PATIENT.constitution}</p>
        </div>
      </div>

      {/* Metric row */}
      <div className="flex gap-2 mb-4">
        <Metric label="Last Visit" value={PATIENT.lastVisit} />
        <Metric label="Next Appt." value={PATIENT.nextAppointment} accent />
      </div>

      {/* Quick info */}
      <div className="flex items-center gap-2 text-stone-500 text-xs">
        <UserIcon />
        <span>
          Patient ID: <span className="font-semibold text-stone-700">#AYU-2026-0381</span>
        </span>
      </div>
    </div>
  </article>
);

export default PatientSummaryCard;
