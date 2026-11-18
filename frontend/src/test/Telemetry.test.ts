import { describe, it, expect } from "vitest";
import {
  stripPhiPii,
  generateIncidentId,
  getTechnicalDeviceContext,
  getTechnicalLocationContext,
} from "../core/observability/telemetry";

describe("Telemetry & Crash Reporting HIPAA Sanitizer", () => {
  it("scrubs email addresses from diagnostic strings", () => {
    const raw = "Crash while processing patient alice.smith@domain.com in table";
    const scrubbed = stripPhiPii(raw);
    expect(scrubbed).not.toContain("alice.smith@domain.com");
    expect(scrubbed).toContain("[REDACTED_EMAIL]");
  });

  it("scrubs phone numbers from stack traces or messages", () => {
    const raw = "Callback to +1-800-555-0199 failed during verification";
    const scrubbed = stripPhiPii(raw);
    expect(scrubbed).not.toContain("800-555-0199");
    expect(scrubbed).toContain("[REDACTED_PHONE]");
  });

  it("scrubs authorization tokens and keys", () => {
    const raw = "Failed request with token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and Bearer sec123";
    const scrubbed = stripPhiPii(raw);
    expect(scrubbed).not.toContain("Bearer sec123");
    expect(scrubbed).toContain("[REDACTED_TOKEN]");
  });

  it("scrubs credit cards and SSNs", () => {
    const raw = "Card 4111-2222-3333-4444 and ssn 123-45-6789";
    const scrubbed = stripPhiPii(raw);
    expect(scrubbed).toContain("[REDACTED_CARD]");
    expect(scrubbed).toContain("[REDACTED_SSN]");
  });

  it("generates opaque incident IDs matching pattern inc-[time]-[rand]", () => {
    const id = generateIncidentId();
    expect(id).toMatch(/^inc-[a-z0-9]+-[a-z0-9]+$/);
  });

  it("extracts technical device diagnostics safely without PII", () => {
    const device = getTechnicalDeviceContext();
    expect(typeof device.screen_width).toBe("number");
    expect(typeof device.screen_height).toBe("number");
    expect(typeof device.online).toBe("boolean");
    expect(typeof device.user_agent).toBe("string");
  });

  it("extracts technical location diagnostics limited to timezone", () => {
    const loc = getTechnicalLocationContext();
    expect(typeof loc.timezone).toBe("string");
    expect(loc.timezone.length).toBeGreaterThan(0);
    expect(typeof loc.locale).toBe("string");
  });
});

