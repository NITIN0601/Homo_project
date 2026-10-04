/**
 * ─── Contact & WhatsApp Configuration (SSOT) ─────────────────────────────────
 * Single Source of Truth for clinic communications, phone lines, emails,
 * WhatsApp Cloud integration, and external mapping URLs.
 */
import { CLINIC, DOCTOR } from "./clinic";

// ─── Contact Channels ────────────────────────────────────────────────────────
export const CONTACT_INFO = {
  PHONE_DISPLAY:   CLINIC.PHONE_DISPLAY,
  PHONE_TEL:       CLINIC.PHONE_TEL,
  SUPPORT_EMAIL:   CLINIC.SUPPORT_EMAIL,
  DOCTOR_EMAIL:    DOCTOR.EMAIL,
  PHARMACY_EMAIL:  CLINIC.PHARMACY_EMAIL,
  ADDRESS_FULL:    CLINIC.ADDRESS.FULL,
  MAPS_URL:        CLINIC.ADDRESS.MAPS_URL,
} as const;

// ─── WhatsApp Business (SSOT) ────────────────────────────────────────────────
export const WHATSAPP = {
  NUMBER:           "+917019576255",
  NUMBER_CLEAN:     "917019576255",
  ACCOUNT_ID:       "WABA-7019576255",
  DEFAULT_MESSAGE:  `Hello ${CLINIC.FULL_NAME}! 👋 I would like to schedule a consultation with ${DOCTOR.NAME}.`,

  TEMPLATES: {
    INQUIRY: `Hello ${DOCTOR.NAME}! I would like to inquire about consultation timings at ${CLINIC.NAME}.`,
    WALKIN: `Hello ${DOCTOR.NAME}! Inquiring about evening walk-in OPD today at ${CLINIC.ADDRESS.SHORT}.`,
    APPOINTMENT: (patientName: string) =>
      `Hi ${DOCTOR.NAME}, I'd like to book an appointment. Patient: ${patientName}`,
    CONSULTATION_SUMMARY: (patientName: string, diagnosis: string, advice?: string) =>
      `Hello ${patientName}! Your consultation with ${DOCTOR.NAME} has been finalized via ${CLINIC.NAME} Clinic.\nDiagnosis: ${diagnosis}\n${advice ? `Diet & Advice: ${advice}\n` : ""}Check your ${CLINIC.NAME} Portal for your complete record.`,
    PHARMACY_PO: (poNumber: string, summary: string) =>
      `Official Purchase Order ${poNumber} from ${CLINIC.FULL_NAME}:\n${summary}`,
  },

  /** Helper to construct sanitized WhatsApp URL */
  buildUrl: (message?: string, phone?: string): string => {
    let targetMsg = message;
    let targetPhone = phone;

    // Defensive auto-detection if arguments were passed as (phone, message)
    if (
      typeof message === "string" &&
      /^\+?[0-9\s-]{7,15}$/.test(message.trim()) &&
      typeof phone === "string" &&
      phone.length > 15
    ) {
      targetPhone = message;
      targetMsg = phone;
    }

    const targetNumber = (targetPhone ?? WHATSAPP.NUMBER_CLEAN).replace(/[^0-9]/g, "");
    const text = targetMsg ?? WHATSAPP.DEFAULT_MESSAGE;
    return `https://wa.me/${targetNumber}?text=${encodeURIComponent(text)}`;
  },
} as const;

// ─── External Links ───────────────────────────────────────────────────────────
export const EXTERNAL_LINKS = {
  MAPS:     CLINIC.ADDRESS.MAPS_URL,
  WEBSITE:  CLINIC.WEBSITE,
  AYUSH:    "https://main.ayush.gov.in/",
} as const;
