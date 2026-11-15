import React from "react";
import type { DynamicHoliday } from "../../../services/holidayService";
import type { BlockedCalendarDate } from "../../../types";
import { THEME_COLORS } from "../../../config";
import { DAY_HEADERS, MONTHS, toYMD, isClinicOpen } from "./types";
import { isDatePastClinicTime } from "../../../utils/timezone";

interface CalendarGridProps {
  calendarCells: (number | null)[];
  viewYear: number;
  viewMonth: number;
  effectiveTodayYMD: string;
  selectedDate: string;
  bookedDates: string[];
  adminMode: boolean;
  startDate: string;
  endDate: string;
  blockedDatesList: BlockedCalendarDate[];
  holidaysMap: Map<string, DynamicHoliday>;
  tenantDoctorName: string;
  onDayClick: (day: number | null) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  calendarCells,
  viewYear,
  viewMonth,
  effectiveTodayYMD,
  selectedDate,
  bookedDates,
  adminMode,
  startDate,
  endDate,
  blockedDatesList,
  holidaysMap,
  tenantDoctorName,
  onDayClick,
}) => {
  return (
    <>
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

          const dateObj = new Date(viewYear, viewMonth, day);
          const ymd = toYMD(dateObj);
          const past = adminMode ? isDatePastClinicTime(ymd) : (ymd < effectiveTodayYMD);
          const isSunday = dateObj.getDay() === 0;
          const booked = bookedDates.includes(ymd);
          const dayBlockedEntries = blockedDatesList.filter((b) => b.date === ymd);
          const fullDayBlocked = dayBlockedEntries.find((b) => b.allDay !== false);
          const hasPartialBlock = !fullDayBlocked && dayBlockedEntries.some((b) => b.allDay === false);
          const isBlocked = !!fullDayBlocked;
          const blockedEntry = fullDayBlocked || dayBlockedEntries[0];

          // Admin range calculations
          const activeStart = adminMode ? (startDate || selectedDate || "") : (selectedDate || "");
          const activeEnd = adminMode ? (endDate || "") : "";
          const isStart = activeStart === ymd;
          const isEnd = activeEnd === ymd;
          const isInRange = Boolean(activeStart && activeEnd && activeStart < activeEnd && ymd > activeStart && ymd < activeEnd);
          const isRangeSelected = isStart || isEnd || isInRange;

          const disabled = adminMode ? false : (past || booked || isBlocked);
          const selected = adminMode ? isRangeSelected : (ymd === selectedDate);
          const isToday = effectiveTodayYMD === ymd;
          const festival = holidaysMap.get(ymd);

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
            } else if (hasPartialBlock) {
              cellBg = "#fef3c7";
              cellBorder = "1.5px dashed #f59e0b";
              textNumColor = "#92400e";
            } else if (past) {
              cellBg = festival ? "#f5f5f4" : "#fafaf9";
              cellBorder = festival ? "1px dashed #d6d3d1" : "1px solid #f5f5f4";
              textNumColor = "#a8a29e";
            } else if (festival) {
              cellBg = isSunday ? "#fff7ed" : "#ffedd5";
              cellBorder = "1.5px solid #ea580c";
              textNumColor = "#c2410c";
            } else if (isSunday) {
              cellBg = "#fffbeb";
              cellBorder = "1px solid #fde68a";
              textNumColor = "#92400e";
            }
          } else {
            cellBg = selected
              ? "#0f172a"
              : isBlocked
              ? "#fee2e2"
              : hasPartialBlock
              ? "#fffbeb"
              : past
              ? (festival ? "#f5f5f4" : "#fafaf9")
              : festival
              ? (isSunday ? "#fff7ed" : "#ffedd5")
              : isSunday
              ? "#fffbeb"
              : "white";

            cellBorder = selected
              ? "1px solid #0f172a"
              : isBlocked
              ? "1px solid #fca5a5"
              : hasPartialBlock
              ? "1.5px dashed #f59e0b"
              : past
              ? (festival ? "1px dashed #d6d3d1" : "1px solid #f5f5f4")
              : festival
              ? "1.5px solid #ea580c"
              : isSunday
              ? "1px solid #fde68a"
              : "1px solid transparent";

            textNumColor = selected
              ? "#ffffff"
              : isBlocked
              ? "#b91c1c"
              : hasPartialBlock
              ? "#92400e"
              : past
              ? "#a8a29e"
              : festival
              ? "#c2410c"
              : isSunday
              ? "#92400e"
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
                  ? `${tenantDoctorName} is Out of Office: ${blockedEntry?.reason}${adminMode ? " (Click to inspect / unblock)" : ""}`
                  : festival
                  ? `🪔 Indian Festival: ${festival.name}${festival.emoji ? ` ${festival.emoji}` : ""}`
                  : isSunday
                  ? "Sunday: Open by prior appointment only"
                  : adminMode
                  ? "Click to select start or end date"
                  : undefined
              }
              onClick={() => onDayClick(day)}
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

              {/* Partial time block indicator */}
              {hasPartialBlock && !selected && !isBlocked && (
                <span
                  className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[6.5px] font-extrabold tracking-tighter uppercase select-none pointer-events-none text-amber-900 flex items-center gap-0.5"
                  aria-hidden="true"
                  title="Specific hours blocked"
                >
                  <span>⏱️</span>Part
                </span>
              )}

              {/* Sunday badge indicator */}
              {isSunday && !selected && !isBlocked && !hasPartialBlock && (
                <span
                  className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[6px] font-extrabold tracking-tighter uppercase select-none pointer-events-none ${
                    past ? "text-stone-400" : "text-amber-900"
                  }`}
                  aria-hidden="true"
                >
                  {festival ? "Sun·Fest" : "Sun"}
                </span>
              )}

              {/* Indian Festival saffron dot & emoji indicator */}
              {festival && !selected && (
                <>
                  <span
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full z-10 ${
                      past ? "bg-stone-300 ring-1 ring-stone-200" : "bg-orange-600 ring-2 ring-orange-200 shadow-xs"
                    }`}
                    aria-hidden="true"
                    title={`Festival: ${festival.name}${past ? " (Past)" : ""}`}
                  />
                  <span
                    className={`absolute top-0.5 left-1 text-[8.5px] leading-none select-none pointer-events-none ${
                      past ? "opacity-35 grayscale" : ""
                    }`}
                    aria-hidden="true"
                    title={festival.name}
                  >
                    {festival.emoji || "🪔"}
                  </span>
                  {!isSunday && !isBlocked && (
                    <span
                      className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[6px] font-extrabold tracking-tighter uppercase select-none pointer-events-none ${
                        past ? "text-stone-400" : "text-orange-900"
                      }`}
                    >
                      Fest
                    </span>
                  )}
                </>
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
    </>
  );
};
