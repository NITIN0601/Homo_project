import React, { useState, useMemo } from "react";
import { useApp, useRequireRole, MEDICINE_CATALOGUE } from "../context/AppContext";
import { useTenant } from "../context/ThemeProvider";
import { Button } from "../components/ui";
import { DashboardErrorBoundary } from "../components";
import { MOCK_ACCOUNTS } from "../data/mocks";
import type {
  AdminTab,
  PatientClinicalMedia,
  UserProfile,
} from "../types";
import { HOSPITAL, DEFAULT_DOCTOR_TODOS, USE_MOCK_DATA } from "../config";
import { formatDateTime } from "../utils/format";
import { getHospitalTimeInfo } from "../utils/timezone";
import { api } from "../services/api";

import {
  OverviewTab,
  AppointmentsTab,
  PatientRecordsTab,
  BillingInvoicesTab,
  DispensaryInventoryTab,
  DispatchesTab,
  CalendarTab,
  CustomizationTab,
  AdminModalOrchestrator,
  useAdminModals,
  useRequisitionBatch,
  INITIAL_PATIENT_MEDIA,
  type DoctorTodoItem,
} from "./admin";

export const AdminDashboard: React.FC = () => {
  // Enforce RBAC security boundary — throws RbacAccessError if role !== 'admin'
  useRequireRole("admin");

  const {
    state,
    dispatch,
    addVisitSummary,
    updateInventory,
    setAdminTab,
    blockDate,
    blockDateRange,
    unblockDate,
    updateBlockedDate,
    updateAppointmentStatus,
    bookAppointment,
    cancelAppointment,
    postConsultationInvoice,
    confirmConsultationPayment,
    updateInvoiceTransactionRef,
    updateInvoiceStatus,
  } = useApp();

  const { visitSummaries, inventory, adminTab, blockedDates, appointments, consultationInvoices } = state;
  const { tenant } = useTenant();
  const hospitalTime = useMemo(() => getHospitalTimeInfo(), []);

  // Active Tab synchronized with AppContext (URL query param support)
  const activeTab: AdminTab = adminTab || "dashboard";
  const setActiveTab = (tab: AdminTab) => setAdminTab(tab);

  // ── Feedback Toasts & Notifications ──────────────────────────────────────────
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [mediaSuccessMsg, setMediaSuccessMsg] = useState<string | null>(null);
  const [uploadPrescriptionSuccessMsg, setUploadPrescriptionSuccessMsg] = useState<string | null>(null);
  const [batchOrderSuccessMsg, setBatchOrderSuccessMsg] = useState<string | null>(null);

  const showBatchOrderSuccess = (msg: string) => {
    setBatchOrderSuccessMsg(msg);
    setTimeout(() => setBatchOrderSuccessMsg(null), 4000);
  };

  // ── Requisition & Logistics Management Hook ──────────────────────────────────
  const {
    requisitionBatch,
    setRequisitionBatch,
    pharmacyOrders,
    setPharmacyOrders,
    toggleAddToBatch,
    updateBatchQuantity,
    addAllLowStockToBatch,
    handleSimulateLogisticsScan,
    handleMarkDeliveredImmediately,
  } = useRequisitionBatch({
    inventory,
    updateInventory,
    onSuccessMsg: showBatchOrderSuccess,
  });

  // ── Modal State Orchestration Hook ───────────────────────────────────────────
  const modals = useAdminModals();

  // ── Patients & Clinical Media State ──────────────────────────────────────────
  const [patientMedia, setPatientMedia] = useState<PatientClinicalMedia[]>(INITIAL_PATIENT_MEDIA);
  const [expandedPatientIds, setExpandedPatientIds] = useState<Set<string>>(() => new Set(["usr-001"]));

  // Sorted registered patient list (dynamically aggregated from live appointments, visit summaries, and accounts)
  const patientList = useMemo(() => {
    const map = new Map<string, UserProfile>();
    if (USE_MOCK_DATA) {
      Object.values(MOCK_ACCOUNTS)
        .map((acc) => acc.profile)
        .filter((prof) => prof.role === "patient")
        .forEach((p) => map.set(p.id, p));
    }
    // Include patients with active clinical files
    Object.entries(state.visitSummaries).forEach(([pid, file]) => {
      if (!map.has(pid)) {
        map.set(pid, {
          id: pid,
          name: file.patientName,
          initials: file.patientName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
          email: `${pid}@example.com`,
          role: "patient",
          phone: "+91 98123 45678",
          address: { street: "", city: "", state: "", pincode: "" },
        });
      }
    });
    // Include patients with appointments
    state.appointments.forEach((apt) => {
      if (apt.patientId && !map.has(apt.patientId)) {
        map.set(apt.patientId, {
          id: apt.patientId,
          name: apt.patientName,
          initials: apt.patientName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2),
          email: apt.patientEmail || "",
          role: "patient",
          phone: apt.patientPhone || "",
          address: { street: "", city: "", state: "", pincode: "" },
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
  }, [state.visitSummaries, state.appointments]);

  // ── Doctor's To-Do List State ────────────────────────────────────────────────
  const [todoList, setTodoList] = useState<DoctorTodoItem[]>([...DEFAULT_DOCTOR_TODOS]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* ── HOSPITAL SSOT BRAND & DOCTOR HEADER ──────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-900 text-white rounded-3xl p-6 card-shadow border border-emerald-800/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl shadow-inner">
              🔒
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{tenant.name || HOSPITAL.NAME} Doctor Console</h1>
                <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Doctor Admin Access
                </span>
              </div>
              <p className="text-emerald-200/90 text-xs mt-0.5">
                {tenant.doctor.title || HOSPITAL.DOCTOR_TITLE} · {tenant.name || HOSPITAL.NAME}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Button
              variant="primary"
              size="sm"
              onClick={() => modals.openUploadForPatient("usr-001")}
            >
              <span>📄</span> Upload Doctor Prescription
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => modals.setIsExcelSyncModalOpen(true)}
              className="bg-stone-800/90 hover:bg-stone-700 text-emerald-300 border-stone-600"
              title="Open Excel Spreadsheet Sync"
            >
              <span>📊</span> Excel Sync
            </Button>
            <div className="bg-stone-800/80 px-3 py-1.5 rounded-xl border border-stone-700 text-stone-300">
              <span className="text-stone-400">📍 Location:</span> <strong>{tenant.contact.address.city || HOSPITAL.ADDRESS.CITY}</strong> ({tenant.contact.address.pincode || HOSPITAL.ADDRESS.PINCODE})
            </div>
            <div className="bg-stone-800/80 px-3 py-1.5 rounded-xl border border-stone-700 text-stone-300">
              <span className="text-stone-400">📞 Phone:</span> <strong>{tenant.contact.phoneDisplay || HOSPITAL.PHONE_DISPLAY}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ── NOTIFICATIONS & TOASTS ── */}
      {(bookingSuccessMsg || mediaSuccessMsg || uploadPrescriptionSuccessMsg || batchOrderSuccessMsg) && (
        <div className="bg-emerald-950 border border-emerald-500/50 text-emerald-100 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-emerald-500 text-stone-950 flex items-center justify-center font-bold text-sm">
              ✓
            </span>
            <p className="text-xs font-bold">
              {bookingSuccessMsg || mediaSuccessMsg || uploadPrescriptionSuccessMsg || batchOrderSuccessMsg}
            </p>
          </div>
          <button
            onClick={() => {
              setBookingSuccessMsg(null);
              setMediaSuccessMsg(null);
              setUploadPrescriptionSuccessMsg(null);
              setBatchOrderSuccessMsg(null);
            }}
            className="text-emerald-400 hover:text-white font-mono text-xs cursor-pointer px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── ACTIVE TAB RENDERING ── */}
      <DashboardErrorBoundary dashboardName="Doctor Admin Portal" tabName={activeTab} key={activeTab}>
        {activeTab === "dashboard" && (
          <OverviewTab
            appointments={appointments}
            patientList={patientList}
            inventory={inventory}
            pharmacyOrders={pharmacyOrders}
            blockedDates={blockedDates}
            todoList={todoList}
            visitSummaries={visitSummaries}
            todayYMD={hospitalTime.todayYMD}
            formattedDate={hospitalTime.formattedDate}
            onSetActiveTab={setActiveTab}
            onOpenUploadForPatient={modals.openUploadForPatient}
            onOpenBatchModalWithLowStock={() => {
              addAllLowStockToBatch();
              modals.setIsBatchModalOpen(true);
            }}
            onOpenCreatePOModal={() => modals.setIsCreatePOModalOpen(true)}
            onOpenRequisitionBatchSingle={(item, qty) => {
              setRequisitionBatch([{ item, quantity: qty }]);
              modals.setIsBatchModalOpen(true);
            }}
            onStartConsultation={(apptId) => updateAppointmentStatus(apptId, "In Consultation")}
            onOpenVoiceStudioForUser={(user) => modals.setVoiceStudioPatient(user)}
            onToggleTodo={(id) =>
              setTodoList((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
            }
            onAddTodo={(item) => setTodoList((prev) => [item, ...prev])}
            onDeleteTodo={(id) => setTodoList((prev) => prev.filter((t) => t.id !== id))}
            onSelectPatientInEhr={(patientId) => setExpandedPatientIds(new Set([patientId]))}
          />
        )}

        {activeTab === "appointments" && (
          <AppointmentsTab
            appointments={appointments}
            todayYMD={hospitalTime.todayYMD}
            onStatusChange={updateAppointmentStatus}
            onOpenBookingModal={() => modals.setIsBookingModalOpen(true)}
            onOpenCancelModal={(id) => modals.setCancellingAppointmentId(id)}
            onOpenUploadPrescription={modals.openUploadForPatient}
            onNavigateToPatient={(patientId) => {
              setExpandedPatientIds(new Set([patientId]));
              setActiveTab("patients");
            }}
          />
        )}

        {activeTab === "patients" && (
          <PatientRecordsTab
            patientList={patientList}
            visitSummaries={visitSummaries}
            consultationInvoices={consultationInvoices}
            patientMedia={patientMedia}
            expandedPatientIds={expandedPatientIds}
            onToggleExpand={(id) => {
              setExpandedPatientIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            onExpandAll={() => setExpandedPatientIds(new Set(patientList.map((p) => p.id)))}
            onCollapseAll={() => setExpandedPatientIds(new Set())}
            onOpenPrescribeModal={(patient) => modals.setPrescribeModalPatient(patient)}
            onOpenVoiceStudio={(patient) => modals.setVoiceStudioPatient(patient)}
            onOpenPostFeeModal={(patient) => modals.setPostFeeModalPatient(patient)}
            onOpenUploadPrescription={(patientId) => modals.openUploadForPatient(patientId)}
            onOpenMediaUploadModal={(patientId) => modals.openMediaUpload(patientId)}
            onViewMedia={(media) => modals.setViewingMedia(media)}
            onOpenReconcileModal={(inv) => modals.setReconcilingInvoice(inv)}
            onConfirmPayment={confirmConsultationPayment}
            onUpdateInvoiceStatus={updateInvoiceStatus}
          />
        )}

        {activeTab === "billing" && (
          <BillingInvoicesTab
            invoices={consultationInvoices || []}
            patientList={patientList}
            onOpenReconcileModal={(inv) => modals.setReconcilingInvoice(inv)}
            onConfirmPayment={confirmConsultationPayment}
            onUpdateStatus={updateInvoiceStatus}
            onOpenPostFeeModal={(patient) => modals.setPostFeeModalPatient(patient)}
          />
        )}

        {activeTab === "inventory" && (
          <DispensaryInventoryTab
            inventory={inventory}
            requisitionBatch={requisitionBatch}
            onToggleAddToBatch={toggleAddToBatch}
            onUpdateBatchQuantity={updateBatchQuantity}
            onClearBatch={() => setRequisitionBatch([])}
            onOpenBatchModal={() => modals.setIsBatchModalOpen(true)}
            onOpenExcelModal={() => modals.setIsExcelSyncModalOpen(true)}
            onOpenCreatePOModal={() => modals.setIsCreatePOModalOpen(true)}
            onAddAllLowStock={addAllLowStockToBatch}
          />
        )}

        {activeTab === "dispatches" && (
          <DispatchesTab
            orders={pharmacyOrders}
            onOpenBatchModal={() => modals.setIsBatchModalOpen(true)}
            onInspectOrder={(order) => modals.setInspectingOrder(order)}
            onSimulateLogisticsScan={handleSimulateLogisticsScan}
            onMarkDeliveredImmediately={handleMarkDeliveredImmediately}
          />
        )}

        {activeTab === "calendar" && (
          <CalendarTab
            blockedDates={blockedDates as any}
            onBlockDate={(d, r, t, tc) => blockDate(d, r, t, tc)}
            onBlockDateRange={(s, e, r, t, tc) => blockDateRange(s, e, r, t, tc)}
            onUnblockDate={(id, date) => unblockDate(id, date)}
            onUpdateBlockedDate={(id, date, updates) => updates && updateBlockedDate({ id, date }, updates)}
          />
        )}

        {activeTab === "customization" && <CustomizationTab />}
      </DashboardErrorBoundary>

      {/* ── MODAL ORCHESTRATION LAYER ── */}
      <AdminModalOrchestrator
        isBookingModalOpen={modals.isBookingModalOpen}
        onCloseBookingModal={() => modals.setIsBookingModalOpen(false)}
        onBookAppointment={async (apt) => {
          bookAppointment(apt);
          setBookingSuccessMsg(`✓ Booked ${apt.type} for ${apt.patientName} on ${apt.date} at ${apt.time}`);
          setTimeout(() => setBookingSuccessMsg(null), 4000);
          try {
            await api.appointments.book({
              user_email: apt.patientEmail || "patient@example.com",
              user_name: apt.patientName,
              start_time: `${apt.date}T${apt.time}:00`,
              end_time: `${apt.date}T${apt.time}:30`,
              description: apt.chiefReason,
            });
          } catch (err) {
            console.warn("Backend sync notice for admin booking:", err);
          }
        }}

        cancellingAppointmentId={modals.cancellingAppointmentId}
        onCloseCancelModal={() => modals.setCancellingAppointmentId(null)}
        onConfirmCancelAppointment={async (id) => {
          cancelAppointment(id);
          modals.setCancellingAppointmentId(null);
          try {
            await api.appointments.updateStatus(id, "Cancelled");
          } catch (err) {
            console.warn("Backend sync notice for appointment cancellation:", err);
          }
        }}

        prescribeModalPatient={modals.prescribeModalPatient}
        onClosePrescribeModal={() => modals.setPrescribeModalPatient(null)}
        onPrescribeRemedy={(patientId, newVisit, medicineId, customDosageNote) => {
          const medObj = MEDICINE_CATALOGUE.find((m) => m.id === medicineId);
          if (medObj) {
            if (!medObj.prescribedToPatientIds) medObj.prescribedToPatientIds = [];
            if (!medObj.prescribedToPatientIds.includes(patientId)) {
              medObj.prescribedToPatientIds.push(patientId);
            }
            medObj.doctorNote = `Prescribed by ${tenant.doctor?.name || HOSPITAL.DOCTOR_NAME}: ${customDosageNote}`;
          }
          addVisitSummary(patientId, newVisit);
        }}

        postFeeModalPatient={modals.postFeeModalPatient}
        onClosePostFeeModal={() => modals.setPostFeeModalPatient(null)}
        onPostInvoice={async (newInvoice) => {
          postConsultationInvoice(newInvoice);
          try {
            await api.invoices.create(newInvoice);
          } catch (err) {
            console.warn("Backend sync notice for new invoice:", err);
          }
        }}

        isUploadPrescriptionOpen={modals.isUploadPrescriptionOpen}
        onCloseUploadPrescription={() => modals.setIsUploadPrescriptionOpen(false)}
        uploadTargetPatientId={modals.uploadTargetPatientId}
        uploadChiefDiagnosis={modals.uploadChiefDiagnosis}
        onSavePrescription={(patientId, newVisit, attachment) => {
          addVisitSummary(patientId, newVisit);
          if (attachment) {
            setPatientMedia((prev) => [
              {
                id: `med-${Date.now().toString(36)}`,
                patientId,
                title: `Signed Prescription Slip: ${newVisit.chiefDiagnosis}`,
                category: "prescription",
                fileUrl: attachment.url,
                uploadDate: newVisit.visitDate,
                notes: `Doctor prescription with ${newVisit.prescribedRemedies.length} remedies.`,
                fileSize: "1.2 MB",
              },
              ...prev,
            ]);
          }
          setUploadPrescriptionSuccessMsg(`✓ Doctor Prescription issued for #${patientId}!`);
          setTimeout(() => setUploadPrescriptionSuccessMsg(null), 4000);
        }}

        isCreatePOModalOpen={modals.isCreatePOModalOpen}
        onCloseCreatePOModal={() => modals.setIsCreatePOModalOpen(false)}
        onDispatchPO={(newOrder) => {
          setPharmacyOrders((prev) => [newOrder, ...prev]);
          showBatchOrderSuccess(`✓ PO #${newOrder.id} dispatched via WhatsApp to ${newOrder.supplierSummary}!`);
        }}

        isBatchModalOpen={modals.isBatchModalOpen}
        onCloseBatchModal={() => modals.setIsBatchModalOpen(false)}
        requisitionBatch={requisitionBatch}
        onUpdateBatchQuantity={updateBatchQuantity}
        onToggleAddToBatch={toggleAddToBatch}
        onDispatchBatchOrder={(newOrder) => {
          setPharmacyOrders((prev) => [newOrder, ...prev]);
          setRequisitionBatch([]);
          showBatchOrderSuccess(`✓ Consolidated PO #${newOrder.id} dispatched successfully!`);
        }}

        inspectingOrder={modals.inspectingOrder}
        onCloseInspectingOrder={() => modals.setInspectingOrder(null)}

        isMediaUploadModalOpen={modals.isMediaUploadModalOpen}
        onCloseMediaUploadModal={() => modals.setIsMediaUploadModalOpen(false)}
        mediaTargetPatientId={modals.mediaTargetPatientId}
        onUploadMedia={(media) => {
          setPatientMedia((prev) => [media, ...prev]);
          setMediaSuccessMsg(`✓ Clinical ${media.category} attached to patient #${media.patientId}!`);
          setTimeout(() => setMediaSuccessMsg(null), 3500);
        }}

        viewingMedia={modals.viewingMedia}
        onCloseViewingMedia={() => modals.setViewingMedia(null)}

        reconcilingInvoice={modals.reconcilingInvoice}
        onCloseReconcilingInvoice={() => modals.setReconcilingInvoice(null)}
        onConfirmReconciliation={async (invoiceId, utrRef, isPaid) => {
          const timestamp = formatDateTime();
          if (isPaid) {
            updateInvoiceTransactionRef(invoiceId, utrRef);
          } else {
            confirmConsultationPayment(invoiceId, timestamp, utrRef);
          }
          try {
            await api.invoices.update(invoiceId, {
              status: "paid",
              paidAt: timestamp,
              transactionRef: utrRef,
            });
          } catch (err) {
            console.warn("Backend sync notice for invoice reconciliation:", err);
          }
        }}

        isExcelSyncModalOpen={modals.isExcelSyncModalOpen}
        onCloseExcelSyncModal={() => modals.setIsExcelSyncModalOpen(false)}
        inventory={inventory}
        onSyncInventory={(updatedInventory) => {
          dispatch({ type: "SET_INVENTORY", payload: updatedInventory });
        }}

        voiceStudioPatient={modals.voiceStudioPatient}
        onCloseVoiceStudio={() => modals.setVoiceStudioPatient(null)}

        patientList={patientList}
      />
    </div>
  );
};

export default AdminDashboard;
