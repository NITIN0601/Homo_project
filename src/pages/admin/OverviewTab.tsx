import React, { useState, useMemo } from "react";
import type { BookedAppointment, InventoryItem, UserProfile, AdminTab, VisitSummaryRecord } from "../../types";
import type { PharmacyPurchaseOrder, DoctorTodoItem } from "./types";
import { CLINIC, INVENTORY as INV_CONFIG } from "../../config";
import { MOCK_ACCOUNTS } from "../../context/AppContext";

interface OverviewTabProps {
  appointments: BookedAppointment[];
  patientList: UserProfile[];
  inventory: InventoryItem[];
  pharmacyOrders: PharmacyPurchaseOrder[];
  blockedDates: Array<{ id: string; date: string; reason?: string }>;
  todoList: DoctorTodoItem[];
  visitSummaries: Record<string, { patientId: string; patientName: string; bloodGroup?: string; knownAllergies?: string[]; visits: VisitSummaryRecord[] }>;
  todayYMD: string;
  formattedDate: string;
  onSetActiveTab: (tab: AdminTab) => void;
  onOpenUploadForPatient: (patientId: string) => void;
  onOpenBatchModalWithLowStock: () => void;
  onOpenCreatePOModal: () => void;
  onOpenRequisitionBatchSingle: (item: InventoryItem, qty: number) => void;
  onStartConsultation: (appointmentId: string) => void;
  onOpenVoiceStudioForUser: (user: UserProfile) => void;
  onToggleTodo: (id: string) => void;
  onAddTodo: (todo: DoctorTodoItem) => void;
  onDeleteTodo: (id: string) => void;
  onSelectPatientInEhr: (patientId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  appointments,
  patientList,
  inventory,
  pharmacyOrders,
  blockedDates,
  todoList,
  visitSummaries,
  todayYMD,
  formattedDate,
  onSetActiveTab,
  onOpenUploadForPatient,
  onOpenBatchModalWithLowStock,
  onOpenCreatePOModal,
  onOpenRequisitionBatchSingle,
  onStartConsultation,
  onOpenVoiceStudioForUser,
  onToggleTodo,
  onAddTodo,
  onDeleteTodo,
  onSelectPatientInEhr,
}) => {
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<"High" | "Normal" | "Routine">("High");
  const [newTodoCategory, setNewTodoCategory] = useState<"Prescription" | "Follow-up" | "Inventory" | "Review">("Prescription");

  const lowStockItems = useMemo(
    () => inventory.filter((i) => i.stockQty <= INV_CONFIG.LOW_STOCK_THRESHOLD),
    [inventory]
  );

  const upcomingPatientRecord = useMemo(() => {
    const todayAppts = appointments.filter((a) => (a.date === "Today" || a.date === todayYMD) && a.status !== "Cancelled");
    if (todayAppts.length === 0) return null;
    const nextAppt = todayAppts[0];
    const patientAccount = Object.values(MOCK_ACCOUNTS).find((acc) => acc.profile.id === nextAppt.patientId);
    const pFile = visitSummaries[nextAppt.patientId];
    return {
      appointment: nextAppt,
      profile: patientAccount?.profile,
      file: pFile,
    };
  }, [appointments, todayYMD, visitSummaries]);

  const handleTodoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    const item: DoctorTodoItem = {
      id: `todo-${Date.now()}`,
      task: newTodoText.trim(),
      category: newTodoCategory,
      priority: newTodoPriority,
      completed: false,
    };
    onAddTodo(item);
    setNewTodoText("");
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Quick Action Bar */}
      <div className="bg-gradient-to-r from-emerald-900 to-stone-900 text-white p-4.5 rounded-3xl card-shadow border border-emerald-700/50 flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h2 className="text-base font-extrabold flex items-center gap-2">
            <span>⚡</span> Doctor Clinical Overview &amp; Practice Hub
          </h2>
          <p className="text-xs text-emerald-200">
            High-level operational summary · Click any KPI card below to view full detailed records
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="bg-emerald-800/80 px-3 py-1.5 rounded-xl border border-emerald-600/50 font-bold text-emerald-100 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Practice Feed
          </span>
        </div>
      </div>

      {/* ── STATS SUMMARY CARDS (5 KEY CLINIC KPIS) ────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => onSetActiveTab("appointments")}
          className="p-3.5 rounded-2xl card-shadow border bg-white border-stone-100 hover:border-emerald-300 transition-all cursor-pointer group"
          title="Click to view detailed Appointments Schedule & Clinical Consultations"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold group-hover:scale-105 transition-transform">
              📅
            </div>
            <div>
              <p className="text-lg font-black text-stone-800">
                {appointments.filter((a) => a.date === "Today" || a.date === todayYMD).length}
              </p>
              <p className="text-stone-500 text-[11px] font-bold">Appointments Today</p>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] text-emerald-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Detailed View <span>→</span>
          </div>
        </div>

        <div
          onClick={() => onSetActiveTab("patients")}
          className="p-3.5 rounded-2xl card-shadow border bg-white border-stone-100 hover:border-teal-300 transition-all cursor-pointer group"
          title="Click to view detailed Patient Case Records"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center text-lg font-bold group-hover:scale-105 transition-transform">
              👥
            </div>
            <div>
              <p className="text-lg font-black text-stone-800">{patientList.length}</p>
              <p className="text-stone-500 text-[11px] font-bold">Patients Records</p>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] text-teal-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Detailed View <span>→</span>
          </div>
        </div>

        <div
          onClick={() => onSetActiveTab("inventory")}
          className="p-3.5 rounded-2xl card-shadow border bg-white border-stone-100 hover:border-purple-300 transition-all cursor-pointer group"
          title="Click to view detailed Medical Supplies & Stock Inventory"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-lg font-bold group-hover:scale-105 transition-transform">
              📦
            </div>
            <div>
              <p className="text-lg font-black text-stone-800">{inventory.length}</p>
              <p className="text-stone-500 text-[11px] font-bold">Stock ({lowStockItems.length} Low)</p>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] text-purple-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Detailed View <span>→</span>
          </div>
        </div>

        <div
          onClick={() => onSetActiveTab("dispatches")}
          className="p-3.5 rounded-2xl card-shadow border bg-white border-stone-100 hover:border-sky-300 transition-all cursor-pointer group"
          title="Click to view detailed Purchase Order Dispatches & Tracking"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center text-lg font-bold group-hover:scale-105 transition-transform">
              🚚
            </div>
            <div>
              <p className="text-lg font-black text-sky-900">{pharmacyOrders.length}</p>
              <p className="text-stone-500 text-[11px] font-bold">PO Dispatches</p>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] text-sky-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Detailed View <span>→</span>
          </div>
        </div>

        <div
          onClick={() => onSetActiveTab("calendar")}
          className="p-3.5 rounded-2xl card-shadow border bg-white border-stone-100 hover:border-rose-300 transition-all cursor-pointer group"
          title="Click to view detailed Doctor Availability & OOO Calendar"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center text-lg font-bold group-hover:scale-105 transition-transform">
              🏖️
            </div>
            <div>
              <p className="text-lg font-black text-rose-900">{blockedDates.length}</p>
              <p className="text-stone-500 text-[11px] font-bold">OOO / Blocked Days</p>
            </div>
          </div>
          <div className="mt-1.5 text-[10px] text-rose-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Detailed View <span>→</span>
          </div>
        </div>
      </div>

      {/* ── URGENT CRITICAL DISPENSARY SUPPLIES TO ORDER BANNER ── */}
      <div className="bg-gradient-to-r from-amber-950 via-rose-950 to-stone-900 text-white p-5 rounded-3xl card-shadow border border-amber-500/40 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/30 flex items-center justify-center text-xl font-black">
              🚨
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-amber-100 tracking-wide">
                  URGENT MEDICAL SUPPLIES TO ORDER
                </h3>
                <span className="bg-amber-400 text-stone-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Priority Reorder
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                {lowStockItems.length > 0
                  ? `${lowStockItems.length} essential clinic polycrests have reached critical dispensing thresholds. Reorder now to avoid treatment disruption.`
                  : "All dispensary homeopathic remedies are currently at safe inventory thresholds."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {lowStockItems.length > 0 && (
              <button
                onClick={onOpenBatchModalWithLowStock}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <span>⚡</span> 1-Click Reorder All Low-Stock ({lowStockItems.length})
              </button>
            )}
            <button
              onClick={onOpenCreatePOModal}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>➕</span> Create Custom PO
            </button>
            <button
              onClick={() => onSetActiveTab("inventory")}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer flex items-center gap-1"
            >
              <span>📦</span> View All Supplies ({inventory.length}) →
            </button>
          </div>
        </div>

        {lowStockItems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="bg-black/40 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-white">{item.name}</span>
                    <span className="text-[10px] font-bold text-amber-300 bg-amber-900/60 px-1.5 py-0.2 rounded border border-amber-600/40">
                      {item.potency}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 mt-0.5">
                    Stock: <strong className="text-red-400">{item.stockQty}</strong> / Min Required:{" "}
                    <strong>{item.reorderQty}</strong>
                  </p>
                  <p className="text-[10px] text-stone-400 mt-0.2 font-mono">Supplier: {item.supplier}</p>
                </div>
                <button
                  onClick={() => onOpenRequisitionBatchSingle(item, 25)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-black cursor-pointer shadow-xs transition-all active:scale-95"
                >
                  Reorder →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: UPCOMING PATIENT MEDICAL HISTORY + TODAY'S CONSULTATIONS */}
        <div className="lg:col-span-7 space-y-5">
          {upcomingPatientRecord && (
            <div className="bg-gradient-to-br from-teal-950 via-emerald-950 to-stone-900 text-white rounded-3xl card-shadow border border-teal-500/40 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-teal-800/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-teal-500/20 text-teal-300 border border-teal-400/40 flex items-center justify-center font-black text-sm shadow-xs">
                    {upcomingPatientRecord.profile?.initials ||
                      upcomingPatientRecord.appointment.patientName.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-white">
                        {upcomingPatientRecord.appointment.patientName}
                      </h3>
                      <span className="font-mono text-xs text-teal-300 font-bold bg-teal-900/60 px-2 py-0.5 rounded border border-teal-600/40">
                        #{upcomingPatientRecord.appointment.patientId}
                      </span>
                    </div>
                    <p className="text-xs text-teal-200/90 mt-0.5">
                      Patient · Blood:{" "}
                      <strong>{upcomingPatientRecord.file?.bloodGroup || upcomingPatientRecord.profile?.bloodGroup || "B+"}</strong> · Scheduled:{" "}
                      <strong className="text-white">{upcomingPatientRecord.appointment.time} Today</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      upcomingPatientRecord.appointment.type.includes("Tele")
                        ? "bg-purple-900/60 text-purple-200 border-purple-400/40"
                        : "bg-emerald-900/60 text-emerald-200 border-emerald-400/40"
                    }`}
                  >
                    {upcomingPatientRecord.appointment.type.includes("Tele") ? "💻 Tele-Consult" : "🌿 In-Person Visit"}
                  </span>
                  <button
                    onClick={() => {
                      onSelectPatientInEhr(upcomingPatientRecord.appointment.patientId);
                      onSetActiveTab("patients");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-stone-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1"
                    title="Open full chronological patient medical history and case records"
                  >
                    <span>👥 View Medical History →</span>
                  </button>
                </div>
              </div>

              {/* Medical History Snapshot */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-black/30 border border-teal-800/50 rounded-2xl p-3 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-teal-300 uppercase tracking-wider block">
                    Past Diagnosis &amp; Active Complaint
                  </span>
                  <p className="font-bold text-stone-100 text-xs">
                    {upcomingPatientRecord.file?.visits[0]?.chiefDiagnosis ||
                      upcomingPatientRecord.appointment.chiefReason}
                  </p>
                  <p className="text-[11px] text-stone-300">
                    <strong>Observed Modalities:</strong>{" "}
                    {upcomingPatientRecord.file?.visits[0]?.symptomsObserved?.join(", ") ||
                      "Digestive distress, anxiety after midnight, relief from warm applications."}
                  </p>
                </div>

                <div className="bg-black/30 border border-teal-800/50 rounded-2xl p-3 space-y-1.5">
                  <span className="text-[10px] font-extrabold text-teal-300 uppercase tracking-wider block">
                    Known Allergies &amp; Miasm
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-rose-900/80 text-rose-200 border border-rose-600/50 text-[11px] font-black">
                      ⚠️ {upcomingPatientRecord.file?.knownAllergies?.join(", ") || "Penicillin, Sulfa drugs"}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-300 mt-1">
                    <strong>Miasmatic Baseline:</strong>{" "}
                    {upcomingPatientRecord.file?.visits[0]?.homeopathicCaseRecord?.clinical_summary.miasmatic_predominance ||
                      "Psoric Totality"}
                  </p>
                </div>
              </div>

              {/* Action Buttons for upcoming patient */}
              <div className="bg-black/40 border border-teal-800/60 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-extrabold text-teal-400 uppercase tracking-wider">
                    Active Prescribed Remedy
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-black text-emerald-300">
                      💊 {upcomingPatientRecord.file?.visits[0]?.prescribedRemedies?.[0]?.medicineName || "Nux Vomica"} (
                      {upcomingPatientRecord.file?.visits[0]?.prescribedRemedies?.[0]?.potency || "30C"})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onStartConsultation(upcomingPatientRecord.appointment.id);
                      onSetActiveTab("appointments");
                    }}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition-all cursor-pointer"
                  >
                    🩺 Start Consultation
                  </button>
                  <button
                    onClick={() => {
                      if (upcomingPatientRecord.profile) {
                        onOpenVoiceStudioForUser(upcomingPatientRecord.profile);
                      }
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-1"
                  >
                    <span>🎙️</span> Voice Studio
                  </button>
                  <button
                    onClick={() => {
                      const phone = upcomingPatientRecord.appointment.patientPhone.replace(/\D/g, "");
                      window.open(
                        `https://wa.me/91${phone}?text=${encodeURIComponent(
                          `Hello ${upcomingPatientRecord.appointment.patientName}, this is ${CLINIC.FULL_NAME} regarding your appointment today.`
                        )}`,
                        "_blank"
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-black text-xs transition-all cursor-pointer"
                  >
                    💬 WhatsApp
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Today's Consultations Snapshot */}
          <div className="bg-white rounded-3xl card-shadow border border-stone-100 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                  <span>📅</span> Today's Consultations (
                  {appointments.filter((a) => a.date === "Today" || a.date === todayYMD).length})
                </h3>
                <p className="text-stone-500 text-xs mt-0.5">Doctor roster snapshot for {formattedDate}</p>
              </div>

              <button
                onClick={() => onSetActiveTab("appointments")}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-all cursor-pointer"
              >
                <span>View Full Schedule ({appointments.length})</span>
                <span>→</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {appointments
                .filter((apt) => apt.date === "Today" || apt.date === todayYMD)
                .map((apt) => (
                  <div
                    key={apt.id}
                    className="p-3.5 rounded-2xl border border-stone-200/80 bg-stone-50/60 hover:bg-stone-50 hover:border-emerald-300 transition-all flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-xs flex items-center justify-center">
                        {apt.time.split(" ")[0]}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-extrabold text-stone-900 text-xs">{apt.patientName}</h4>
                          <span className="font-mono text-[10px] text-stone-400 font-bold">#{apt.patientId}</span>
                        </div>
                        <p className="text-[11px] text-stone-500 font-medium">{apt.chiefReason.slice(0, 48)}…</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          apt.type.includes("Tele")
                            ? "bg-purple-50 text-purple-800 border-purple-200"
                            : "bg-emerald-50 text-emerald-800 border-emerald-200"
                        }`}
                      >
                        {apt.type.includes("Tele") ? "💻 Tele" : "🌿 In-Person"}
                      </span>

                      <button
                        onClick={() => onSetActiveTab("appointments")}
                        className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 text-[11px] font-bold cursor-pointer transition-all"
                      >
                        Examine →
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DOCTOR'S TO-DO LIST & QUICK SHORTCUTS */}
        <div className="lg:col-span-5 space-y-5">
          {/* Doctor's Daily To-Do List Card */}
          <div className="bg-white rounded-3xl card-shadow border border-stone-100 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                  <span>✅</span> Doctor's Clinical Tasks
                </h3>
                <p className="text-stone-500 text-xs mt-0.5">
                  {todoList.filter((t) => t.completed).length} of {todoList.length} tasks completed
                </p>
              </div>
              <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full">
                {CLINIC.DOCTOR_NAME}
              </span>
            </div>

            {/* To-Do Items List */}
            <div className="space-y-2">
              {todoList.map((todo) => (
                <div
                  key={todo.id}
                  onClick={() => onToggleTodo(todo.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                    todo.completed
                      ? "bg-stone-50 border-stone-200 opacity-60"
                      : "bg-white border-stone-200 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={todo.completed}
                      onChange={() => onToggleTodo(todo.id)}
                      className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <p
                        className={`text-xs font-bold ${
                          todo.completed ? "line-through text-stone-400" : "text-stone-800"
                        }`}
                      >
                        {todo.task}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-stone-500 font-semibold bg-stone-100 px-2 py-0.5 rounded">
                          {todo.category}
                        </span>
                        <span
                          className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                            todo.priority === "High"
                              ? "bg-red-100 text-red-800"
                              : todo.priority === "Normal"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-stone-100 text-stone-600"
                          }`}
                        >
                          {todo.priority}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTodo(todo.id);
                    }}
                    className="text-stone-300 hover:text-red-500 text-xs p-1 cursor-pointer"
                    title="Delete task"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Add New Task Form */}
            <form onSubmit={handleTodoSubmit} className="pt-2 border-t border-stone-100 space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="+ Add new clinical task / reminder…"
                  value={newTodoText}
                  onChange={(e) => setNewTodoText(e.target.value)}
                  className="flex-1 text-xs border border-stone-300 rounded-xl px-3 py-2 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
                <button
                  type="submit"
                  disabled={!newTodoText.trim()}
                  className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-stone-500">
                <div className="flex items-center gap-1.5">
                  <span>Priority:</span>
                  <select
                    value={newTodoPriority}
                    onChange={(e) => setNewTodoPriority(e.target.value as any)}
                    className="text-[11px] bg-stone-100 rounded-lg px-2 py-0.5 border border-stone-200"
                  >
                    <option value="High">High</option>
                    <option value="Normal">Normal</option>
                    <option value="Routine">Routine</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>Category:</span>
                  <select
                    value={newTodoCategory}
                    onChange={(e) => setNewTodoCategory(e.target.value as any)}
                    className="text-[11px] bg-stone-100 rounded-lg px-2 py-0.5 border border-stone-200"
                  >
                    <option value="Prescription">Prescription</option>
                    <option value="Follow-up">Follow-up</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Review">Review</option>
                  </select>
                </div>
              </div>
            </form>
          </div>

          {/* Fast Shortcuts Card */}
          <div className="bg-white rounded-3xl card-shadow border border-stone-100 p-5 space-y-3">
            <h4 className="font-extrabold text-stone-800 text-xs uppercase tracking-wider">
              ⚡ Doctor Quick Shortcuts
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => onOpenUploadForPatient("usr-001")}
                className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold text-left transition-all cursor-pointer space-y-1"
              >
                <span className="text-lg">📄</span>
                <p className="text-xs">Upload Prescription</p>
                <span className="text-[10px] text-emerald-700 font-normal">Attach Rx file / image</span>
              </button>

              <button
                onClick={() => onSetActiveTab("patients")}
                className="p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 font-bold text-left transition-all cursor-pointer space-y-1"
              >
                <span className="text-lg">👥</span>
                <p className="text-xs">Patients Records</p>
                <span className="text-[10px] text-stone-500 font-normal">Collapsible case history</span>
              </button>

              <button
                onClick={() => onSetActiveTab("inventory")}
                className="p-3 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-bold text-left transition-all cursor-pointer space-y-1"
              >
                <span className="text-lg">📦</span>
                <p className="text-xs">Medical Supplies</p>
                <span className="text-[10px] text-purple-700 font-normal">Stock &amp; batch order</span>
              </button>

              <button
                onClick={() => onSetActiveTab("calendar")}
                className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 font-bold text-left transition-all cursor-pointer space-y-1"
              >
                <span className="text-lg">🏖️</span>
                <p className="text-xs">Doctor OOO Leave</p>
                <span className="text-[10px] text-rose-700 font-normal">
                  Block dates ({blockedDates.length} days)
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
