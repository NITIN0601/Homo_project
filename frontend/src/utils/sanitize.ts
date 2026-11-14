/**
 * ─── Enterprise Input Sanitization Utilities ─────────────────────────────────
 * Defense-in-depth client-side sanitization to prevent UI-level XSS, format injection,
 * and malformed inputs before reaching network boundaries.
 */

/**
 * Strips dangerous HTML tags, angle brackets, and control characters.
 * Ensures the string is trimmed and clamped to the maximum allowed length.
 */
export function sanitizeText(val: unknown, maxLength = 255): string {
  if (typeof val !== "string") return "";
  return val
    .trim()
    .replace(/[<>]/g, "") // Strip angle brackets to prevent HTML/XSS injection
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") // Strip invisible control characters
    .slice(0, maxLength);
}

/**
 * Normalizes an alphanumeric identifier (e.g. UTR references, transaction IDs, slugs).
 * Only retains A-Z, a-z, 0-9, and optionally hyphens/underscores.
 */
export function sanitizeAlphanumeric(val: unknown, allowSeparators = true, maxLength = 64): string {
  if (typeof val !== "string") return "";
  const pattern = allowSeparators ? /[^A-Za-z0-9_-]/g : /[^A-Za-z0-9]/g;
  return val.trim().replace(pattern, "").slice(0, maxLength);
}

/**
 * Validates and sanitizes a monetary currency value.
 * Disallows negative values, clamps to safe boundaries, and rounds to 2 decimal places.
 */
export function sanitizeCurrency(val: unknown, maxAmount = 10_000_000): number {
  let num: number;
  if (typeof val === "number") {
    num = val;
  } else if (typeof val === "string") {
    const isNegative = val.trim().startsWith("-");
    const cleaned = val.replace(/[^0-9.]/g, "");
    num = parseFloat(cleaned);
    if (isNegative && !isNaN(num)) num = -num;
  } else {
    return 0;
  }

  if (isNaN(num) || num < 0) return 0;
  if (num > maxAmount) return maxAmount;
  return Math.round(num * 100) / 100;
}

/**
 * Sanitizes and normalizes an email address (trims, converts to lowercase, strips spaces).
 */
export function sanitizeEmail(val: unknown): string {
  if (typeof val !== "string") return "";
  return val.trim().toLowerCase().replace(/\s+/g, "").slice(0, 150);
}

/**
 * Sanitizes a phone number, preserving valid international characters (+, digits, spaces).
 */
export function sanitizePhone(val: unknown): string {
  if (typeof val !== "string") return "";
  return val.trim().replace(/[^0-9+\-\s()]/g, "").slice(0, 25);
}

/**
 * Enforces a strict 6-digit Indian PIN code.
 */
export function sanitizePincode(val: unknown): string {
  if (typeof val !== "string" && typeof val !== "number") return "";
  return String(val).replace(/\D/g, "").slice(0, 6);
}

/**
 * Sanitizes a list of strings (e.g. allergies, past history, doctor specialties).
 * Trims each entry, strips HTML, removes duplicates, and filters out empty values.
 */
export function sanitizeArrayOfStrings(
  raw: unknown,
  maxItems = 30,
  maxItemLength = 100
): string[] {
  if (!raw) return [];
  const list = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : [];

  const sanitized = list
    .map((item) => sanitizeText(String(item), maxItemLength))
    .filter((item) => item.length > 0);

  // Return unique items up to maxItems
  return Array.from(new Set(sanitized)).slice(0, maxItems);
}
