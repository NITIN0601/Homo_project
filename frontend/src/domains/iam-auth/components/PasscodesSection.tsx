import React from "react";
import type { AdminPasscode, CustomizationAuditLogEntry } from "@core/types/tenant";
import { formatDateTime } from "../../../shared/utils/format";
import { Button, Card } from "../../../shared/ui";

interface PasscodesSectionProps {
  passcodes: AdminPasscode[];
  auditLogs: CustomizationAuditLogEntry[];
  onChangePasscode: () => void;
  onAddPasscode: () => void;
  onDeletePasscode: (id: string, label: string) => void;
}

export const PasscodesSection: React.FC<PasscodesSectionProps> = ({
  passcodes,
  auditLogs,
  onChangePasscode,
  onAddPasscode,
  onDeletePasscode,
}) => {
  return (
    <Card variant="default" className="space-y-4 border-amber-900/30 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔐</span>
            <h3 className="text-stone-900 font-extrabold text-base">
              Admin Passcodes &amp; Security Audit Trail
            </h3>
          </div>
          <p className="text-stone-500 text-xs mt-0.5">
            Authorized passcodes protect customer view configuration from unintended edits. All changes are timestamped and attributed to the modifying administrator.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onChangePasscode}
            className="text-xs"
          >
            <span>🔑</span> Change Passcode
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onAddPasscode}
            className="text-xs"
          >
            <span>➕</span> Add New Passcode
          </Button>
        </div>
      </div>

      {/* Active Passcodes Roster */}
      <div className="space-y-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 block">
          Active Authorized Security Passcodes ({passcodes.length})
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {passcodes.map((pc, idx) => (
            <div
              key={pc.id}
              className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-2 relative"
            >
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-xs text-stone-900">{pc.label}</span>
                <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                  ••••
                </span>
              </div>
              <div className="text-[11px] text-stone-500 space-y-0.5">
                <p>Created: {formatDateTime(pc.createdAt)}</p>
                <p>By: <strong className="text-stone-700">{pc.createdBy}</strong></p>
              </div>
              {passcodes.length > 1 && idx !== 0 && (
                <button
                  type="button"
                  onClick={() => onDeletePasscode(pc.id, pc.label)}
                  className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                >
                  Delete Passcode
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Live Security Audit Log Table */}
      <div className="space-y-2 pt-2 border-t border-stone-100">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 block">
            Security &amp; Configuration Change Audit Log ({auditLogs.length} Records)
          </span>
          <span className="text-[10px] text-stone-400">Chronological tamper-evident audit</span>
        </div>

        <div className="border border-stone-200 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-stone-100 text-stone-700 font-bold text-[10px] uppercase">
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3">Admin</th>
                <th className="py-2 px-3">Action</th>
                <th className="py-2 px-3">Details / Audit Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-stone-50/80">
                  <td className="py-2 px-3 font-mono text-stone-500 whitespace-nowrap">
                    {formatDateTime(log.timestamp)}
                  </td>
                  <td className="py-2 px-3 font-bold text-stone-900 whitespace-nowrap">
                    {log.adminName}
                  </td>
                  <td className="py-2 px-3 whitespace-nowrap">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        log.action === "TOGGLE_FEATURE"
                          ? "bg-purple-100 text-purple-900 border border-purple-200"
                          : log.action === "CHANGE_PASSCODE"
                          ? "bg-amber-100 text-amber-900 border border-amber-200"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-200"
                      }`}
                    >
                      {log.action.replace("_", " ")}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-stone-700 font-medium">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
};

export default PasscodesSection;

