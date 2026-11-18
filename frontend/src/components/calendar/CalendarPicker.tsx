import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useTenant } from "../../context/ThemeProvider";
import { isDatePastHospitalTime } from "../../utils/timezone";
import { fetchIndianHolidays, type DynamicHoliday } from "../../services/holidayService";
import { CalendarHeader } from "./CalendarHeader";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarLegend } from "./CalendarLegend";
import { CalendarHolidaysBanner } from "./CalendarHolidaysBanner";
import { CalendarDoctorOooBanner } from "./CalendarDoctorOooBanner";
import { CalendarActiveSelectionBanner } from "./CalendarActiveSelectionBanner";
import {
  toYMD,
  isClinicOpen,
  getDaysInMonth,
  getFirstDayOfWeek,
  type CalendarPickerProps,
} from "./calendarTypes";

// export type { CalendarPickerProps };

export const CalendarPicker: React.FC<CalendarPickerProps> = ({
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
  const { state, hospitalTimeInfo, userTzInfo } = useApp();
  const { tenant } = useTenant();
  const blockedDatesList = state.blockedDates;
  const effectiveTodayYMD = adminMode ? hospitalTimeInfo.todayYMD : (userTzInfo?.todayYMD || hospitalTimeInfo.todayYMD);
  const [effYear, effMonth] = effectiveTodayYMD.split("-").map(Number);

  // Start view at current month
  const [viewYear, setViewYear] = useState(effYear);
  const [viewMonth, setViewMonth] = useState(effMonth - 1);

  // Keep view aligned if user switches timezone
  useEffect(() => {
    if (!adminMode && userTzInfo?.todayYMD) {
      const [y, m] = userTzInfo.todayYMD.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }, [adminMode, userTzInfo?.todayYMD]);

  // Dynamic Indian holidays fetched from Google Calendar public feed
  const [dynamicHolidays, setDynamicHolidays] = useState<DynamicHoliday[]>([]);
  const [loadedHolidayYear, setLoadedHolidayYear] = useState<number | null>(null);
  const isLoadingHolidays = loadedHolidayYear !== viewYear;

  const [isSyncingHolidays, setIsSyncingHolidays] = useState(false);
  const [syncFeedbackMsg, setSyncFeedbackMsg] = useState<string | null>(null);

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

  const handleSyncHolidays = async () => {
    setIsSyncingHolidays(true);
    try {
      const res = await fetch(`/api/calendar/holidays/sync?year=${viewYear}&force=true`, { method: "POST" });
      if (res.ok) {
        try {
          localStorage.removeItem(`ehr_dynamic_holidays_v5_${viewYear}`);
          localStorage.removeItem(`agastya_dynamic_holidays_v5_${viewYear}`);
        } catch {}
        const freshHols = await fetchIndianHolidays(viewYear);
        setDynamicHolidays(freshHols);
        setSyncFeedbackMsg(`✓ Updated ${freshHols.length} holidays for ${viewYear}!`);
      } else {
        const freshHols = await fetchIndianHolidays(viewYear);
        setDynamicHolidays(freshHols);
        setSyncFeedbackMsg(`✓ Loaded ${freshHols.length} holidays for ${viewYear}!`);
      }
    } catch {
      const freshHols = await fetchIndianHolidays(viewYear);
      setDynamicHolidays(freshHols);
      setSyncFeedbackMsg(`✓ Loaded ${freshHols.length} holidays for ${viewYear}!`);
    } finally {
      setIsSyncingHolidays(false);
      setTimeout(() => setSyncFeedbackMsg(null), 3000);
    }
  };

  // Year range: current year ± 2
  const yearOptions = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => effYear - 1 + i);
  }, [effYear]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth);

  // Month-specific blocked dates for doctor OOO announcement
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

  // Build the 6×7 calendar grid
  const calendarCells = useMemo<(number | null)[]>(() => {
    const cells: (number | null)[] = Array(firstDayOfWeek).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [firstDayOfWeek, daysInMonth]);

  // Month navigation
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
        if (!startDate || (startDate && endDate)) {
          onSelectRange(ymd, "");
        } else if (startDate && !endDate) {
          if (ymd > startDate) {
            onSelectRange(startDate, ymd);
          } else if (ymd < startDate) {
            onSelectRange(ymd, "");
          } else {
            onSelectRange(startDate, "");
          }
        }
      } else if (onSelectDate) {
        onSelectDate(ymd);
      }
      return;
    }

    const past = adminMode ? isDatePastHospitalTime(ymd) : (ymd < effectiveTodayYMD);
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

      <CalendarHeader
        viewYear={viewYear}
        viewMonth={viewMonth}
        yearOptions={yearOptions}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onSelectMonth={(m: number) => setViewMonth(m)}
        onSelectYear={(y: number) => setViewYear(y)}
      />

      <CalendarGrid
        calendarCells={calendarCells}
        viewYear={viewYear}
        viewMonth={viewMonth}
        effectiveTodayYMD={effectiveTodayYMD}
        selectedDate={selectedDate}
        bookedDates={bookedDates}
        adminMode={adminMode}
        startDate={startDate}
        endDate={endDate}
        blockedDatesList={blockedDatesList}
        holidaysMap={holidaysMap}
        tenantDoctorName={tenant.doctor?.name || "Doctor"}
        onDayClick={handleDayClick}
      />

      <CalendarLegend adminMode={adminMode} />

      {adminMode && (
        <>
          <CalendarHolidaysBanner
            monthFestivals={monthFestivals}
            viewMonth={viewMonth}
            viewYear={viewYear}
            isSyncingHolidays={isSyncingHolidays}
            syncFeedbackMsg={syncFeedbackMsg}
            isLoadingHolidays={isLoadingHolidays}
            onSyncHolidays={handleSyncHolidays}
          />

          <CalendarDoctorOooBanner monthBlockedDates={monthBlockedDates} />
        </>
      )}

      <CalendarActiveSelectionBanner
        adminMode={adminMode}
        selectedDate={selectedDate}
        startDate={startDate}
        endDate={endDate}
        holidaysMap={holidaysMap}
        onClearDate={() => onSelectDate?.("")}
        onClearRange={onSelectRange ? () => onSelectRange("", "") : undefined}
      />

      {error && (
        <p className="px-5 pb-4 text-red-500 text-xs font-medium" role="alert">{error}</p>
      )}
    </fieldset>
  );
};

export default CalendarPicker;
