/**
 * ─── Navigation Configuration (SSOT) ──────────────────────────────────────────
 * Central navigation routes, labels, emojis, badges, and aria attributes
 * shared between Desktop NavBar, Mobile Header Navigation, and Mobile BottomNav.
 */
import type { Page } from "../types";

export interface NavItemConfig {
  id: Page;
  label: string;
  shortLabel: string;
  emoji: string;
  ariaLabel: string;
  badge?: string;
}

export const PATIENT_NAV_ITEMS: readonly NavItemConfig[] = [
  {
    id: "home",
    label: "Home",
    shortLabel: "Home",
    emoji: "🏠",
    ariaLabel: "Navigate to Home",
  },
  {
    id: "about",
    label: "About Us",
    shortLabel: "About",
    emoji: "🌿",
    ariaLabel: "Navigate to About Us",
  },
  {
    id: "appointments",
    label: "Book Appointment",
    shortLabel: "Book Appt.",
    emoji: "📅",
    ariaLabel: "Navigate to Appointments",
  },
  {
    id: "visit-summary",
    label: "My Summary",
    shortLabel: "Summary",
    emoji: "📋",
    ariaLabel: "Navigate to Visit Summary",
  },
] as const;

export const ADMIN_NAV_ITEMS: readonly NavItemConfig[] = [
  {
    id: "admin-dashboard",
    label: "Doctor Practice Console",
    shortLabel: "Admin",
    emoji: "🩺",
    badge: "Single Console",
    ariaLabel: "Navigate to Doctor Practice Console",
  },
  {
    id: "appointments",
    label: "Appointments",
    shortLabel: "Appt.",
    emoji: "📅",
    ariaLabel: "Navigate to Appointments",
  },
] as const;
