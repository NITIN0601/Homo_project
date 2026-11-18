import { tokenStorage } from "./tokenStorage";
import { broadcastSessionEvent } from "./sessionSync";

export interface SessionInfo {
  isAuthenticated: boolean;
  token: string | null;
}

export const sessionManager = {
  getSession(): SessionInfo {
    const token = tokenStorage.getToken();
    return {
      isAuthenticated: Boolean(token),
      token,
    };
  },

  terminateSession(_reason: "explicit_logout" | "idle_timeout" | "token_expired" = "explicit_logout"): void {
    tokenStorage.clearToken();
    broadcastSessionEvent({
      type: "AUTH_LOGOUT",
    });
  },
};
