import { useMemo } from "react";
import { useTenant } from "../branding/ThemeProvider";
import { HOSPITAL, OFFICE_HOURS } from "../../config";
import type { HospitalTenantConfig, HospitalDoctor } from "@core/types/tenant";

export interface HospitalFacade {
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
  specialties: string[];
  primaryDoctorName: string;
  primaryDoctorTitle: string;
  primaryDoctorQualifications: string;
  primaryDoctorExperience: string;
  primaryDoctorAbout: string;
  facilityType: "hospital" | "clinic";
  facilityLabel: "Hospital" | "Clinic";
  facilityLabelLower: "hospital" | "clinic";
  currency: string;
  currencySymbol: string;
  aboutHospitalText: string;
  branding: HospitalTenantConfig["branding"];
  features: HospitalTenantConfig["features"];
  legal?: HospitalTenantConfig["legal"];
  isFeatureEnabled: (key: keyof HospitalTenantConfig["features"]) => boolean;
  officeHours: typeof OFFICE_HOURS;
}

export function useHospital(): HospitalFacade {
  const { tenant, isFeatureEnabled } = useTenant();

  return useMemo(() => {
    const hasTenantDoctor = Boolean(tenant.doctor && tenant.doctor.name);
    const primaryDoctor: HospitalDoctor = hasTenantDoctor
      ? tenant.doctor
      : tenant.doctors && tenant.doctors.length > 0
        ? tenant.doctors[0]
        : {
            id: `doc-${tenant.id || "primary"}`,
            name: "Attending Physician",
            title: "Consulting Physician, MD",
            qualifications: "MD, MBBS",
            experienceYears: 5,
            regNo: "",
            aboutText: `${tenant.name || "The facility"}'s clinical medical care team.`,
            specialties: tenant.specialties || ["General Healthcare"],
          };

    const doctorsList: HospitalDoctor[] =
      tenant.doctors && tenant.doctors.length > 0 ? tenant.doctors : [primaryDoctor];

    const specialtiesList: string[] =
      tenant.specialties && tenant.specialties.length > 0
        ? tenant.specialties
        : Array.from(new Set(doctorsList.flatMap((d) => d.specialties || [])));

    const street = tenant.contact.address.street || HOSPITAL.ADDRESS.STREET;
    const city = tenant.contact.address.city || HOSPITAL.ADDRESS.CITY;
    const state = tenant.contact.address.state || HOSPITAL.ADDRESS.STATE;
    const pincode = tenant.contact.address.pincode || HOSPITAL.ADDRESS.PINCODE;
    const country = tenant.contact.address.country || HOSPITAL.ADDRESS.COUNTRY;

    const facilityType: "hospital" | "clinic" = tenant.facilityType === "clinic" ? "clinic" : "hospital";
    const facilityLabel: "Hospital" | "Clinic" = facilityType === "clinic" ? "Clinic" : "Hospital";
    const facilityLabelLower: "hospital" | "clinic" = facilityType;

    const aboutHospitalText =
      tenant.branding.aboutHospitalText ||
      `${tenant.name || HOSPITAL.FULL_NAME} provides personalized clinical consultations, comprehensive outpatient evaluations, and dedicated continuing care.`;

    return {
      tenant,
      id: tenant.id,
      name: tenant.name || HOSPITAL.FULL_NAME,
      shortName: tenant.shortName || HOSPITAL.NAME,
      tagline: tenant.tagline || HOSPITAL.TAGLINE,
      facilityType,
      facilityLabel,
      facilityLabelLower,
      currency: tenant.currency || "INR",
      currencySymbol: tenant.currencySymbol || "₹",
      logoUrl: tenant.branding.logoUrl || HOSPITAL.LOGO_PATH,
      phone: tenant.contact.phoneDisplay || tenant.contact.phone || HOSPITAL.PHONE_DISPLAY,
      phoneTel: tenant.contact.phone || HOSPITAL.PHONE_TEL,
      email: tenant.contact.email || HOSPITAL.SUPPORT_EMAIL,
      address: {
        street,
        city,
        state,
        pincode,
        country,
        full: `${street}, ${city}, ${state} – ${pincode}`,
        short: `${city}, ${state}`,
        mapsUrl: tenant.contact.mapsUrl || HOSPITAL.ADDRESS.MAPS_URL,
      },
      doctor: primaryDoctor,
      doctors: doctorsList,
      specialties: specialtiesList,
      primaryDoctorName: primaryDoctor.name,
      primaryDoctorTitle: primaryDoctor.title,
      primaryDoctorQualifications: primaryDoctor.qualifications,
      primaryDoctorExperience: `${primaryDoctor.experienceYears} Years`,
      primaryDoctorAbout: primaryDoctor.aboutText || "",
      aboutHospitalText,
      branding: tenant.branding,
      features: tenant.features,
      legal: tenant.legal,
      isFeatureEnabled,
      officeHours: OFFICE_HOURS,
    };
  }, [tenant, isFeatureEnabled]);
}

export default useHospital;
