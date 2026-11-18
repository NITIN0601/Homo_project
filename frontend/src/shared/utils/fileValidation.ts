/**
 * ─── Clinical File & MIME Validation Utility ──────────────────────────────
 * Enforces strict MIME types and size caps on clinical document and prescription uploads
 * to defend against remote file injection and memory overflow (HIPAA §164.312).
 */

export const ALLOWED_CLINICAL_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "audio/wav",
  "audio/mpeg",
  "audio/webm",
  "audio/ogg",
];

export const MAX_CLINICAL_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB limit

export function validateClinicalFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "No file was selected." };
  }

  // Check MIME type
  if (!ALLOWED_CLINICAL_FILE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file format (${file.type || "unknown"}). Only JPEG, PNG, WebP, PDF, and audio recordings are accepted.`,
    };
  }

  // Check file size
  if (file.size > MAX_CLINICAL_FILE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File exceeds maximum clinical size limit of 25MB (uploaded size: ${sizeMb}MB).`,
    };
  }

  return { valid: true };
}
