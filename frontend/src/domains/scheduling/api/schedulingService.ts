import { apiFetch, serverFetch, USE } from "../../../core/api/client/httpClient";
import { STORAGE_KEYS } from "../../../core/config";
import type { BookedAppointment, BlockedCalendarDate, ContinuityPreferenceResponse } from "@core/types";

export const schedulingService = {
  appointments: {
    getAll: async (): Promise<BookedAppointment[]> => {
      try {
        return await serverFetch<BookedAppointment[]>("/api/appointments");
      } catch {
        const raw = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
        return raw ? JSON.parse(raw) : [];
      }
    },
    book: async (payload: {
      user_email: string;
      user_name: string;
      start_time: string;
      end_time: string;
      summary?: string;
      description?: string;
      user_phone?: string;
      phone?: string;
      patient_id?: string;
      hospital_id?: string;
      doctor_id?: string;
      calendar_id?: string;
      continuity_status?: string;
      hospital_date?: string;
      hospital_slot?: string;
      user_date?: string;
      user_time?: string;
      user_timezone?: string;
      consultation_type?: string;
    }) => {
      try {
        return await serverFetch<{
          status: string;
          message: string;
          appointment: BookedAppointment;
          calendar_event?: Record<string, unknown>;
          email_delivery?: Record<string, unknown>;
        }>("/api/book-appointment", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("Direct /api/book-appointment failed, falling back to local dispatch", err);
        }
        return null;
      }
    },
    save: async (appointment: BookedAppointment) => {
      try {
        return await serverFetch("/api/appointments", {
          method: "POST",
          body: JSON.stringify(appointment),
        });
      } catch {
        return null;
      }
    },
    updateStatus: async (id: string, status: BookedAppointment["status"]) => {
      try {
        return await serverFetch<BookedAppointment>(`/api/appointments/${id}/status`, {
          method: "PUT",
          body: JSON.stringify({ status }),
        });
      } catch {
        return null;
      }
    },
    checkContinuityPreference: async (
      hospitalId?: string,
      identifier?: string,
      date?: string,
      slot?: string
    ): Promise<ContinuityPreferenceResponse | null> => {
      if (!identifier) return null;
      try {
        const params = new URLSearchParams({
          identifier,
          ...(hospitalId ? { hospital_id: hospitalId } : {}),
          ...(date ? { date } : {}),
          ...(slot ? { slot } : {}),
        });
        return await serverFetch<ContinuityPreferenceResponse>(
          `/api/v1/scheduling/continuity-preference?${params.toString()}`
        );
      } catch (err) {
        console.warn("Continuity preference check failed:", err);
        return null;
      }
    },
  },
  calendar: {
    getBlockedDates: async (): Promise<BlockedCalendarDate[]> => {
      try {
        return await serverFetch<BlockedCalendarDate[]>("/api/blocked-dates");
      } catch {
        const raw = localStorage.getItem(STORAGE_KEYS.BLOCKED_DATES);
        return raw ? JSON.parse(raw) : [];
      }
    },
    saveBlockedDates: async (dates: BlockedCalendarDate[]) => {
      try {
        return await serverFetch("/api/blocked-dates", {
          method: "POST",
          body: JSON.stringify(dates),
        });
      } catch {
        return null;
      }
    },
  },
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
};

export default schedulingService;
