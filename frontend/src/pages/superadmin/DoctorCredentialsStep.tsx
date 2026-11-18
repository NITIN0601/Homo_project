import React from "react";
import type { StepProps } from "./onboardTypes";

interface DoctorCredentialsStepProps extends StepProps {
  activeTimezoneDetails: { timeZone: string; label: string; offset: string };
  detectedCurrency: { code: string; symbol: string; name: string };
}

export const DoctorCredentialsStep: React.FC<DoctorCredentialsStepProps> = ({
  form,
  updateField,
  activeTimezoneDetails,
  detectedCurrency,
}) => {
  return (
    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
          <span>🩺</span> 3. Lead Consulting Doctor (Google Login &amp; Credentials)
        </p>
        <span className="text-[10px] bg-indigo-200 text-indigo-900 font-bold px-2 py-0.5 rounded-full">
          Operates in {activeTimezoneDetails.label}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Doctor Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Dr. Rajesh Sharma"
            value={form.doctorName}
            onChange={(e) => updateField("doctorName", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">
            Doctor Login Email * (For Google Sign-In)
          </label>
          <input
            type="email"
            required
            placeholder="e.g. doctor.sharma@hospital.org"
            value={form.doctorEmail}
            onChange={(e) => updateField("doctorEmail", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none font-medium text-indigo-900"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Medical Registration No *</label>
          <input
            type="text"
            required
            placeholder="e.g. MCI-2015-9921"
            value={form.doctorRegNo}
            onChange={(e) => updateField("doctorRegNo", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none font-mono"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Qualifications</label>
          <input
            type="text"
            placeholder="MD, MBBS, Fellowship in Telemedicine"
            value={form.doctorQual}
            onChange={(e) => updateField("doctorQual", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Experience (Years)</label>
          <input
            type="number"
            min={0}
            value={form.doctorExp}
            onChange={(e) => updateField("doctorExp", Number(e.target.value) || 0)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">Clinical Specialties</label>
          <input
            type="text"
            placeholder="General Medicine, Telehealth, Chronic Care"
            value={form.doctorSpecialties}
            onChange={(e) => updateField("doctorSpecialties", e.target.value)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-stone-600 uppercase">
            Consultation Fee ({detectedCurrency.code} {detectedCurrency.symbol})
          </label>
          <input
            type="number"
            min={0}
            step={50}
            value={form.doctorFee}
            onChange={(e) => updateField("doctorFee", Number(e.target.value) || 0)}
            className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white outline-none font-bold text-indigo-900"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-stone-600 uppercase">Doctor Biography &amp; Practice Focus</label>
        <textarea
          rows={2}
          placeholder="Clinical background, special focus, and patient healing approach..."
          value={form.doctorBio}
          onChange={(e) => updateField("doctorBio", e.target.value)}
          className="w-full mt-1 border border-stone-200 rounded-xl px-3 py-1.5 text-xs bg-white outline-none"
        />
      </div>
    </div>
  );
};
