import { createContext, useContext } from "react";
import type { BlockedCalendarDate, BookedAppointment } from "../../types";
import type {
  UserTimezoneInfo,
  ClinicTimeInfo,
  MappedSessionHours,
} from "../../utils/timezone";

export interface SchedulingContextValue {
  blockedDates: BlockedCalendarDate[];
  appointments: BookedAppointment[];
  userTimezone: string;
  setUserTimezone: (tz: string) => void;
  userTzInfo: UserTimezoneInfo;
  clinicTimeInfo: ClinicTimeInfo;
  sessionHours: MappedSessionHours;
  blockDate: (
    date: string,
    reason: string,
    type?: "ooo" | "holiday" | "leave",
    timeConfig?: { allDay?: boolean; startTime?: string; endTime?: string; slots?: string[] }
  ) => void;
  blockDateRange: (
    startDate: string,
    endDate: string,
    reason: string,
    type?: "ooo" | "holiday" | "leave",
    timeConfig?: { allDay?: boolean; startTime?: string; endTime?: string; slots?: string[] }
  ) => void;
  unblockDate: (idOrDate?: string, date?: string) => void;
  updateBlockedDate: (
    target: { id?: string; date?: string },
    updates: Partial<BlockedCalendarDate>
  ) => void;
  isDateBlocked: (date: string) => BlockedCalendarDate | undefined;
  isSlotBlocked: (date: string, slot24: string) => BlockedCalendarDate | undefined;
  getBlockedEntriesForDate: (date: string) => BlockedCalendarDate[];
  bookAppointment: (apt: BookedAppointment) => void;
  cancelAppointment: (id: string) => void;
  updateAppointmentStatus: (id: string, status: BookedAppointment["status"]) => void;
  getBookedSlotsForDate: (dateYMD: string) => string[];
  isSlotBooked: (dateYMD: string, slot24: string) => boolean;
}

export const SchedulingContext = createContext<SchedulingContextValue | null>(null);

export function useScheduling(): SchedulingContextValue {
  const ctx = useContext(SchedulingContext);
  if (!ctx) {
    throw new Error("useScheduling must be used within an AppProvider or SchedulingProvider");
  }
  return ctx;
}

