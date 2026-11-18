import React from "react";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";

export const ConnectionStatusBar: React.FC = () => {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) return null;

  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="bg-amber-600 text-white text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md animate-fadeIn"
      >
        <span className="w-2 h-2 rounded-full bg-amber-200 animate-ping" />
        <span>⚠️ Hospital Wi-Fi / Network Offline — Working in local degraded mode. Unsaved prescriptions and drafts are preserved in session storage.</span>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-emerald-600 text-white text-xs font-semibold px-4 py-1.5 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm animate-fadeIn"
    >
      <span>✓ Connection Restored — Re-synchronized with hospital servers.</span>
    </div>
  );
};

export default ConnectionStatusBar;
