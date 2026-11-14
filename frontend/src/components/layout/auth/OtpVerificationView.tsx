import React, { useState } from "react";
import { THEME_GRADIENTS } from "../../../config";

interface OtpVerificationViewProps {
  regEmail: string;
  generatedOtp: string;
  loading: boolean;
  onVerifyAndRegister: (otp: string) => Promise<void>;
  onResendOtp: () => void;
  onBack: () => void;
}

export const OtpVerificationView: React.FC<OtpVerificationViewProps> = ({
  regEmail,
  generatedOtp,
  loading,
  onVerifyAndRegister,
  onResendOtp,
  onBack,
}) => {
  const [inputOtp, setInputOtp] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);

    if (inputOtp.trim() !== generatedOtp) {
      setOtpError(`Incorrect OTP code. Enter the 6-digit code sent to ${regEmail} (Demo code: ${generatedOtp})`);
      return;
    }

    try {
      await onVerifyAndRegister(inputOtp.trim());
    } catch (err: any) {
      setOtpError(err?.message || "Registration failed.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-fadeIn" noValidate>
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
            className="text-emerald-700 font-bold hover:underline cursor-pointer"
          >
            ⚡ Auto-Fill Demo OTP ({generatedOtp})
          </button>
          <button
            type="button"
            onClick={onResendOtp}
            className="text-stone-500 hover:text-stone-600 cursor-pointer"
          >
            Resend OTP
          </button>
        </div>
      </div>

      <div className="space-y-2 pt-2">
        <button
          type="submit"
          disabled={loading || inputOtp.length < 6}
          className="w-full py-3 rounded-xl font-extrabold text-xs text-white btn-shadow transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          style={{ background: THEME_GRADIENTS.PRIMARY }}
        >
          {loading ? "Verifying OTP & Registering…" : "✓ Verify Email OTP & Complete Registration"}
        </button>

        <button
          type="button"
          onClick={onBack}
          className="w-full py-2 text-xs font-semibold text-stone-500 hover:bg-stone-100 rounded-xl cursor-pointer"
        >
          ← Back to Edit Patient Details
        </button>
      </div>
    </form>
  );
};

