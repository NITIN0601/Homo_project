import { THEME_COLORS } from "./theme";

// ─── Doctor Profile (SSOT) ────────────────────────────────────────────────────
export const DOCTOR = {
  NAME:            "Dr. Bramarambha K",
  FULL_NAME_WITH_DOT: "Dr. Bramarambha K.",
  TITLE:           "Dr. Bramarambha K, MD (Homeopathic Materia Medica), SCPH",
  QUALIFICATIONS:  "Homoeopathic Physician | MD in Materia Medica | SCPH-Certified",
  DESIGNATION:     "Assistant Professor & Consultant Homoeopath",
  COLLEGE:         "Anuradha Homoeopathic Medical College & Hospital, Bengaluru",
  COLLEGE_SHORT:   "Anuradha HMC",
  ALMA_MATER:      "Government Homoeopathic Medical College & Hospital, Bengaluru",
  RANK:            "3rd Rank in MD (Homeopathic Materia Medica), RGUHS",
  CERTIFICATION:   "SCPH-Certified",
  EXPERIENCE_YEARS: "6 Years",
  EXPERIENCE_DESC: "6 years of dedicated clinical experience providing individualised homoeopathic care",
  EMAIL:           "vaishnavikshetty@gmail.com",
  UPI_ID:          "bramarambha.k@okicici",

  BIO_SUMMARY:
    "Dr. Bramarambha K. is a Homoeopathic Physician with a postgraduate specialisation in Homeopathic Materia Medica. She completed her undergraduate and postgraduate studies at Government Homoeopathic Medical College & Hospital, Bengaluru, and secured 3rd rank in MD (Homeopathic Materia Medica) from Rajiv Gandhi University of Health Sciences (RGUHS). She is also SCPH-certified.",

  APPROACH:
    "My approach to care is centred on understanding each patient’s health history, lifestyle, and individual concerns, so that treatment can be planned according to their specific needs. Each consultation is individualised, with treatment planned according to the patient’s symptoms, medical history, and overall health.",

  EXPERIENCE_DETAIL:
    "Currently works as an Assistant Professor at Anuradha Homoeopathic Medical College & Hospital, Bengaluru, actively involved in teaching and academic activities. Alongside academic experience, she brings 6 years of dedicated clinical experience providing individualised homoeopathic care and managing patients with a diverse range of chronic and acute health concerns.",

  CREDENTIAL_CHIPS: [
    { label: "Clinical Experience",   value: "6 Years",         sub: "Individualised Homoeopathic Care" },
    { label: "Postgraduate Rank",     value: "3rd Rank MD",     sub: "RGUHS (Homeopathic Materia Medica)" },
    { label: "Academic Faculty",      value: "Assistant Prof.", sub: "Anuradha Homoeopathic Medical College" },
    { label: "Clinical Certification", value: "SCPH-Certified",  sub: "Advanced Homoeopathic Practice" },
  ],
} as const;

// Backward-compatible alias for DOCTOR_BIO
export const DOCTOR_BIO = {
  name: DOCTOR.FULL_NAME_WITH_DOT,
  qualifications: DOCTOR.QUALIFICATIONS,
  summary: DOCTOR.BIO_SUMMARY,
  approach: DOCTOR.APPROACH,
  experience: DOCTOR.EXPERIENCE_DETAIL,
} as const;

