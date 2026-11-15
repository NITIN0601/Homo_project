import type { TimezoneOption } from "./types";

export const CANONICAL_TIMEZONE_ABBREVIATIONS: Record<string, string> = {
  "Asia/Kolkata": "IST",
  "America/New_York": "EST/EDT",
  "America/Chicago": "CST/CDT",
  "America/Denver": "MST/MDT",
  "America/Phoenix": "MST",
  "America/Los_Angeles": "PST/PDT",
  "Europe/London": "GMT/BST",
  "Europe/Paris": "CET/CEST",
  "Europe/Berlin": "CET/CEST",
  "Asia/Dubai": "GST",
  "Asia/Singapore": "SGT",
  "Australia/Sydney": "AEST/AEDT",
  "Australia/Perth": "AWST",
  "America/Toronto": "EST/EDT",
  "America/Vancouver": "PST/PDT",
  "Asia/Tokyo": "JST",
  "Pacific/Auckland": "NZST/NZDT",
};

export const COMMON_TIMEZONES: TimezoneOption[] = [
  { timeZone: "Asia/Kolkata", label: "India Standard Time (IST, UTC+5:30)", region: "India (Clinic SSOT)", offset: "UTC+05:30" },
  { timeZone: "America/New_York", label: "US Eastern Time (EDT / EST)", region: "United States (Eastern)", offset: "UTC-05:00" },
  { timeZone: "America/Chicago", label: "US Central Time (CDT / CST)", region: "United States (Central)", offset: "UTC-06:00" },
  { timeZone: "America/Denver", label: "US Mountain Time (MDT / MST)", region: "United States (Mountain)", offset: "UTC-07:00" },
  { timeZone: "America/Phoenix", label: "US Arizona (MST, No DST)", region: "United States (Arizona)", offset: "UTC-07:00" },
  { timeZone: "America/Los_Angeles", label: "US Pacific Time (PDT / PST)", region: "United States (Pacific)", offset: "UTC-08:00" },
  { timeZone: "Europe/London", label: "UK / London (BST / GMT)", region: "United Kingdom", offset: "UTC+00:00" },
  { timeZone: "Europe/Paris", label: "Central European Time (CET / CEST)", region: "Western Europe", offset: "UTC+01:00" },
  { timeZone: "Asia/Dubai", label: "Gulf Standard Time (GST, UTC+4)", region: "United Arab Emirates", offset: "UTC+04:00" },
  { timeZone: "Asia/Singapore", label: "Singapore Time (SGT, UTC+8)", region: "Singapore", offset: "UTC+08:00" },
  { timeZone: "Australia/Sydney", label: "Sydney / Melbourne (AEST / AEDT)", region: "Australia (Eastern)", offset: "UTC+10:00" },
  { timeZone: "Australia/Perth", label: "Western Australia (AWST)", region: "Australia (Western)", offset: "UTC+08:00" },
  { timeZone: "America/Toronto", label: "Eastern Canada (EDT / EST)", region: "Canada (Eastern)", offset: "UTC-05:00" },
  { timeZone: "America/Vancouver", label: "Pacific Canada (PDT / PST)", region: "Canada (Pacific)", offset: "UTC-08:00" },
  { timeZone: "Asia/Tokyo", label: "Japan Standard Time (JST, UTC+9)", region: "Japan", offset: "UTC+09:00" },
  { timeZone: "Pacific/Auckland", label: "New Zealand Time (NZST / NZDT)", region: "New Zealand", offset: "UTC+12:00" },
];

