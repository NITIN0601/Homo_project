import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import type { HospitalTenantConfig, HospitalDoctor, HospitalFeatures, HospitalBranding, HospitalLegal } from "@core/types/tenant";
import { DEFAULT_HOSPITAL_TENANT, getHospitalTenantById } from "../../config/tenants";
import { resolveActiveHospitalTenant } from "../identity/tenantResolver";
import { broadcastSessionEvent } from "../../security/sessionSync";
import { updateRemoteTenantCustomization } from "../configuration/tenantConfigService";

const STORAGE_CUSTOM_PREFIX = "hospital_tenant_custom_v1_";

const FALLBACK_DOCTOR: HospitalDoctor = {
  id: "doc-001",
  name: "Dr. Bramarambha K",
  title: "Dr. Bramarambha K, MD (Homeopathic Materia Medica), SCPH",
  regNo: "KAR-HOM-2018-0492",
  experienceYears: 6,
  qualifications: "Homoeopathic Physician | MD in Materia Medica | SCPH-Certified",
  aboutText: "Homoeopathic Physician with postgraduate specialisation in Homeopathic Materia Medica.",
  specialties: ["Classical Homeopathy", "Chronic Pathology", "Paediatric Immunity"],
  consultationFee: 750,
};

export interface TenantContextValue {
  tenant: HospitalTenantConfig;
  setTenantId: (tenantId: string) => void;
  updateTenant: (updates: Partial<HospitalTenantConfig>) => void;
  updateTenantFeatures: (features: Partial<HospitalFeatures>) => void;
  updateTenantBranding: (branding: Partial<HospitalBranding>) => void;
  updateTenantLegal: (legal: Partial<HospitalLegal>) => void;
  resetTenantToDefaults: () => void;
  isFeatureEnabled: (featureKey: keyof HospitalFeatures) => boolean;
}

const TenantContext = createContext<TenantContextValue | undefined>(undefined);

