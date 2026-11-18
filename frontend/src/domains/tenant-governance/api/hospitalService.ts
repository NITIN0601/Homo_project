import { apiFetch, USE } from "../../../core/api/client/httpClient";

export const hospitalService = {
  hospitals: {
    getFeatures: async (hospitalId: string) => {
      if (USE) return apiFetch<{ hospital_id: string; features: Record<string, boolean>; updated_at?: string }>(`/hospitals/${hospitalId}/features`);
      return { hospital_id: hospitalId, features: {} };
    },
    updateFeatures: async (hospitalId: string, features: Record<string, boolean>) => {
      if (USE) {
        return apiFetch<{ status: string; hospital_id: string; features: Record<string, boolean> }>(`/hospitals/${hospitalId}/features`, {
          method: "PATCH",
          body: JSON.stringify(features),
        });
      }
      return { status: "updated", hospital_id: hospitalId, features };
    },
  },

  // ── Multi-Tenant Platform & Super Admin Management ────────────────────────────
  platform: {
    onboardHospital: async (payload: Record<string, unknown>) => {
      return apiFetch<{
        status: string;
        message: string;
        hospital: Record<string, unknown>;
        doctor: Record<string, unknown>;
        invite: Record<string, unknown>;
        invite_url: string;
        email_delivery: Record<string, unknown>;
      }>("/super-admin/onboard-hospital", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    updateHospitalFeatures: async (hospitalId: string, features: Record<string, boolean>) => {
      return apiFetch<{
        status: string;
        message: string;
        hospital_id: string;
        features: Record<string, boolean>;
      }>(`/super-admin/hospitals/${hospitalId}/features`, {
        method: "PUT",
        body: JSON.stringify({ features }),
      });
    },
    updateHospital: async (hospitalId: string, payload: Record<string, unknown>) => {
      return apiFetch<{
        status: string;
        message: string;
        hospital: Record<string, unknown>;
      }>(`/super-admin/hospitals/${hospitalId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    updateDoctor: async (hospitalId: string, doctorId: string, payload: Record<string, unknown>) => {
      return apiFetch<{
        status: string;
        message: string;
        doctor: Record<string, unknown>;
      }>(`/super-admin/hospitals/${hospitalId}/doctors/${doctorId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    createHospital: async (data: Record<string, unknown>) => {
      return apiFetch("/hospitals", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    createDoctor: async (data: Record<string, unknown>) => {
      return apiFetch("/doctors", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    toggleDevMode: async (useMockData: boolean) => {
      return apiFetch("/platform/toggle-dev-mode", {
        method: "POST",
        body: JSON.stringify({ use_mock_data: useMockData }),
      });
    },
    listHospitals: async (activeOnly = true) => {
      return apiFetch<Record<string, unknown>[]>(`/hospitals?active_only=${activeOnly}`);
    },
    getHospital: async (hospitalId: string) => {
      return apiFetch<Record<string, unknown>>(`/hospitals/${hospitalId}`);
    },
    deleteHospital: async (hospitalId: string, permanent = false) => {
      return apiFetch<{
        status: string;
        message: string;
        hospital_id: string;
        is_active: boolean;
      }>(`/super-admin/hospitals/${hospitalId}?permanent=${permanent}`, {
        method: "DELETE",
      });
    },
    deleteDoctor: async (doctorId: string, hospitalId?: string, permanent = false) => {
      const endpoint = hospitalId
        ? `/super-admin/hospitals/${hospitalId}/doctors/${doctorId}?permanent=${permanent}`
        : `/doctors/${doctorId}?permanent=${permanent}`;
      return apiFetch<{
        status: string;
        message: string;
        doctor_id: string;
        is_active: boolean;
      }>(endpoint, {
        method: "DELETE",
      });
    },
    updateHospitalCustomization: async (hospitalId: string, payload: Record<string, unknown>) => {
      return apiFetch<{
        status: string;
        message: string;
        hospital: Record<string, unknown>;
      }>(`/hospitals/${hospitalId}/customization`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
  },
};

export default hospitalService;
