import { apiFetch, USE } from "./httpClient";
import { STORAGE_KEYS, MOCK_TOKENS } from "../config";
import type { UserProfile } from "../types";

export const authService = {
   login: async (email: string, pass: string): Promise<{ token: string; profile: UserProfile }> => {
      if (USE) {
        const res = await apiFetch<{ status: string; token: string; profile: UserProfile }>("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: email.trim().toLowerCase(), password: pass }),
        });
        if (res.token) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.token);
          localStorage.setItem(STORAGE_KEYS.AUTH_PROFILE, JSON.stringify(res.profile));
        }
        return res;
      }
      return { token: MOCK_TOKENS.DEMO_JWT, profile: {} as UserProfile };
    },

    register: async (userData: { name: string; first_name?: string; middle_name?: string; last_name?: string; email: string; password: string; role?: string; phone?: string }): Promise<{ token: string; profile: UserProfile }> => {
      if (USE) {
        const res = await apiFetch<{ status: string; token: string; profile: UserProfile }>("/auth/register", {
          method: "POST",
          body: JSON.stringify(userData),
        });
        if (res.token) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.token);
          localStorage.setItem(STORAGE_KEYS.AUTH_PROFILE, JSON.stringify(res.profile));
        }
        return res;
      }
      return { token: MOCK_TOKENS.DEMO_JWT, profile: userData as unknown as UserProfile };
    },

    sendOtp: async (email: string): Promise<{ success: boolean }> => {
      if (USE) return apiFetch("/auth/send-otp", { method: "POST", body: JSON.stringify({ email }) });
      return { success: true };
    },

    invite: async (data: { name: string; email: string; role?: string; hospital_id?: string; phone?: string }): Promise<{ status: string; invite_url: string }> => {
      return apiFetch("/auth/invite", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    acceptInvite: async (token: string, password: string): Promise<{ token: string; profile: UserProfile }> => {
      const res = await apiFetch<{ status: string; token: string; profile: UserProfile }>("/auth/accept-invite", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      if (res.token) {
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.token);
        localStorage.setItem(STORAGE_KEYS.AUTH_PROFILE, JSON.stringify(res.profile));
      }
      return res;
    },

    google: async (payload: { email: string; name?: string; portal_intent?: string; hospital_id?: string; id_token?: string }): Promise<{ token: string; profile: UserProfile }> => {
      if (USE) {
        const res = await apiFetch<{ status: string; token: string; profile: UserProfile }>("/auth/google", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res.token) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.token);
          localStorage.setItem(STORAGE_KEYS.AUTH_PROFILE, JSON.stringify(res.profile));
        }
        return res;
      }
      return {
        token: MOCK_TOKENS.DEMO_JWT,
        profile: {
          id: `usr-g-${Date.now().toString(36)}`,
          name: payload.name || "Google Patient",
          email: payload.email,
          initials: (payload.name || "GP").slice(0, 2).toUpperCase(),
          role: payload.email.includes("admin") ? "admin" : "patient",
          phone: "+91 98450 12345",
        },
      };
    },

    acceptInviteWithGoogle: async (payload: { token: string; email: string; name?: string }): Promise<{ token: string; profile: UserProfile }> => {
      if (USE) {
        const res = await apiFetch<{ status: string; token: string; profile: UserProfile }>("/auth/accept-invite-google", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (res.token) {
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, res.token);
          localStorage.setItem(STORAGE_KEYS.AUTH_PROFILE, JSON.stringify(res.profile));
        }
        return res;
      }
      return {
        token: MOCK_TOKENS.DEMO_JWT,
        profile: {
          id: `usr-g-${Date.now().toString(36)}`,
          name: payload.name || "Google Patient",
          email: payload.email,
          initials: (payload.name || "GP").slice(0, 2).toUpperCase(),
          role: "patient",
          phone: "+91 98450 12345",
        },
      };
    },

    verifyOtp: async (email: string, otp: string): Promise<{ valid: boolean }> => {
      if (USE) return apiFetch("/auth/verify-otp", { method: "POST", body: JSON.stringify({ email, otp }) });
      return { valid: otp === "123456" }; // mock: any 6-digit code works in demo
    },
};

export default authService;
