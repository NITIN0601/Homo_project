import type { AuthUser, UserProfile, UserRole } from "@core/types";

export type { AuthUser, UserProfile, UserRole };

export interface AuthSessionState {
  user: AuthUser;
  isAuthenticated: boolean;
  role: UserRole | null;
  status: "idle" | "loading" | "authenticated" | "unauthenticated";
}
