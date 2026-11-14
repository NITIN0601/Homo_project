import React from "react";
import type { HospitalFeatures } from "../../types/tenant";
import {
  DOCTOR_PORTAL_FEATURES,
  PATIENT_PORTAL_FEATURES,
  type FeatureDefinition,
} from "../../config/tenants/constants";

export interface FeatureToggleGroupProps {
  features: HospitalFeatures;
  onChange: (key: keyof HospitalFeatures, value: boolean) => void;
  category?: "all" | "doctor" | "patient";
  className?: string;
  readOnly?: boolean;
}

export const FeatureToggleGroup: React.FC<FeatureToggleGroupProps> = ({
  features,
  onChange,
  category = "all",
  className = "",
  readOnly = false,
}) => {
  const renderFeatureItem = (feat: FeatureDefinition, accentColor: "indigo" | "emerald") => {
    const isChecked = features[feat.key] !== false;
    const checkboxClass =
      accentColor === "indigo" ? "accent-indigo-600 text-indigo-600" : "accent-emerald-600 text-emerald-600";
    const activeBorderClass =
      accentColor === "indigo"
        ? "border-indigo-200 bg-white shadow-xs"
        : "border-emerald-200 bg-white shadow-xs";

    return (
      <label
        key={feat.key}
        className={`flex items-start gap-3 p-3 rounded-xl border transition-all select-none ${
          readOnly ? "cursor-default opacity-85" : "cursor-pointer hover:border-stone-300"
        } ${isChecked ? activeBorderClass : "border-stone-200/80 bg-stone-50/50 opacity-75"}`}
      >
        <input
          type="checkbox"
          checked={isChecked}
          disabled={readOnly}
          onChange={(e) => onChange(feat.key, e.target.checked)}
          className={`w-4 h-4 rounded mt-0.5 shrink-0 ${checkboxClass}`}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 font-bold text-xs text-stone-900 leading-snug">
            <span aria-hidden="true">{feat.icon}</span>
            <span>{feat.label}</span>
          </div>
          <p className="text-[11px] text-stone-500 leading-normal mt-0.5">{feat.description}</p>
        </div>
      </label>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {(category === "all" || category === "doctor") && (
        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">🩺</span>
              <h4 className="font-black text-xs text-indigo-950 uppercase tracking-wider">
                Doctor Portal Capabilities (What Doctor Can View &amp; Use)
              </h4>
            </div>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
              Clinical Workspace
            </span>
          </div>
          <div className="space-y-2">
            {DOCTOR_PORTAL_FEATURES.map((feat) => renderFeatureItem(feat, "indigo"))}
          </div>
        </div>
      )}

      {(category === "all" || category === "patient") && (
        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">🌿</span>
              <h4 className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                Patient Portal Capabilities (What Patient Can View &amp; Access)
              </h4>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Patient Workspace
            </span>
          </div>
          <div className="space-y-2">
            {PATIENT_PORTAL_FEATURES.map((feat) => renderFeatureItem(feat, "emerald"))}
          </div>
        </div>
      )}
    </div>
  );
};

