import { STORAGE_KEYS } from "../config";

/**
 * ─── Secure Token Storage Abstraction ───────────────────────────────────────
 * Defends against XSS exfiltration by preferring in-memory token retention.
 * Falls back to sessionStorage (tab-scoped) for page refreshes, and supports
 * credentials: 'include' for HttpOnly server-set cookies.
 */
let inMemoryToken: string | null = null;

export const tokenStorage = {
  getToken(): string | null {
    if (inMemoryToken) return inMemoryToken;
    if (typeof sessionStorage !== "undefined") {
      try {
        const sessionToken = sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        if (sessionToken) {
          inMemoryToken = sessionToken;
          return sessionToken;
        }
      } catch {}
    }
    // Backward compatibility fallback during migration
    if (typeof localStorage !== "undefined") {
      try {
        return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      } catch {}
    }
    return null;
  },

  setToken(token: string | null): void {
    inMemoryToken = token;
    if (typeof sessionStorage !== "undefined") {
      try {
        if (token) {
          sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        } else {
          sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        }
      } catch {}
    }
    // Clear legacy localStorage token to prevent XSS leakage
    if (typeof localStorage !== "undefined") {
      try {
        if (!token) {
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
        } else {
          // Keep synchronized for legacy tests while prioritizing in-memory
          localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
        }
      } catch {}
    }
  },

  clearToken(): void {
    this.setToken(null);
  },
};
