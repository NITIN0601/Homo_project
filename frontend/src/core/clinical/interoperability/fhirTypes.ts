export interface FhirResource {
  resourceType: string;
  id: string;
  meta?: {
    versionId?: string;
    lastUpdated?: string;
  };
}

export interface FhirPatient extends FhirResource {
  resourceType: "Patient";
  identifier?: Array<{ system: string; value: string }>;
  active?: boolean;
  name?: Array<{ use?: string; text?: string; family?: string; given?: string[] }>;
  telecom?: Array<{ system: string; value: string; use?: string }>;
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;
}

export interface FhirEncounter extends FhirResource {
  resourceType: "Encounter";
  status: "planned" | "in-progress" | "finished" | "cancelled";
  subject: { reference: string; display?: string };
  period?: { start: string; end?: string };
}
