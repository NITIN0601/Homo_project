/**
 * ─── Enterprise Stale-Chunk & Cache Reload Auto-Recovery ─────────────────────
 * When a new deployment occurs on the server, older chunk hashes are removed (HTTP 404).
 * This utility detects dynamic import failures ('vite:preloadError' or chunk load rejections)
 * and automatically hard-reloads the browser with a fresh index.html manifest.
 *
 * Loop Protection:
 * Uses sessionStorage with a 10-second threshold to guarantee it never enters
 * an infinite reload loop if an asset is genuinely missing on the server.
 */

const RELOAD_GUARD_KEY = "hospital_chunk_reload_timestamp";
const RELOAD_COOLDOWN_MS = 10000;

export function triggerSafeCacheReload(reason: string): void {
  try {
    const lastReload = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(RELOAD_GUARD_KEY) : null;
    const now = Date.now();

    if (lastReload && now - Number(lastReload) < RELOAD_COOLDOWN_MS) {
      console.warn(`[CacheReload] Cooldown active (${reason}). Letting error boundary handle failure.`);
      return;
    }

    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(RELOAD_GUARD_KEY, String(now));
    }
    console.info(`[CacheReload] Deploy hash mismatch detected (${reason}). Performing automated cache reload...`);
    window.location.reload();
  } catch {
    window.location.reload();
  }
}

export function initCacheReloadListeners(): void {
  if (typeof window === "undefined") return;

  // 1. Native Vite preload error event (emitted when a dynamic import chunk 404s)
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    triggerSafeCacheReload("vite:preloadError");
  });

  // 2. Global unhandled rejection fallback (for module script failures in varied browser engines)
  window.addEventListener("unhandledrejection", (event) => {
    const message = event.reason?.message || String(event.reason || "");
    const isChunkFailure =
      message.includes("Failed to fetch dynamically imported module") ||
      message.includes("error loading dynamically imported module") ||
      message.includes("Importing a module script failed") ||
      message.includes("Loading chunk");

    if (isChunkFailure) {
      event.preventDefault();
      triggerSafeCacheReload(`unhandledrejection: ${message.slice(0, 60)}`);
    }
  });
}
