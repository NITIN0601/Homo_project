import { sessionManager } from "../../security/sessionManager";

export function handleUnauthorizedResponse(status: number): void {
  if (status === 401) {
    sessionManager.terminateSession("token_expired");
  }
}
