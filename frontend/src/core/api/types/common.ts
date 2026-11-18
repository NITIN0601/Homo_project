export * from "../contracts/ApiResponse";
export * from "../contracts/ApiError";
export * from "../contracts/Pagination";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestConfig {
  headers?: Record<string, string>;
  signal?: AbortSignal;
  params?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}
