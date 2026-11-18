import { apiFetch, serverFetch, USE } from "../../../core/api/client/httpClient";
import { WHATSAPP, HOSPITAL } from "../../../core/config";

export const communicationService = {
  whatsapp: {
    registerAdminBusiness: async (config: {
      doctorName: string;
      whatsappNumber: string;
      businessAccountId: string;
      autoNotifyRegistration: boolean;
      autoNotifyPrescriptions: boolean;
    }) => {
      if (USE) return apiFetch("/whatsapp/register-admin", { method: "POST", body: JSON.stringify(config) });
      return { success: true, message: `WhatsApp Business registered for ${config.doctorName}` };
    },

    sendMessage: async (payload: { phone: string; message: string; type: "registration" | "prescription" | "order" }) => {
      if (USE) return apiFetch("/whatsapp/send-message", { method: "POST", body: JSON.stringify(payload) });
      return { success: true, messageId: `wa_msg_${Date.now()}`, timestamp: new Date().toISOString() };
    },

    /** Opens WhatsApp deeplink — appends patient login details or Guest automatically */
    openChat: (message?: string, user?: { name: string; email?: string } | null, phone?: string) => {
      const number = (phone ?? WHATSAPP.NUMBER_CLEAN).replace(/[^0-9]/g, "");
      const userTag = user
        ? `Patient: ${user.name} (${user.email ?? "No Email"})`
        : `Patient Status: Guest (Not Logged In)`;

      let baseText = message ?? `Hello ${HOSPITAL.FULL_NAME}! 👋 I need assistance with my homoeopathy consultation.`;
      
      // Append userTag if not already present
      if (!baseText.includes("Patient:")) {
        baseText = `${baseText}\n\n[Sender Info — ${userTag}]`;
      }

      window.open(WHATSAPP.buildUrl(baseText, number), "_blank");
    },
  },

  // ── Email Notifications ───────────────────────────────────────────────────────
  email: {
    sendNotification: async (payload: { email: string; subject: string; body: string }) => {
      if (USE) return apiFetch("/email/send", { method: "POST", body: JSON.stringify(payload) });
      return { success: true, message: "Email queued (mock)" };
    },
  },
  geo: {
    detect: async (): Promise<{ timezone: string; country?: string; ip?: string }> => {
      try {
        const res = await serverFetch<{ status: string; timezone: string; country?: string; ip?: string }>("/api/geo/detect");
        if (res && res.timezone) return res;
      } catch {}
      return {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata",
      };
    },
  },
};

export default communicationService;
