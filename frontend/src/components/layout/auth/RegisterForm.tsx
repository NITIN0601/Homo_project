import React, { useState } from "react";
import PhoneInput from "../../forms/PhoneInput";
import { TermsPrivacyModal } from "../../modals/TermsPrivacyModal";
import {
  PHASE_CONFIG,
  PLACEHOLDERS,
  THEME_GRADIENTS,
} from "../../../config";
import { MOCK_ACCOUNTS } from "../../../data/mocks";
import { validateEmail, validateFullName, validatePhone } from "../../../utils/validation";

export interface RegisterFormData {
  name: string;
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  street: string;
  city: string;
  pincode: string;
  upi: string;
  card: string;
}

interface RegisterFormProps {
  onRequestOtp: (data: RegisterFormData) => void;
  onGoogleSignUp: (email?: string, name?: string) => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onRequestOtp,
  onGoogleSignUp,
}) => {
  const [regFirstName, setRegFirstName]   = useState("");
  const [regMiddleName, setRegMiddleName] = useState("");
  const [regLastName, setRegLastName]     = useState("");
  const [regName, setRegName]             = useState("");
  const [regEmail, setRegEmail]           = useState("");
  const [regEmailTouched, setRegEmailTouched] = useState(false);
  const [regPassword, setRegPassword]     = useState("");
  const [regPhone, setRegPhone]           = useState("");
  const [regStreet, setRegStreet]         = useState("");
  const [regCity, setRegCity]             = useState("");
  const [regPincode, setRegPincode]       = useState("");
  const [regUpi, setRegUpi]               = useState("");
  const [regCard, setRegCard]             = useState("");

  const [honeypot, setHoneypot]                 = useState("");
  const [agreedToTerms, setAgreedToTerms]       = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [error, setError]                       = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Bot / Spam Protection check: Honeypot field must be empty
    if (honeypot.trim().length > 0) {
      console.warn("Spam Bot Submission Blocked by Honeypot Trap.");
      return;
    }

    const nameVal = validateFullName(regName);
    if (!nameVal.isValid) {
      setError(nameVal.error || "Full Name must be at least 2 characters.");
      return;
    }

    const emailVal = validateEmail(regEmail);
    if (!emailVal.isValid) {
      setError(emailVal.error || "Please enter a valid email address.");
      return;
    }

    const phoneVal = validatePhone(regPhone);
    if (!phoneVal.isValid) {
      setError(phoneVal.error || "Please enter a valid phone number for the selected country code.");
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

    onRequestOtp({
      name: regName.trim(),
      firstName: regFirstName.trim(),
      middleName: regMiddleName.trim(),
      lastName: regLastName.trim(),
      email: accountKey,
      phone: regPhone.trim(),
      password: regPassword,
      street: regStreet.trim(),
      city: regCity.trim(),
      pincode: regPincode.trim(),
      upi: regUpi.trim(),
      card: regCard.trim(),
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600">
            <span>⚠️</span> {error}
          </div>
        )}

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
          <p className="text-stone-500 text-[11px]">Register your details to save delivery address &amp; payment methods</p>
        </div>

        {/* 1-Click Fast Google Sign-Up (Passwordless) */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-sm">⚡</span>
            <span className="text-xs font-bold text-emerald-950">1-Click Patient Sign-Up</span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-snug">
            No password required. Connect your Google account to register instantly.
          </p>
          <button
            type="button"
            onClick={() => onGoogleSignUp(regEmail || undefined, regName || undefined)}
            className="w-full py-2 px-3 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 font-bold text-xs text-stone-700 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.42 7.33 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.58 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Sign Up with Google (Passwordless)</span>
          </button>
        </div>

        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-[10px] font-bold text-stone-400">or register with email</span>
          </div>
        </div>

        {/* First Name (compulsory), Middle Name (optional), Last Name (compulsory) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">First Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rahul"
              value={regFirstName}
              onChange={(e) => {
                const val = e.target.value;
                setRegFirstName(val);
                setRegName([val, regMiddleName, regLastName].filter(Boolean).join(" ").trim());
              }}
              className={`w-full mt-0.5 rounded-xl border px-3 py-2 text-xs outline-none transition-all ${
                regFirstName && regFirstName.trim().length < 2
                  ? "border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400"
                  : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              }`}
            />
            {regFirstName && regFirstName.trim().length < 2 && (
              <p className="text-[10px] text-red-500 font-semibold mt-0.5">⚠️ Min 2 chars</p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">Middle Name</label>
            <input
              type="text"
              placeholder="(Optional)"
              value={regMiddleName}
              onChange={(e) => {
                const val = e.target.value;
                setRegMiddleName(val);
                setRegName([regFirstName, val, regLastName].filter(Boolean).join(" ").trim());
              }}
              className="w-full mt-0.5 rounded-xl border border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 px-3 py-2 text-xs outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">Last Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Verma"
              value={regLastName}
              onChange={(e) => {
                const val = e.target.value;
                setRegLastName(val);
                setRegName([regFirstName, regMiddleName, val].filter(Boolean).join(" ").trim());
              }}
              className={`w-full mt-0.5 rounded-xl border px-3 py-2 text-xs outline-none transition-all ${
                regLastName && regLastName.trim().length < 2
                  ? "border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400"
                  : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              }`}
            />
            {regLastName && regLastName.trim().length < 2 && (
              <p className="text-[10px] text-red-500 font-semibold mt-0.5">⚠️ Min 2 chars</p>
            )}
          </div>
        </div>

        {/* Live Computed Full Name Preview */}
        {regName.trim() && (
          <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl px-3 py-1.5 flex items-center justify-between text-[11px]">
            <span className="text-stone-500 font-medium">Full Name (for Records &amp; Invoices):</span>
            <strong className="text-emerald-950 font-bold">{regName}</strong>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-bold text-stone-500 uppercase">Email *</label>
            <input
              type="email"
              required
              placeholder="rahul@example.com"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              onBlur={() => setRegEmailTouched(true)}
              className={`w-full mt-0.5 rounded-xl border px-3 py-2 text-xs outline-none transition-all ${
                regEmailTouched && regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)
                  ? "border-red-400 bg-red-50/50 focus:ring-2 focus:ring-red-400"
                  : "border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500"
              }`}
            />
            {regEmailTouched && regEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail) && (
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

        {/* Terms & Conditions / Privacy Policy Agreement Checkbox */}
        <div className="pt-2 border-t border-stone-100 space-y-1">
          <label className="flex items-start gap-2.5 cursor-pointer text-[11px] text-stone-700 select-none">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="w-4 h-4 accent-emerald-700 rounded mt-0.5 shrink-0 cursor-pointer"
              required
            />
            <span>
              I have read and agree to the{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setIsTermsModalOpen(true);
                }}
                className="text-emerald-700 underline font-bold hover:text-emerald-950 inline cursor-pointer"
              >
                Terms of Service &amp; DPDP / HIPAA Privacy Policy
              </button>
              .
            </span>
          </label>
          {!agreedToTerms && (
            <p className="text-[10px] text-stone-400 pl-6.5">
              Click the link above to review the policy document in-page.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!regName || !regEmail || !regPassword || !agreedToTerms}
          className="w-full py-3 rounded-xl font-extrabold text-xs text-white btn-shadow transition-all active:scale-95 disabled:opacity-50 mt-2 cursor-pointer"
          style={{ background: THEME_GRADIENTS.PRIMARY }}
        >
          Send Email OTP Verification Code →
        </button>
      </form>

      <TermsPrivacyModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        onAccept={() => setAgreedToTerms(true)}
      />
    </>
  );
};

