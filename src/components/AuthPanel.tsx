import React, { useState, useRef, useEffect } from "react";
import { useApp, MOCK_ACCOUNTS } from "../context/AppContext";
import {
  USE_MOCK_DATA,
  DEMO_CREDENTIALS,
  PHASE_CONFIG,
  CLINIC,
  THEME_COLORS,
  THEME_GRADIENTS,
  PLACEHOLDERS,
} from "../config";
import { api } from "../services/api";
import type { UserProfile } from "../types";
import PhoneInput from "./PhoneInput";
import validator from "validator";
import { isValidPhoneNumber } from "libphonenumber-js";

const getInitials = (name: string): string => {
  const parts = name.trim().split(" ");
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const AuthPanel: React.FC = () => {
  const { state, login, logout, closeAuthModal, navigateTo, setAdminTab, toggleOrdersModal } = useApp();
  const { authUser, isAuthModalOpen } = state;

  // Active Auth Tab: 'signin' | 'register'
  const [authTab, setAuthTab] = useState<"signin" | "register">("signin");

  // Sign in form state
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  // Registration form state
  const [regName, setRegName]         = useState("");
  const [regEmail, setRegEmail]       = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPhone, setRegPhone]       = useState("");
  const [regStreet, setRegStreet]     = useState("");
  const [regCity, setRegCity]         = useState("");
  const [regPincode, setRegPincode]   = useState("");
  const [regUpi, setRegUpi]           = useState("");
  const [regCard, setRegCard]         = useState("");

  // OTP Verification state
  const [isOtpStep, setIsOtpStep]     = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState("584920");
  const [inputOtp, setInputOtp]       = useState("");
  const [otpError, setOtpError]       = useState<string | null>(null);

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

  // ── Submit Login ─────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!email.trim() || !validator.isEmail(email.trim())) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    // When connected to live backend/database
    if (!USE_MOCK_DATA) {
      try {
        const res = await api.auth.login(email.trim(), password);
        login(res.profile);
        setEmail("");
        setPassword("");
        setLoading(false);
        return;
      } catch (err: any) {
        setError(err.message || "Invalid email or password.");
        setLoading(false);
        return;
      }
    }

    // Fallback for Mock Demo Mode
    await new Promise((r) => setTimeout(r, 400));
    const accountKey = email.trim().toLowerCase();
    const account = MOCK_ACCOUNTS[accountKey];
    if (!account || account.password !== password) {
      setError("Invalid email or password. Please try again.");
      setLoading(false);
      return;
    }

    login(account.profile);
    setEmail("");
    setPassword("");
    setLoading(false);
  };

  // Spam & Bot Protection state (Honeypot trap)
  const [honeypot, setHoneypot] = useState("");

  // ── Request Email OTP ────────────────────────────────────────────────────────
  const handleRequestOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Bot / Spam Protection check: Honeypot field must be empty
    if (honeypot.trim().length > 0) {
      console.warn("Spam Bot Submission Blocked by Honeypot Trap.");
      return;
    }

    // Form Validations using industry-standard libraries
    if (!regName.trim() || regName.trim().length < 2) {
      setError("Full Name must be at least 2 characters.");
      return;
    }

    if (!regEmail.trim() || !validator.isEmail(regEmail.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!regPhone.trim() || !isValidPhoneNumber(regPhone.trim())) {
      setError("Please enter a valid phone number for the selected country code.");
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    const accountKey = regEmail.trim().toLowerCase();
    if (MOCK_ACCOUNTS[accountKey]) {
      setError("An account with this email already exists. Please sign in instead.");
      return;
    }

    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(randomOtp);
    setIsOtpStep(true);
  };

  // ── Submit OTP Verification & Register ────────────────────────────────────────
  const handleVerifyOtpAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (inputOtp.trim() !== generatedOtp) {
      setOtpError(`Incorrect OTP code. Enter the 6-digit code sent to ${regEmail} (Demo code: ${generatedOtp})`);
      return;
    }

    setLoading(true);

    if (!USE_MOCK_DATA) {
      try {
        const authRes = await api.auth.register({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword,
          role: "patient",
          phone: regPhone.trim(),
        });
        login(authRes.profile);
        setIsOtpStep(false);
        setLoading(false);
        return;
      } catch (err: any) {
        setOtpError(err.message || "Registration failed.");
        setLoading(false);
        return;
      }
    }

    await new Promise((r) => setTimeout(r, 400));

    const accountKey = regEmail.trim().toLowerCase();
    const newProfile: UserProfile = {
      id: `usr-${Date.now()}`,
      name: regName.trim(),
      initials: getInitials(regName),
      email: accountKey,
      role: "patient",
      phone: regPhone.trim() || "+91 98765 00000",
      address: {
        street: regStreet.trim() || "10 MG Road",
        city: regCity.trim() || CLINIC.ADDRESS.CITY,
        state: CLINIC.ADDRESS.STATE,
        pincode: regPincode.trim() || CLINIC.ADDRESS.PINCODE,
      },
      savedUpiId: regUpi.trim() || undefined,
      savedCards: regCard.trim()
        ? [
            {
              id: `card-${Date.now()}`,
              cardHolder: regName.trim(),
              cardNumber: `**** **** **** ${regCard.slice(-4)}`,
              brand: regCard.startsWith("5") ? "Mastercard" : "Visa",
              expiry: "12/28",
              isDefault: true,
            },
          ]
        : undefined,
    };

    MOCK_ACCOUNTS[accountKey] = {
      password: regPassword,
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
          /* ── Logged-in profile view ──────────────────────────────────── */
          <div className="overflow-y-auto">
            {/* Profile header */}
            <div
              className="px-5 py-5 flex items-center gap-4 text-white"
              style={{ background: THEME_GRADIENTS.PRIMARY }}
            >
              <div
                className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/40
                  flex items-center justify-center font-bold text-xl select-none flex-shrink-0"
              >
                {authUser.initials}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base leading-tight truncate">{authUser.name}</p>
                <p className="text-sage-200 text-xs mt-0.5 truncate">{authUser.email}</p>
                <span
                  className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest rounded-full px-2.5 py-0.5"
                  style={{
                    background: authUser.role === "admin" ? THEME_COLORS.ADMIN_GOLD_ALPHA_25 : THEME_COLORS.WHITE_ALPHA_20,
                    color: authUser.role === "admin" ? THEME_COLORS.ADMIN_GOLD : THEME_COLORS.SAGE_200,
                  }}
                >
                  {authUser.role === "admin" ? "🔒 Administrator" : "👤 Registered Patient"}
                </span>
              </div>
            </div>

            {/* Registered User Profile Details */}
            <div className="px-4 py-3 bg-stone-50 border-b border-stone-100 text-xs space-y-1.5">
              <p className="font-bold text-stone-500 uppercase tracking-wider text-[9px]">Registered Account Details</p>
              {authUser.phone && <p className="text-stone-700">📞 Phone: <span className="font-medium">{authUser.phone}</span></p>}
              {authUser.address && (
                <p className="text-stone-700">
                  📍 Address: <span className="font-medium">{authUser.address.street}, {authUser.address.city} - {authUser.address.pincode}</span>
                </p>
              )}
              {PHASE_CONFIG.ENABLE_PAYMENTS && authUser.savedUpiId && (
                <p className="text-stone-700 font-mono">🟢 Saved GPay: <span className="font-bold">{authUser.savedUpiId}</span></p>
              )}
              {PHASE_CONFIG.ENABLE_PAYMENTS && authUser.savedCards?.map((c) => (
                <p key={c.id} className="text-stone-700 font-mono">💳 Saved {c.brand}: <span className="font-bold">{c.cardNumber}</span></p>
              ))}
            </div>

            {/* Quick nav links */}
            <div className="py-2">
              {authUser.role === "patient" && (
                <>
                  <ProfileLink
                    emoji="📋"
                    label="My Summary & History"
                    onClick={() => { navigateTo("visit-summary"); closeAuthModal(); }}
                  />
                  <ProfileLink
                    emoji="📅"
                    label="Book Appointment"
                    onClick={() => { navigateTo("appointments"); closeAuthModal(); }}
                  />
                </>
              )}
              {authUser.role === "admin" && (
                <>
                  <ProfileLink
                    emoji="📊"
                    label="Doctor Dashboard"
                    onClick={() => { setAdminTab("dashboard"); navigateTo("admin-dashboard"); closeAuthModal(); }}
                  />
                  <ProfileLink
                    emoji="📅"
                    label="Appointments Schedule"
                    onClick={() => { setAdminTab("appointments"); navigateTo("admin-dashboard"); closeAuthModal(); }}
                  />
                  <ProfileLink
                    emoji="👥"
                    label="Patients Records"
                    onClick={() => { setAdminTab("patients"); navigateTo("admin-dashboard"); closeAuthModal(); }}
                  />
                  <ProfileLink
                    emoji="📦"
                    label="Medical Supplies & Stock"
                    onClick={() => { setAdminTab("inventory"); navigateTo("admin-dashboard"); closeAuthModal(); }}
                  />
                  <ProfileLink
                    emoji="🏖️"
                    label="Doctor Schedule & OOO"
                    onClick={() => { setAdminTab("calendar"); navigateTo("admin-dashboard"); closeAuthModal(); }}
                  />
                  <ProfileLink
                    emoji="👁️"
                    label="Preview Patient Portal"
                    onClick={() => { navigateTo("home"); closeAuthModal(); }}
                  />
                </>
              )}
              {PHASE_CONFIG.ENABLE_MEDICINE_ORDERING && (
                <ProfileLink
                  emoji="🚚"
                  label="My Orders & Tracking"
                  onClick={() => { toggleOrdersModal(true); closeAuthModal(); }}
                />
              )}
            </div>

            <div className="h-px bg-stone-100 mx-4" />

            {/* Logout */}
            <div className="p-3">
              <button
                id="logout-btn"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl
                  text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          /* ── Authentication Tabs: Sign In / Registration ───────────────── */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header Tabs */}
            <div className="flex border-b border-stone-200 bg-stone-50">
              <button
                type="button"
                onClick={() => { setAuthTab("signin"); setError(null); }}
                className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
                  authTab === "signin"
                    ? "border-emerald-600 text-emerald-800 bg-white"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab("register"); setError(null); }}
                className={`flex-1 py-3 text-xs font-bold transition-all border-b-2 ${
                  authTab === "register"
                    ? "border-emerald-600 text-emerald-800 bg-white"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                }`}
              >
                📝 Create Account
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600">
                  <span>⚠️</span> {error}
                </div>
              )}

              {authTab === "signin" ? (
                /* ── SIGN IN FORM ────────────────────────────────────────── */
                <form onSubmit={handleLogin} className="space-y-3.5" noValidate>
                  {/* 1-Click Demo Quick Sign-In */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-950 flex items-center gap-1">
                        <span>⚡</span> 1-Click Demo Login
                      </span>
                      <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded">
                        Mock SSOT
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const acc = MOCK_ACCOUNTS[DEMO_CREDENTIALS.ADMIN.email];
                          if (acc) {
                            login(acc.profile);
                            navigateTo("admin-dashboard");
                            closeAuthModal();
                          }
                        }}
                        className="w-full py-1.5 px-2 bg-emerald-800 text-white rounded-lg font-bold text-[10px] hover:bg-emerald-700 transition-all text-center flex items-center justify-center gap-1"
                      >
                        <span>🩺</span> Admin (Doctor)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const acc = MOCK_ACCOUNTS[DEMO_CREDENTIALS.PATIENT.email];
                          if (acc) {
                            login(acc.profile);
                            navigateTo("home");
                            closeAuthModal();
                          }
                        }}
                        className="w-full py-1.5 px-2 bg-white border border-emerald-300 text-emerald-900 rounded-lg font-bold text-[10px] hover:bg-emerald-100 transition-all text-center flex items-center justify-center gap-1"
                      >
                        <span>👤</span> Patient (John)
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-500 text-center font-mono">
                      {DEMO_CREDENTIALS.HINT}
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Email Address</label>
                    <input
                      ref={emailRef}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="you@agastyahomoeo.com"
                      className="w-full mt-1 rounded-xl border border-stone-200 px-3 py-2 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-stone-500">Password</label>
                    <div className="relative mt-1">
                      <input
                        type={showPwd ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setError(null); }}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-stone-200 px-3 py-2 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-600 text-xs"
                      >
                        {showPwd ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="w-full py-2.5 rounded-xl font-bold text-xs text-white btn-shadow transition-all active:scale-95 disabled:opacity-50"
                    style={{ background: THEME_GRADIENTS.PRIMARY }}
                  >
                    {loading ? "Signing in…" : "Sign In →"}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthTab("register")}
                      className="text-xs text-emerald-700 font-semibold hover:underline"
                    >
                      New patient? Register your details here →
                    </button>
                  </div>
                </form>
              ) : isOtpStep ? (
                /* ── EMAIL OTP VERIFICATION SCREEN (FOR PATIENT REGISTRATION) ────────── */
                <form onSubmit={handleVerifyOtpAndRegister} className="space-y-4 animate-fadeIn" noValidate>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-emerald-900 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="font-extrabold text-sm flex items-center gap-1.5 text-emerald-900">
                        <span>📩</span> Email OTP Verification
                      </p>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                        Patient Registration
                      </span>
                    </div>
                    <p className="text-stone-600 text-xs leading-relaxed">
                      Email OTP is required to register and verify your patient account on the portal. A 6-digit verification code has been sent to <strong>{regEmail}</strong>.
                    </p>
                    <div className="bg-emerald-100/90 border border-emerald-300 rounded-xl p-2 font-mono font-bold text-center text-emerald-800 text-xs mt-2">
                      Demo Email OTP Code: <span className="underline text-sm">{generatedOtp}</span>
                    </div>
                  </div>

                  {otpError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-xl flex items-center gap-2">
                      <span>⚠️</span> {otpError}
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Enter 6-Digit Email Registration OTP *</label>
                    <div className="relative mt-1">
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={inputOtp}
                        onChange={(e) => setInputOtp(e.target.value)}
                        placeholder="123456"
                        className="w-full text-center tracking-[0.5em] font-mono text-lg font-black py-2.5 rounded-xl border border-stone-300 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setInputOtp(generatedOtp)}
                        className="text-emerald-700 font-bold hover:underline"
                      >
                        ⚡ Auto-Fill Demo OTP ({generatedOtp})
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
                          setGeneratedOtp(newOtp);
                        }}
                        className="text-stone-500 hover:text-stone-600"
                      >
                        Resend OTP
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      disabled={loading || inputOtp.length < 6}
                      className="w-full py-3 rounded-xl font-extrabold text-xs text-white btn-shadow transition-all active:scale-95 disabled:opacity-50"
                      style={{ background: THEME_GRADIENTS.PRIMARY }}
                    >
                      {loading ? "Verifying OTP & Registering…" : "✓ Verify Email OTP & Complete Registration"}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsOtpStep(false)}
                      className="w-full py-2 text-xs font-semibold text-stone-500 hover:bg-stone-100 rounded-xl"
                    >
                      ← Back to Edit Patient Details
                    </button>
                  </div>
                </form>
              ) : (
                /* ── USER REGISTRATION FORM ─────────────────────────────── */
                <form onSubmit={handleRequestOtp} className="space-y-3" noValidate>
                  {/* Spam Bot Honeypot Trap Field */}
                  <input
                    type="text"
                    name="b_website_trap"
                    value={honeypot}
                    onChange={(e) => setHoneypot(e.target.value)}
                    className="sr-only"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />

                  <div>
                    <h3 className="font-bold text-stone-800 text-sm">Patient Registration</h3>
                    <p className="text-stone-500 text-[11px]">Register your details to save delivery address & payment methods</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Verma"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className={`w-full mt-0.5 rounded-xl border px-3 py-2 text-xs outline-none transition-all ${
                        regName && regName.trim().length < 2
                          ? "border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400"
                          : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      }`}
                    />
                    {regName && regName.trim().length < 2 && (
                      <p className="text-[10px] text-red-500 font-semibold mt-0.5">⚠️ Full name must be at least 2 characters</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Email *</label>
                      <input
                        type="email"
                        required
                        placeholder="rahul@example.com"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className={`w-full mt-0.5 rounded-xl border px-3 py-2 text-xs outline-none transition-all ${
                          regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)
                            ? "border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400"
                            : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                        }`}
                      />
                      {regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail) && (
                        <p className="text-[10px] text-red-500 font-semibold mt-0.5">⚠️ Invalid email format</p>
                      )}
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] font-bold text-stone-500 uppercase">Contact Phone Number *</label>
                      <PhoneInput
                        value={regPhone}
                        onChange={(full) => setRegPhone(full)}
                        defaultIso="IND"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase">Create Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className={`w-full mt-0.5 rounded-xl border px-3 py-2 text-xs outline-none transition-all ${
                        regPassword && regPassword.length < 6
                          ? "border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400"
                          : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                      }`}
                    />
                    {regPassword && regPassword.length < 6 && (
                      <p className="text-[10px] text-red-500 font-semibold mt-0.5">⚠️ Password must be at least 6 characters</p>
                    )}
                  </div>

                  {/* Delivery Address fields */}
                  <div className="pt-2 border-t border-stone-100 space-y-2">
                    <p className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">Default Delivery Address</p>
                    <div>
                      <input
                        type="text"
                        placeholder="Street Address (e.g. 15 Park Street)"
                        value={regStreet}
                        onChange={(e) => setRegStreet(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 px-3 py-1.5 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder={PLACEHOLDERS.CITY}
                        value={regCity}
                        onChange={(e) => setRegCity(e.target.value)}
                        className="w-full rounded-xl border border-stone-200 px-3 py-1.5 text-xs bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <div>
                        <input
                          type="text"
                          placeholder={PLACEHOLDERS.PINCODE}
                          value={regPincode}
                          onChange={(e) => setRegPincode(e.target.value)}
                          className={`w-full rounded-xl border px-3 py-1.5 text-xs outline-none ${
                            regPincode && !/^\d{6}$/.test(regPincode)
                              ? "border-red-400 bg-red-50/50"
                              : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                          }`}
                        />
                        {regPincode && !/^\d{6}$/.test(regPincode) && (
                          <p className="text-[9px] text-red-500 font-semibold mt-0.5">Must be 6 digits</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Optional saved payment credentials — Phase 2 feature */}
                  {PHASE_CONFIG.ENABLE_PAYMENTS && (
                    <div className="pt-2 border-t border-stone-100 space-y-2">
                      <p className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider">Payment Details (Optional)</p>
                      <div>
                        <input
                          type="text"
                          placeholder="GPay UPI VPA (e.g. rahul@okicici)"
                          value={regUpi}
                          onChange={(e) => setRegUpi(e.target.value)}
                          className={`w-full rounded-xl border px-3 py-1.5 text-xs font-mono outline-none ${
                            regUpi && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(regUpi)
                              ? "border-red-400 bg-red-50/50"
                              : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                          }`}
                        />
                        {regUpi && !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(regUpi) && (
                          <p className="text-[9px] text-red-500 font-semibold mt-0.5">Format: name@okicici or name@upi</p>
                        )}
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Visa/Mastercard Number (16 digits)"
                          value={regCard}
                          onChange={(e) => setRegCard(e.target.value)}
                          className={`w-full rounded-xl border px-3 py-1.5 text-xs font-mono outline-none ${
                            regCard && !/^\d{16}$/.test(regCard.replace(/\s/g, ""))
                              ? "border-red-400 bg-red-50/50"
                              : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                          }`}
                        />
                        {regCard && !/^\d{16}$/.test(regCard.replace(/\s/g, "")) && (
                          <p className="text-[9px] text-red-500 font-semibold mt-0.5">Card number must be 16 digits</p>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !regName || !regEmail || !regPassword}
                    className="w-full py-3 rounded-xl font-extrabold text-xs text-white btn-shadow transition-all active:scale-95 disabled:opacity-50 mt-2"
                    style={{ background: THEME_GRADIENTS.PRIMARY }}
                  >
                    Send Email OTP Verification Code →
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const ProfileLink: React.FC<{ emoji: string; label: string; onClick: () => void }> = ({
  emoji, label, onClick,
}) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-3 px-5 py-2.5 text-xs font-medium text-stone-700
      hover:bg-stone-50 transition-colors text-left"
  >
    <span aria-hidden="true" className="text-base">{emoji}</span>
    {label}
  </button>
);

export default AuthPanel;
