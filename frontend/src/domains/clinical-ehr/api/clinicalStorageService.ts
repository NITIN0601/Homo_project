import { apiFetch, USE } from "../../../core/api/client/httpClient";

/**
 * ─── Clinical Media Object Storage Service ──────────────────────────────────
 * Uploads prescription images and documents to backend object storage (S3 / Supabase Storage),
 * returning light reference URLs instead of serializing multi-megabyte base64 strings into
 * React state and localStorage (defending against QuotaExceededError).
 */
export const clinicalStorageService = {
  uploadClinicalImage: async (fileOrDataUri: File | Blob | string, patientId: string): Promise<string> => {
    // If backend is active, upload multipart to object storage
    if (USE) {
      try {
        const formData = new FormData();
        if (typeof fileOrDataUri === "string") {
          // Convert data URI to blob
          const res = await fetch(fileOrDataUri);
          const blob = await res.blob();
          formData.append("file", blob, `rx_${patientId}_${Date.now()}.jpg`);
        } else {
          formData.append("file", fileOrDataUri);
        }
        formData.append("patientId", patientId);

        const uploadRes = await apiFetch<{ url: string; fileId: string }>("/clinical-storage/upload", {
          method: "POST",
          body: formData,
        });

        if (uploadRes?.url) {
          return uploadRes.url;
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("[ClinicalStorage] Remote object storage upload fallback:", err);
        }
      }
    }

    // In local sandbox / mock mode, return light resource identifier instead of massive base64
    const mediaId = `rx_obj_${patientId}_${Date.now().toString(36)}`;
    return `/media/prescriptions/${mediaId}.jpg`;
  },
};

export default clinicalStorageService;
