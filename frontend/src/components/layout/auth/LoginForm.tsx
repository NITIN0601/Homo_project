import React, { useState } from "react";
import { DEMO_CREDENTIALS, THEME_GRADIENTS } from "../../../config";
import { validateEmail } from "../../../utils/validation";

interface LoginFormProps {
  emailInputRef: React.RefObject<HTMLInputElement | null>;
  loading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onSwitchToRegister: () => void;
  onQuickDemoLogin: (email: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  emailInputRef,
  loading,
  onLogin,
  onGoogleSignIn,
  onSwitchToRegister,
  onQuickDemoLogin,
}) => {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [showPwd, setShowPwd]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailVal = validateEmail(email);
    if (!emailVal.isValid) {
      setError(emailVal.error || "Please enter a valid email address.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      await onLogin(email, password);
    } catch (err: any) {
      setError(err?.message || "Invalid email or password. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600">
          <span>⚠️</span> {error}
        </div>
      )}

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
            onClick={() => onQuickDemoLogin(DEMO_CREDENTIALS.ADMIN.email)}
            className="w-full py-1.5 px-2 bg-emerald-800 text-white rounded-lg font-bold text-[10px] hover:bg-emerald-700 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>🩺</span> Admin (Doctor)
          </button>
          <button
            type="button"
            onClick={() => onQuickDemoLogin(DEMO_CREDENTIALS.PATIENT.email)}
            className="w-full py-1.5 px-2 bg-white border border-emerald-300 text-emerald-900 rounded-lg font-bold text-[10px] hover:bg-emerald-100 transition-all text-center flex items-center justify-center gap-1 cursor-pointer"
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
          ref={emailInputRef}
          type="email"
          required
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(null); }}
          placeholder="you@example.com"
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
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-600 text-xs cursor-pointer"
          >
            {showPwd ? "🙈" : "👁️"}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !email || !password}
        className="w-full py-2.5 rounded-xl font-bold text-xs text-white btn-shadow transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
        style={{ background: THEME_GRADIENTS.PRIMARY }}
      >
        {loading ? "Signing in…" : "Sign In →"}
      </button>

      {/* Google OAuth Alternative */}
      <div className="relative my-3">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-[10px] font-bold text-stone-400">or continue with</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onGoogleSignIn}
        className="w-full py-2.5 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 font-bold text-xs text-stone-700 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer"
      >
        <svg width="15" height="15" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.42 7.33 24 12 24z"/>
          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.58 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
        </svg>
        Sign In with Google Account
      </button>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="text-xs text-emerald-700 font-semibold hover:underline cursor-pointer"
        >
          New patient? Register your details here →
        </button>
      </div>
    </form>
  );
};
