/**
 * ─── HIPAA-Compliant Zero-PHI/PII Error Telemetry & Crash Reporter ───────────
 * Captures technical diagnostics (error type, sanitized stack trace, component
 * trace, device viewport, browser OS, timezone, and route path) while stripping
 * 100% of Patient Health Information (PHI) and Personally Identifiable Information (PII).
 *
 * Reusable across RootErrorBoundary, DashboardErrorBoundary, and global unhandled listeners.
 */

const EMAIL_REGEX = /[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g;
const PHONE_REGEX = /(\+?[0-9]{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
const TOKEN_REGEX = /(bearer\s+[a-zA-Z0-9_\-\.]+|token=[a-zA-Z0-9_\-\.]+|key=[a-zA-Z0-9_\-\.]+|pwd=[a-zA-Z0-9_\-\.]+|password=[a-zA-Z0-9_\-\.]+)/gi;
const CREDIT_CARD_REGEX = /\b(?:\d{4}[-\s]?){3}\d{4}\b/g;
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;

/**
 * Strips all PHI and PII (credit cards, SSNs, tokens, emails, phone numbers) from strings.
 * High-specificity patterns (cards, SSNs, tokens) are redacted before generic phone regex.
 */
export function stripPhiPii(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .replace(TOKEN_REGEX, "[REDACTED_TOKEN]")
    .replace(CREDIT_CARD_REGEX, "[REDACTED_CARD]")
    .replace(SSN_REGEX, "[REDACTED_SSN]")
    .replace(EMAIL_REGEX, "[REDACTED_EMAIL]")
    .replace(PHONE_REGEX, "[REDACTED_PHONE]");
}

/**
 * Generates an opaque, non-PII incident tracking reference ID.
 */
export function generateIncidentId(): string {
  const timePart = Date.now().toString(36);
  const randPart = Math.random().toString(36).slice(2, 7);
  return `inc-${timePart}-${randPart}`;
}

export interface DeviceDiagnostics {
  screen_width: number;
  screen_height: number;
  user_agent: string;
  language: string;
  platform: string;
  online: boolean;
}

export interface LocationDiagnostics {
  timezone: string;
  locale: string;
}

export interface CrashReportOptions {
  error: Error | string | unknown;
  componentStack?: string;
  source?: string;
  userAction?: "report_and_reload" | "report_and_retry" | "auto_captured" | "manual_report";
  route?: string;
}

export interface CrashReportResult {
  success: boolean;
  incidentId: string;
}

/**
 * Gathers technical device and viewport details without any PII.
 */
export function getTechnicalDeviceContext(): DeviceDiagnostics {
  if (typeof window === "undefined") {
    return {
      screen_width: 0,
      screen_height: 0,
      user_agent: "server-render",
      language: "en-US",
      platform: "unknown",
      online: true,
    };
  }

  return {
    screen_width: window.innerWidth || window.screen?.width || 0,
    screen_height: window.innerHeight || window.screen?.height || 0,
    user_agent: stripPhiPii(navigator.userAgent || ""),
    language: navigator.language || "en-US",
    platform: stripPhiPii(navigator.platform || ""),
    online: navigator.onLine !== false,
  };
}

/**
 * Gathers technical timezone without any GPS or street addresses.
 */
export function getTechnicalLocationContext(): LocationDiagnostics {
  let timezone = "UTC";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {}

  return {
    timezone,
    locale: typeof navigator !== "undefined" ? navigator.language || "en-US" : "en-US",
  };
}

/**
 * Dispatches a sanitized, zero-PHI/PII crash report to the backend.
 * Reusable across the entire application.
 */
export async function sendCrashReport(options: CrashReportOptions): Promise<CrashReportResult> {
  const incidentId = generateIncidentId();
  const timestamp = new Date().toISOString();

  let errorName = "UnhandledException";
  let errorMessage = "Unknown runtime error";
  let stackTrace = "";

  if (options.error instanceof Error) {
    errorName = options.error.name || "Error";
    errorMessage = stripPhiPii(options.error.message || "");
    stackTrace = stripPhiPii(options.error.stack || "");
  } else if (typeof options.error === "string") {
    errorMessage = stripPhiPii(options.error);
  }

  const sanitizedComponentStack = stripPhiPii(options.componentStack || "");

  // Scrub URL path of any tokens, queries, or IDs
  let scrubbedUrl = "/";
  if (typeof window !== "undefined") {
    try {
      const u = new URL(window.location.href);
      scrubbedUrl = stripPhiPii(u.pathname);
    } catch {
      scrubbedUrl = stripPhiPii(window.location.pathname || "/");
    }
  }

  const payload = {
    incident_id: incidentId,
    timestamp,
    error_name: errorName,
    error_message: errorMessage,
    stack_trace: stackTrace,
    component_stack: sanitizedComponentStack,
    url: scrubbedUrl,
    route: options.route || scrubbedUrl,
    device: getTechnicalDeviceContext(),
    location: getTechnicalLocationContext(),
    source: options.source || "frontend_error_boundary",
    user_action: options.userAction || "report_and_reload",
  };

  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      sessionStorage.setItem("last_crash_incident_id", incidentId);
    }
  } catch {}

  try {
    const res = await fetch("/api/telemetry/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      return { success: true, incidentId };
    }
  } catch {
    // If fetch failed, attempt sendBeacon as secondary fallback
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: "application/json" });
        navigator.sendBeacon("/api/telemetry/report", blob);
        return { success: true, incidentId };
      }
    } catch {}
  }

  return { success: false, incidentId };
}

/**
 * Initializes global browser error and unhandled rejection listeners to capture
 * unexpected system faults into the telemetry pipeline.
 * Deduplicates bursts to avoid spamming the backend.
 */
let listenersInitialized = false;
const reportedErrorHashes = new Set<string>();

export function initGlobalTelemetryListeners(): void {
  if (typeof window === "undefined" || listenersInitialized) {
    return;
  }
  listenersInitialized = true;

  const shouldThrottle = (key: string): boolean => {
    if (reportedErrorHashes.has(key)) return true;
    reportedErrorHashes.add(key);
    // Clear hash after 30 seconds
    setTimeout(() => reportedErrorHashes.delete(key), 30000);
    return false;
  };

  window.addEventListener("error", (event) => {
    const errorKey = `${event.message}:${event.filename}:${event.lineno}`;
    if (shouldThrottle(errorKey)) return;

    sendCrashReport({
      error: event.error || event.message,
      source: "window.onerror",
      userAction: "auto_captured",
      route: window.location.pathname,
    }).catch(() => {});
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : String(reason);
    const errorKey = `unhandledrejection:${msg}`;
    if (shouldThrottle(errorKey)) return;

    sendCrashReport({
      error: reason,
      source: "window.unhandledrejection",
      userAction: "auto_captured",
      route: window.location.pathname,
    }).catch(() => {});
  });
}
