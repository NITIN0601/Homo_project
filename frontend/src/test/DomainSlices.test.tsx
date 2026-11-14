import React from "react";
import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import {
  AppProvider,
  useApp,
  useAuth,
  useCart,
  useNavigation,
  useScheduling,
  useClinical,
  useRequireRole,
  RbacAccessError,
} from "../context";

describe("Domain-Specific Context Slices & Facade Integration", () => {
  it("provides useAuth hook inside AppProvider", () => {
    let capturedAuth: ReturnType<typeof useAuth> | null = null;
    const Consumer: React.FC = () => {
      capturedAuth = useAuth();
      return <div data-testid="auth">{capturedAuth.authUser ? capturedAuth.authUser.role : "none"}</div>;
    };

    renderToString(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    expect(capturedAuth).not.toBeNull();
    expect(typeof capturedAuth?.login).toBe("function");
    expect(typeof capturedAuth?.logout).toBe("function");
    expect(typeof capturedAuth?.openAuthModal).toBe("function");
  });

  it("provides useCart hook inside AppProvider", () => {
    let capturedCart: ReturnType<typeof useCart> | null = null;
    const Consumer: React.FC = () => {
      capturedCart = useCart();
      return <div data-testid="cart">Total: {capturedCart.cartTotalItems}</div>;
    };

    renderToString(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    expect(capturedCart).not.toBeNull();
    expect(capturedCart?.cartTotalItems).toBe(0);
    expect(typeof capturedCart?.addToCart).toBe("function");
    expect(typeof capturedCart?.removeFromCart).toBe("function");
    expect(typeof capturedCart?.placeOrder).toBe("function");
  });

  it("provides useNavigation hook inside AppProvider", () => {
    let capturedNav: ReturnType<typeof useNavigation> | null = null;
    const Consumer: React.FC = () => {
      capturedNav = useNavigation();
      return <div data-testid="nav">{capturedNav.activePage}</div>;
    };

    renderToString(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    expect(capturedNav).not.toBeNull();
    expect(capturedNav?.activePage).toBeDefined();
    expect(typeof capturedNav?.navigateTo).toBe("function");
    expect(typeof capturedNav?.setAdminTab).toBe("function");
  });

  it("provides useScheduling hook inside AppProvider", () => {
    let capturedScheduling: ReturnType<typeof useScheduling> | null = null;
    const Consumer: React.FC = () => {
      capturedScheduling = useScheduling();
      return <div data-testid="sched">TZ: {capturedScheduling.userTimezone}</div>;
    };

    renderToString(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    expect(capturedScheduling).not.toBeNull();
    expect(typeof capturedScheduling?.blockDate).toBe("function");
    expect(typeof capturedScheduling?.bookAppointment).toBe("function");
    expect(typeof capturedScheduling?.isSlotBooked).toBe("function");
    expect(capturedScheduling?.clinicTimeInfo).toBeDefined();
  });

  it("provides useClinical hook inside AppProvider", () => {
    let capturedClinical: ReturnType<typeof useClinical> | null = null;
    const Consumer: React.FC = () => {
      capturedClinical = useClinical();
      return <div data-testid="clinical">Visits: {Object.keys(capturedClinical.visitSummaries).length}</div>;
    };

    renderToString(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    expect(capturedClinical).not.toBeNull();
    expect(typeof capturedClinical?.addVisitSummary).toBe("function");
    expect(typeof capturedClinical?.postConsultationInvoice).toBe("function");
    expect(typeof capturedClinical?.submitConsultationPayment).toBe("function");
  });

  it("backwards-compatible useApp facade exposes unified interface", () => {
    let capturedApp: ReturnType<typeof useApp> | null = null;
    const Consumer: React.FC = () => {
      capturedApp = useApp();
      return <div>Unified App Facade</div>;
    };

    renderToString(
      <AppProvider>
        <Consumer />
      </AppProvider>
    );

    expect(capturedApp).not.toBeNull();
    expect(capturedApp?.state).toBeDefined();
    expect(capturedApp?.dispatch).toBeDefined();
    expect(typeof capturedApp?.navigateTo).toBe("function");
    expect(typeof capturedApp?.addToCart).toBe("function");
    expect(typeof capturedApp?.bookAppointment).toBe("function");
    expect(typeof capturedApp?.postConsultationInvoice).toBe("function");
  });

  it("throws RbacAccessError when guest accesses protected resource via useRequireRole", () => {
    const ProtectedComponent: React.FC = () => {
      useRequireRole("admin");
      return <div>Admin Secret</div>;
    };

    expect(() => {
      renderToString(
        <AppProvider>
          <ProtectedComponent />
        </AppProvider>
      );
    }).toThrow(RbacAccessError);
  });
});

