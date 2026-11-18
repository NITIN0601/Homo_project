/**
 * useFeatureGate — reactive feature flag hook
 * Returns true if the feature is enabled in the active tenant config.
 * Re-renders automatically when admin saves changes.
 */
import { useTenant } from "../branding/ThemeProvider";
import type { HospitalFeatures } from "@core/types/tenant";

export function useFeatureGate(key: keyof HospitalFeatures): boolean {
  const { isFeatureEnabled } = useTenant();
  return isFeatureEnabled(key);
}

