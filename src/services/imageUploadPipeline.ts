/**
 * ─── Client-Side Image & Camera Upload Anti-Spam Control Module ───────────────
 * Implements strict camera snapshot deduplication & anti-spam rate limiting:
 *   A. Reads image/snapshot file using standard Web API FileReader.
 *   B. Generates rapid cryptographic SHA-256 signature using browser Web Crypto API.
 *   C. Verifies hash against public.uploaded_file_hashes (Postgres 23505).
 *      If duplicate, aborts immediately with error: "This identical image has already been uploaded."
 *   D. 30-second time-based debounce cooldown mechanism on camera/upload trigger.
 */

import { BACKEND, USE_MOCK_DATA } from "../config";

// ─── 30-Second Cooldown Tracker ───────────────────────────────────────────────
const COOLDOWN_DURATION_MS = 30000; // 30 seconds
let lastUploadTimestamp = 0;

export interface HashVerificationResult {
  allowed: boolean;
  fileHash: string;
  errorMessage?: string;
  cooldownRemainingSeconds?: number;
  record?: any;
}

/** Check if the 30-second UI cooldown is currently active */
export function getCooldownStatus(): { inCooldown: boolean; remainingSeconds: number } {
  const now = Date.now();
  const elapsed = now - lastUploadTimestamp;
  if (elapsed < COOLDOWN_DURATION_MS) {
    const remaining = Math.ceil((COOLDOWN_DURATION_MS - elapsed) / 1000);
    return { inCooldown: true, remainingSeconds: remaining };
  }
  return { inCooldown: false, remainingSeconds: 0 };
}

/** Trigger or reset the cooldown clock */
export function activateCooldown(): void {
  lastUploadTimestamp = Date.now();
}

/**
 * Step A & B: Read chosen or snapped image using standard Web API FileReader
 * and compute a rapid cryptographic SHA-256 hash using the native browser crypto.subtle API.
 */
export async function computeImageCryptoHash(file: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        if (!buffer) {
          throw new Error("FileReader returned empty buffer");
        }

        // Web Crypto API SHA-256 computation
        const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
        resolve(hashHex);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read image file via FileReader API."));
    };

    reader.readAsArrayBuffer(file);
  });
}

// In-memory mock hash cache when USE_MOCK_DATA is true
const MOCK_REGISTERED_HASHES = new Set<string>();

/**
 * Step C & D: Complete Image Upload & Anti-Spam Pipeline
 * Returns verified hash and upload status or throws clear error toast.
 */
export async function processSecureImageUpload(
  file: File | Blob,
  fileName: string = "prescription_snapshot.jpg",
  uploadedBy: string = "mobile_worker"
): Promise<HashVerificationResult> {
  // Step D: Verify 30-Second Debounce Cooldown
  const cooldown = getCooldownStatus();
  if (cooldown.inCooldown) {
    throw new Error(
      `Camera snapshot cooldown active. Please wait ${cooldown.remainingSeconds}s before snapping or uploading another image.`
    );
  }

  // Step A & B: Compute Cryptographic Signature
  const fileHash = await computeImageCryptoHash(file);

  // If in Mock Demonstration mode
  if (USE_MOCK_DATA) {
    if (MOCK_REGISTERED_HASHES.has(fileHash)) {
      throw new Error("This identical image has already been uploaded.");
    }
    MOCK_REGISTERED_HASHES.add(fileHash);
    activateCooldown();
    return {
      allowed: true,
      fileHash,
      record: { id: `mock-hash-${Date.now()}`, file_hash: fileHash, file_name: fileName },
    };
  }

  // Step C: Execute check & insert against on-premise backend / Supabase
  const endpoint = `${BACKEND.BASE_URL}/anti-spam/verify-and-register-hash`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_hash: fileHash,
        file_name: fileName,
        file_size_bytes: file.size,
        uploaded_by: uploadedBy,
      }),
    });

    if (res.status === 409) {
      throw new Error("This identical image has already been uploaded.");
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const detail = errData.detail || `Upload verification failed (${res.status})`;
      if (detail.includes("23505") || detail.toLowerCase().includes("duplicate")) {
        throw new Error("This identical image has already been uploaded.");
      }
      throw new Error(detail);
    }

    const data = await res.json();

    // Activate the 30-second cooldown on successful submission
    activateCooldown();

    return {
      allowed: true,
      fileHash,
      record: data.record,
    };
  } catch (err: any) {
    throw new Error(err.message || "Upload verification failed.");
  }
}
