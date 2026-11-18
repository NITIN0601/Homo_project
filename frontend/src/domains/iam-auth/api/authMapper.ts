import type { AuthUser, UserProfile } from "../model/authTypes";

export function toCleanUserProfile(raw: Record<string, unknown>): UserProfile {
  const name = String(raw.name || "User");
  const initials = name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return {
    id: String(raw.id || "usr-anon"),
    name,
    initials: initials || "U",
    role: (raw.role as UserProfile["role"]) || "patient",
    email: raw.email ? String(raw.email) : "",
    phone: raw.phone ? String(raw.phone) : undefined,
  };
}

export function toAuthUser(profile: UserProfile | null): AuthUser {
  return profile;
}
