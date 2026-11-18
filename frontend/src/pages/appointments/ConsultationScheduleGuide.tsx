import React from "react";
import { HOSPITAL } from "../../config";
import type { HospitalTenantConfig, HospitalDoctor } from "../../types/tenant";
import type { UserTimezoneInfo, MappedSessionHours } from "../../utils/timezone";

interface ConsultationScheduleGuideProps {
  tenant: HospitalTenantConfig;
  activeDoctor: HospitalDoctor;
  userTzInfo: UserTimezoneInfo;
  sessionHours: MappedSessionHours;
}

export const ConsultationScheduleGuide: React.FC<ConsultationScheduleGuideProps> = ({
  tenant,
  activeDoctor,
  userTzInfo,
  sessionHours,
}) => {
  const isTelemedicineHospital = tenant.features.enableTelemedicine && tenant.hours?.walkinAllowed === false;
  const doctorSchedule = activeDoctor.availability?.schedule;
  const hasWalkins = !isTelemedicineHospital && (doctorSchedule?.walkinDays ? doctorSchedule.walkinDays.length > 0 : true);
  const morningHoursDisplay = !userTzInfo.isHospitalTimezone
    ? sessionHours.morning.display
    : (activeDoctor.availability?.morningHours || sessionHours.morning.display);
  const eveningHoursDisplay = !userTzInfo.isHospitalTimezone
    ? sessionHours.evening.display
    : (activeDoctor.availability?.eveningHours || sessionHours.evening.display);
  const walkinDaysDisplay = doctorSchedule?.walkinDays?.join(", ") || tenant.hours?.walkinDaysSummary || "Monday to Saturday";
  const apptDaysDisplay = doctorSchedule?.appointmentOnlyDays?.join(", ") || tenant.hours?.appointmentDaysSummary || "Morning sessions & Sundays";
  const offDaysList = doctorSchedule?.offDays || [];

  if (isTelemedicineHospital || !hasWalkins) {
    return (
      <div className="bg-sky-50/90 border border-sky-200/90 rounded-2xl p-4 text-xs space-y-1.5 shadow-2xs mb-6">
        <div className="flex items-center gap-2 font-extrabold text-sky-950">
          <span className="text-base">🌐</span>
          <span>Scheduled Consultations Only (Tele-Care &amp; Dedicated Appointments)</span>
        </div>
        <p className="text-sky-900 leading-relaxed text-[11px]">
          All consultations with <strong>{activeDoctor.name}</strong> at {tenant.name} are scheduled strictly by prior appointment ({morningHoursDisplay} &amp; {eveningHoursDisplay}) to ensure dedicated, unhurried clinical care.
          {offDaysList.length > 0 && <span className="block mt-1 font-semibold text-sky-950">🏖️ Weekly Off: {offDaysList.join(", ")}</span>}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
      <div className="bg-blue-50/90 border border-blue-200/90 rounded-2xl p-4 text-xs space-y-1.5 shadow-2xs">
        <div className="flex items-center gap-2 font-extrabold text-blue-950">
          <span className="text-base">🚶‍♂️</span>
          <span>Walk-in OPD ({eveningHoursDisplay})</span>
        </div>
        <p className="text-blue-900 leading-relaxed text-[11px]">
          Walk-ins welcomed directly at{" "}
          <a
            href={tenant.contact.mapsUrl || HOSPITAL.ADDRESS.MAPS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline decoration-blue-400 hover:text-blue-950 inline-flex items-center gap-1 cursor-pointer"
            title={`Open ${tenant.name} on Google Maps`}
          >
            <span>{tenant.name} ({tenant.contact.address.street}, {tenant.contact.address.city})</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="opacity-80">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>{" "}
          during {walkinDaysDisplay}. Tokens issued at reception upon arrival.
        </p>
      </div>

      <div className="bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-4 text-xs space-y-1.5 shadow-2xs">
        <div className="flex items-center gap-2 font-extrabold text-emerald-950">
          <span className="text-base">📅</span>
          <span>Prior Appointment Only ({morningHoursDisplay})</span>
        </div>
        <p className="text-emerald-900 leading-relaxed text-[11px]">
          {apptDaysDisplay} with <strong>{activeDoctor.name}</strong> require prior booking using the calendar below.
          {offDaysList.length > 0 && <span className="block mt-1 font-semibold text-emerald-950">🏖️ Weekly Off: {offDaysList.join(", ")}</span>}
        </p>
      </div>
    </div>
  );
};
