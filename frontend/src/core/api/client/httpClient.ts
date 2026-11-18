import { BACKEND } from "../../../core/config";
import { tokenStorage } from "../../../core/security/tokenStorage";
import { resolveActiveHospitalTenant } from "../../../core/tenancy/identity/tenantResolver";

export const BASE = BACKEND.BASE_URL;
export const USE = BACKEND.ENABLED;

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  idempotencyKey?: string | boolean;
  retries?: number;
  signal?: AbortSignal;
}

export function generateIdempotencyKey(): string {
  return `idem_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function coreFetch<T>(base: string, path: string, options?: RequestOptions): Promise<T> {
  const token = tokenStorage.getToken();
  const maxRetries = options?.retries ?? (options?.method && options.method !== "GET" ? 0 : 1);
  const activeTenant = resolveActiveHospitalTenant();
  const tenantId = activeTenant?.id || "default";
  const requestId = generateRequestId();

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Tenant-ID": tenantId,
    "X-Hospital-ID": tenantId,
    "X-Request-ID": requestId,
    ...(token && !options?.skipAuth ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (options?.idempotencyKey) {
    defaultHeaders["X-Idempotency-Key"] =
      typeof options.idempotencyKey === "string"
        ? options.idempotencyKey
        : generateIdempotencyKey();
  }

  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt <= maxRetries) {
    try {
      const res = await fetch(`${base}${path}`, {
        credentials: "include",
        ...options,
        headers: {
          ...defaultHeaders,
          ...options?.headers,
        },
        signal: options?.signal,
      });

      if (!res.ok) {
        // Retry transient gateway & capacity errors
        if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxRetries) {
          attempt++;
          await new Promise((r) => setTimeout(r, attempt * 400));
          continue;
        }

        const errorDetails = await res.json().catch(() => null);
        const message = errorDetails?.detail || errorDetails?.message || `API ${path} failed: ${res.status} ${res.statusText} [ref: ${requestId}]`;
        const err = new Error(message);
        (err as any).requestId = requestId;
        (err as any).status = res.status;
        throw err;
      }

      return res.json() as Promise<T>;
    } catch (err: unknown) {
      // Don't retry if aborted
      if (err instanceof DOMException && err.name === "AbortError") {
        throw err;
      }
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        attempt++;
        await new Promise((r) => setTimeout(r, attempt * 400));
        continue;
      }
      break;
    }
  }

  throw lastError || new Error(`Network request to ${path} failed [ref: ${requestId}]`);
}

export const serverFetch = <T>(path: string, opts?: RequestOptions) => coreFetch<T>("", path, opts);
export const apiFetch = <T>(path: string, opts?: RequestOptions) => coreFetch<T>(BASE, path, opts);
