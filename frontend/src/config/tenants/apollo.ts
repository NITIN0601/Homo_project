import type { HospitalTenantConfig } from "../../types/tenant";

export const APOLLO_DEMO_TENANT: HospitalTenantConfig = {
  id: "apollo",
  slug: "apollo",
  domain: "apollo.telecare.in",
  subdomains: ["apollo", "telecare"],
  name: "Apollo TeleCare & Integrative Health",
  shortName: "Apollo Care",
  tagline: "Accessible Clinical Excellence Everywhere",
  doctor: {
    id: "doc-apollo-01",
    name: "Dr. Rajesh Sharma",
    title: "Dr. Rajesh Sharma, MD, MBBS, Fellowship in Telemedicine",
    regNo: "MCI-2012-8841",
    experienceYears: 14,
    qualifications: "Chief Consultant Physician | Telehealth Director",
    aboutText: "Senior Telehealth physician pioneering integrative outpatient tele-consultations across India.",
    specialties: ["Tele-Medicine", "Internal Medicine", "Preventive Care"],
  },
  doctors: [
    {
      id: "doc-apollo-01",
      name: "Dr. Rajesh Sharma",
      title: "Dr. Rajesh Sharma, MD, MBBS, Fellowship in Telemedicine",
      regNo: "MCI-2012-8841",
      experienceYears: 14,
      qualifications: "Chief Consultant Physician | Telehealth Director",
      aboutText: "Senior Telehealth physician pioneering integrative outpatient tele-consultations across India.",
      specialties: ["Tele-Medicine", "Internal Medicine", "Preventive Care"],
    },
    {
      id: "doc-apollo-02",
      name: "Dr. Anita Nair",
      title: "Dr. Anita Nair, MD, DNB, Consultant Pulmonologist",
      regNo: "MCI-2015-4421",
      experienceYears: 9,
      qualifications: "Consultant Pulmonologist & Allergy Specialist",
      aboutText: "Specialist in respiratory disorders and chronic asthma management.",
      specialties: ["Pulmonology", "Allergies"],
    },
  ],
  contact: {
    phone: "+918049001122",
    phoneDisplay: "+91 80 4900 1122",
    email: "care@apollotelecare.in",
    address: {
      street: "Apollo Health City, Jubilee Hills",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500033",
      country: "India",
    },
    googleReviewUrl: "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY5",
  },
  branding: {
    primaryColor: "#1e3a8a", // Blue-900
    primaryDarkColor: "#172554", // Blue-950
    accentColor: "#0284c7", // Sky-600
    neutralBg: "#f8fafc", // Slate-50
    cardRadius: "1rem",
    buttonRadius: "0.5rem",
    fontSans: '"Inter", sans-serif',
    logoUrl: "/favicon.ico",
    bannerUrl: "/assets/banner.jpg",
    aboutDocText: "Senior Telehealth physician pioneering integrative outpatient tele-consultations across India.",
    aboutClinicText: "Apollo TeleCare brings tertiary healthcare directly into patient homes.",
  },
  features: {
    enableECommerce: false,       // Pure teleconsultation hospital (no eCommerce)
    enableVoiceStudio: true,
    enablePrescriptionScan: true,
    enableOnlinePayments: false,  // Tenant A: Online payment disabled
    enableTelemedicine: true,
    enableCustomerPayments: false,// Tenant A: Customer payment portal disabled
    enableRawCaseJson: false,     // Raw JSON disabled by default
    enableGoogleReviews: true,
    displayDoctorDetails: true,
    enablePatientMedicalRecords: true,
    enableBillingHistory: false, // Apollo demo has payments disabled
    enableFollowupFeedback: true,
    enableAgastyaBot: true,
    enablePatientProfileEdit: true,
  },
};

export default APOLLO_DEMO_TENANT;
