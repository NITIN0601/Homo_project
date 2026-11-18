export interface PatientNotification {
  id: string;
  patientId: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "appointment" | "prescription" | "invoice" | "general";
}
