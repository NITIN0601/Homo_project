import { createContext, useContext } from "react";
import type { AuthUser, UserProfile, SavedCard } from "../../types";

export interface AuthContextValue {
  authUser: AuthUser | null;
  isAuthModalOpen: boolean;
  savedCards: SavedCard[];
  login: (profile: UserProfile) => void;
  logout: () => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  addSavedCard: (card: SavedCard) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AppProvider or AuthProvider");
  }
  return ctx;
}

export class RbacAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RbacAccessError";
  }
}

export function useRequireRole(required: "admin" | "patient" | "super_admin"): void {
  const { authUser } = useAuth();
  const role = authUser?.role;
  if (!role) {
    throw new RbacAccessError(
      `Access denied: role 'guest' cannot access a '${required}' resource.`
    );
  }
  // Hierarchical RBAC: super_admin inherits administrative and patient clinical access
  if (role === "super_admin") {
    return;
  }
  if (role !== required) {
    throw new RbacAccessError(
      `Access denied: role '${role}' cannot access a '${required}' resource.`
    );
  }
}

