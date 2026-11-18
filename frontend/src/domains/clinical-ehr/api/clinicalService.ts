import { apiFetch, serverFetch, USE, BASE } from "../../../core/api/client/httpClient";
import { HOSPITAL } from "../../../core/config";
import { formatDateShort } from "../../../shared/utils/format";
import { clinicalStorageService } from "./clinicalStorageService";
import type { PatientMedicalFile, VisitSummaryRecord, Medicine } from "@core/types";

export const clinicalService = {
  remedies: {
    getPrescribed: async (patientId: string): Promise<Medicine[]> => {
      if (USE) return apiFetch(`/remedies/prescribed/${patientId}`);
      return [];
    },
  },

  // ── TypeSafe AI Jev Decision Engine ──────────────────────────────────────────
  ai: {
    jevClassify: async (stateText: string, customQuestions?: Record<string, unknown>) => {
      if (USE) {
        return apiFetch<{
          status: string;
          engine: string;
          results: Record<string, { value?: boolean; probability?: number; choice?: string; score?: number; distribution?: Record<string, number> }>;
        }>("/ai/jev-classify", {
          method: "POST",
          body: JSON.stringify({ state: stateText, custom_questions: customQuestions }),
        });
      }
      return {
        status: "success",
        engine: "TypeSafe AI Jev Model (Simulated)",
        results: {
          is_emergency: { value: false, probability: 0.05 },
          consultation_modality: { choice: "in_person", probability: 0.85, distribution: { in_person: 0.85, tele_consult: 0.15 } },
          severity_index: { score: 3.5, confidence: 0.9 },
        },
      };
    },
  },

  // ── Patient Medical Records ───────────────────────────────────────────────────
  patient: {
    getMedicalFile: async (patientId: string): Promise<PatientMedicalFile | null> => {
      if (USE) return apiFetch(`/patients/${patientId}/visits`);
      return null;
    },

    uploadPrescription: async (patientId: string, imageUri: string): Promise<VisitSummaryRecord> => {
      const storedImageUri = await clinicalStorageService.uploadClinicalImage(imageUri, patientId);
      if (USE) {
        const formData = new FormData();
        formData.append("prescription_file", imageUri);
        const res = await fetch(`${BASE}/patients/${patientId}/upload-prescription`, { method: "POST", body: formData });
        if (!res.ok) throw new Error("Upload failed");
        return res.json();
      }
      // Mock OCR parse response
      return {
        id:        `vis-${Date.now()}`,
        visitDate: formatDateShort(new Date()),
        doctorName:    HOSPITAL.DOCTOR_TITLE,
        hospitalBranch:  HOSPITAL.BRANCHES.TELE,
        chiefDiagnosis: "Uploaded Prescription Auto-Parsed by AI OCR",
        symptomsObserved: ["Patient Uploaded Prescription Photo"],
        prescribedRemedies: [
          { medicineId: "m1", medicineName: "Arnica Montana",  potency: "30C", dosage: "4 globules twice daily", duration: "10 days" },
          { medicineId: "m3", medicineName: "Nux Vomica",      potency: "30C", dosage: "2 drops at bedtime",      duration: "7 days" },
        ],
        clinicalNotes:   "Prescription document uploaded by patient. Parsed remedies automatically added to cart recommendation.",
        lifestyleAdvice: "Avoid caffeine & camphor 30 mins before remedies.",
        followUpDate:    "In 14 Days",
        prescriptionImageUri: storedImageUri,
      };
    },
  },
  visits: {
    getAll: async (): Promise<Record<string, PatientMedicalFile>> => {
      try {
        return await serverFetch<Record<string, PatientMedicalFile>>("/api/visit-summaries");
      } catch {
        return {};
      }
    },
    save: async (patientId: string, visit: VisitSummaryRecord) => {
      try {
        return await serverFetch("/api/visit-summaries", {
          method: "POST",
          body: JSON.stringify({ patientId, visit }),
        });
      } catch {
        return null;
      }
    },
  },
};

export default clinicalService;
