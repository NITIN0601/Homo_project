import React, { useState, useMemo } from "react";
import CalendarPicker from "../../components/CalendarPicker";
import { formatDateWithWeekday, formatDateISO } from "../../utils/format";
import type { BlockedDateEntry } from "./types";

interface CalendarTabProps {
  blockedDates: BlockedDateEntry[];
  onBlockDate: (date: string, reason: string, type: "ooo" | "holiday" | "leave") => void;
  onBlockDateRange: (start: string, end: string, reason: string, type: "ooo" | "holiday" | "leave") => void;
  onUnblockDate: (id: string) => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = ({
  blockedDates,
  onBlockDate,
  onBlockDateRange,
  onUnblockDate,
}) => {
  const [newOooDate, setNewOooDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDateISO(d);
  });
  const [newOooEndDate, setNewOooEndDate] = useState("");
  const [newOooReason, setNewOooReason] = useState("Doctor Out of Office — Medical Conference & CME");
  const [newOooType, setNewOooType] = useState<"ooo" | "holiday" | "leave">("ooo");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [inspectedBlockedDate, setInspectedBlockedDate] = useState<BlockedDateEntry | null>(null);

  const computedDayCount = useMemo(() => {
    if (!newOooDate) return 0;
    if (!newOooEndDate || newOooEndDate <= newOooDate) return 1;
    const [sY, sM, sD] = newOooDate.split("-").map(Number);
    const [eY, eM, eD] = newOooEndDate.split("-").map(Number);
    const start = new Date(sY, sM - 1, sD, 12, 0, 0);
    const end = new Date(eY, eM - 1, eD, 12, 0, 0);
    const diffTime = end.getTime() - start.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }, [newOooDate, newOooEndDate]);

