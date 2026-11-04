/**
 * ─── Centralized Form Validation Utilities ────────────────────────────────────
 * Reusable validation functions and standard error messages across the application.
 */

import validator from "validator";
import { isValidPhoneNumber } from "libphonenumber-js";

export const VALIDATION_MESSAGES = {
  NAME_REQUIRED: "Full name is required (min 2 characters).",
  EMAIL_INVALID: "Please enter a valid, active email address.",
  PHONE_INVALID: "Please enter a valid phone number for your selected country code.",
  DATE_REQUIRED: "Please select a consultation date.",
  SLOT_REQUIRED: "Please select an available time slot.",
} as const;

export function validateFullName(name: string): { isValid: boolean; error?: string } {
  const trimmed = name.trim();
  if (!trimmed || trimmed.length < 2) {
    return { isValid: false, error: VALIDATION_MESSAGES.NAME_REQUIRED };
  }
  return { isValid: true };
}

export function validateEmail(email: string): { isValid: boolean; error?: string } {
  const trimmed = email.trim();
  if (!trimmed || !validator.isEmail(trimmed)) {
    return { isValid: false, error: VALIDATION_MESSAGES.EMAIL_INVALID };
  }
  return { isValid: true };
}

export function validatePhone(phone: string): { isValid: boolean; error?: string } {
  const trimmed = phone.trim();
  if (!trimmed || !isValidPhoneNumber(trimmed)) {
    return { isValid: false, error: VALIDATION_MESSAGES.PHONE_INVALID };
  }
  return { isValid: true };
}
