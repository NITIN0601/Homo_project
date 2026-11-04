import type { HospitalTenantConfig } from "../../types/tenant";
import { CLINIC, DOCTOR } from "../clinic";
import { THEME_COLORS, THEME_FONTS } from "../theme";

export const AGASTYA_TENANT: HospitalTenantConfig = {
  id: "agastya",
  slug: "agastya",
  domain: "agastyahomoeopathy.com",
  subdomains: ["agastya", "clinic", "ehr"],
  name: CLINIC.FULL_NAME,
  shortName: CLINIC.NAME,
  tagline: CLINIC.TAGLINE,
  doctor: {
    id: "doc-001",
    name: DOCTOR.NAME,
    title: DOCTOR.TITLE,
    regNo: "KAR-HOM-2018-0492",
    experienceYears: 6,
    qualifications: DOCTOR.QUALIFICATIONS,
    aboutText: DOCTOR.BIO_SUMMARY,
    specialties: ["Classical Homeopathy", "Chronic Pathology", "Paediatric Immunity"],
  },
  doctors: [
    {
      id: "doc-001",
      name: DOCTOR.NAME,
      title: DOCTOR.TITLE,
      regNo: "KAR-HOM-2018-0492",
      experienceYears: 6,
      qualifications: DOCTOR.QUALIFICATIONS,
      aboutText: DOCTOR.BIO_SUMMARY,
      specialties: ["Classical Homeopathy", "Chronic Pathology", "Paediatric Immunity"],
    },
  ],
  contact: {
    phone: CLINIC.PHONE_TEL,
    phoneDisplay: CLINIC.PHONE_DISPLAY,
    email: CLINIC.SUPPORT_EMAIL,
    emergencyPhone: CLINIC.PHONE_TEL,
    address: {
      street: CLINIC.ADDRESS.STREET,
      city: CLINIC.ADDRESS.CITY,
      state: CLINIC.ADDRESS.STATE,
      pincode: CLINIC.ADDRESS.PINCODE,
      country: CLINIC.ADDRESS.COUNTRY,
    },
    mapsUrl: CLINIC.ADDRESS.MAPS_URL,
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4",
  },
  branding: {
    primaryColor: THEME_COLORS.SAGE_900,
    primaryDarkColor: THEME_COLORS.SAGE_950,
    accentColor: THEME_COLORS.SAGE_500,
    neutralBg: THEME_COLORS.STONE_50,
    cardRadius: "1.25rem",
    buttonRadius: "0.75rem",
    fontSans: THEME_FONTS.FAMILY_SANS,
    logoUrl: "/favicon.ico",
    bannerUrl: "/assets/banner.jpg",
    aboutDocText: DOCTOR.BIO_SUMMARY,
    aboutClinicText: "Holistic Classical Homoeopathy practice serving patients globally with clinical precision and compassionate care.",
  },
  features: {
    enableECommerce: true,
    enableVoiceStudio: true,
    enablePrescriptionScan: true,
    enableOnlinePayments: true,
    enableTelemedicine: true,
    enableCustomerPayments: true,
    enableRawCaseJson: false, // Default false: Patients see human-readable prescriptions, not raw developer JSON
    enableGoogleReviews: true,
    displayDoctorDetails: true,
    enablePatientMedicalRecords: true,
    enableBillingHistory: true,
    enableFollowupFeedback: true,
    enableAgastyaBot: true,
    enablePatientProfileEdit: true,
  },
};

export default AGASTYA_TENANT;
