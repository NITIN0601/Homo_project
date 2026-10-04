import React, { useState, useMemo } from "react";
import type { BookedAppointment } from "../../types";
import { CLINIC } from "../../config";

interface AppointmentsTabProps {
  appointments: BookedAppointment[];
  todayYMD: string;
  onStatusChange: (id: string, newStatus: BookedAppointment["status"]) => void;
  onOpenBookingModal: () => void;
  onOpenCancelModal: (id: string) => void;
  onOpenUploadPrescription: (patientId: string, chiefReason?: string) => void;
  onNavigateToPatient: (patientId: string) => void;
}

export const AppointmentsTab: React.FC<AppointmentsTabProps> = ({
  appointments,
  todayYMD,
  onStatusChange,
  onOpenBookingModal,
  onOpenCancelModal,
  onOpenUploadPrescription,
  onNavigateToPatient,
}) => {
  const [filter, setFilter] = useState<"all" | "today" | "tele" | "in_person" | "completed" | "cancelled">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        q === "" ||
        apt.patientName.toLowerCase().includes(q) ||
        apt.patientPhone.toLowerCase().includes(q) ||
        apt.patientId.toLowerCase().includes(q) ||
        apt.chiefReason.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (filter === "today") return apt.date === "Today" || apt.date === todayYMD;
      if (filter === "tele") return apt.type.includes("Tele");
      if (filter === "in_person") return apt.type.includes("In-Person");
      if (filter === "completed") return apt.status === "Completed";
      if (filter === "cancelled") return apt.status === "Cancelled";

      return true;
    });
  }, [appointments, searchQuery, filter, todayYMD]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header & Metric Banner */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5 rounded-3xl card-shadow border border-emerald-700/50 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <span>📅</span> Clinical Consultations &amp; Patient Appointments Hub
          </h2>
          <p className="text-xs text-emerald-200 mt-0.5">
            Full roster of in-person clinic visits and tele-consultations ({appointments.length} total appointments)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={onOpenBookingModal}
            className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-stone-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>➕</span> Book New Appointment
          </button>
          <span className="bg-emerald-800/80 px-3 py-1.5 rounded-xl border border-emerald-600/50 font-bold text-emerald-100">
            📅 Today: <strong>{appointments.filter((a) => a.date === "Today" || a.date === todayYMD).length}</strong>
          </span>
          <span className="bg-teal-800/80 px-3 py-1.5 rounded-xl border border-teal-600/50 font-bold text-teal-100">
            💻 Virtual: <strong>{appointments.filter((a) => a.type.includes("Tele")).length}</strong>
          </span>
          <span className="bg-stone-800/80 px-3 py-1.5 rounded-xl border border-stone-600/50 font-bold text-stone-200">
            🌿 In-Person: <strong>{appointments.filter((a) => a.type.includes("In-Person")).length}</strong>
          </span>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-3xl card-shadow border border-stone-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] max-w-md">
          <input
            type="search"
            placeholder="Search by Patient Name, ID (#usr-001), Phone, or Symptoms…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-stone-300 px-3.5 py-2.5 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1.5 rounded-2xl text-xs font-bold">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === "all" ? "bg-white text-emerald-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            All ({appointments.length})
          </button>
          <button
            onClick={() => setFilter("today")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === "today" ? "bg-white text-emerald-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Today ({appointments.filter((a) => a.date === "Today" || a.date === todayYMD).length})
          </button>
          <button
            onClick={() => setFilter("tele")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === "tele" ? "bg-white text-emerald-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            💻 Tele ({appointments.filter((a) => a.type.includes("Tele")).length})
          </button>
          <button
            onClick={() => setFilter("in_person")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === "in_person" ? "bg-white text-emerald-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            🌿 In-Person ({appointments.filter((a) => a.type.includes("In-Person")).length})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === "completed" ? "bg-white text-emerald-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            ✓ Completed ({appointments.filter((a) => a.status === "Completed").length})
          </button>
          <button
            onClick={() => setFilter("cancelled")}
            className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              filter === "cancelled" ? "bg-white text-rose-900 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            ✕ Cancelled ({appointments.filter((a) => a.status === "Cancelled").length})
          </button>
        </div>
      </div>

      {/* Full Appointment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAppointments.length === 0 ? (
          <div className="col-span-2 text-center py-12 bg-white rounded-3xl border border-stone-200 p-6 space-y-2">
            <span className="text-3xl">📅</span>
            <h4 className="font-bold text-stone-800 text-sm">No appointments matching your criteria</h4>
            <p className="text-stone-500 text-xs">Try clearing the search query or changing the filter chips.</p>
          </div>
        ) : (
          filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-white rounded-3xl card-shadow border border-stone-200/90 p-5 hover:border-emerald-300 transition-all space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center shadow-xs">
                    {apt.time.split(" ")[0]}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-stone-900 text-sm">{apt.patientName}</h4>
                      <span className="font-mono text-xs text-stone-400 font-bold">#{apt.patientId}</span>
                    </div>
                    <p className="text-xs text-stone-500 font-medium">
                      {apt.date === todayYMD || apt.date === "Today" ? "Today" : apt.date} · {apt.time}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      apt.type.includes("Tele")
                        ? "bg-purple-50 text-purple-800 border-purple-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    {apt.type.includes("Tele") ? "💻 Tele-Consult" : "🌿 In-Person"}
                  </span>

                  {/* Status Selector Dropdown */}
                  <select
                    value={apt.status}
                    onChange={(e) =>
                      onStatusChange(apt.id, e.target.value as BookedAppointment["status"])
                    }
                    className={`text-xs font-black rounded-xl px-2.5 py-1 border cursor-pointer ${
                      apt.status === "In Consultation"
                        ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                        : apt.status === "Completed"
                        ? "bg-stone-200 text-stone-700 border-stone-300"
                        : apt.status === "Cancelled"
                        ? "bg-rose-100 text-rose-800 border-rose-300"
                        : "bg-emerald-100 text-emerald-900 border-emerald-300"
                    }`}
                  >
                    <option value="Confirmed">✓ Confirmed</option>
                    <option value="In Consultation">⏳ In Consultation</option>
                    <option value="Completed">✓ Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Cancelled">✕ Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Patient Phone & Contact Details */}
              <div className="flex items-center justify-between text-xs text-stone-600 bg-stone-50/80 px-3 py-2 rounded-xl border border-stone-200/60">
                <span className="flex items-center gap-1.5">
                  <span>📞</span> <strong>{apt.patientPhone}</strong>
                </span>
                <a
                  href={`https://wa.me/91${apt.patientPhone.replace(/\D/g, "")}?text=Hello%20${encodeURIComponent(apt.patientName)},%20this%20is%20${encodeURIComponent(CLINIC.DOCTOR_TITLE)}%20from%20${encodeURIComponent(CLINIC.NAME)}%20regarding%20your%20consultation.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-700 hover:text-emerald-900 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>💬</span> WhatsApp Patient
                </a>
              </div>

              {/* Cancellation Reason alert if cancelled */}
              {apt.status === "Cancelled" && (
                <div className="bg-rose-50 border border-rose-200 text-rose-900 p-2.5 rounded-xl text-xs flex items-center justify-between">
                  <span><strong>Cancellation Reason:</strong> {apt.cancellationReason || "Appointment cancelled by clinic/patient."}</span>
                  <button
                    onClick={() => onStatusChange(apt.id, "Confirmed")}
                    className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer bg-white px-2 py-0.5 rounded border border-rose-200 ml-2"
                  >
                    ↺ Restore
                  </button>
                </div>
              )}

              {/* Appointment Doctor Notes if present */}
              {apt.notes && (
                <div className="bg-amber-50/70 border border-amber-200 text-amber-950 p-2.5 rounded-xl text-xs">
                  <strong>Clinical / Desk Notes:</strong> {apt.notes}
                </div>
              )}

              {/* Symptoms / Chief Complaint */}
              <div className="bg-stone-50 p-3 rounded-2xl border border-stone-200/80 text-xs space-y-1">
                <span className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wide">
                  Chief Complaint / Clinical Symptoms:
                </span>
                <p className="text-stone-800 font-medium">{apt.chiefReason}</p>
              </div>

              {/* Action Buttons for this Appointment */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onNavigateToPatient(apt.patientId)}
                    className="text-stone-600 hover:text-emerald-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>👥</span> Patient Case File →
                  </button>

                  {apt.status !== "Cancelled" && (
                    <button
                      onClick={() => onOpenCancelModal(apt.id)}
                      className="text-rose-600 hover:text-rose-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>✕</span> Cancel
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onOpenUploadPrescription(apt.patientId, apt.chiefReason)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <span>📄</span> Issue / Upload Prescription
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AppointmentsTab;