function getSavedTenantOverride(base: HospitalTenantConfig): HospitalTenantConfig {
  if (typeof window === "undefined") return base;
  const baseDoctor = base.doctor || base.doctors?.[0] || FALLBACK_DOCTOR;
  try {
    const raw = localStorage.getItem(`${STORAGE_CUSTOM_PREFIX}${base.id}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const activeDoctor = { ...FALLBACK_DOCTOR, ...baseDoctor, ...(parsed.doctor || (parsed.doctors?.[0] || {})) };
      const activeDoctors = parsed.doctors && parsed.doctors.length > 0
        ? parsed.doctors
        : (base.doctors && base.doctors.length > 0 ? [{ ...base.doctors[0], ...activeDoctor }, ...base.doctors.slice(1)] : [activeDoctor]);

      return {
        ...base,
        ...parsed,
        doctor: activeDoctor,
        doctors: activeDoctors,
        specialties: parsed.specialties || base.specialties || Array.from(new Set(activeDoctors.flatMap((d: any) => d.specialties || []))),
        contact: {
          ...base.contact,
          ...(parsed.contact || {}),
          address: { ...base.contact?.address, ...(parsed.contact?.address || {}) },
        },
        branding: {
          ...base.branding,
          ...(parsed.branding || {}),
          aboutDocText: activeDoctor.aboutText || parsed.branding?.aboutDocText || base.branding?.aboutDocText,
        },
        features: {
          ...base.features,
          ...(parsed.features ?? {}),
        },
        facilityType: parsed.facilityType || base.facilityType || "hospital",
        legal: {
          ...base.legal,
          ...(parsed.legal || {}),
        },
      };
    }
  } catch {
    // fallback to base
  }
  return {
    ...base,
    doctor: baseDoctor,
  };
}

export const ThemeProvider: React.FC<{
  initialTenantId?: string;
  children: React.ReactNode;
}> = ({ initialTenantId, children }) => {
  const [tenant, setTenant] = useState<HospitalTenantConfig>(() => {
    const base = initialTenantId ? getHospitalTenantById(initialTenantId) : resolveActiveHospitalTenant();
    const guaranteedBase = {
      ...base,
      doctor: base.doctor || base.doctors?.[0] || FALLBACK_DOCTOR,
    };
    return getSavedTenantOverride(guaranteedBase);
  });

  const setTenantId = (id: string) => {
    const nextBase = getHospitalTenantById(id);
    const guaranteedNextBase = {
      ...nextBase,
      doctor: nextBase.doctor || nextBase.doctors?.[0] || FALLBACK_DOCTOR,
    };
    setTenant(getSavedTenantOverride(guaranteedNextBase));
    broadcastSessionEvent({ type: "TENANT_SWITCH", tenantId: id });
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("hospital_tenant_switched", { detail: { tenantId: id } }));
    }
  };

  const updateTenant = useCallback((updates: Partial<HospitalTenantConfig>) => {
    setTenant((prev) => {
      const baseDoctor = prev.doctor || prev.doctors?.[0] || FALLBACK_DOCTOR;
      const updatedDoctor = updates.doctor
        ? { ...baseDoctor, ...updates.doctor }
        : (updates.doctors?.[0] ? { ...baseDoctor, ...updates.doctors[0] } : baseDoctor);

      const updatedDoctors = updates.doctors
        ? updates.doctors
        : (prev.doctors && prev.doctors.length > 0
            ? [{ ...prev.doctors[0], ...updatedDoctor }, ...prev.doctors.slice(1)]
            : [updatedDoctor]);

      const merged: HospitalTenantConfig = {
        ...prev,
        ...updates,
        doctor: updatedDoctor,
        doctors: updatedDoctors,
        specialties: updates.specialties || prev.specialties || Array.from(new Set(updatedDoctors.flatMap((d) => d.specialties || []))),
        contact: updates.contact
          ? {
              ...prev.contact,
              ...updates.contact,
              address: { ...prev.contact.address, ...(updates.contact.address || {}) },
            }
          : prev.contact,
        branding: updates.branding
          ? {
              ...prev.branding,
              ...updates.branding,
              aboutDocText: updatedDoctor.aboutText || updates.branding.aboutDocText || prev.branding.aboutDocText,
            }
          : {
              ...prev.branding,
              aboutDocText: updatedDoctor.aboutText || prev.branding.aboutDocText,
            },
        features: updates.features ? { ...prev.features, ...updates.features } : prev.features,
        facilityType: updates.facilityType !== undefined ? updates.facilityType : prev.facilityType,
        legal: updates.legal
          ? { ...prev.legal, ...updates.legal }
          : prev.legal,
      };
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`${STORAGE_CUSTOM_PREFIX}${merged.id}`, JSON.stringify(merged));
          window.dispatchEvent(new Event("tenant_features_changed"));
        } catch {}
        // Persist to backend server SSOT asynchronously
        updateRemoteTenantCustomization(merged.id, updates as any)?.catch(() => {});
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

  const updateTenantLegal = useCallback((legal: Partial<HospitalLegal>) => {
    updateTenant({ legal: { ...tenant.legal, ...legal } });
  }, [tenant.legal, updateTenant]);

  const resetTenantToDefaults = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`${STORAGE_CUSTOM_PREFIX}${tenant.id}`);
        window.dispatchEvent(new Event("tenant_features_changed"));
      } catch {}
    }
    const cleanBase = getHospitalTenantById(tenant.id);
    setTenant(cleanBase);
  }, [tenant.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleSync = () => {
      const base = initialTenantId ? getHospitalTenantById(initialTenantId) : resolveActiveHospitalTenant();
      setTenant(getSavedTenantOverride(base));
    };
    window.addEventListener("storage", handleSync);
    window.addEventListener("tenant_features_changed", handleSync);
    window.addEventListener("tenant_registry_updated", handleSync);
    return () => {
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("tenant_features_changed", handleSync);
      window.removeEventListener("tenant_registry_updated", handleSync);
    };
  }, [initialTenantId]);

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
      updateTenantLegal,
      resetTenantToDefaults,
      isFeatureEnabled,
    }),
    [tenant, isFeatureEnabled, updateTenant, updateTenantFeatures, updateTenantBranding, updateTenantLegal, resetTenantToDefaults]
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
      updateTenantLegal: () => {},
      resetTenantToDefaults: () => {},
      isFeatureEnabled: () => true,
    };
  }
  return ctx;
}

export default ThemeProvider;
