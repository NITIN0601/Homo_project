/**
 * ─── Cross-Tab Session & Security Synchronization (BroadcastChannel) ────────
 * Coordinates session lifecycles across multiple browser tabs:
 * 1. Immediate Logout Propagation: If an admin logs out in Tab A, Tab B instantly terminates
 *    its session to prevent unauthorized access to Patient Health Information (PHI).
 * 2. Cross-Tab Login Sync: If a user signs in in Tab A, other tabs update without a manual refresh.
 * 3. Hospital Tenant Switch: Coordinates multi-tenant brand switching across open windows.
 */

export type SessionSyncPayload =
  | { type: "AUTH_LOGOUT" }
  | { type: "AUTH_LOGIN"; role?: string }
  | { type: "TENANT_SWITCH"; tenantId: string };

export type SessionSyncMessage = SessionSyncPayload & { sourceTabId: string };

const CHANNEL_NAME = "hospital_session_sync_bus";
const TAB_ID = `tab_${Math.random().toString(36).substring(2, 9)}`;

type SyncListener = (msg: SessionSyncMessage) => void;
const listeners = new Set<SyncListener>();

let channel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<SessionSyncMessage>) => {
      // Ignore echoes from the same tab
      if (event.data?.sourceTabId === TAB_ID) return;
      listeners.forEach((listener) => {
        try {
          listener(event.data);
        } catch (e) {
          console.error("[SessionSync] Listener execution error:", e);
        }
      });
    };
  } catch (err) {
    console.warn("[SessionSync] BroadcastChannel unavailable, using storage fallback:", err);
  }
}

export function broadcastSessionEvent(message: SessionSyncPayload): void {
  const payload: SessionSyncMessage = { ...message, sourceTabId: TAB_ID };
  if (channel) {
    try {
      channel.postMessage(payload);
    } catch {}
  }
}

export function subscribeToSessionEvents(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
