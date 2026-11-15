import React from "react";
import { THEME_GRADIENTS } from "../../config";
import type { HospitalTenantConfig, HospitalDoctor } from "../../types/tenant";
import type { DoctorSummary } from "../../types";

interface AttendingDoctorCardProps {
  tenant: HospitalTenantConfig;
  activeDoctor: HospitalDoctor;
  selectedDoctor: DoctorSummary | null;
  onSelectDoctor: (doctor: DoctorSummary) => void;
}

export const AttendingDoctorCard: React.FC<AttendingDoctorCardProps> = ({
  tenant,
  activeDoctor,
  selectedDoctor,
  onSelectDoctor,
}) => {
  return (
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
              {activeDoctor.regNo && (
                <span>
                  Reg: <strong className="text-stone-600 font-semibold">{activeDoctor.regNo}</strong>
                </span>
              )}
              {activeDoctor.experienceYears && (
                <span>
                  · Experience:{" "}
                  <strong className="text-stone-600 font-semibold">{activeDoctor.experienceYears}+ Years</strong>
                </span>
              )}
              <span>
                · Fee:{" "}
                <strong className="text-emerald-700 font-bold">
                  {tenant.currencySymbol || "₹"}
                  {activeDoctor.consultationFee || activeDoctor.availability?.consultationFee || 750}
                </strong>
              </span>
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
                      onSelectDoctor({
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
  );
};
