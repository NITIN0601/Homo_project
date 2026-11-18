import React from "react";
import type { OnboardFormState } from "./onboardTypes";
import type { HospitalFeatures } from "../../types/tenant";
import { FeatureToggleGroup } from "../../components/common/FeatureToggleGroup";

interface FacilityGovernanceStepProps {
  form: OnboardFormState;
  handleFeatureToggle: (key: keyof HospitalFeatures, value: boolean) => void;
}

export const FacilityGovernanceStep: React.FC<FacilityGovernanceStepProps> = ({
  form,
  handleFeatureToggle,
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-black text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
          <span>🎛️</span> 4. Layout &amp; Functionality Governance (Super Admin Control)
        </p>
        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
          3-Tier Governance
        </span>
      </div>
      <FeatureToggleGroup features={form.features} onChange={handleFeatureToggle} category="all" />
    </div>
  );
};