  const handleBlockCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOooDate) return;

    if (newOooEndDate && newOooEndDate > newOooDate) {
      onBlockDateRange(newOooDate, newOooEndDate, newOooReason, newOooType);
      setSuccessMsg(`Blocked ${computedDayCount} days (${newOooDate} to ${newOooEndDate}) on patient appointment portal.`);
    } else {
      onBlockDate(newOooDate, newOooReason, newOooType);
      setSuccessMsg(`Blocked ${newOooDate} as ${newOooType.toUpperCase()} on patient appointment portal.`);
    }

    setTimeout(() => setSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Calendar Header Banner */}
      <div className="bg-gradient-to-r from-rose-950 via-stone-900 to-rose-900 text-white p-5 rounded-3xl card-shadow border border-rose-600/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <span>🏖️</span> Doctor Schedule, Out-of-Office &amp; Clinic Availability Manager
          </h2>
          <p className="text-xs text-rose-200 mt-0.5">
            Synchronizes instantly with patient booking portal · Block leaves, national holidays, or conference dates
          </p>
        </div>

        <span className="bg-rose-900/80 px-3.5 py-1.5 rounded-xl border border-rose-500/40 font-bold text-xs text-rose-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
          {blockedDates.length} Days Blocked from Booking
        </span>
      </div>

      {successMsg && (
        <div className="bg-rose-50 border border-rose-300 text-rose-950 p-3 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <span>🏖️</span> {successMsg}
        </div>
      )}

      {/* Main Grid: Form on Left, Calendar Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form and Blocked List (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Date Block Form Card */}
          <div className="bg-white rounded-3xl card-shadow border border-stone-100 p-5 space-y-4 text-xs">
            <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2 border-b border-stone-100 pb-2.5">
              <span>📅</span> Block Clinic Dates (Single Day or Date Range)
            </h3>

            <form onSubmit={handleBlockCalendar} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={newOooDate}
                    onChange={(e) => setNewOooDate(e.target.value)}
                    className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                    End Date (Optional for Multi-Day)
                  </label>
                  <input
                    type="date"
                    value={newOooEndDate}
                    onChange={(e) => setNewOooEndDate(e.target.value)}
                    min={newOooDate}
                    className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              {computedDayCount > 1 && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-bold text-[11px] flex items-center gap-2">
                  <span>📅</span> Range selection: <strong>{computedDayCount} consecutive calendar days</strong> will be blocked.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                    Blocking Type *
                  </label>
                  <select
                    value={newOooType}
                    onChange={(e) => setNewOooType(e.target.value as any)}
                    className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white font-bold text-xs"
                  >
                    <option value="ooo">🏖️ Doctor Out of Office (OOO)</option>
                    <option value="holiday">🎉 Public / Festival Holiday</option>
                    <option value="leave">🌿 Clinic Maintenance / Personal Leave</option>
                  </select>
                </div>

                <div>
                  <label className="font-extrabold text-stone-700 uppercase tracking-wide text-[10px]">
                    Reason (Displayed to Patients) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newOooReason}
                    onChange={(e) => setNewOooReason(e.target.value)}
                    placeholder="e.g. CME Conference in Delhi, Festival Holiday…"
                    className="w-full mt-1 p-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>🏖️</span> Block Selected Dates ({computedDayCount} {computedDayCount === 1 ? "Day" : "Days"})
                </button>
              </div>
            </form>
          </div>

          {/* Active Blocked Dates Roster */}
          <div className="bg-white rounded-3xl card-shadow border border-stone-100 p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                <span>📋</span> Blocked Dates Roster ({blockedDates.length})
              </h3>
              <span className="text-[11px] text-stone-400">Live synchronized</span>
            </div>

            {blockedDates.length === 0 ? (
              <p className="text-stone-400 italic py-4 text-center">No calendar dates currently blocked.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {blockedDates.map((entry) => (
                  <div
                    key={entry.id || entry.date}
                    className="p-3 rounded-2xl border border-stone-200 bg-stone-50/70 hover:bg-white flex items-center justify-between gap-3 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-stone-900 text-xs font-mono">{entry.date}</strong>
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                            entry.type === "holiday"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : entry.type === "leave"
                              ? "bg-purple-100 text-purple-900 border border-purple-300"
                              : "bg-rose-100 text-rose-900 border border-rose-300"
                          }`}
                        >
                          {entry.type || "OOO"}
                        </span>
                      </div>
                      <p className="text-stone-600 text-[11px] mt-0.5">{entry.reason}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setInspectedBlockedDate(entry)}
                        className="text-stone-600 hover:text-stone-900 font-bold text-[11px] cursor-pointer"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => onUnblockDate(entry.id || entry.date)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        Unblock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Embedded Calendar Picker preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-3xl card-shadow border border-stone-100 p-5 space-y-3">
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                <span>🗓️</span> Patient Portal Calendar Preview
              </h3>
              <p className="text-stone-500 text-xs mt-0.5">
                Displays dates exactly as patient sees them on booking screen
              </p>
            </div>

            <div className="border border-stone-200 rounded-2xl overflow-hidden p-2 bg-stone-50/50">
              <CalendarPicker
                selectedDate={newOooDate}
                onSelectDate={(d: string) => setNewOooDate(d)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Inspect Blocked Date Modal */}
      {inspectedBlockedDate && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full card-shadow border border-stone-100 p-6 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <h4 className="font-bold text-stone-900 text-sm">Blocked Date Details</h4>
              <button
                onClick={() => setInspectedBlockedDate(null)}
                className="text-stone-400 hover:text-stone-600 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <p><strong>Date:</strong> {formatDateWithWeekday(inspectedBlockedDate.date)} ({inspectedBlockedDate.date})</p>
              <p><strong>Type:</strong> <span className="uppercase font-bold">{inspectedBlockedDate.type}</span></p>
              <p><strong>Reason:</strong> {inspectedBlockedDate.reason}</p>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
              <button
                onClick={() => setInspectedBlockedDate(null)}
                className="px-4 py-1.5 rounded-xl bg-stone-100 text-stone-700 font-bold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  onUnblockDate(inspectedBlockedDate.id || inspectedBlockedDate.date);
                  setInspectedBlockedDate(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Unblock Date
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarTab;
