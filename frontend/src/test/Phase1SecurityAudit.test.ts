import { describe, it, expect, beforeEach, vi } from "vitest";
import { tokenStorage } from "../services/tokenStorage";
import { coreFetch, generateRequestId } from "../services/httpClient";
import { getInitialAuthUser } from "../context/appInitialState";
import { appReducer, INITIAL_STATE } from "../context/AppContext";
import { resolveActiveHospitalTenant } from "../services/tenantResolver";
import { auditService } from "../services/auditService";
import { paymentGatewayService } from "../services/paymentGatewayService";
import type { ConsultationInvoice } from "../types";

describe("Phase 1: Immediate Blockers & Security Hardening Verification", () => {
  beforeEach(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
    tokenStorage.clearToken();
    auditService.clearMemoryLogs();
  });

  describe("1. Token Storage Abstraction (Fix 1)", () => {
    it("stores and retrieves token with in-memory preference", () => {
      expect(tokenStorage.getToken()).toBeNull();
      tokenStorage.setToken("jwt_test_token_abc");
      expect(tokenStorage.getToken()).toBe("jwt_test_token_abc");

      tokenStorage.clearToken();
      expect(tokenStorage.getToken()).toBeNull();
    });
  });

  describe("2. HTTP Client Security Headers & Tracing (Fix 2)", () => {
    it("generates UUID correlation IDs for request tracing", () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
    });
  });

  describe("3. Port-Based and URL Role Privilege Escalation Removal (Fix 3)", () => {
    it("never grants admin role from URL ?role=admin or port 5174", () => {
      const originalWindow = (globalThis as any).window;
      (globalThis as any).window = {
        location: new URL("http://localhost:5174/?role=super_admin"),
      };

      const user = getInitialAuthUser();
      expect(user).toBeNull(); // Must not auto-grant super_admin or admin!

      (globalThis as any).window = originalWindow;
    });
  });

  describe("4. State Flush on Tenant Switch (Fix 4)", () => {
    it("flushes clinical EHR and appointment cache on RESET_CLINICAL_STATE", () => {
      const dirtyState = {
        ...INITIAL_STATE,
        appointments: [{ id: "apt-1", patientName: "Secret Apollo Patient" } as any],
        blockedDates: [{ id: "b-1", date: "2026-10-10" } as any],
        visitSummaries: { "p-1": { patientId: "p-1", patientName: "Secret File", visits: [] } as any },
        consultationInvoices: [{ id: "inv-1", patientName: "Private Patient", amountINR: 1000 } as any],
      };

      const cleanState = appReducer(dirtyState, { type: "RESET_CLINICAL_STATE" });
      expect(cleanState.appointments).toHaveLength(0);
      expect(cleanState.blockedDates).toHaveLength(0);
      expect(Object.keys(cleanState.visitSummaries)).toHaveLength(0);
      expect(cleanState.consultationInvoices).toHaveLength(0);
    });
  });

  describe("5. Audit Service Clinical Action Logging (Fix 7)", () => {
    it("logs ePHI access actions with actor, tenant and timestamp", async () => {
      const entry = await auditService.logAction("VIEWED_PATIENT_CHART", {
        actorId: "dr-001",
        actorRole: "admin",
        targetPatientId: "usr-001",
        details: { section: "clinical_notes" },
      });

      expect(entry.action).toBe("VIEWED_PATIENT_CHART");
      expect(entry.actorId).toBe("dr-001");
      expect(entry.targetPatientId).toBe("usr-001");
      expect(entry.timestamp).toBeDefined();

      const recent = auditService.getRecentLogs();
      expect(recent).toHaveLength(1);
      expect(recent[0].id).toBe(entry.id);
    });
  });

  describe("6. Payment Gateway Contract (Fix 8)", () => {
    it("processes payment via gateway contract without fake Math.random() timeout", async () => {
      const mockInvoice: ConsultationInvoice = {
        id: "inv-pay-01",
        patientId: "usr-001",
        patientName: "Jane Doe",
        doctorName: "Dr. Doctor",
        visitDate: "2026-11-18",
        amountINR: 500,
        consultationType: "In-Person Hospital Visit",
        status: "pending",
        issuedAt: new Date().toISOString(),
      };

      const res = await paymentGatewayService.processPayment({
        invoice: mockInvoice,
        paymentMethod: "upi",
        patientUpiId: "jane@okaxis",
      });

      expect(res.success).toBe(true);
      expect(res.orderId).toContain("order_");
      expect(res.transactionRef).toMatch(/^UPI-\d+-IN$/);
      expect(res.method).toBe("UPI");
    });
  });
});
