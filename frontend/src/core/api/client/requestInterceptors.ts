import { tokenStorage } from "../../security/tokenStorage";

export interface RequestInterceptorContext {
  headers: Record<string, string>;
  tenantId?: string;
  requestId: string;
}

export function applyDefaultHeaders(ctx: RequestInterceptorContext): void {
  const token = tokenStorage.getToken();
  if (token) {
    ctx.headers["Authorization"] = `Bearer ${token}`;
  }
  ctx.headers["X-Request-ID"] = ctx.requestId;
  if (ctx.tenantId) {
    ctx.headers["X-Tenant-ID"] = ctx.tenantId;
  }
}
