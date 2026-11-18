import type { BookedAppointment, BlockedCalendarDate } from "@core/types";

export type { BookedAppointment, BlockedCalendarDate };

export type AppointmentStatus = BookedAppointment["status"];

export interface SchedulingFilters {
  doctorId?: string;
  startDate?: string;
  endDate?: string;
  patientId?: string;
  status?: AppointmentStatus;
}

export interface BlockedDateEntry {
  id: string;
  date: string;
  reason: string;
  type: "ooo" | "holiday" | "leave";
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
  slots?: string[];
  createdAt?: string;
}
