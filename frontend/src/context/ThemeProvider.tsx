import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { HospitalTenantConfig, HospitalFeatures, HospitalBranding } from "../types/tenant";
import { DEFAULT_HOSPITAL_TENANT, getHospitalTenantById } from "../config/tenants";
import { resolveActiveHospitalTenant } from "../services/tenantResolver";

const STORAGE_CUSTOM_PREFIX = "hospital_tenant_custom_v1_";

export interface TenantContextValue {
  tenant: HospitalTenantConfig;
  setTenantId: (tenantId: string) => void;
  updateTenant: (updates: Partial<HospitalTenantConfig>) => void;
  updateTenantFeatures: (features: Partial<HospitalFeatures>) => void;
  updateTenantBranding: (branding: Partial<HospitalBranding>) => void;
  resetTenantToDefaults: () => void;
  isFeatureEnabled: (featureKey: keyof HospitalFeatures) => boolean;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

function getSavedTenantOverride(base: HospitalTenantConfig): HospitalTenantConfig {
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(`${STORAGE_CUSTOM_PREFIX}${base.id}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...base,
        ...parsed,
        doctor: { ...base.doctor, ...(parsed.doctor || {}) },
        contact: {
          ...base.contact,
          ...(parsed.contact || {}),
          address: { ...base.contact.address, ...(parsed.contact?.address || {}) },
        },
        branding: { ...base.branding, ...(parsed.branding || {}) },
        features: {
          displayDoctorDetails: true,
          enablePatientMedicalRecords: true,
          enableBillingHistory: true,
          enableFollowupFeedback: true,
          enableAgastyaBot: true,
          enablePatientProfileEdit: true,
          ...base.features,
          ...(parsed.features || {}),
        },
      };
    }
  } catch {
    // fallback to base
  }
  return base;
}

export const ThemeProvider: React.FC<{
  initialTenantId?: string;
  children: React.ReactNode;
}> = ({ initialTenantId, children }) => {
  const [tenant, setTenant] = useState<HospitalTenantConfig>(() => {
    const base = initialTenantId ? getHospitalTenantById(initialTenantId) : resolveActiveHospitalTenant();
    return getSavedTenantOverride(base);
  });

  const setTenantId = (id: string) => {
    const nextBase = getHospitalTenantById(id);
    setTenant(getSavedTenantOverride(nextBase));
  };

  const updateTenant = useCallback((updates: Partial<HospitalTenantConfig>) => {
    setTenant((prev) => {
      const merged: HospitalTenantConfig = {
        ...prev,
        ...updates,
        doctor: updates.doctor ? { ...prev.doctor, ...updates.doctor } : prev.doctor,
        contact: updates.contact
          ? {
              ...prev.contact,
              ...updates.contact,
              address: { ...prev.contact.address, ...(updates.contact.address || {}) },
            }
          : prev.contact,
        branding: updates.branding ? { ...prev.branding, ...updates.branding } : prev.branding,
        features: updates.features ? { ...prev.features, ...updates.features } : prev.features,
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`${STORAGE_CUSTOM_PREFIX}${merged.id}`, JSON.stringify(merged));
        } catch {}
      }
      return merged;
    });
  }, []);

  const updateTenantFeatures = useCallback((features: Partial<HospitalFeatures>) => {
    updateTenant({ features: { ...tenant.features, ...features } });
  }, [tenant.features, updateTenant]);

  const updateTenantBranding = useCallback((branding: Partial<HospitalBranding>) => {
    updateTenant({ branding: { ...tenant.branding, ...branding } });
  }, [tenant.branding, updateTenant]);

  const resetTenantToDefaults = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`${STORAGE_CUSTOM_PREFIX}${tenant.id}`);
      } catch {}
    }
    const cleanBase = getHospitalTenantById(tenant.id);
    setTenant(cleanBase);
  }, [tenant.id]);

  const isFeatureEnabled = useCallback((featureKey: keyof HospitalFeatures): boolean => {
    return Boolean(tenant.features[featureKey]);
  }, [tenant.features]);

  // Inject CSS custom properties and document title whenever tenant changes
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    root.style.setProperty("--brand-primary", tenant.branding.primaryColor);
    root.style.setProperty("--brand-primary-dark", tenant.branding.primaryDarkColor);
    root.style.setProperty("--brand-accent", tenant.branding.accentColor);
    root.style.setProperty("--radius-card", tenant.branding.cardRadius);
    root.style.setProperty("--radius-button", tenant.branding.buttonRadius);
    root.style.setProperty("--font-sans", tenant.branding.fontSans);

    // Dynamic brand document title
    document.title = `${tenant.name} — ${tenant.tagline}`;
  }, [tenant]);

  const value = useMemo(
    () => ({
      tenant,
      setTenantId,
      updateTenant,
      updateTenantFeatures,
      updateTenantBranding,
      resetTenantToDefaults,
      isFeatureEnabled,
    }),
    [tenant, isFeatureEnabled, updateTenant, updateTenantFeatures, updateTenantBranding, resetTenantToDefaults]
  );

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    return {
      tenant: DEFAULT_HOSPITAL_TENANT,
      setTenantId: () => {},
      updateTenant: () => {},
      updateTenantFeatures: () => {},
      updateTenantBranding: () => {},
      resetTenantToDefaults: () => {},
      isFeatureEnabled: () => true,
    };
  }
  return ctx;
}

export default ThemeProvider;
