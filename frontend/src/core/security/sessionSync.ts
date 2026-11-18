/**
 * ─── Cross-Tab Session & Security Synchronization (BroadcastChannel + Storage Fallback) ───
 * Coordinates session lifecycles across multiple browser tabs:
 * 1. Immediate Logout Propagation: If an admin logs out in Tab A, Tab B instantly terminates
 *    its session to prevent unauthorized access to Patient Health Information (PHI).
 * 2. Cross-Tab Login Sync: If a user signs in in Tab A, other tabs update without a manual refresh.
 * 3. Hospital Tenant Switch: Coordinates multi-tenant brand switching and clinical state flush across open windows.
 */

export type SessionSyncPayload =
  | { type: "AUTH_LOGOUT" }
  | { type: "AUTH_LOGIN"; role?: string }
  | { type: "TENANT_SWITCH"; tenantId: string };

export type SessionSyncMessage = SessionSyncPayload & { sourceTabId: string; timestamp?: number };

const CHANNEL_NAME = "hospital_session_sync_bus";
const STORAGE_SYNC_KEY = "hospital_session_sync_bus_event";
const TAB_ID = `tab_${Math.random().toString(36).substring(2, 9)}`;

type SyncListener = (msg: SessionSyncMessage) => void;
const listeners = new Set<SyncListener>();

let channel: BroadcastChannel | null = null;

function notifyListeners(msg: SessionSyncMessage) {
  if (msg?.sourceTabId === TAB_ID) return;
  listeners.forEach((listener) => {
    try {
      listener(msg);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.error("[SessionSync] Listener execution error:", e);
      }
    }
  });
}

if (typeof window !== "undefined") {
  if ("BroadcastChannel" in window) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.onmessage = (event: MessageEvent<SessionSyncMessage>) => {
        notifyListeners(event.data);
      };
    } catch {
      channel = null;
    }
  }

  // Cross-tab storage fallback for Safari Private mode or environments lacking BroadcastChannel
  window.addEventListener("storage", (e: StorageEvent) => {
    if (e.key === STORAGE_SYNC_KEY && e.newValue) {
      try {
        const msg = JSON.parse(e.newValue) as SessionSyncMessage;
        notifyListeners(msg);
      } catch {}
    }
  });
}

export function broadcastSessionEvent(message: SessionSyncPayload): void {
  const payload: SessionSyncMessage = { ...message, sourceTabId: TAB_ID, timestamp: Date.now() };

  if (channel) {
    try {
      channel.postMessage(payload);
    } catch {}
  }

  // Always write transient storage event payload for cross-tab storage listeners
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(payload));
    } catch {}
  }
}

export function subscribeToSessionEvents(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
