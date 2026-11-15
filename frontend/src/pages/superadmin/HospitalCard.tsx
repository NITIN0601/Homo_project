import React from "react";
import type { HospitalTenantConfig } from "../../types/tenant";

export interface HospitalCardProps {
  hospital: HospitalTenantConfig;
  isActive: boolean;
  onSwitch: (hospital: HospitalTenantConfig) => void;
  onOpenFeatures: (hospital: HospitalTenantConfig) => void;
  onPreviewPatient: (hospital: HospitalTenantConfig) => void;
  onPreviewDoctor: (hospital: HospitalTenantConfig) => void;
}

export const HospitalCard: React.FC<HospitalCardProps> = ({
  hospital,
  isActive,
  onSwitch,
  onOpenFeatures,
  onPreviewPatient,
  onPreviewDoctor,
}) => {
  return (
    <div
      className={`bg-white rounded-3xl p-6 border transition-all duration-200 flex flex-col justify-between gap-5 relative overflow-hidden ${
        isActive
          ? "border-indigo-600 ring-2 ring-indigo-500/20 shadow-xl"
          : "border-stone-200 shadow-xs hover:border-stone-300 hover:shadow-md"
      }`}
    >
      {isActive && (
        <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase px-3 py-1 rounded-bl-xl tracking-wider">
          Active Preview
        </div>
      )}

      <div className="space-y-3">
        {/* Color Swatch & Title */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0"
            style={{ background: hospital.branding.primaryColor }}
            aria-hidden="true"
          >
            🏥
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-stone-900 text-base leading-snug truncate">{hospital.name}</h3>
            <p className="text-xs font-mono text-stone-400">id: {hospital.id}</p>
          </div>
        </div>

        {/* Brand Swatches Bar */}
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-stone-50 border border-stone-200/80">
          <span className="text-[10px] font-bold text-stone-500">Branding:</span>
          <div className="flex items-center gap-1.5 flex-1">
            <div
              className="w-5 h-5 rounded-md border border-black/10 shadow-inner"
              style={{ background: hospital.branding.primaryColor }}
              title={`Primary: ${hospital.branding.primaryColor}`}
            />
            <div
              className="w-5 h-5 rounded-md border border-black/10 shadow-inner"
              style={{ background: hospital.branding.primaryDarkColor }}
              title={`Dark: ${hospital.branding.primaryDarkColor}`}
            />
            <div
              className="w-5 h-5 rounded-md border border-black/10 shadow-inner"
              style={{ background: hospital.branding.accentColor }}
              title={`Accent: ${hospital.branding.accentColor}`}
            />
            <span className="text-[10px] font-mono text-stone-400 ml-1">
              {hospital.branding.primaryColor}
            </span>
          </div>
        </div>

        {/* Lead Doctor Info */}
        <div className="text-xs space-y-1 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 text-indigo-950">
          <div className="flex items-center justify-between">
            <p className="font-bold flex items-center gap-1">
              <span aria-hidden="true">🩺</span> Lead Physician: <strong>{hospital.doctor.name}</strong>
            </p>
            {hospital.doctors && hospital.doctors.length > 1 && (
              <span className="text-[10px] font-extrabold bg-indigo-200 text-indigo-900 px-2 py-0.5 rounded-full">
                {hospital.doctors.length} Doctors
              </span>
            )}
          </div>
          <p className="text-[11px] text-stone-500 pl-4">{hospital.doctor.title}</p>
          <p className="text-[10px] text-stone-400 pl-4">
            {hospital.doctor.qualifications} • {hospital.doctor.experienceYears} yrs exp
          </p>
          {hospital.doctor.regNo && (
            <p className="text-[10px] text-indigo-700 font-mono font-bold pl-4">Reg: {hospital.doctor.regNo}</p>
          )}
        </div>

        {/* Feature Badges */}
        <div className="space-y-1">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">Enabled Modules:</p>
          <div className="flex flex-wrap gap-1 text-[10px] font-bold">
            {hospital.features.enableVoiceStudio && (
              <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">🎙️ AI Voice</span>
            )}
            {hospital.features.enablePrescriptionScan && (
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">📄 OCR Scan</span>
            )}
            {hospital.features.enableTelemedicine && (
              <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">📹 Telehealth</span>
            )}
            {hospital.features.enableECommerce && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">💊 Pharmacy</span>
            )}
            {hospital.features.enablePatientMedicalRecords && (
              <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800">📋 Medical Records</span>
            )}
            {hospital.features.enableBillingHistory && (
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-800">💳 Billing</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-3 border-t border-stone-100 flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onSwitch(hospital)}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              isActive
                ? "bg-indigo-100 text-indigo-950 font-black cursor-default"
                : "bg-stone-100 hover:bg-stone-200 text-stone-800"
            }`}
          >
            <span>{isActive ? "✓ Active" : "🎯 Switch"}</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenFeatures(hospital)}
            className="py-2 px-3 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 transition-all flex items-center justify-center gap-1 cursor-pointer"
            title="Manage what Doctor and Patient can view/do"
          >
            <span>⚙️ Layout &amp; Access</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onPreviewPatient(hospital)}
            className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer text-center"
          >
            👁️ Patient View
          </button>
          <button
            type="button"
            onClick={() => onPreviewDoctor(hospital)}
            className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-[11px] font-bold transition-colors cursor-pointer text-center"
          >
            🩺 Doctor View
          </button>
        </div>
      </div>
    </div>
  );
};

