export const queryKeys = {
  all: ["hospital"] as const,
  tenant: (tenantId: string) => [...queryKeys.all, "tenant", tenantId] as const,
  tenantConfig: (tenantId: string) => [...queryKeys.tenant(tenantId), "config"] as const,
  scheduling: {
    all: (tenantId: string) => [...queryKeys.tenant(tenantId), "scheduling"] as const,
    slots: (tenantId: string, date: string, doctorId?: string) =>
      [...queryKeys.scheduling.all(tenantId), "slots", date, doctorId] as const,
    appointments: (tenantId: string, patientId?: string) =>
      [...queryKeys.scheduling.all(tenantId), "appointments", patientId] as const,
  },
  clinical: {
    all: (tenantId: string) => [...queryKeys.tenant(tenantId), "clinical"] as const,
    patientRecords: (tenantId: string, patientId: string) =>
      [...queryKeys.clinical.all(tenantId), "records", patientId] as const,
    encounters: (tenantId: string, encounterId: string) =>
      [...queryKeys.clinical.all(tenantId), "encounters", encounterId] as const,
  },
  pharmacy: {
    all: (tenantId: string) => [...queryKeys.tenant(tenantId), "pharmacy"] as const,
    inventory: (tenantId: string) => [...queryKeys.pharmacy.all(tenantId), "inventory"] as const,
    orders: (tenantId: string) => [...queryKeys.pharmacy.all(tenantId), "orders"] as const,
  },
  billing: {
    all: (tenantId: string) => [...queryKeys.tenant(tenantId), "billing"] as const,
    invoices: (tenantId: string, patientId?: string) =>
      [...queryKeys.billing.all(tenantId), "invoices", patientId] as const,
  },
};
