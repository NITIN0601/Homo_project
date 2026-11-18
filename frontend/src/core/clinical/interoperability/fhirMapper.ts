import type { FhirPatient } from "./fhirTypes";

export function mapProfileToFhirPatient(profile: { id: string; name: string; phone?: string; gender?: string; age?: number }): FhirPatient {
  const names = profile.name ? profile.name.trim().split(/\s+/) : ["Patient"];
  const family = names.length > 1 ? names[names.length - 1] : "";
  const given = names.length > 1 ? names.slice(0, -1) : names;

  return {
    resourceType: "Patient",
    id: profile.id,
    active: true,
    name: [{
      use: "official",
      text: profile.name,
      family,
      given,
    }],
    telecom: profile.phone ? [{
      system: "phone",
      value: profile.phone,
      use: "mobile",
    }] : [],
    gender: (profile.gender === "male" || profile.gender === "female") ? profile.gender : "other",
  };
}
