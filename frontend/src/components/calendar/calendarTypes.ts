export interface CalendarPickerProps {
  selectedDate?: string;       // "YYYY-MM-DD" or ""
  onSelectDate?: (date: string) => void;
  error?: string;
  /** Simulate already-booked dates from the API */
  bookedDates?: string[];
  /** Admin Interactive Range Selection Mode */
  adminMode?: boolean;
  startDate?: string;
  endDate?: string;
  onSelectRange?: (startDate: string, endDate: string) => void;
  onDateClick?: (date: string, isBlocked: boolean, blockedEntry?: any) => void;
}

export const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export const DAY_HEADERS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function isClinicOpen(_date: Date): boolean {
  return true;
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}
