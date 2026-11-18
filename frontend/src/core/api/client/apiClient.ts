import { coreFetch, type RequestOptions } from "./httpClient";

/**
 * ─── Typed API Client Wrapper ─────────────────────────────────────────────
 * Clean transport-layer HTTP wrapper for core platform network calls.
 */
export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => coreFetch<T>("", path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    coreFetch<T>("", path, { ...options, method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    coreFetch<T>("", path, { ...options, method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string, options?: RequestOptions) => coreFetch<T>("", path, { ...options, method: "DELETE" }),
};

export default apiClient;
