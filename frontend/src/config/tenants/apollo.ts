import type { HospitalTenantConfig, HospitalDoctor } from "../../types/tenant";

const APOLLO_DOCTORS: HospitalDoctor[] = [
  {
    id: "doc-apollo-01",
    name: "Dr. Rajesh Sharma",
    title: "Dr. Rajesh Sharma, MD, MBBS, Fellowship in Telemedicine",
    regNo: "MCI-2012-8841",
    experienceYears: 14,
    qualifications: "Chief Consultant Physician | Telehealth Director",
    aboutText:
      "Senior Telehealth physician pioneering integrative outpatient tele-consultations, preventive medicine, and comprehensive digital care pathways across India.",
    specialties: ["Tele-Medicine", "Internal Medicine", "Preventive Care"],
    consultationFee: 600,
    availability: {
      days: "Mon - Fri",
      morningHours: "09:00 AM – 1:00 PM",
      eveningHours: "4:00 PM – 7:00 PM",
      consultationFee: 600,
      schedule: {
        appointmentOnlyDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        walkinDays: [],
        offDays: ["Saturday", "Sunday"],
        holidays: [],
      },
      telemedicineOnly: true,
    },
  },
  {
    id: "doc-apollo-02",
    name: "Dr. Anita Nair",
    title: "Dr. Anita Nair, MD, DNB, Consultant Pulmonologist",
    regNo: "MCI-2015-4421",
    experienceYears: 9,
    qualifications: "Consultant Pulmonologist & Allergy Specialist",
    aboutText:
      "Specialist in respiratory disorders, pulmonary health, allergic conditions, and chronic asthma management with personalized care plans.",
    specialties: ["Pulmonology", "Allergies"],
    consultationFee: 800,
    availability: {
      days: "Mon, Wed, Fri, Sat",
      morningHours: "10:00 AM – 2:00 PM",
      eveningHours: "5:00 PM – 8:00 PM",
      consultationFee: 800,
      schedule: {
        appointmentOnlyDays: ["Monday", "Wednesday", "Friday", "Saturday"],
        walkinDays: [],
        offDays: ["Tuesday", "Thursday", "Sunday"],
        holidays: [],
      },
      telemedicineOnly: true,
    },
  },
];

export const APOLLO_DEMO_TENANT: HospitalTenantConfig = {
  id: "apollo",
  slug: "apollo",
  domain: "apollo.telecare.in",
  subdomains: ["apollo", "telecare"],
  name: "Apollo TeleCare & Integrative Health",
  shortName: "Apollo Care",
  tagline: "Accessible Clinical Excellence Everywhere",
  doctor: APOLLO_DOCTORS[0],
  doctors: APOLLO_DOCTORS,
  specialties: [
    "Tele-Medicine",
    "Internal Medicine",
    "Preventive Care",
    "Pulmonology",
    "Allergies",
    "Chronic Disease Management",
  ],
  hours: {
    timezone: "Asia/Kolkata",
    morningDisplay: "09:00 AM – 2:00 PM",
    morningStart: "09:00",
    morningEnd: "14:00",
    eveningDisplay: "4:00 PM – 8:00 PM",
    eveningStart: "16:00",
    eveningEnd: "20:00",
    availableDays: "Mon – Sat (100% Tele-consultation by Prior Appointment)",
    sundayPolicy: "Closed",
    consultationSlotMinutes: 20,
    walkinAllowed: false,
    walkinDaysSummary: "Pure Telemedicine — In-person walk-ins not available",
    appointmentDaysSummary: "Mon – Sat: Online Video & Phone Appointments Only",
  },
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
    aboutDocText: APOLLO_DOCTORS[0].aboutText,
    aboutClinicText:
      "Apollo TeleCare brings tertiary healthcare, multi-specialty clinical consultations, and continuous health monitoring directly into patient homes.",
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
    enableBillingHistory: false,  // Apollo demo has payments disabled
    enableFollowupFeedback: true,
    enableAgastyaBot: true,
    enablePatientProfileEdit: true,
  },
};

export default APOLLO_DEMO_TENANT;
