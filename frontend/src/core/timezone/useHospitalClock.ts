import { useState, useEffect } from "react";
import { getHospitalTimeInfo } from "./hospitalClock";
import type { HospitalTimeInfo } from "./types";

/**
 * Hook providing live reactive hospital time that refreshes every 30 seconds
 * and synchronizes with tenant timezone and locale.
 */
export function useHospitalClock(timezone?: string, locale?: string): HospitalTimeInfo {
  const [clock, setClock] = useState<HospitalTimeInfo>(() => getHospitalTimeInfo(timezone, locale));

  useEffect(() => {
    // Immediate sync on timezone/locale change
    setClock(getHospitalTimeInfo(timezone, locale));

    const interval = setInterval(() => {
      setClock(getHospitalTimeInfo(timezone, locale));
    }, 30000);

    return () => clearInterval(interval);
  }, [timezone, locale]);

  return clock;
}

export default useHospitalClock;
