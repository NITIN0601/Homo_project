import React, { useState } from "react";
import { Modal } from "../../../shared/ui";
import { formatDateWithWeekday } from "../../../shared/utils/format";
import type { BlockedDateEntry } from "../model/schedulingTypes";
import { BLOCKING_REASON_TEMPLATES } from "../model/calendarConstants";

interface InspectBlockedDateModalProps {
  entry: BlockedDateEntry | null;
  isOpen: boolean;
  onClose: () => void;
  onUnblock: (entry: BlockedDateEntry) => void;
  onSaveNotice: (
    id: string | undefined,
    date: string | undefined,
    updates: { reason?: string; type?: "ooo" | "holiday" | "leave" }
  ) => void;
}

const InspectModalBody: React.FC<{
  entry: BlockedDateEntry;
  onClose: () => void;
  onUnblock: (entry: BlockedDateEntry) => void;
  onSaveNotice: InspectBlockedDateModalProps["onSaveNotice"];
}> = ({ entry, onClose, onUnblock, onSaveNotice }) => {
  const [editInspectReason, setEditInspectReason] = useState(entry.reason || "");
  const [editInspectType, setEditInspectType] = useState<"ooo" | "holiday" | "leave">(entry.type || "ooo");
  const [inspectSaveSuccess, setInspectSaveSuccess] = useState(false);

  const handleSave = () => {
    if (!editInspectReason.trim()) return;
    const updates = { reason: editInspectReason.trim(), type: editInspectType };
    onSaveNotice(entry.id, entry.date, updates);
    setInspectSaveSuccess(true);
    setTimeout(() => {
      setInspectSaveSuccess(false);
    }, 3500);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Blocked Schedule Details & Patient Notice"
      subtitle="Manage Doctor Availability and update the notice displayed to patients"
      size="md"
      footer={
        <div className="flex items-center justify-between gap-2 w-full">
          <button
            type="button"
            onClick={() => {
              onUnblock(entry);
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold transition-colors cursor-pointer text-xs active:scale-95"
          >
            🗑️ Unblock Entry
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold transition-colors cursor-pointer text-xs"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!editInspectReason.trim()}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold transition-colors cursor-pointer text-xs active:scale-95 shadow-sm flex items-center gap-1.5"
            >
              <span>💾</span> Save Changes
            </button>
          </div>
        </div>
      }
    >
      <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 text-xs">
        {inspectSaveSuccess && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold flex items-center gap-2 animate-fadeIn">
            <span>✓</span> Notice updated successfully! Live schedule reflects changes immediately.
          </div>
        )}

        <div className="space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-200">
            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Date</span>
              <p className="font-bold text-stone-900 mt-0.5">
                {formatDateWithWeekday(entry.date)}
              </p>
              <p className="text-[11px] font-mono text-stone-500">{entry.date}</p>
            </div>

            <div>
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Scope</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mt-1 ${
                  entry.allDay !== false
                    ? "bg-rose-100 text-rose-900 border border-rose-300"
                    : "bg-blue-100 text-blue-900 border border-blue-300"
                }`}
              >
                {entry.allDay !== false ? "🌞 Full Day Block" : "⏱️ Time-Based Block"}
              </span>
            </div>
          </div>

          {entry.allDay === false && (
            <div className="p-3 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-2">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
                  Blocked Hours Window
                </span>
                <p className="font-mono font-bold text-blue-950 mt-0.5 text-xs">
                  {entry.startTime || "Custom"} – {entry.endTime || "Custom"}
                </p>
              </div>

              {entry.slots && entry.slots.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">
                    Blocked Consultation Slots ({entry.slots.length}):
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {entry.slots.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-md bg-white text-blue-900 border border-blue-200 font-mono font-bold text-[11px] shadow-xs"
                      >
                        ⛔ {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Editable Blocking Type */}
          <div>
            <label className="text-[10px] font-extrabold text-stone-600 uppercase tracking-wider block mb-1">
              Blocking Category / Type *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditInspectType("ooo");
                  const allTpls = Object.values(BLOCKING_REASON_TEMPLATES).flat();
                  if (!editInspectReason.trim() || allTpls.includes(editInspectReason)) {
                    setEditInspectReason(BLOCKING_REASON_TEMPLATES.ooo[0]);
                  }
                }}
                className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  editInspectType === "ooo"
                    ? "bg-rose-50 border-rose-400 text-rose-950 ring-2 ring-rose-400/40"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                🏖️ Out of Office
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditInspectType("holiday");
                  const allTpls = Object.values(BLOCKING_REASON_TEMPLATES).flat();
                  if (!editInspectReason.trim() || allTpls.includes(editInspectReason)) {
                    setEditInspectReason(BLOCKING_REASON_TEMPLATES.holiday[0]);
                  }
                }}
                className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  editInspectType === "holiday"
                    ? "bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-400/40"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                🎉 Holiday
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditInspectType("leave");
                  const allTpls = Object.values(BLOCKING_REASON_TEMPLATES).flat();
                  if (!editInspectReason.trim() || allTpls.includes(editInspectReason)) {
                    setEditInspectReason(BLOCKING_REASON_TEMPLATES.leave[0]);
                  }
                }}
                className={`p-2 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                  editInspectType === "leave"
                    ? "bg-purple-50 border-purple-400 text-purple-950 ring-2 ring-purple-400/40"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                🌿 Leave / Maint.
              </button>
            </div>
          </div>

          {/* Editable Reason */}
          <div>
            <label className="text-[10px] font-extrabold text-stone-600 uppercase tracking-wider block mb-1">
              Reason (Displayed to Patients) *
            </label>
            <textarea
              rows={2}
              value={editInspectReason}
              onChange={(e) => setEditInspectReason(e.target.value)}
              placeholder="e.g. CME Conference, Emergency Surgery, Regional Holiday…"
              className="w-full p-2.5 rounded-xl border border-stone-300 bg-white text-xs outline-none focus:ring-2 focus:ring-rose-500 font-medium"
            />

            {/* Template Suggestions matching selected type */}
            <div className="mt-2 space-y-1">
              <span className="text-[10px] font-semibold text-stone-500">
                Template suggestions for {editInspectType.toUpperCase()}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {BLOCKING_REASON_TEMPLATES[editInspectType].map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setEditInspectReason(tpl)}
                    className={`text-[10.5px] px-2.5 py-1 rounded-lg border transition-all text-left cursor-pointer ${
                      editInspectReason === tpl
                        ? "bg-stone-900 text-white border-stone-900 font-bold shadow-xs"
                        : "bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200"
                    }`}
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export const InspectBlockedDateModal: React.FC<InspectBlockedDateModalProps> = ({
  entry,
  isOpen,
  onClose,
  onUnblock,
  onSaveNotice,
}) => {
  if (!isOpen || !entry) return null;
  return (
    <InspectModalBody
      key={entry.id || entry.date}
      entry={entry}
      onClose={onClose}
      onUnblock={onUnblock}
      onSaveNotice={onSaveNotice}
    />
  );
};


export default InspectBlockedDateModal;
