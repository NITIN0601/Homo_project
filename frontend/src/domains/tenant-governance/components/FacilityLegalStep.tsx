import React from "react";
import type { StepProps } from "../model/onboardTypes";
import { generateDefaultLegalTemplates } from "../../../core/config/tenants/constants";

export const FacilityLegalStep: React.FC<StepProps> = ({ form, updateField }) => {
  const facilityLabel = form.facilityType === "clinic" ? "Clinic" : "Hospital";

  const handleGenerateTemplates = () => {
    const templates = generateDefaultLegalTemplates(
      form.hospitalName || (form.facilityType === "clinic" ? "Care Clinic" : "Care Hospital"),
      form.facilityType,
      form.city || "our medical center",
      form.phone || "+91 98450 12345",
      form.email || "admin@hospital.org"
    );

    updateField("aboutHospitalText", templates.aboutHospitalText);
    updateField("termsConditionsText", templates.termsConditionsText);
    updateField("privacyPolicyText", templates.privacyPolicyText);
    updateField("emergencyNotice", templates.emergencyNotice);
  };

  return (
    <div className="p-4 bg-stone-50/70 rounded-2xl border border-stone-200/80 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/60 pb-2">
        <p className="text-[11px] font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>⚖️</span> 6. Legal Policies, Privacy &amp; Patient Consent
        </p>
        <button
          type="button"
          onClick={handleGenerateTemplates}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
          title="Auto-fill compliant legal policies tailored to this facility"
        >
          <span>✨</span> Auto-Generate Compliant Templates
        </button>
      </div>

      <p className="text-xs text-stone-600 leading-relaxed">
        Policies are 100% facility-specific and dynamically displayed on the patient portal, booking agreements, and footer links. Zero hardcoded text.
      </p>

      {/* Emergency Notice */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-amber-900 uppercase flex items-center gap-1">
            <span>⚠️</span> Medical Emergency Disclaimer *
          </label>
          <span className="text-[10px] text-stone-400 font-mono">
            {form.emergencyNotice.length} chars
          </span>
        </div>
        <textarea
          rows={2}
          required
          placeholder="Emergency services notice shown at the top of Terms and booking confirmation..."
          value={form.emergencyNotice}
          onChange={(e) => updateField("emergencyNotice", e.target.value)}
          className="w-full border border-amber-200 rounded-xl px-3 py-2 text-xs bg-amber-50/40 text-stone-800 outline-none focus:ring-2 focus:ring-amber-500/30"
        />
      </div>

      {/* Terms & Conditions */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-stone-700 uppercase flex items-center gap-1">
            <span>📜</span> Terms &amp; Conditions Agreement (Public &amp; Booking) *
          </label>
          <span className="text-[10px] text-stone-400 font-mono">
            {form.termsConditionsText.length} chars
          </span>
        </div>
        <textarea
          rows={5}
          required
          placeholder={`Enter official terms & conditions for this ${facilityLabel.toLowerCase()}...`}
          value={form.termsConditionsText}
          onChange={(e) => updateField("termsConditionsText", e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white text-stone-800 font-sans outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      {/* Privacy Policy */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-stone-700 uppercase flex items-center gap-1">
            <span>🛡️</span> Patient Privacy &amp; Data Protection Policy (DPDP / HIPAA) *
          </label>
          <span className="text-[10px] text-stone-400 font-mono">
            {form.privacyPolicyText.length} chars
          </span>
        </div>
        <textarea
          rows={5}
          required
          placeholder={`Enter data privacy and health records protection policy for this ${facilityLabel.toLowerCase()}...`}
          value={form.privacyPolicyText}
          onChange={(e) => updateField("privacyPolicyText", e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white text-stone-800 font-sans outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>

      {/* Public About Narrative */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-bold text-stone-700 uppercase flex items-center gap-1">
            <span>🏥</span> About {facilityLabel} Public Overview (Patient Hero &amp; Bio) *
          </label>
          <span className="text-[10px] text-stone-400 font-mono">
            {form.aboutHospitalText.length} chars
          </span>
        </div>
        <textarea
          rows={3}
          required
          placeholder={`Enter the about narrative and mission statement for this ${facilityLabel.toLowerCase()}...`}
          value={form.aboutHospitalText}
          onChange={(e) => updateField("aboutHospitalText", e.target.value)}
          className="w-full border border-stone-200 rounded-xl px-3 py-2 text-xs bg-white text-stone-800 font-sans outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
      </div>
    </div>
  );
};
