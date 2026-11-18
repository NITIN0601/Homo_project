import type { AppointmentStatus } from "../model/schedulingTypes";

export function formatAppointmentStatus(status: AppointmentStatus): string {
  switch (status) {
    case "Confirmed": return "Confirmed";
    case "Cancelled": return "Cancelled";
    case "Completed": return "Completed";
    case "In Consultation": return "In Consultation";
    case "Pending": return "Pending";
    default: return String(status);
  }
}