// ─── Clinic Identity (SSOT) ──────────────────────────────────────────────────
export const CLINIC = {
  NAME:              "Agastya",
  FULL_NAME:         "Agastya Homoeopathy Clinic",
  TAGLINE:           "Gentle Healing, Lasting Wellness",
  SECONDARY_TAGLINE: "Your Health • Our Priority",
  WEBSITE:           "https://agastyahomoeopathy.com",
  TIMEZONE:          "Asia/Kolkata",
  TIMEZONE_LABEL:    "IST (Indian Standard Time, UTC+5:30)",
  TIMEZONE_OFFSET:   "+05:30",

  // Brand colors (from logo)
  BRAND: {
    NAVY:        THEME_COLORS.BRAND_NAVY,
    GREEN:       THEME_COLORS.BRAND_GREEN,
    NAVY_DARK:   THEME_COLORS.BRAND_NAVY_DARK,
    GREEN_DARK:  THEME_COLORS.BRAND_GREEN_DARK,
    GREEN_LIGHT: THEME_COLORS.BRAND_GREEN_LIGHT,
  },

  // Primary doctor fields for direct access
  DOCTOR_NAME:            DOCTOR.NAME,
  DOCTOR_TITLE:           DOCTOR.TITLE,
  DOCTOR_QUALIFICATIONS:  DOCTOR.QUALIFICATIONS,
  DOCTOR_DESIGNATION:     DOCTOR.DESIGNATION,
  DOCTOR_COLLEGE:         DOCTOR.COLLEGE,
  DOCTOR_ALMA_MATER:      DOCTOR.ALMA_MATER,
  DOCTOR_RANK:            DOCTOR.RANK,
  DOCTOR_EXPERIENCE_YEARS: DOCTOR.EXPERIENCE_YEARS,
  DOCTOR_EMAIL:           DOCTOR.EMAIL,
  DOCTOR_UPI_ID:          DOCTOR.UPI_ID,

  // Contact
  PHONE_DISPLAY:   "+91 70195 76255",
  PHONE_TEL:       "+917019576255",
  SUPPORT_EMAIL:   "vaishnavikshetty@gmail.com",
  PHARMACY_EMAIL:  "pharmacy@agastyahomoeopathy.com",

  // Assets
  LOGO_PATH:       "/logo.png",
  LOGO_ALT:        "Agastya Homoeopathy Clinic — Gentle Healing, Lasting Wellness",

  // Address (SSOT)
  ADDRESS: {
    STREET:            "No. 10/2, 2nd Temple Road, 16th Cross, Malleshwaram",
    AREA:              "Malleshwaram",
    CITY:              "Bengaluru",
    STATE:             "Karnataka",
    PINCODE:           "560003",
    COUNTRY:           "India",
    CITY_STATE:        "Bengaluru, Karnataka",
    SHORT:             "Malleshwaram, Bengaluru",
    FULL:              "No. 10/2, 2nd Temple Road, 16th Cross, Malleshwaram, Bengaluru, Karnataka – 560003",
    FULL_WITH_COUNTRY: "No. 10/2, 2nd Temple Road, 16th Cross, Malleshwaram, Bengaluru, Karnataka – 560003, India",
    MAPS_URL:          "https://maps.google.com/?q=No.+10/2,+2nd+Temple+Road,+16th+Cross,+Malleshwaram,+Bengaluru,+Karnataka+560003",
  },

  // Branches
  BRANCHES: {
    MALLESHWARAM: "Agastya Central Clinic, Malleshwaram",
    TELE:         "Agastya Tele-Consultation Hub",
    OPD:          "Agastya OPD Clinic, Malleshwaram",
  },

  // Trust Badges
  TRUST_BADGES: [
    { icon: "🚶‍♂️", label: "Evening Walk-ins Welcome (5:30–8 PM)" },
    { icon: "📅", label: "Morning: Prior Appt Only" },
    { icon: "🏥", label: "AYUSH Registered" },
    { icon: "⭐", label: "4.9 • 1,240 Reviews" },
  ],
} as const;

// ─── Office Hours & Walk-in Policy (SSOT) ────────────────────────────────────
export const OFFICE_HOURS = {
  MORNING: {
    label: "Morning Session",
    days:  "Monday – Saturday",
    hours: "10:00 AM – 1:00 PM",
    mode:  "By prior appointment only",
    walkinsAllowed: false,
    badge: "Prior Appt Only",
  },
  EVENING: {
    label: "Evening Session",
    days:  "Monday – Saturday",
    hours: "5:30 PM – 8:00 PM",
    mode:  "Walk-ins & Appointments Welcome",
    walkinsAllowed: true,
    badge: "Walk-ins Welcome",
  },
  SUNDAY: {
    label: "Sunday Consultation",
    days:  "Sunday",
    hours: "By prior appointment only",
    mode:  "By prior appointment only",
    walkinsAllowed: false,
    badge: "Prior Appt Only",
  },
  WEEKDAYS:  { label: "Mon – Sat (Morning)", hours: "10:00 AM – 1:00 PM (By prior appointment only)" },
  SATURDAY:  { label: "Saturday",  hours: "10:00 AM – 1:00 PM (Prior Appt) & 5:30 PM – 8:00 PM (Walk-ins Welcome)" },
  SUMMARY:   "Mon – Sat: 10:00 AM – 1:00 PM (Prior Appt) & 5:30 PM – 8:00 PM (Walk-ins & Appointments) · Sunday: By prior appt only",
  WALKIN_POLICY: "Walk-ins are welcomed Monday through Saturday during Evening OPD (5:30 PM – 8:00 PM). Morning sessions (10:00 AM – 1:00 PM) and Sundays are strictly by prior appointment.",
  EMERGENCY: "For appointments, walk-in inquiries and queries, call or WhatsApp +91 7019576255.",
} as const;

// ─── Consultation Appointment Time Slots (SSOT) ──────────────────────────────
export const MORNING_SLOTS: readonly string[] = [
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
] as const;

export const EVENING_SLOTS: readonly string[] = [
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
] as const;

export const ALL_TIME_SLOTS: readonly string[] = [
  ...MORNING_SLOTS,
  ...EVENING_SLOTS,
] as const;
