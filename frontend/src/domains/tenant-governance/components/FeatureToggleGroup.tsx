import React from "react";
import type { HospitalFeatures } from "@core/types/tenant";
import {
  HOSPITAL_FEATURES,
  DOCTOR_PORTAL_FEATURES,
  PATIENT_PORTAL_FEATURES,
  type FeatureDefinition,
} from "../../../core/config/tenants/constants";

export interface FeatureToggleGroupProps {
  features: HospitalFeatures;
  onChange: (key: keyof HospitalFeatures, value: boolean) => void;
  category?: "all" | "hospital" | "doctor" | "patient";
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
  const handleFeatureChange = (key: keyof HospitalFeatures, val: boolean) => {
    onChange(key, val);
    // Eliminate duplicate/desync between enableOnlinePayments and enableCustomerPayments
    if (key === "enableOnlinePayments") {
      onChange("enableCustomerPayments", val);
    } else if (key === "enableCustomerPayments") {
      onChange("enableOnlinePayments", val);
    }
  };

  const renderFeatureItem = (feat: FeatureDefinition, accentColor: "sky" | "indigo" | "emerald") => {
    const isChecked = (features as unknown as Record<string, boolean | undefined>)[feat.key as string] !== false;
    const checkboxClass =
      accentColor === "sky"
        ? "accent-sky-600 text-sky-600"
        : accentColor === "indigo"
        ? "accent-indigo-600 text-indigo-600"
        : "accent-emerald-600 text-emerald-600";
    const activeBorderClass =
      accentColor === "sky"
        ? "border-sky-200 bg-white shadow-xs"
        : accentColor === "indigo"
        ? "border-indigo-200 bg-white shadow-xs"
        : "border-emerald-200 bg-white shadow-xs";

    return (
      <label
        key={String(feat.key)}
        className={`flex items-start gap-3 p-3 rounded-xl border transition-all select-none ${
          readOnly ? "cursor-default opacity-85" : "cursor-pointer hover:border-stone-300"
        } ${isChecked ? activeBorderClass : "border-stone-200/80 bg-stone-50/50 opacity-75"}`}
      >
        <input
          type="checkbox"
          checked={isChecked}
          disabled={readOnly}
          onChange={(e) => handleFeatureChange(feat.key as keyof HospitalFeatures, e.target.checked)}
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
      {/* ── 1. HOSPITAL CORE FEATURES & PLATFORM SERVICES ── */}
      {(category === "all" || category === "hospital") && (
        <div className="p-4 bg-sky-50/50 rounded-2xl border border-sky-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">🏥</span>
              <h4 className="font-black text-xs text-sky-950 uppercase tracking-wider">
                Hospital Features (Central Platform Services &amp; Logistics)
              </h4>
            </div>
            <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">
              Hospital Level
            </span>
          </div>
          <div className="space-y-2">
            {HOSPITAL_FEATURES.map((feat) => renderFeatureItem(feat, "sky"))}
          </div>
        </div>
      )}

      {/* ── 2. DOCTOR PORTAL CAPABILITIES & CLINICAL WORKSPACE ── */}
      {(category === "all" || category === "doctor") && (
        <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">🩺</span>
              <h4 className="font-black text-xs text-indigo-950 uppercase tracking-wider">
                Doctor Features (Clinical Workspace Capabilities &amp; Policies)
              </h4>
            </div>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
              Doctor Level
            </span>
          </div>
          <div className="space-y-2">
            {DOCTOR_PORTAL_FEATURES.map((feat) => renderFeatureItem(feat, "indigo"))}
          </div>
        </div>
      )}

      {/* ── 3. PATIENT PORTAL CAPABILITIES & VISIBILITY ── */}
      {(category === "all" || category === "patient") && (
        <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">🌿</span>
              <h4 className="font-black text-xs text-emerald-950 uppercase tracking-wider">
                Patient Features (Patient Portal Access &amp; Visibility)
              </h4>
            </div>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Patient Level
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

export default FeatureToggleGroup;
