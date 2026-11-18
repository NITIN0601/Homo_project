import { BACKEND, STORAGE_KEYS } from "../config";

export const BASE = BACKEND.BASE_URL;
export const USE = BACKEND.ENABLED;

export interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
  idempotencyKey?: string | boolean;
  retries?: number;
}

export function generateIdempotencyKey(): string {
  return `idem_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

export async function coreFetch<T>(base: string, path: string, options?: RequestOptions): Promise<T> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;
  const maxRetries = options?.retries ?? (options?.method && options.method !== "GET" ? 0 : 1);

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
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
        ...options,
        headers: {
          ...defaultHeaders,
          ...options?.headers,
        },
      });

      if (!res.ok) {
        // Retry transient gateway & capacity errors
        if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < maxRetries) {
          attempt++;
          await new Promise((r) => setTimeout(r, attempt * 400));
          continue;
        }

        const errorDetails = await res.json().catch(() => null);
        const message = errorDetails?.detail || errorDetails?.message || `API ${path} failed: ${res.status} ${res.statusText}`;
        throw new Error(message);
      }

      return res.json() as Promise<T>;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        attempt++;
        await new Promise((r) => setTimeout(r, attempt * 400));
        continue;
      }
      break;
    }
  }

  throw lastError || new Error(`Network request to ${path} failed`);
}

export const serverFetch = <T>(path: string, opts?: RequestOptions) => coreFetch<T>("", path, opts);
export const apiFetch = <T>(path: string, opts?: RequestOptions) => coreFetch<T>(BASE, path, opts);
