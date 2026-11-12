import { useMemo } from "react";
import { useTenant } from "../context/ThemeProvider";
import { CLINIC, DOCTOR, OFFICE_HOURS } from "../config";
import type { HospitalTenantConfig, HospitalDoctor } from "../types/tenant";

export interface ClinicFacade {
  tenant: HospitalTenantConfig;
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  logoUrl: string;
  phone: string;
  phoneTel: string;
  email: string;
  address: {
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    full: string;
    short: string;
    mapsUrl: string;
  };
  doctor: HospitalDoctor;
  doctors: HospitalDoctor[];
  primaryDoctorName: string;
  primaryDoctorTitle: string;
  primaryDoctorQualifications: string;
  primaryDoctorExperience: string;
  primaryDoctorAbout: string;
  branding: HospitalTenantConfig["branding"];
  features: HospitalTenantConfig["features"];
  legal?: HospitalTenantConfig["legal"];
  isFeatureEnabled: (key: keyof HospitalTenantConfig["features"]) => boolean;
  officeHours: typeof OFFICE_HOURS;
}

export function useClinic(): ClinicFacade {
  const { tenant, isFeatureEnabled } = useTenant();

  return useMemo(() => {
    const hasTenantDoctor = Boolean(tenant.doctor && tenant.doctor.name);
    const primaryDoctor: HospitalDoctor = hasTenantDoctor
      ? tenant.doctor
      : {
          id: "doc-default",
          name: DOCTOR.NAME,
          title: DOCTOR.TITLE,
          qualifications: DOCTOR.QUALIFICATIONS,
          experienceYears: 6,
          regNo: "MED-001",
          aboutText: DOCTOR.BIO_SUMMARY,
          specialties: ["Homoeopathic Medicine", "Chronic Care"],
        };

    const street = tenant.contact.address.street || CLINIC.ADDRESS.STREET;
    const city = tenant.contact.address.city || CLINIC.ADDRESS.CITY;
    const state = tenant.contact.address.state || CLINIC.ADDRESS.STATE;
    const pincode = tenant.contact.address.pincode || CLINIC.ADDRESS.PINCODE;
    const country = tenant.contact.address.country || CLINIC.ADDRESS.COUNTRY;

    return {
      tenant,
      id: tenant.id,
      name: tenant.name || CLINIC.FULL_NAME,
      shortName: tenant.shortName || CLINIC.NAME,
      tagline: tenant.tagline || CLINIC.TAGLINE,
      logoUrl: tenant.branding.logoUrl || CLINIC.LOGO_PATH,
      phone: tenant.contact.phoneDisplay || tenant.contact.phone || CLINIC.PHONE_DISPLAY,
      phoneTel: tenant.contact.phone || CLINIC.PHONE_TEL,
      email: tenant.contact.email || CLINIC.SUPPORT_EMAIL,
      address: {
        street,
        city,
        state,
        pincode,
        country,
        full: `${street}, ${city}, ${state} – ${pincode}`,
        short: `${city}, ${state}`,
        mapsUrl: tenant.contact.mapsUrl || CLINIC.ADDRESS.MAPS_URL,
      },
      doctor: primaryDoctor,
      doctors: tenant.doctors && tenant.doctors.length > 0 ? tenant.doctors : [primaryDoctor],
      primaryDoctorName: primaryDoctor.name,
      primaryDoctorTitle: primaryDoctor.title,
      primaryDoctorQualifications: primaryDoctor.qualifications,
      primaryDoctorExperience: `${primaryDoctor.experienceYears} Years`,
      primaryDoctorAbout: primaryDoctor.aboutText || "",
      branding: tenant.branding,
      features: tenant.features,
      legal: tenant.legal,
      isFeatureEnabled,
      officeHours: OFFICE_HOURS,
    };
  }, [tenant, isFeatureEnabled]);
}

export default useClinic;
