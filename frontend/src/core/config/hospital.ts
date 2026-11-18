import { THEME_COLORS } from "./theme";

// ─── Doctor Profile (SSOT Baseline Placeholders) ──────────────────────────────
export const DOCTOR = {
  NAME:            "Dr. Bramarambha K",
  FULL_NAME_WITH_DOT: "Dr. Bramarambha K, MD (Homoeopathy)",
  TITLE:           "Dr. Bramarambha K, MD (Homeopathic Materia Medica), SCPH",
  QUALIFICATIONS:  "BHMS, MD (Homoeopathy), SCPH",
  DESIGNATION:     "Consulting Homoeopathic Physician",
  COLLEGE:         "Government Homoeopathic Medical College & Hospital, Bengaluru",
  COLLEGE_SHORT:   "Govt. Homoeopathic Medical College",
  ALMA_MATER:      "Government Homoeopathic Medical College & Hospital, Bengaluru",
  RANK:            "RGUHS University 3rd Rank in MD",
  CERTIFICATION:   "SCPH Certified Classical Prescriber",
  EXPERIENCE_YEARS: "6+ Years",
  EXPERIENCE_DESC: "6+ years of dedicated clinical experience in individualised classical homeopathy",
  EMAIL:           "doctor@agastyahomoeo.com",
  UPI_ID:          "agastya@upi",

  BIO_SUMMARY:
    "Homoeopathic Physician with postgraduate specialisation in Homeopathic Materia Medica from RGUHS Bengaluru, SCPH-certified in classical homeopathy.",

  APPROACH:
    "My approach to care is centred on understanding each patient’s health history, mental state, and physical symptoms to select the single simillimum remedy tailored to their constitutional state.",

  EXPERIENCE_DETAIL:
    "Extensive clinical experience managing chronic pathologies, allergic rhinitis, paediatric immunity, eczema, and migraine through classical Hahnemannian principles.",

  CREDENTIAL_CHIPS: [
    { label: "Clinical Experience",   value: "6+ Years",        sub: "Classical Homeopathy" },
    { label: "Medical Credentials",   value: "MD, BHMS",        sub: "Materia Medica Specialist" },
    { label: "University Honor",      value: "3rd Rank",        sub: "RGUHS Bengaluru" },
    { label: "Board Certification",   value: "SCPH Certified",  sub: "Advanced Classical Practice" },
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

// ─── Hospital Identity (SSOT Baseline Placeholders) ───────────────────────────
export const HOSPITAL = {
  NAME:              "Agastya Clinic",
  FULL_NAME:         "Agastya Classical Homeopathy Clinic",
  TAGLINE:           "Root-cause homeopathic healing with clinical precision",
  SECONDARY_TAGLINE: "Gentle Healing, Lasting Wellness",
  WEBSITE:           "https://agastyahomoeo.com",
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
  PHONE_DISPLAY:   "+91 98450 12345",
  PHONE_TEL:       "+919845012345",
  SUPPORT_EMAIL:   "admin@agastyahomoeo.com",
  PHARMACY_EMAIL:  "pharmacy@agastyahomoeo.com",

  // Assets
  LOGO_PATH:       "/agastya-logo.png",
  LOGO_ALT:        "Agastya Classical Homeopathy Clinic — Root-cause homeopathic healing",

  // Address (SSOT)
  ADDRESS: {
    STREET:            "No. 10/2, 2nd Temple Road, 16th Cross",
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
    MALLESHWARAM: "Malleshwaram Main Clinic",
    TELE:         "Virtual Consultation Care Hub",
    OPD:          "Agastya Homoeopathic OPD",
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

export default HOSPITAL;
