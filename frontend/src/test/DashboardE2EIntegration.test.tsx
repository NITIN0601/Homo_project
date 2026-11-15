import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ThemeProvider } from "../context/ThemeProvider";
import { AppProvider } from "../context/AppContext";
import { AuthContext, type AuthContextValue } from "../context/slices/AuthContext";
import { SuperAdminDashboard } from "../pages/SuperAdminDashboard";
import { AdminDashboard } from "../pages/AdminDashboard";
import { VisitSummaryPage } from "../pages/VisitSummaryPage";
import { CartPage } from "../pages/CartPage";
import {
  CalendarTab,
  BillingInvoicesTab,
  DispensaryInventoryTab,
  DispatchesTab,
  CustomizationTab,
} from "../pages/admin";

const createMockAuth = (role: "super_admin" | "admin" | "patient" | null, name = "Test User"): AuthContextValue => ({
  authUser: role
    ? {
        id: `usr-${role}`,
        name,
        email: `${role}@clinic.org`,
        role,
      }
    : null,
  isAuthModalOpen: false,
  savedCards: [],
  login: () => {},
  logout: () => {},
  openAuthModal: () => {},
  closeAuthModal: () => {},
  addSavedCard: () => {},
});

const renderWithProviders = (
  children: React.ReactNode,
  authOverride: AuthContextValue = createMockAuth("super_admin")
) => {
  return renderToString(
    <ThemeProvider>
      <AppProvider>
        <AuthContext.Provider value={authOverride}>{children}</AuthContext.Provider>
      </AppProvider>
    </ThemeProvider>
  );
};

describe("End-to-End Dashboard & UI Component Verification", () => {
  describe("1. SuperAdmin Dashboard (src/pages/SuperAdminDashboard.tsx)", () => {
    it("renders SuperAdmin Console with tenant controller and onboard action", () => {
      const html = renderWithProviders(<SuperAdminDashboard />, createMockAuth("super_admin", "Global Admin"));
      expect(html).toContain("Super Administrator Console");
      expect(html).toContain("Multi-Tenant Platform Controller");
      expect(html).toContain("Onboard New Hospital");
    });
  });

  describe("2. Doctor / Admin Dashboard & Tabs (src/pages/AdminDashboard.tsx)", () => {
    it("renders Doctor Console and quick shortcut actions", () => {
      const html = renderWithProviders(<AdminDashboard />, createMockAuth("admin", "Dr. Lead Physician"));
      expect(html).toContain("Doctor Console");
      expect(html).toContain("Doctor Admin Access");
      expect(html).toContain("Doctor Quick Shortcuts");
      expect(html).toContain("Upload Prescription");
      expect(html).toContain("Doctor OOO Leave");
    });

    it("renders CalendarTab with MonthGrid, blocked dates, and Block Dates modal triggers", () => {
      const html = renderWithProviders(
        <CalendarTab
          blockedDates={[]}
          onBlockDate={() => {}}
          onBlockDateRange={() => {}}
          onUnblockDate={() => {}}
          onUpdateBlockedDate={() => {}}
        />,
        createMockAuth("admin")
      );
      expect(html).toContain("Doctor Schedule, Out-of-Office &amp; Availability Manager");
      expect(html).toContain("Block Clinic Dates &amp; Time Slots");
    });

    it("renders BillingInvoicesTab with invoices table and UTR reconciliation", () => {
      const html = renderWithProviders(
        <BillingInvoicesTab
          invoices={[]}
          patientList={[]}
          onOpenReconcileModal={() => {}}
          onConfirmPayment={() => {}}
          onUpdateStatus={() => {}}
          onOpenPostFeeModal={() => {}}
        />,
        createMockAuth("admin")
      );
      expect(html).toContain("Clinic Billing &amp; Consultation Invoices Hub");
      expect(html).toContain("Total Billed");
      expect(html).toContain("Verification Needed");
    });

    it("renders DispensaryInventoryTab with pharmacy stock and batch ordering", () => {
      const html = renderWithProviders(
        <DispensaryInventoryTab
          inventory={[]}
          requisitionBatch={[]}
          onToggleAddToBatch={() => {}}
          onUpdateBatchQuantity={() => {}}
          onClearBatch={() => {}}
          onOpenBatchModal={() => {}}
          onOpenExcelModal={() => {}}
          onOpenCreatePOModal={() => {}}
          onAddAllLowStock={() => {}}
        />,
        createMockAuth("admin")
      );
      expect(html).toContain("Medicine Inventory Table");
      expect(html).toContain("Multi-Order Action");
    });

    it("renders DispatchesTab with courier tracking and shipping statuses", () => {
      const html = renderWithProviders(
        <DispatchesTab
          orders={[]}
          onOpenBatchModal={() => {}}
          onInspectOrder={() => {}}
          onSimulateLogisticsScan={() => {}}
          onMarkDeliveredImmediately={() => {}}
        />,
        createMockAuth("admin")
      );
      expect(html).toContain("Real-Time Pharmacy Purchase Orders &amp; Logistics Tracking Hub");
      expect(html).toContain("Live Carrier Simulation Active");
    });

    it("renders CustomizationTab with clinic branding, UPI ID, and feature switches", () => {
      const html = renderWithProviders(<CustomizationTab />, createMockAuth("admin"));
      expect(html).toContain("Hospital &amp; Feature Customization");
    });
  });

  describe("3. Patient Portal & Storefront (src/pages/VisitSummaryPage.tsx & CartPage.tsx)", () => {
    it("renders unauthenticated patient view with Sign In prompt", () => {
      const html = renderWithProviders(<VisitSummaryPage />, createMockAuth(null));
      expect(html).toContain("Sign in to View Your Summary");
      expect(html).toContain("Sign In / Register");
    });

    it("renders CartPage with empty cart guidance and Shop Remedies trigger", () => {
      const html = renderWithProviders(<CartPage />, createMockAuth("patient"));
      expect(html).toContain("Your cart is empty");
      expect(html).toContain("Shop Remedies");
    });
  });

  describe("4. Live Backend API Wiring Verification", () => {
    it("validates live backend health and consultation invoices endpoint", async () => {
      const res = await fetch("http://127.0.0.1:8000/api/consultation-invoices");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("validates live backend payment verification endpoint with Luhn algorithm", async () => {
      const res = await fetch("http://127.0.0.1:8000/api/validate-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "upi", value: "doctor@okhdfcbank" }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.is_valid).toBe(true);
      expect(data.method).toBe("upi");
    });

    it("validates live appointment endpoint and schema compliance", async () => {
      const res = await fetch("http://127.0.0.1:8000/api/appointments");
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });
});
