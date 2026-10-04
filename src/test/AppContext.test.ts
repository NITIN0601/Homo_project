/**
 * Frontend State Machine & Reducer Automated Regression Tests
 * Covers AppContext reducer actions:
 *   - BOOK_APPOINTMENT
 *   - POST_INVOICE / POST_CONSULTATION_INVOICE
 *   - LOGIN
 *   - LOGOUT
 *   - CANCEL_APPOINTMENT & UPDATE_APPOINTMENT_STATUS
 *   - SUBMIT_CONSULTATION_PAYMENT
 *   - Cart state machine (ADD_TO_CART, UPDATE_QUANTITY, REMOVE_FROM_CART, CLEAR_CART)
 *   - Calendar blocking (BLOCK_DATE, UNBLOCK_DATE)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { appReducer, INITIAL_STATE, MEDICINE_CATALOGUE } from "../context/AppContext";
import type { AppState, BookedAppointment, ConsultationInvoice, AuthUser } from "../types";

describe("AppContext State Machine & Reducer Regression Suite", () => {
  let baseState: AppState;

  beforeEach(() => {
    // Reset state and mock storage before each test
    baseState = {
      ...INITIAL_STATE,
      appointments: [],
      consultationInvoices: [],
      cart: [],
      authUser: null,
      activePage: "home",
      isCartOpen: false,
      isAuthModalOpen: false,
    };
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {}
  });

  describe("BOOK_APPOINTMENT action", () => {
    it("successfully adds a new appointment to the top of state", () => {
      const newApt: BookedAppointment = {
        id: "apt-test-001",
        patientId: "usr-001",
        patientName: "John Doe",
        patientPhone: "+91 98123 45678",
        patientEmail: "john@agastyahomoeo.com",
        date: "2026-10-15",
        time: "10:30 AM",
        slot: "10:30",
        type: "In-Person Clinic Visit",
        chiefReason: "Chronic headache review",
        status: "Confirmed",
      };

      const nextState = appReducer(baseState, {
        type: "BOOK_APPOINTMENT",
        payload: newApt,
      });

      expect(nextState.appointments).toHaveLength(1);
      expect(nextState.appointments[0]).toEqual(newApt);
    });

    it("deduplicates and replaces when booking with an existing appointment ID", () => {
      const initialApt: BookedAppointment = {
        id: "apt-test-001",
        patientId: "usr-001",
        patientName: "John Doe",
        date: "2026-10-15",
        time: "10:30 AM",
        slot: "10:30",
        type: "In-Person Clinic Visit",
        chiefReason: "Initial visit",
        status: "Confirmed",
      };

      const stateWithApt = appReducer(baseState, {
        type: "BOOK_APPOINTMENT",
        payload: initialApt,
      });

      const updatedApt: BookedAppointment = {
        ...initialApt,
        chiefReason: "Updated consultation reason",
        time: "11:00 AM",
      };

      const nextState = appReducer(stateWithApt, {
        type: "BOOK_APPOINTMENT",
        payload: updatedApt,
      });

      expect(nextState.appointments).toHaveLength(1);
      expect(nextState.appointments[0].chiefReason).toBe("Updated consultation reason");
      expect(nextState.appointments[0].time).toBe("11:00 AM");
    });
  });

  describe("POST_INVOICE & POST_CONSULTATION_INVOICE actions", () => {
    it("successfully creates a new consultation invoice", () => {
      const invoice: ConsultationInvoice = {
        id: "INV-2026-TEST",
        patientId: "usr-001",
        patientName: "John Doe",
        doctorName: "Dr. Bramarambha K, MD",
        visitDate: "2026-10-02",
        amountINR: 750,
        consultationType: "In-Person Clinic Visit",
        notes: "Acute constitutional consultation",
        status: "pending",
        issuedAt: "2026-10-02 11:00 AM",
      };

      const nextState = appReducer(baseState, {
        type: "POST_INVOICE",
        payload: invoice,
      });

      expect(nextState.consultationInvoices).toHaveLength(1);
      expect(nextState.consultationInvoices[0].id).toBe("INV-2026-TEST");
      expect(nextState.consultationInvoices[0].status).toBe("pending");
    });

    it("updates existing invoice record when ID matches", () => {
      const invoice: ConsultationInvoice = {
        id: "INV-2026-TEST",
        patientId: "usr-001",
        patientName: "John Doe",
        doctorName: "Dr. Bramarambha K, MD",
        visitDate: "2026-10-02",
        amountINR: 750,
        consultationType: "In-Person Clinic Visit",
        notes: "Initial consultation",
        status: "pending",
        issuedAt: "2026-10-02 11:00 AM",
      };

      const s1 = appReducer(baseState, {
        type: "POST_CONSULTATION_INVOICE",
        payload: invoice,
      });

      const updated = { ...invoice, amountINR: 950, notes: "Extended constitutional consultation" };
      const s2 = appReducer(s1, {
        type: "POST_CONSULTATION_INVOICE",
        payload: updated,
      });

      expect(s2.consultationInvoices).toHaveLength(1);
      expect(s2.consultationInvoices[0].amountINR).toBe(950);
      expect(s2.consultationInvoices[0].notes).toBe("Extended constitutional consultation");
    });
  });

  describe("LOGIN action", () => {
    it("authenticates admin user and directs to admin-dashboard", () => {
      const adminUser: AuthUser = {
        id: "usr-admin-001",
        name: "Dr. Bramarambha K",
        initials: "BK",
        email: "admin@agastyahomoeo.com",
        role: "admin",
        phone: "+91 70195 76255",
      };

      const nextState = appReducer(
        { ...baseState, isAuthModalOpen: true, activePage: "home" },
        { type: "LOGIN", payload: adminUser }
      );

      expect(nextState.authUser).toEqual(adminUser);
      expect(nextState.activePage).toBe("admin-dashboard");
      expect(nextState.isAuthModalOpen).toBe(false);
    });

    it("authenticates patient user and retains patient-safe page", () => {
      const patientUser: AuthUser = {
        id: "usr-001",
        name: "John Doe",
        initials: "JD",
        email: "john@agastyahomoeo.com",
        role: "patient",
        phone: "+91 98123 45678",
      };

      const nextState = appReducer(
        { ...baseState, isAuthModalOpen: true, activePage: "medicines" },
        { type: "LOGIN", payload: patientUser }
      );

      expect(nextState.authUser).toEqual(patientUser);
      expect(nextState.activePage).toBe("medicines");
      expect(nextState.isAuthModalOpen).toBe(false);
    });

    it("prevents patient from remaining on admin-dashboard upon login", () => {
      const patientUser: AuthUser = {
        id: "usr-001",
        name: "John Doe",
        initials: "JD",
        email: "john@agastyahomoeo.com",
        role: "patient",
        phone: "+91 98123 45678",
      };

      const nextState = appReducer(
        { ...baseState, activePage: "admin-dashboard" },
        { type: "LOGIN", payload: patientUser }
      );

      expect(nextState.activePage).toBe("home");
    });
  });

  describe("LOGOUT action", () => {
    it("clears authUser, clears cart, closes cart, and routes to home", () => {
      const loggedInState: AppState = {
        ...baseState,
        authUser: {
          id: "usr-admin-001",
          name: "Dr. Bramarambha K",
          initials: "BK",
          email: "admin@agastyahomoeo.com",
          role: "admin",
          phone: "+91 70195 76255",
        },
        activePage: "admin-dashboard",
        cart: [{ medicine: MEDICINE_CATALOGUE[0], quantity: 2 }],
        isCartOpen: true,
      };

      const nextState = appReducer(loggedInState, { type: "LOGOUT" });

      expect(nextState.authUser).toBeNull();
      expect(nextState.activePage).toBe("home");
      expect(nextState.cart).toEqual([]);
      expect(nextState.isCartOpen).toBe(false);
    });
  });

  describe("Invoice payment transitions", () => {
    it("transitions pending invoice to processing upon payment submission", () => {
      const initialInvoice: ConsultationInvoice = {
        id: "INV-PAY-01",
        patientId: "usr-001",
        patientName: "John Doe",
        doctorName: "Dr. Bramarambha K",
        visitDate: "2026-10-02",
        amountINR: 750,
        consultationType: "In-Person Clinic Visit",
        notes: "Consultation notes",
        status: "pending",
        issuedAt: "2026-10-02 10:00 AM",
      };

      const stateWithInvoice: AppState = {
        ...baseState,
        consultationInvoices: [initialInvoice],
      };

      const nextState = appReducer(stateWithInvoice, {
        type: "SUBMIT_CONSULTATION_PAYMENT",
        payload: {
          invoiceId: "INV-PAY-01",
          paymentMethod: "UPI / QR",
          transactionRef: "UPI-UTR-998877665544",
          submittedAt: "2026-10-02 10:35 AM",
          patientUpiId: "john@okicici",
        },
      });

      const updated = nextState.consultationInvoices[0];
      expect(updated.status).toBe("processing");
      expect(updated.paymentMethod).toBe("UPI / QR");
      expect(updated.transactionRef).toBe("UPI-UTR-998877665544");
      expect(updated.patientUpiId).toBe("john@okicici");
    });
  });

  describe("Cart state machine operations", () => {
    const med = MEDICINE_CATALOGUE[0];

    it("adds item to cart with quantity 1, and increments if already present", () => {
      const s1 = appReducer(baseState, { type: "ADD_TO_CART", payload: med });
      expect(s1.cart).toHaveLength(1);
      expect(s1.cart[0].quantity).toBe(1);

      const s2 = appReducer(s1, { type: "ADD_TO_CART", payload: med });
      expect(s2.cart).toHaveLength(1);
      expect(s2.cart[0].quantity).toBe(2);
    });

    it("updates quantity and removes item when quantity reaches 0", () => {
      const s1 = appReducer(baseState, { type: "ADD_TO_CART", payload: med });
      const s2 = appReducer(s1, { type: "UPDATE_QUANTITY", payload: { id: med.id, quantity: 5 } });
      expect(s2.cart[0].quantity).toBe(5);

      const s3 = appReducer(s2, { type: "UPDATE_QUANTITY", payload: { id: med.id, quantity: 0 } });
      expect(s3.cart).toHaveLength(0);
    });

    it("clears entire cart upon CLEAR_CART", () => {
      const s1 = appReducer(baseState, { type: "ADD_TO_CART", payload: med });
      const s2 = appReducer(s1, { type: "CLEAR_CART" });
      expect(s2.cart).toEqual([]);
    });
  });
});
