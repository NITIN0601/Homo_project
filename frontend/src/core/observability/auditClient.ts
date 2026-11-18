import { apiFetch, USE } from "../../core/api/client/httpClient";
import { resolveActiveHospitalTenant } from "../../core/tenancy/identity/tenantResolver";

export type AuditAction =
  | "VIEWED_PATIENT_CHART"
  | "EXPAND_ALL_PATIENTS"
  | "PRESCRIBED_REMEDY"
  | "EXPORTED_CASE_JSON"
  | "PRINTED_RECEIPT"
  | "UPLOADED_PRESCRIPTION"
  | "CANCELLED_APPOINTMENT"
  | "OVERRODE_INVOICE_STATUS"
  | "CUSTOMIZATION_CHANGED"
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_LOGOUT_SUCCESS";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  actorId?: string;
  actorRole?: string;
  tenantId: string;
  targetPatientId?: string;
  details?: Record<string, unknown>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

// In-memory ring buffer of recent audit entries for client inspection/telemetry
const inMemoryAuditLogs: AuditLogEntry[] = [];
const MAX_IN_MEMORY_LOGS = 100;

export const auditService = {
  logAction: async (
    action: AuditAction,
    context?: {
      actorId?: string;
      actorRole?: string;
      targetPatientId?: string;
      details?: Record<string, unknown>;
    }
  ): Promise<AuditLogEntry> => {
    const tenant = resolveActiveHospitalTenant();
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      action,
      actorId: context?.actorId,
      actorRole: context?.actorRole,
      tenantId: tenant.id,
      targetPatientId: context?.targetPatientId,
      details: context?.details,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    };

    // Store in ring buffer
    inMemoryAuditLogs.unshift(entry);
    if (inMemoryAuditLogs.length > MAX_IN_MEMORY_LOGS) {
      inMemoryAuditLogs.pop();
    }

    // Server-side audit logging
    if (USE) {
      try {
        await apiFetch<{ status: string }>("/audit-trail", {
          method: "POST",
          body: JSON.stringify(entry),
          skipAuth: false,
        });
      } catch (err) {
        if (import.meta.env.DEV) {
          console.warn("[AuditService] Remote audit log write failed (offline/mock):", err);
        }
      }
    }

    return entry;
  },

  getRecentLogs(): AuditLogEntry[] {
    return [...inMemoryAuditLogs];
  },

  clearMemoryLogs(): void {
    inMemoryAuditLogs.length = 0;
  },
};

export default auditService;
