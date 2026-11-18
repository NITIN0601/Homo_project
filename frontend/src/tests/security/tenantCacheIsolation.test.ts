import { describe, it, expect } from "vitest";
import { queryCache } from "../../core/api/query/queryClient";
import { queryKeys } from "../../core/api/query/queryKeys";
import { tokenStorage } from "../../core/security/tokenStorage";
import { stripPhiPii } from "../../core/observability/telemetry";

describe("Multi-Tenant Security & Cache Isolation", () => {
  it("namespaces query keys with the active tenant identity", () => {
    const key1 = queryKeys.scheduling.slots("tenant-agastya", "2026-11-20");
    const key2 = queryKeys.scheduling.slots("tenant-apollo", "2026-11-20");

    expect(key1).toContain("tenant-agastya");
    expect(key2).toContain("tenant-apollo");
    expect(key1).not.toEqual(key2);
  });

  it("invalidates and purges only the switched tenant cached queries", () => {
    queryCache.set("hospital:tenant:tenant-a:clinical", { records: ["rec-1"] });
    queryCache.set("hospital:tenant:tenant-b:clinical", { records: ["rec-2"] });

    expect(queryCache.get("hospital:tenant:tenant-a:clinical")).toBeDefined();
    expect(queryCache.get("hospital:tenant:tenant-b:clinical")).toBeDefined();

    queryCache.invalidateTenant("tenant-a");

    expect(queryCache.get("hospital:tenant:tenant-a:clinical")).toBeUndefined();
    expect(queryCache.get("hospital:tenant:tenant-b:clinical")).toBeDefined();
  });

  it("clears security tokens on explicit logout", () => {
    tokenStorage.setToken("sec-token-12345");
    expect(tokenStorage.getToken()).toBe("sec-token-12345");

    tokenStorage.clearToken();
    expect(tokenStorage.getToken()).toBeNull();
  });

  it("redacts PHI from strings before telemetry transmission", () => {
    const raw = "Patient John Doe with email john.doe@hospital.com and card 4111-2222-3333-4444";
    const redacted = stripPhiPii(raw);

    expect(redacted).not.toContain("john.doe@hospital.com");
    expect(redacted).not.toContain("4111-2222-3333-4444");
    expect(redacted).toContain("[REDACTED_EMAIL]");
    expect(redacted).toContain("[REDACTED_CARD]");
  });
});
