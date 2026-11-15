import { THEME_COLORS } from "./theme";

// ─── Doctor Profile (SSOT Baseline Placeholders) ──────────────────────────────
export const DOCTOR = {
  NAME:            "Dr. Primary Physician",
  FULL_NAME_WITH_DOT: "Dr. Primary Physician, MD",
  TITLE:           "Primary Consulting Physician, MD",
  QUALIFICATIONS:  "MD, MBBS",
  DESIGNATION:     "Consulting Physician",
  COLLEGE:         "Medical College & Hospital",
  COLLEGE_SHORT:   "Medical College",
  ALMA_MATER:      "Medical College & Hospital",
  RANK:            "Clinical Excellence",
  CERTIFICATION:   "Board Certified",
  EXPERIENCE_YEARS: "10 Years",
  EXPERIENCE_DESC: "10 years of dedicated clinical experience providing individualised healthcare",
  EMAIL:           "doctor@example.com",
  UPI_ID:          "clinic@upi",

  BIO_SUMMARY:
    "Experienced clinical practitioner dedicated to holistic patient wellness, compassionate care, and evidence-based clinical medicine.",

  APPROACH:
    "My approach to care is centred on understanding each patient’s health history, lifestyle, and individual concerns, so that treatment can be planned according to their specific needs.",

  EXPERIENCE_DETAIL:
    "Extensive clinical experience providing comprehensive patient consultations and managing a diverse range of chronic and acute health concerns.",

  CREDENTIAL_CHIPS: [
    { label: "Clinical Experience",   value: "10 Years",        sub: "Patient-Centered Care" },
    { label: "Medical Credentials",   value: "MD, MBBS",        sub: "Clinical Medicine" },
    { label: "Faculty & Practice",    value: "Consultant",      sub: "General & Holistic Practice" },
    { label: "Board Certification",   value: "Certified",       sub: "Advanced Clinical Practice" },
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

// ─── Clinic Identity (SSOT Baseline Placeholders) ────────────────────────────
export const CLINIC = {
  NAME:              "General Clinic",
  FULL_NAME:         "General Healthcare Clinic",
  TAGLINE:           "Patient-Centered Healthcare & Lasting Wellness",
  SECONDARY_TAGLINE: "Your Health • Our Priority",
  WEBSITE:           "https://clinic.example.com",
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
  PHONE_DISPLAY:   "+1 555-0100",
  PHONE_TEL:       "+15550100",
  SUPPORT_EMAIL:   "admin@example.com",
  PHARMACY_EMAIL:  "pharmacy@example.com",

  // Assets
  LOGO_PATH:       "/generic-clinic-logo.svg",
  LOGO_ALT:        "General Healthcare Clinic — Patient-Centered Healthcare",

  // Address (SSOT)
  ADDRESS: {
    STREET:            "100 Medical Center Way",
    AREA:              "Medical Center",
    CITY:              "Metropolis",
    STATE:             "State",
    PINCODE:           "10001",
    COUNTRY:           "Country",
    CITY_STATE:        "Metropolis, State",
    SHORT:             "Metropolis, State",
    FULL:              "100 Medical Center Way, Metropolis, State – 10001",
    FULL_WITH_COUNTRY: "100 Medical Center Way, Metropolis, State – 10001, Country",
    MAPS_URL:          "https://maps.google.com/?q=Medical+Center",
  },

  // Branches
  BRANCHES: {
    MALLESHWARAM: "Main Medical Center",
    TELE:         "Virtual Consultation Care Hub",
    OPD:          "Outpatient Medical Clinic",
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
  EMERGENCY: "For appointments, walk-in inquiries and queries, call or WhatsApp +1 555-0100.",
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
