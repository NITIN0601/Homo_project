import React, { useState, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useTenant } from "../../context/ThemeProvider";
import { MOCK_ACCOUNTS } from "../../data/mocks";
import { USE_MOCK_DATA, CLINIC } from "../../config";
import { api } from "../../services/api";
import type { UserProfile } from "../../types";
import {
  UserProfileMenu,
  LoginForm,
  RegisterForm,
  type RegisterFormData,
  OtpVerificationView,
} from "./auth";

const getInitials = (name: string): string => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const AuthPanel: React.FC = () => {
  const { state, login, logout, closeAuthModal, navigateTo, setAdminTab, toggleOrdersModal } = useApp();
  const { tenant } = useTenant();
  const { authUser, isAuthModalOpen } = state;

  // Active Auth Tab: 'signin' | 'register'
  const [authTab, setAuthTab] = useState<"signin" | "register">("signin");
  const [loading, setLoading] = useState(false);

  // OTP Verification state
  const [isOtpStep, setIsOtpStep]         = useState(false);
  const [generatedOtp, setGeneratedOtp]   = useState("584920");
  const [pendingRegisterData, setPendingRegisterData] = useState<RegisterFormData | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Focus email input when panel opens
  useEffect(() => {
    if (isAuthModalOpen && !authUser) {
      setTimeout(() => emailRef.current?.focus(), 60);
    }
  }, [isAuthModalOpen, authUser]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isAuthModalOpen) closeAuthModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isAuthModalOpen, closeAuthModal]);

  // Close on outside click
  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (isAuthModalOpen && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeAuthModal();
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [isAuthModalOpen, closeAuthModal]);

  // ── Handle Email/Password Login ──────────────────────────────────────────────
  const handleLogin = async (email: string, password: string): Promise<void> => {
    setLoading(true);

    if (!USE_MOCK_DATA) {
      try {
        const res = await api.auth.login(email.trim(), password);
        login(res.profile);
        setLoading(false);
        return;
      } catch (err: any) {
        setLoading(false);
        throw new Error(err.message || "Invalid email or password.");
      }
    }

    // Mock Demo Mode
    await new Promise((r) => setTimeout(r, 400));
    const accountKey = email.trim().toLowerCase();
    const account = MOCK_ACCOUNTS[accountKey];
    if (!account || account.password !== password) {
      setLoading(false);
      throw new Error("Invalid email or password. Please try again.");
    }

    login(account.profile);
    setLoading(false);
  };

  // ── Handle Quick Demo Sign-In ───────────────────────────────────────────────
  const handleQuickDemoLogin = (email: string) => {
    const acc = MOCK_ACCOUNTS[email];
    if (acc) {
      login(acc.profile);
      if (acc.profile.role === "super_admin") {
        navigateTo("super-admin-dashboard");
      } else if (acc.profile.role === "admin") {
        navigateTo("admin-dashboard");
      } else {
        navigateTo("home");
      }
      closeAuthModal();
    }
  };

  // ── Google OAuth Sign-In (Passwordless for Patients) ───────────────────────
  const handleGoogleSignIn = async (customEmail?: string, customName?: string): Promise<void> => {
    setLoading(true);
    try {
      const targetEmail = (customEmail || "patient.google@gmail.com").trim().toLowerCase();
      const targetName = (
        customName ||
        (targetEmail.includes("@") ? targetEmail.split("@")[0].replace(/[._]/g, " ") : "Google Patient")
      ).trim();

      const authRes = await api.auth.google({
        email: targetEmail,
        name: targetName,
        portal_intent: "patient",
        hospital_id: tenant.id || "default",
      });
      login(authRes.profile);
      closeAuthModal();
    } finally {
      setLoading(false);
    }
  };

  // ── Trigger OTP step from registration form ─────────────────────────────────
  const handleRequestOtp = (data: RegisterFormData) => {
    setPendingRegisterData(data);
    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomOtp);
    setIsOtpStep(true);
  };

  // ── Verify OTP & Complete Registration ─────────────────────────────────────
  const handleVerifyOtpAndRegister = async (_otp: string): Promise<void> => {
    if (!pendingRegisterData) return;
    setLoading(true);

    if (!USE_MOCK_DATA) {
      try {
        const authRes = await api.auth.register({
          name: pendingRegisterData.name,
          first_name: pendingRegisterData.firstName || undefined,
          middle_name: pendingRegisterData.middleName || undefined,
          last_name: pendingRegisterData.lastName || undefined,
          email: pendingRegisterData.email,
          password: pendingRegisterData.password,
          role: "patient",
          phone: pendingRegisterData.phone,
        });
        login(authRes.profile);
        setIsOtpStep(false);
        setLoading(false);
        return;
      } catch (err: any) {
        setLoading(false);
        throw new Error(err.message || "Registration failed.");
      }
    }

    await new Promise((r) => setTimeout(r, 400));

    const newProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      name: pendingRegisterData.name,
      firstName: pendingRegisterData.firstName || undefined,
      middleName: pendingRegisterData.middleName || undefined,
      lastName: pendingRegisterData.lastName || undefined,
      initials: getInitials(pendingRegisterData.name),
      email: pendingRegisterData.email,
      role: "patient",
      phone: pendingRegisterData.phone || "+91 98765 00000",
      address: {
        street: pendingRegisterData.street || "10 MG Road",
        city: pendingRegisterData.city || CLINIC.ADDRESS.CITY,
        state: CLINIC.ADDRESS.STATE,
        pincode: pendingRegisterData.pincode || CLINIC.ADDRESS.PINCODE,
      },
      savedUpiId: pendingRegisterData.upi || undefined,
      savedCards: pendingRegisterData.card
        ? [
            {
              id: `card-${Date.now()}`,
              cardHolder: pendingRegisterData.name,
              cardNumber: `**** **** **** ${pendingRegisterData.card.slice(-4)}`,
              brand: pendingRegisterData.card.startsWith("5") ? "Mastercard" : "Visa",
              expiry: "12/28",
              isDefault: true,
            },
          ]
        : undefined,
    };

    MOCK_ACCOUNTS[pendingRegisterData.email] = {
      password: pendingRegisterData.password,
      profile: newProfile,
    };

    login(newProfile);
    setIsOtpStep(false);
    setLoading(false);
  };

  const handleLogout = () => {
    logout();
    navigateTo("home");
  };

  if (!isAuthModalOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs" onClick={closeAuthModal} aria-hidden="true" />

      {/* Auth Panel Drawer */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={authUser ? "Profile menu" : "Sign in or register"}
        className="fixed sm:absolute inset-x-3 sm:inset-x-auto sm:right-0 top-16 sm:top-[calc(100%+8px)] z-50 w-auto sm:w-[350px] max-w-sm sm:max-w-none mx-auto max-h-[85dvh] bg-white
          rounded-2xl sm:rounded-3xl card-shadow border border-stone-100 overflow-hidden flex flex-col shadow-2xl"
        style={{ animation: "fadeInUp 0.18s ease both" }}
      >
        {authUser ? (
          <UserProfileMenu
            authUser={authUser}
            onLogout={handleLogout}
            onNavigate={navigateTo}
            onSetAdminTab={setAdminTab}
            onToggleOrders={toggleOrdersModal}
            onClose={closeAuthModal}
          />
        ) : (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header Tabs */}
            <div className="flex border-b border-stone-200 bg-stone-50">
              <button
                type="button"
                onClick={() => setAuthTab("signin")}
                className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  authTab === "signin"
                    ? "border-emerald-600 text-emerald-800 bg-white"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setAuthTab("register")}
                className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                  authTab === "register"
                    ? "border-emerald-600 text-emerald-800 bg-white"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                📝 Create Account
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {authTab === "signin" ? (
                <LoginForm
                  emailInputRef={emailRef}
                  loading={loading}
                  onLogin={handleLogin}
                  onGoogleSignIn={() => handleGoogleSignIn()}
                  onSwitchToRegister={() => setAuthTab("register")}
                  onQuickDemoLogin={handleQuickDemoLogin}
                />
              ) : isOtpStep && pendingRegisterData ? (
                <OtpVerificationView
                  regEmail={pendingRegisterData.email}
                  generatedOtp={generatedOtp}
                  loading={loading}
                  onVerifyAndRegister={handleVerifyOtpAndRegister}
                  onResendOtp={() => {
                    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
                    setGeneratedOtp(newOtp);
                  }}
                  onBack={() => setIsOtpStep(false)}
                />
              ) : (
                <RegisterForm
                  onRequestOtp={handleRequestOtp}
                  onGoogleSignUp={(em, nm) => {
                    void handleGoogleSignIn(em, nm);
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AuthPanel;
