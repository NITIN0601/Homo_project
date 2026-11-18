import type { FhirResource } from "./fhirTypes";

export function isValidFhirResource(resource: unknown): resource is FhirResource {
  if (!resource || typeof resource !== "object") return false;
  const res = resource as Record<string, unknown>;
  return typeof res.resourceType === "string" && typeof res.id === "string" && res.id.length > 0;
}
