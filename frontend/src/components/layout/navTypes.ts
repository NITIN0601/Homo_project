export type PrimaryAdminGroup = "dashboard" | "appointments" | "patients" | "supplies" | "customization";

export interface AdminNavStats {
  todayAppts: number;
  registeredPatients: number;
  totalStock: number;
  lowStock: number;
  dispatchesCount: number;
  blockedDays: number;
}
