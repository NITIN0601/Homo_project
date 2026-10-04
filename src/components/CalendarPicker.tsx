import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useApp } from "../context/AppContext";
import { CLINIC, THEME_GRADIENTS, THEME_COLORS } from "../config";
import { formatDateWithWeekday, formatDateFull } from "../utils/format";
import { isDatePastClinicTime } from "../utils/timezone";
import { fetchIndianHolidays, type DynamicHoliday } from "../services/holidayService";

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_HEADERS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function toYMD(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function isClinicOpen(_date: Date): boolean {
  // Monday to Saturday open regular hours; Sunday open by prior appointment only
  return true;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

// ─── Props ────────────────────────────────────────────────────────────────────
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

// ─── Component ────────────────────────────────────────────────────────────────
const CalendarPicker: React.FC<CalendarPickerProps> = ({
  selectedDate = "",
  onSelectDate,
  error,
  bookedDates = [],
  adminMode = false,
  startDate = "",
  endDate = "",
  onSelectRange,
  onDateClick,
}) => {
  const { state, clinicTimeInfo } = useApp();
  const blockedDatesList = state.blockedDates;
  const clinicTime = clinicTimeInfo;
  const [clinicYear, clinicMonth] = clinicTime.todayYMD.split("-").map(Number);

  // Start view at clinic's current month
  const [viewYear,  setViewYear]  = useState(clinicYear);
  const [viewMonth, setViewMonth] = useState(clinicMonth - 1);

  // Dynamic Indian holidays fetched from Google Calendar public feed
  const [dynamicHolidays, setDynamicHolidays] = useState<DynamicHoliday[]>([]);
  const [loadedHolidayYear, setLoadedHolidayYear] = useState<number | null>(null);
  const isLoadingHolidays = loadedHolidayYear !== viewYear;

  useEffect(() => {
    let active = true;
    fetchIndianHolidays(viewYear)
      .then((hols) => {
        if (active) {
          setDynamicHolidays(hols);
          setLoadedHolidayYear(viewYear);
        }
      })
      .catch(() => {
        if (active) setLoadedHolidayYear(viewYear);
      });
    return () => {
      active = false;
    };
  }, [viewYear]);

  // Year range: current clinic year ± 2
  const yearOptions = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => clinicYear - 1 + i);
  }, [clinicYear]);

  const daysInMonth   = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);

  // Month-specific blocked dates for doctor OOO announcement (deduplicated by date)
  const monthBlockedDates = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    const map = new Map<string, typeof blockedDatesList[0]>();
    for (const b of blockedDatesList) {
      if (b && b.date && b.date.startsWith(prefix) && !map.has(b.date)) {
        map.set(b.date, b);
      }
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [viewYear, viewMonth, blockedDatesList]);

  // Dynamic holidays map by date YYYY-MM-DD
  const holidaysMap = useMemo(() => {
    const map = new Map<string, DynamicHoliday>();
    for (const h of dynamicHolidays) {
      if (map.has(h.date)) {
        const existing = map.get(h.date)!;
        map.set(h.date, {
          ...existing,
          name: `${existing.name} / ${h.name}`,
        });
      } else {
        map.set(h.date, h);
      }
    }
    return map;
  }, [dynamicHolidays]);

  // Dynamic month-specific Indian Calendar Festivals & National Holidays
  const monthFestivals = useMemo(() => {
    const prefix = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;
    return dynamicHolidays.filter((h) => h.date.startsWith(prefix));
  }, [viewYear, viewMonth, dynamicHolidays]);

  // Build the 6×7 calendar grid (nulls = empty leading/trailing cells)
  const calendarCells = useMemo<(number | null)[]>(() => {
    const cells: (number | null)[] = Array(firstDayOfWeek).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // Pad to a full row
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [firstDayOfWeek, daysInMonth]);

  // Navigate months
  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11; }
      return m - 1;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0; }
      return m + 1;
    });
  }, []);

  const handleDayClick = (day: number | null) => {
    if (!day) return;
    const date = new Date(viewYear, viewMonth, day);
    const ymd = toYMD(date);
    const blockedEntry = blockedDatesList.find((b) => b.date === ymd);
    const isBlocked = !!blockedEntry;

    if (adminMode) {
      if (onDateClick) {
        onDateClick(ymd, isBlocked, blockedEntry);
      }
      if (onSelectRange) {
        // Multi-day selection logic:
        // 1. If no start date or both start and end exist, clicking starts a new single-day or start date
        if (!startDate || (startDate && endDate)) {
          onSelectRange(ymd, "");
        } else if (startDate && !endDate) {
          // 2. If start date exists and no end date:
          if (ymd > startDate) {
            onSelectRange(startDate, ymd);
          } else if (ymd < startDate) {
            // Clicked earlier date -> make it the new start date
            onSelectRange(ymd, "");
          } else {
            // Clicked same date again -> keep single day
            onSelectRange(startDate, "");
          }
        }
      } else if (onSelectDate) {
        onSelectDate(ymd);
      }
      return;
    }

    const past = isDatePastClinicTime(ymd);
    if (past || !isClinicOpen(date) || isBlocked || bookedDates.includes(ymd)) return;
    if (onSelectDate) {
      onSelectDate(ymd);
    }
  };


  return (
    <fieldset
      className="bg-white rounded-2xl card-shadow overflow-hidden"
      aria-label="Appointment calendar"
    >
      <legend className="sr-only">Select appointment date</legend>

      {/* ── Header: month/year controls ───────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ background: THEME_GRADIENTS.PRIMARY }}
      >
        {/* Prev month */}
        <button
          type="button"
          onClick={prevMonth}
          id="cal-prev-month"
          className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/30
            flex items-center justify-center text-white transition-colors
            focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
          aria-label="Previous month"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Month + Year selectors */}
        <div className="flex items-center gap-2">
          {/* Month dropdown */}
          <select
            id="cal-month-select"
            value={viewMonth}
            onChange={(e) => setViewMonth(Number(e.target.value))}
            className="bg-white/15 hover:bg-white/25 text-white text-sm font-bold
              rounded-lg px-3 py-1.5 border border-white/20
              focus:outline-none focus:ring-2 focus:ring-white/60
              transition-colors cursor-pointer appearance-none text-center"
            aria-label="Select month"
            style={{ colorScheme: "dark" }}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i} className="text-stone-800 bg-white font-medium">
                {m}
              </option>
            ))}
          </select>

          {/* Year dropdown */}
          <select
            id="cal-year-select"
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="bg-white/15 hover:bg-white/25 text-white text-sm font-bold
              rounded-lg px-3 py-1.5 border border-white/20
              focus:outline-none focus:ring-2 focus:ring-white/60
              transition-colors cursor-pointer appearance-none text-center"
            aria-label="Select year"
            style={{ colorScheme: "dark" }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y} className="text-stone-800 bg-white font-medium">
                {y}
              </option>
            ))}
          </select>
        </div>

        {/* Next month */}
        <button
          type="button"
          onClick={nextMonth}
          id="cal-next-month"
          className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/30
            flex items-center justify-center text-white transition-colors
            focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none cursor-pointer"
          aria-label="Next month"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* ── Day-of-week headers ───────────────────────────── */}
      <div className="grid grid-cols-7 bg-stone-50 border-b border-stone-100">
        {DAY_HEADERS.map((d) => (
          <div
            key={d}
            className="text-center text-[10px] font-bold uppercase tracking-wider py-2"
            style={{ color: d === "Sun" ? "#b45309" : THEME_COLORS.STONE_400 }}
            aria-hidden="true"
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ─────────────────────────────────────── */}
      <div
        className="grid grid-cols-7 gap-px bg-stone-100 p-px"
        role="grid"
        aria-label={`${MONTHS[viewMonth]} ${viewYear}`}
      >
        {calendarCells.map((day, idx) => {
          if (!day) {
            return (
              <div
                key={`empty-${idx}`}
                className="bg-white h-10"
                role="gridcell"
                aria-hidden="true"
              />
            );
          }

          const dateObj      = new Date(viewYear, viewMonth, day);
          const ymd          = toYMD(dateObj);
          const past         = isDatePastClinicTime(ymd);
          const isSunday     = dateObj.getDay() === 0;
          const booked       = bookedDates.includes(ymd);
          const blockedEntry = blockedDatesList.find((b) => b.date === ymd);
          const isBlocked    = !!blockedEntry;

          // Admin range calculations
          const activeStart = adminMode ? (startDate || selectedDate || "") : (selectedDate || "");
          const activeEnd   = adminMode ? (endDate || "") : "";
          const isStart     = activeStart === ymd;
          const isEnd       = activeEnd === ymd;
          const isInRange   = Boolean(activeStart && activeEnd && activeStart < activeEnd && ymd > activeStart && ymd < activeEnd);
          const isRangeSelected = isStart || isEnd || isInRange;

          const disabled     = adminMode ? false : (past || booked || isBlocked);
          const selected     = adminMode ? isRangeSelected : (ymd === selectedDate);
          const isToday      = clinicTime.todayYMD === ymd;
          const festival     = holidaysMap.get(ymd);

          let cellBg = "white";
          let cellBorder = "1px solid transparent";
          let textNumColor = "#1c1917";

          if (adminMode) {
            if (isStart || isEnd) {
              cellBg = "#047857";
              cellBorder = "1px solid #065f46";
              textNumColor = "#ffffff";
            } else if (isInRange) {
              cellBg = "#d1fae5";
              cellBorder = "1px solid #6ee7b7";
              textNumColor = "#065f46";
            } else if (isBlocked) {
              cellBg = "#fee2e2";
              cellBorder = "1px solid #fca5a5";
              textNumColor = "#b91c1c";
            } else if (isSunday) {
              cellBg = "#fffbeb";
              cellBorder = "1px solid #fde68a";
              textNumColor = "#92400e";
            } else if (festival && !past) {
              cellBg = "#fff7ed";
              cellBorder = "1px solid #fed7aa";
              textNumColor = "#9a3412";
            } else if (past) {
              cellBg = "#fafaf9";
              cellBorder = "1px solid #f5f5f4";
              textNumColor = "#a8a29e";
            }
          } else {
            cellBg = selected
              ? "#0f172a"
              : isBlocked
              ? "#fee2e2"
              : isSunday
              ? "#fffbeb"
              : festival && !past
              ? "#fff7ed"
              : "white";

            cellBorder = selected
              ? "1px solid #0f172a"
              : isBlocked
              ? "1px solid #fca5a5"
              : isSunday
              ? "1px solid #fde68a"
              : festival && !past
              ? "1px solid #fed7aa"
              : "1px solid transparent";

            textNumColor = selected
              ? "#ffffff"
              : isBlocked
              ? "#b91c1c"
              : isSunday
              ? "#92400e"
              : past
              ? "#a8a29e"
              : booked
              ? "#7e22ce"
              : "#1c1917";
          }

          return (
            <button
              key={ymd}
              type="button"
              id={`cal-day-${ymd}`}
              role="gridcell"
              aria-label={`${day} ${MONTHS[viewMonth]} ${viewYear}${festival ? ` — Indian Festival: ${festival.name}` : ""}${isBlocked ? ` — Doctor Out of Office: ${blockedEntry?.reason}` : isSunday ? " — Sunday: By prior appointment only" : disabled ? " — unavailable" : ""}${selected ? " — selected" : ""}`}
              aria-selected={selected}
              aria-disabled={disabled}
              disabled={disabled}
              title={
                isBlocked
                  ? `${CLINIC.DOCTOR_NAME} is Out of Office: ${blockedEntry?.reason}${adminMode ? " (Click to inspect / unblock)" : ""}`
                  : festival
                  ? `🪔 Indian Festival: ${festival.name}${festival.emoji ? ` ${festival.emoji}` : ""}`
                  : isSunday
                  ? "Sunday: Open by prior appointment only"
                  : adminMode
                  ? "Click to select start or end date"
                  : undefined
              }
              onClick={() => handleDayClick(day)}
              className={`relative h-10 flex items-center justify-center transition-all duration-150 focus-visible:z-20 focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:outline-none ${
                selected ? "z-10 ring-2 ring-emerald-600 ring-offset-1 rounded-sm shadow-md" : ""
              }`}
              style={{
                cursor:     disabled ? "not-allowed" : "pointer",
                background: cellBg,
                border:     cellBorder,
              }}
              onMouseEnter={(e) => {
                if (!disabled && !selected) {
                  (e.currentTarget as HTMLButtonElement).style.background = "#f0fdf4";
                }
              }}
              onMouseLeave={(e) => {
                if (!disabled && !selected) {
                  (e.currentTarget as HTMLButtonElement).style.background = cellBg;
                }
              }}
            >
              {/* Admin Start / End tag overlays */}
              {adminMode && isStart && (
                <span className="absolute -top-1 -left-1 text-[7px] font-black uppercase bg-emerald-950 text-emerald-100 px-1 py-0.5 rounded shadow-2xs pointer-events-none z-20">
                  {isEnd ? "1-Day" : "Start"}
                </span>
              )}
              {adminMode && isEnd && !isStart && (
                <span className="absolute -top-1 -right-1 text-[7px] font-black uppercase bg-emerald-950 text-emerald-100 px-1 py-0.5 rounded shadow-2xs pointer-events-none z-20">
                  End
                </span>
              )}

              {/* Today indicator ring */}
              {isToday && !selected && (
                <span
                  className="absolute inset-[4px] rounded-full border-2 border-emerald-500/80 pointer-events-none"
                  aria-hidden="true"
                />
              )}

              {/* Day number digit */}
              <span
                className={`text-xs font-bold leading-none relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                  selected ? "font-black" : ""
                }`}
                style={{
                  color: textNumColor,
                  background: (adminMode ? (isStart || isEnd) : selected) ? (adminMode ? "#047857" : "#0f172a") : "transparent",
                }}
              >
                {day}
              </span>

              {/* Sunday badge indicator (high contrast non-color cue) */}
              {isSunday && !selected && !isBlocked && !past && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[6px] font-extrabold text-amber-800 tracking-tighter uppercase"
                  aria-hidden="true"
                >
                  Sun
                </span>
              )}

              {/* Indian Festival saffron dot indicator */}
              {festival && !selected && !isBlocked && !past && (
                <span
                  className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-orange-500 shadow-2xs"
                  aria-hidden="true"
                  title={`Festival: ${festival.name}`}
                />
              )}

              {/* Booked dot indicator */}
              {booked && !selected && !isBlocked && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-purple-500"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Legend (Color Blindness Friendly with Distinct Shapes & Hues) ───────── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 border-t border-stone-100 bg-stone-50/70">
        {adminMode ? (
          <>
            <LegendDot color="#047857" label="Selected (Start / End / Range)" border />
            <LegendDot color="#fee2e2" borderColor="#fca5a5" label="Blocked Date (Click to Inspect/Unblock)" />
            <LegendDot color="#fffbeb" borderColor="#fde68a" label="Sunday (Prior Appt Only)" />
            <LegendDot color="#ea580c" label="Indian Festival / Holiday" />
            <LegendDot color="#d6d3d1" label="Past Date" />
          </>
        ) : (
          <>
            <LegendDot color="#0f172a" label="Selected Date" border />
            <LegendDot color="#fffbeb" borderColor="#fde68a" label="Sunday (Prior Appt Only)" />
            <LegendDot color="#ea580c" label="Indian Festival / Holiday" />
            <LegendDot color="#fee2e2" borderColor="#fca5a5" label="Doctor OOO / Unavailable" />
            <LegendDot color="#7e22ce" label="Fully Booked" />
            <LegendDot color="#d6d3d1" label="Past Date" />
          </>
        )}
      </div>

      {/* ── Indian Calendar Festivals & Holidays in View Month ───────────────────── */}
      {monthFestivals.length > 0 && (
        <div className="mx-5 my-2.5 p-3 rounded-xl bg-orange-50/80 border border-orange-200/90 text-xs animate-fadeIn">
          <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
            <div className="flex items-center gap-1.5 font-black text-orange-950">
              <span className="text-sm">🪔</span>
              <span>Indian Calendar Festivals & Holidays ({MONTHS[viewMonth]} {viewYear})</span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1" title="Real-time sync from Google Calendar Public Holidays Feed">
                <span className={`w-1.5 h-1.5 rounded-full ${isLoadingHolidays ? "bg-amber-500 animate-ping" : "bg-emerald-500 animate-pulse"}`} />
                <span>{isLoadingHolidays ? "Syncing Google Calendar..." : "Google Calendar Live Feed"}</span>
              </span>
              <span className="text-[10px] font-semibold text-orange-800 bg-orange-100/90 px-2 py-0.5 rounded-full border border-orange-200">
                {monthFestivals.length} {monthFestivals.length === 1 ? "Festival" : "Festivals"}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px]">
            {monthFestivals.map((f) => (
              <div
                key={f.date + f.name}
                className="flex items-center gap-1.5 text-orange-900 bg-white/80 px-2.5 py-1 rounded-lg border border-orange-100 shadow-2xs"
              >
                <span className="font-mono font-bold text-orange-950 whitespace-nowrap">
                  {f.emoji || "🪔"} {formatDateWithWeekday(f.date + "T00:00:00")}:
                </span>
                <span className="truncate font-semibold">{f.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Doctor OOO Announcements for View Month ───────────────────── */}
      {monthBlockedDates.length > 0 && (
        <div className="mx-5 my-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200/90 text-xs animate-fadeIn">
          <div className="flex items-center gap-1.5 font-black text-rose-950 mb-1">
            <span>🏖️</span>
            <span>Doctor Availability & Out of Office (OOO) Schedule</span>
          </div>
          <div className="space-y-1 text-rose-800 text-[11px] font-medium">
            {monthBlockedDates.map((b) => (
              <div key={b.id} className="flex items-start gap-1.5">
                <span className="font-bold font-mono text-rose-900 whitespace-nowrap">
                  • {formatDateWithWeekday(b.date + "T00:00:00")}:
                </span>
                <span>{b.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Selected date / range display ─────────────────── */}
      {adminMode && (startDate || selectedDate) && (() => {
        const activeStart = startDate || selectedDate;
        const activeEnd = endDate;
        return (
          <div
            className="mx-5 mb-4 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 space-y-1 shadow-2xs animate-fadeIn"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span aria-hidden="true" className="text-xl">🗓️</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    Active Calendar Selection
                  </p>
                  <p className="text-emerald-950 font-extrabold text-xs flex items-center flex-wrap gap-2">
                    {activeEnd && activeEnd > activeStart ? (
                      <span>
                        {formatDateWithWeekday(activeStart + "T00:00:00")} → {formatDateWithWeekday(activeEnd + "T00:00:00")}
                        <span className="ml-2 font-mono text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-black">
                          Range Selected
                        </span>
                      </span>
                    ) : (
                      <span>
                        {formatDateWithWeekday(activeStart + "T00:00:00")}
                        <span className="ml-2 font-mono text-[10px] bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full font-black">
                          Single Day
                        </span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
              {onSelectRange && (
                <button
                  type="button"
                  onClick={() => onSelectRange("", "")}
                  className="text-stone-400 hover:text-stone-600 transition-colors p-1 cursor-pointer"
                  title="Clear Selection"
                  aria-label="Clear selection"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {!adminMode && selectedDate && (() => {
        const isSunday = new Date(selectedDate + "T00:00:00").getDay() === 0;
        const selectedFestival = holidaysMap.get(selectedDate);

        return (
          <div
            className="mx-5 mb-4 bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2 shadow-2xs"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span aria-hidden="true" className="text-xl">📅</span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500">
                    Selected Consultation Date
                  </p>
                  <p className="text-stone-900 font-extrabold text-sm flex items-center flex-wrap gap-2">
                    <span>{formatDateFull(selectedDate + "T00:00:00")}</span>
                    {isSunday && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                        Sunday (Prior Appointment Only)
                      </span>
                    )}
                    {selectedFestival && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1">
                        <span>{selectedFestival.emoji || "🪔"}</span>
                        <span>{selectedFestival.name}</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onSelectDate?.("")}
                className="ml-auto text-stone-400 hover:text-stone-600 transition-colors p-1 cursor-pointer"
                aria-label="Clear selected date"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        );
      })()}

      {/* Error */}
      {error && (
        <p className="px-5 pb-4 text-red-500 text-xs font-medium" role="alert">{error}</p>
      )}
    </fieldset>
  );
};

// ─── Legend dot ───────────────────────────────────────────────────────────────
const LegendDot: React.FC<{ color: string; label: string; border?: boolean; borderColor?: string }> = ({
  color,
  label,
  border,
  borderColor,
}) => (
  <span className="flex items-center gap-1.5 text-[10px] text-stone-600 font-medium">
    <span
      className="w-3 h-3 rounded-sm flex-shrink-0"
      style={{
        background: color,
        border: borderColor ? `1px solid ${borderColor}` : border ? `1px solid #0f172a` : "none",
      }}
      aria-hidden="true"
    />
    {label}
  </span>
);

export default CalendarPicker;

