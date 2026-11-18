import React from "react";
import type { ContinuityPreferenceResponse, DoctorSummary } from "../../types";
import { Badge, Button } from "../../components/ui";

interface PatientDoctorContinuityBannerProps {
  continuity: ContinuityPreferenceResponse | null;
  loading: boolean;
  selectedDoctor: DoctorSummary | null;
  onSelectDoctor: (doctor: DoctorSummary) => void;
  onSelectDate?: (date: string) => void;
}

export const PatientDoctorContinuityBanner: React.FC<PatientDoctorContinuityBannerProps> = ({
  continuity,
  loading,
  selectedDoctor,
  onSelectDoctor,
  onSelectDate,
}) => {
  if (loading) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
        <span className="text-xl">🩺</span>
        <div className="space-y-1">
          <div className="h-3.5 w-48 bg-stone-200 rounded"></div>
          <div className="h-2.5 w-64 bg-stone-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!continuity) return null;

  // ── 1. Doctor Inactive / Left Clinic Fallback ────────────────────────────────
  if (continuity.status === "doctor_inactive" && continuity.recommended_alternate) {
    const alt = continuity.recommended_alternate;
    return (
      <div
        className="bg-indigo-50/90 border border-indigo-200 rounded-2xl p-4 space-y-3"
        role="region"
        aria-label="Doctor Transition Notice"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-950 font-bold text-xs">
            <span className="text-base">📋</span>
            <span>Clinical Handoff &amp; Continuity Transfer</span>
          </div>
          <Badge variant="info" size="sm">
            Case File Reassigned
          </Badge>
        </div>
        <p className="text-indigo-900 text-xs leading-relaxed">
          <strong>{continuity.previous_doctor_name || "Your previous physician"}</strong> is no longer practicing at this hospital.
          Your constitutional repertory and medical history have been assigned to <strong>{alt.name}</strong> ({alt.qualifications}).
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-indigo-700 font-medium">
            Assigned Doctor: <strong>{alt.name}</strong>
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSelectDoctor(alt)}
            className="text-xs border-indigo-300 text-indigo-900 hover:bg-indigo-100"
          >
            Confirm Consultation with {alt.short_name || alt.name}
          </Button>
        </div>
      </div>
    );
  }

  // ── 2. Preferred Doctor Unavailable on Chosen Date / Slot ───────────────────
  if (continuity.status === "doctor_unavailable_on_date" && continuity.preferred_doctor) {
    const pref = continuity.preferred_doctor;
    const alt = continuity.recommended_alternate;
    const isAltSelected = selectedDoctor?.id === alt?.id;

    return (
      <div
        className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 space-y-3"
        role="region"
        aria-label="Doctor Availability Alert"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-950 font-bold text-xs">
            <span className="text-base">⚠️</span>
            <span>Treating Physician Unavailable on Selected Slot</span>
          </div>
          <Badge variant="warning" size="sm">
            Slot Collision / Leave
          </Badge>
        </div>
        <p className="text-amber-900 text-xs leading-relaxed">
          Your primary doctor, <strong>{pref.name}</strong>, is unavailable or booked for this time slot.
          Choose how you would like to proceed:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {alt && (
            <button
              type="button"
              onClick={() => onSelectDoctor(alt)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isAltSelected
                  ? "bg-white border-amber-500 shadow-sm ring-2 ring-amber-400/30"
                  : "bg-white/80 border-amber-200 hover:bg-white text-stone-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-900">Consult Colleague</span>
                {isAltSelected && <span className="text-xs text-emerald-600 font-bold">✓ Selected</span>}
              </div>
              <p className="text-[11px] text-stone-600 mt-1">
                <strong>{alt.name}</strong> on this date.
              </p>
              <span className="text-[10px] text-amber-800 font-medium block mt-1">
                ✓ Full access to past remedies &amp; notes
              </span>
            </button>
          )}

          {continuity.next_available_date && onSelectDate && (
            <button
              type="button"
              onClick={() => {
                onSelectDoctor(pref);
                onSelectDate(continuity.next_available_date!);
              }}
              className="p-3 rounded-xl border bg-white/80 border-amber-200 hover:bg-white text-left transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-stone-900">Wait for {pref.short_name || pref.name}</span>
                <span className="text-[10px] text-amber-700 font-bold">Recommended</span>
              </div>
              <p className="text-[11px] text-stone-600 mt-1">
                Next available: <strong>{continuity.next_available_date}</strong>
              </p>
              <span className="text-[10px] text-emerald-700 font-medium block mt-1">
                ✓ Complete constitutional continuity
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── 3. Preferred Doctor Available (Continuing Care) ──────────────────────────
  if (continuity.status === "preferred_doctor_available" && continuity.preferred_doctor) {
    const doc = continuity.preferred_doctor;
    return (
      <div
        className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 space-y-2"
        role="region"
        aria-label="Doctor Continuity Badge"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs">
            <span className="text-base">🩺</span>
            <span>Continuing Care — Primary Physician Assigned</span>
          </div>
          <Badge variant="success" size="sm">
            Previous Doctor Preferred
          </Badge>
        </div>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-emerald-900 text-xs">
            Welcome back! You are continuing care with <strong>{doc.name}</strong> ({doc.qualifications}).
            {continuity.last_visit_date && (
              <span className="text-emerald-700 text-[11px] block mt-0.5">
                Last consultation: {continuity.last_visit_date} · Case history automatically linked.
              </span>
            )}
          </p>
          {continuity.hospital_doctors.length > 1 && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-emerald-800 font-medium">Or switch doctor:</span>
              <select
                aria-label="Choose alternate doctor"
                value={selectedDoctor?.id || doc.id}
                onChange={(e) => {
                  const target = continuity.hospital_doctors.find((d) => d.id === e.target.value);
                  if (target) onSelectDoctor(target);
                }}
                className="text-xs bg-white border border-emerald-300 rounded-lg px-2 py-1 text-emerald-950 font-medium focus:ring-1 focus:ring-emerald-500"
              >
                {continuity.hospital_doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.id === doc.id ? "(Preferred)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── 4. New Patient / General Roster Discovery ────────────────────────────────
  if (continuity.hospital_doctors && continuity.hospital_doctors.length > 1) {
    return (
      <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-stone-800 font-bold text-xs">
            <span className="text-base">👨‍⚕️</span>
            <span>Select Consulting Physician</span>
          </div>
          <span className="text-[10px] text-stone-500 font-medium">
            {continuity.hospital_doctors.length} Doctors on Roster
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {continuity.hospital_doctors.map((d) => {
            const isSelected = selectedDoctor?.id === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelectDoctor(d)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "bg-white border-emerald-600 shadow-sm ring-2 ring-emerald-500/20"
                    : "bg-white/80 border-stone-200 hover:border-emerald-300 hover:bg-white text-stone-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-stone-900">{d.name}</span>
                  {isSelected && <span className="text-xs text-emerald-600 font-bold">✓ Selected</span>}
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">{d.qualifications}</p>
                {d.specialties && d.specialties.length > 0 && (
                  <span className="text-[10px] text-emerald-800 font-medium block mt-1 truncate">
                    {d.specialties.join(", ")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

