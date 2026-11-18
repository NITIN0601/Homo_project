import React from "react";

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

interface CalendarLegendProps {
  adminMode?: boolean;
}

export const CalendarLegend: React.FC<CalendarLegendProps> = ({ adminMode }) => {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 border-t border-stone-100 bg-stone-50/70">
      {adminMode ? (
        <>
          <LegendDot color="#047857" label="Selected (Start / End / Range)" border />
          <LegendDot color="#fee2e2" borderColor="#fca5a5" label="Full Day Blocked (Click to Inspect/Unblock)" />
          <LegendDot color="#fef3c7" borderColor="#f59e0b" label="Partial Hours Blocked" />
          <LegendDot color="#fffbeb" borderColor="#fde68a" label="Sunday (Prior Appt Only)" />
          <LegendDot color="#ea580c" label="Indian Festival / Holiday" />
          <LegendDot color="#d6d3d1" label="Past Date" />
        </>
      ) : (
        <>
          <LegendDot color="#0f172a" label="Selected Date" border />
          <LegendDot color="#fffbeb" borderColor="#fde68a" label="Sunday (Prior Appt Only)" />
          <LegendDot color="#ea580c" label="Indian Festival / Holiday" />
          <LegendDot color="#fee2e2" borderColor="#fca5a5" label="Doctor OOO (All Day)" />
          <LegendDot color="#fffbeb" borderColor="#f59e0b" label="Partial Hours Blocked" />
          <LegendDot color="#7e22ce" label="Fully Booked" />
          <LegendDot color="#d6d3d1" label="Past Date" />
        </>
      )}
    </div>
  );
};
