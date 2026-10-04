/**
 * ─── Centralized Formatting Utilities ─────────────────────────────────────────
 * Reusable formatting helpers for currency, dates, times, and phone numbers.
 */

import { COMMERCE_CONFIG } from "../config/commerce";

/**
 * Format an amount in INR with Indian comma separators and the rupee symbol.
 * Example: 1450 -> "₹1,450"
 */
export function formatINR(amount: number): string {
  return `${COMMERCE_CONFIG.CURRENCY_SYMBOL}${amount.toLocaleString(COMMERCE_CONFIG.CURRENCY_LOCALE)}`;
}

/**
 * Format a date into a short readable string (e.g., "1 Oct 2026")
 */
export function formatDateShort(dateInput: Date | string | number): string {
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(COMMERCE_CONFIG.CURRENCY_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a date into a full readable string with day name (e.g., "Thursday, 1 October, 2026")
 */
export function formatDateFull(dateInput: Date | string | number): string {
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(COMMERCE_CONFIG.CURRENCY_LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format a date with abbreviated weekday (e.g., "Thu, 1 Oct 2026")
 */
export function formatDateWithWeekday(dateInput: Date | string | number): string {
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString(COMMERCE_CONFIG.CURRENCY_LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format a time in 12-hour format (e.g., "10:30 AM")
 */
export function formatTimeShort(dateInput: Date | string | number = new Date()): string {
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(COMMERCE_CONFIG.CURRENCY_LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format a date into ISO format (YYYY-MM-DD), useful for HTML <input type="date">,
 * API requests, batch references, and DB records.
 * Example: "2026-10-02"
 */
export function formatDateISO(dateInput: Date | string | number = new Date()): string {
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

/**
 * Format a date and time into a medium localized string.
 * Example: "2 Oct 2026, 7:40 pm"
 */
export function formatDateTime(dateInput: Date | string | number = new Date()): string {
  const date = typeof dateInput === "string" || typeof dateInput === "number" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleString(COMMERCE_CONFIG.CURRENCY_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
