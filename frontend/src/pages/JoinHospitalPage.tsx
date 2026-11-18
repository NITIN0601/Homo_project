import React, { useState, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { useTenant } from "../context/ThemeProvider";
import { Button, Card, Input } from "../components/ui";
import { api } from "../services/api";

export const JoinHospitalPage: React.FC = () => {
  const { dispatch, navigateTo } = useApp();
  const { tenant } = useTenant();

  const [token, setToken] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("token");
      if (t) {
        setToken(t);
      } else {
        setError("Missing onboarding token. Please use the activation link sent via email or WhatsApp.");
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Valid invitation token is required.");
      return;
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.acceptInvite(token, password);
      if (res && res.profile) {
        dispatch({ type: "LOGIN", payload: res.profile });
        setSuccess(true);
        setTimeout(() => {
          if (res.profile.role === "admin" || res.profile.role === "super_admin") {
            navigateTo("admin-dashboard");
          } else {
            navigateTo("visit-summary");
          }
        }, 1500);
      } else {
        setError("Failed to claim invitation. Please request a new invite link from your doctor.");
      }
    } catch (err: any) {
      setError(err?.message || "Invalid or expired invitation token.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClaim = async () => {
    if (!token) {
      setError("Valid invitation token is required.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.acceptInviteWithGoogle({
        token,
        email: "invited.patient@gmail.com",
        name: "Invited Patient",
      });
      if (res && res.profile) {
        dispatch({ type: "LOGIN", payload: res.profile });
        setSuccess(true);
        setTimeout(() => {
          if (res.profile.role === "admin" || res.profile.role === "super_admin") {
            navigateTo("admin-dashboard");
          } else {
            navigateTo("visit-summary");
          }
        }, 1500);
      } else {
        setError("Failed to claim invitation with Google.");
      }
    } catch (err: any) {
      setError(err?.message || "Failed to claim invitation with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4" style={{ animation: "fadeInUp 0.3s ease both" }}>
      <Card variant="default" className="p-6 sm:p-8 space-y-6 shadow-xl border border-stone-200 rounded-3xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl font-black shadow-inner">
            🏥
          </div>
          <h1 className="text-xl font-extrabold text-stone-900 tracking-tight">
            Patient Portal Activation
          </h1>
          <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
            Your treating doctor at <strong>{tenant.name}</strong> has set up your clinical case file. Set a password to access your medical records and prescriptions.
          </p>
        </div>

        {success ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center space-y-2 animate-fadeIn">
            <span className="text-3xl block">🎉</span>
            <h3 className="font-bold text-emerald-900 text-sm">Account Successfully Activated!</h3>
            <p className="text-xs text-emerald-700">
              Welcome to {tenant.name}. Taking you to your patient medical dashboard…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-700 font-medium animate-fadeIn">
                ⚠️ {error}
              </div>
            )}

            <Input
              id="join-password"
              label="Create Portal Password"
              type="password"
              placeholder="Minimum 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              id="join-confirm-password"
              label="Confirm Portal Password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                isLoading={loading}
                disabled={!token}
                className="py-3 text-sm rounded-xl"
              >
                Activate My Portal →
              </Button>
            </div>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-[10px] font-bold text-stone-400">or activate instantly with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleClaim}
              disabled={loading || !token}
              className="w-full py-2.5 px-4 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 font-bold text-xs text-stone-700 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.42 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.03 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.27 2.58 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Activate with Google (No Password Needed)</span>
            </button>
          </form>
        )}

        <div className="text-center pt-2 border-t border-stone-100">
          <button
            type="button"
            onClick={() => navigateTo("home")}
            className="text-xs text-stone-400 hover:text-stone-700 underline cursor-pointer"
          >
            ← Return to Hospital Home
          </button>
        </div>
      </Card>
    </div>
  );
};

export default JoinHospitalPage;
