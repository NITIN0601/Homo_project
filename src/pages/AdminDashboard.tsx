import React, { useState, useMemo, useEffect, Suspense, lazy } from "react";
import { useApp, useRequireRole, MEDICINE_CATALOGUE, MOCK_ACCOUNTS } from "../context/AppContext";
import type {
  AdminTab,
  PatientClinicalMedia,
  ConsultationInvoice,
  InventoryItem,
  UserProfile,
} from "../types";
import { CLINIC, DEFAULT_DOCTOR_TODOS, INVENTORY as INV_CONFIG } from "../config";
import { formatTimeShort, formatDateISO, formatDateTime } from "../utils/format";
import { getClinicTimeInfo } from "../utils/timezone";

// Modular Sub-components under src/pages/admin/
import {
  OverviewTab,
  AppointmentsTab,
  PatientRecordsTab,
  BillingInvoicesTab,
  DispensaryInventoryTab,
  DispatchesTab,
  CalendarTab,
  AppointmentBookingModal,
  AppointmentCancellationModal,
  PrescribeRemedyModal,
  PostConsultationFeeModal,
  DoctorPrescriptionUploadModal,
  CustomPOModal,
  ConsolidatedBatchOrderModal,
  LogisticsTimelineModal,
  ClinicalMediaUploadModal,
  ClinicalMediaLightboxModal,
  UtrReconciliationModal,
  INITIAL_PATIENT_MEDIA,
  INITIAL_PHARMACY_ORDERS,
  type BatchOrderItem,
  type PharmacyPurchaseOrder,
  type DoctorTodoItem,
} from "./admin";

// Lazy-loaded heavy components for optimal chunk size & fast initial paint
const ExcelSyncModal = lazy(() => import("./admin/modals/ExcelSyncModal"));
const AdminVoiceStudioModal = lazy(() => import("../components/AdminVoiceStudioModal"));

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
    updateAppointmentStatus,
    bookAppointment,
    cancelAppointment,
    postConsultationInvoice,
    confirmConsultationPayment,
    updateInvoiceTransactionRef,
    updateInvoiceStatus,
  } = useApp();

  const { visitSummaries, inventory, adminTab, blockedDates, appointments, consultationInvoices } = state;
  const clinicTime = useMemo(() => getClinicTimeInfo(), []);

  // Active Tab synchronized with AppContext (URL query param support)
  const activeTab: AdminTab = adminTab || "dashboard";
  const setActiveTab = (tab: AdminTab) => setAdminTab(tab);

  // ── Feedback Toasts & Notifications ──────────────────────────────────────────
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState<string | null>(null);
  const [mediaSuccessMsg, setMediaSuccessMsg] = useState<string | null>(null);
  const [uploadPrescriptionSuccessMsg, setUploadPrescriptionSuccessMsg] = useState<string | null>(null);
  const [batchOrderSuccessMsg, setBatchOrderSuccessMsg] = useState<string | null>(null);

  // ── Patients & Clinical Media State ──────────────────────────────────────────
  const [patientMedia, setPatientMedia] = useState<PatientClinicalMedia[]>(INITIAL_PATIENT_MEDIA);
  const [expandedPatientIds, setExpandedPatientIds] = useState<Set<string>>(() => new Set(["usr-001"]));
  const [viewingMedia, setViewingMedia] = useState<PatientClinicalMedia | null>(null);
  const [voiceStudioPatient, setVoiceStudioPatient] = useState<UserProfile | null>(null);
  const [isMediaUploadModalOpen, setIsMediaUploadModalOpen] = useState(false);
  const [mediaTargetPatientId, setMediaTargetPatientId] = useState("usr-001");

  // Sorted registered patient list (strictly ordered by Patient ID)
  const patientList = useMemo(() => {
    return Object.values(MOCK_ACCOUNTS)
      .map((acc) => acc.profile)
      .filter((prof) => prof.role === "patient")
      .sort((a, b) => a.id.localeCompare(b.id));
  }, []);

  // ── Doctor's To-Do List State ────────────────────────────────────────────────
  const [todoList, setTodoList] = useState<DoctorTodoItem[]>([...DEFAULT_DOCTOR_TODOS]);

  // ── Requisitions, Inventory & PO Logistics State ──────────────────────────────
  const [requisitionBatch, setRequisitionBatch] = useState<BatchOrderItem[]>([]);
  const [pharmacyOrders, setPharmacyOrders] = useState<PharmacyPurchaseOrder[]>(INITIAL_PHARMACY_ORDERS);
  const [inspectingOrder, setInspectingOrder] = useState<PharmacyPurchaseOrder | null>(null);

  // ── Modal Visibility States ──────────────────────────────────────────────────
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string | null>(null);
  const [prescribeModalPatient, setPrescribeModalPatient] = useState<UserProfile | null>(null);
  const [postFeeModalPatient, setPostFeeModalPatient] = useState<UserProfile | null>(null);
  const [isUploadPrescriptionOpen, setIsUploadPrescriptionOpen] = useState(false);
  const [uploadTargetPatientId, setUploadTargetPatientId] = useState<string>("usr-001");
  const [uploadChiefDiagnosis, setUploadChiefDiagnosis] = useState<string>("");
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isExcelSyncModalOpen, setIsExcelSyncModalOpen] = useState(false);
  const [reconcilingInvoice, setReconcilingInvoice] = useState<ConsultationInvoice | null>(null);

  // ── Auto-Progression Real-Time Logistics Simulation Timer ────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setPharmacyOrders((prevOrders) =>
        prevOrders.map((order) => {
          if (order.status === "in_transit" && order.currentCheckpointIdx < 3) {
            const nextIdx = order.currentCheckpointIdx + 1;
            const nowTime = formatTimeShort(new Date());
            const updatedCheckpoints = order.checkpoints.map((cp, idx) => {
              if (idx === nextIdx) {
                return { ...cp, completed: true, current: true, time: `Just now (${nowTime})` };
              }
              if (idx < nextIdx) {
                return { ...cp, completed: true, current: false };
              }
              return cp;
            });
            const newStatus = nextIdx === 3 ? "out_for_delivery" : "in_transit";
            return {
              ...order,
              status: newStatus,
              currentCheckpointIdx: nextIdx,
              checkpoints: updatedCheckpoints,
            };
          }
          return order;
        })
      );
    }, 45000); // 45s pulse

    return () => clearInterval(timer);
  }, []);

  // ── Multi-Medicine Batch Requisition Helpers ─────────────────────────────────
  const toggleAddToBatch = (item: InventoryItem, qty: number = 50) => {
    setRequisitionBatch((prev) => {
      const exists = prev.find((b) => b.item.id === item.id);
      if (exists) {
        return prev.filter((b) => b.item.id !== item.id);
      }
      return [...prev, { item, quantity: qty }];
    });
  };

  const updateBatchQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      setRequisitionBatch((prev) => prev.filter((b) => b.item.id !== itemId));
    } else {
      setRequisitionBatch((prev) =>
        prev.map((b) => (b.item.id === itemId ? { ...b, quantity: qty } : b))
      );
    }
  };

  const addAllLowStockToBatch = () => {
    const lowItems = inventory.filter((i) => i.stockQty <= INV_CONFIG.LOW_STOCK_THRESHOLD);
    setRequisitionBatch((prev) => {
      const next = [...prev];
      lowItems.forEach((low) => {
        const idx = next.findIndex((b) => b.item.id === low.id);
        if (idx === -1) {
          next.push({ item: low, quantity: 50 });
        }
      });
      return next;
    });
  };

  // ── Logistics Checkpoint Handlers ────────────────────────────────────────────
  const handleSimulateLogisticsScan = (orderId: string) => {
    setPharmacyOrders((prevOrders) =>
      prevOrders.map((order) => {
        if (order.id !== orderId) return order;
        if (order.currentCheckpointIdx >= order.checkpoints.length - 1) return order;

        const nextIdx = order.currentCheckpointIdx + 1;
        const nowTime = formatTimeShort(new Date());
        const updatedCheckpoints = order.checkpoints.map((cp, idx) => {
          if (idx === nextIdx) {
            return { ...cp, completed: true, current: true, time: `Live Scan (${nowTime})` };
          }
          if (idx < nextIdx) {
            return { ...cp, completed: true, current: false };
          }
          return cp;
        });

        const newStatus =
          nextIdx >= 4 ? "delivered" : nextIdx === 3 ? "out_for_delivery" : "in_transit";

        if (newStatus === "delivered" && order.status !== "delivered") {
          order.items.forEach((item) => {
            const existing = inventory.find((i) => i.id === item.medicineId);
            if (existing) {
              updateInventory({
                ...existing,
                stockQty: existing.stockQty + item.quantity,
                lastRestocked: formatDateISO(),
              });
            }
          });
        }

        return {
          ...order,
          status: newStatus,
          currentCheckpointIdx: nextIdx,
          checkpoints: updatedCheckpoints,
        };
      })
    );
  };

  const handleMarkDeliveredImmediately = (order: PharmacyPurchaseOrder) => {
    setPharmacyOrders((prev) =>
      prev.map((o) => {
        if (o.id !== order.id) return o;
        const deliveredCheckpoints = o.checkpoints.map((cp) => ({
          ...cp,
          completed: true,
          current: false,
        }));
        deliveredCheckpoints[deliveredCheckpoints.length - 1].current = true;
        deliveredCheckpoints[deliveredCheckpoints.length - 1].time = `Delivered Just Now`;
        return {
          ...o,
          status: "delivered",
          currentCheckpointIdx: 4,
          checkpoints: deliveredCheckpoints,
        };
      })
    );

    order.items.forEach((item) => {
      const existing = inventory.find((i) => i.id === item.medicineId);
      if (existing) {
        updateInventory({
          ...existing,
          stockQty: existing.stockQty + item.quantity,
          lastRestocked: formatDateISO(),
        });
      }
    });

    setBatchOrderSuccessMsg(`✓ Order #${order.id} delivered and stock inventory updated!`);
    setTimeout(() => setBatchOrderSuccessMsg(null), 4000);
  };

  const handleOpenUploadForPatient = (patientId: string, chiefDiagnosis?: string) => {
    setUploadTargetPatientId(patientId);
    if (chiefDiagnosis) setUploadChiefDiagnosis(chiefDiagnosis);
    setIsUploadPrescriptionOpen(true);
  };

  return (
    <div className="space-y-6" style={{ animation: "fadeInUp 0.3s ease both" }}>
      {/* ── CLINIC SSOT BRAND & DOCTOR HEADER ──────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-950 via-stone-900 to-emerald-900 text-white rounded-3xl p-6 card-shadow border border-emerald-800/40">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-2xl shadow-inner">
              🔒
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{CLINIC.NAME} Doctor Console</h1>
                <span className="bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                  Doctor Admin Access
                </span>
              </div>
              <p className="text-emerald-200/90 text-xs mt-0.5">
                {CLINIC.DOCTOR_TITLE} · {CLINIC.BRANCHES.MALLESHWARAM}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={() => handleOpenUploadForPatient("usr-001")}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>📄</span> Upload Doctor Prescription
            </button>
            <button
              onClick={() => setIsExcelSyncModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-stone-800/90 hover:bg-stone-700 text-emerald-300 border border-stone-600 font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
              title="Open Excel Spreadsheet Sync"
            >
              <span>📊</span> Excel Sync
            </button>
            <div className="bg-stone-800/80 px-3 py-1.5 rounded-xl border border-stone-700 text-stone-300">
              <span className="text-stone-400">📍 Location:</span> <strong>{CLINIC.ADDRESS.CITY}</strong> ({CLINIC.ADDRESS.PINCODE})
            </div>
            <div className="bg-stone-800/80 px-3 py-1.5 rounded-xl border border-stone-700 text-stone-300">
              <span className="text-stone-400">📞 Phone:</span> <strong>{CLINIC.PHONE_DISPLAY}</strong>
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

      {/* ── ACTIVE TAB RENDERING (MODULAR SUB-COMPONENTS) ───────────────── */}
      {activeTab === "dashboard" && (
        <OverviewTab
          appointments={appointments}
          patientList={patientList}
          inventory={inventory}
          pharmacyOrders={pharmacyOrders}
          blockedDates={blockedDates}
          todoList={todoList}
          visitSummaries={visitSummaries}
          todayYMD={clinicTime.todayYMD}
          formattedDate={clinicTime.formattedDate}
          onSetActiveTab={setActiveTab}
          onOpenUploadForPatient={handleOpenUploadForPatient}
          onOpenBatchModalWithLowStock={() => {
            addAllLowStockToBatch();
            setIsBatchModalOpen(true);
          }}
          onOpenCreatePOModal={() => setIsCreatePOModalOpen(true)}
          onOpenRequisitionBatchSingle={(item, qty) => {
            setRequisitionBatch([{ item, quantity: qty }]);
            setIsBatchModalOpen(true);
          }}
          onStartConsultation={(apptId) => updateAppointmentStatus(apptId, "In Consultation")}
          onOpenVoiceStudioForUser={(user) => setVoiceStudioPatient(user)}
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
          todayYMD={clinicTime.todayYMD}
          onStatusChange={updateAppointmentStatus}
          onOpenBookingModal={() => setIsBookingModalOpen(true)}
          onOpenCancelModal={(id) => setCancellingAppointmentId(id)}
          onOpenUploadPrescription={handleOpenUploadForPatient}
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
          onOpenPrescribeModal={(patient) => setPrescribeModalPatient(patient)}
          onOpenVoiceStudio={(patient) => setVoiceStudioPatient(patient)}
          onOpenPostFeeModal={(patient) => setPostFeeModalPatient(patient)}
          onOpenUploadPrescription={(patientId) => handleOpenUploadForPatient(patientId)}
          onOpenMediaUploadModal={(patientId) => {
            setMediaTargetPatientId(patientId);
            setIsMediaUploadModalOpen(true);
          }}
          onViewMedia={(media) => setViewingMedia(media)}
          onOpenReconcileModal={(inv) => setReconcilingInvoice(inv)}
          onConfirmPayment={confirmConsultationPayment}
          onUpdateInvoiceStatus={updateInvoiceStatus}
        />
      )}

      {activeTab === "billing" && (
        <BillingInvoicesTab
          invoices={consultationInvoices || []}
          patientList={patientList}
          onOpenReconcileModal={(inv) => setReconcilingInvoice(inv)}
          onConfirmPayment={confirmConsultationPayment}
          onUpdateStatus={updateInvoiceStatus}
          onOpenPostFeeModal={(patient) => setPostFeeModalPatient(patient)}
        />
      )}

      {activeTab === "inventory" && (
        <DispensaryInventoryTab
          inventory={inventory}
          requisitionBatch={requisitionBatch}
          onToggleAddToBatch={toggleAddToBatch}
          onUpdateBatchQuantity={updateBatchQuantity}
          onClearBatch={() => setRequisitionBatch([])}
          onOpenBatchModal={() => setIsBatchModalOpen(true)}
          onOpenExcelModal={() => setIsExcelSyncModalOpen(true)}
          onOpenCreatePOModal={() => setIsCreatePOModalOpen(true)}
          onAddAllLowStock={addAllLowStockToBatch}
        />
      )}

      {activeTab === "dispatches" && (
        <DispatchesTab
          orders={pharmacyOrders}
          onOpenBatchModal={() => setIsBatchModalOpen(true)}
          onInspectOrder={(order) => setInspectingOrder(order)}
          onSimulateLogisticsScan={handleSimulateLogisticsScan}
          onMarkDeliveredImmediately={handleMarkDeliveredImmediately}
        />
      )}

      {activeTab === "calendar" && (
        <CalendarTab
          blockedDates={blockedDates as any}
          onBlockDate={(d, r, t) => blockDate(d, r, t)}
          onBlockDateRange={(s, e, r, t) => blockDateRange(s, e, r, t)}
          onUnblockDate={unblockDate}
        />
      )}

      {/* ── MODALS (ISOLATED & MODULAR) ─────────────────────────────────── */}
      <AppointmentBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onBookAppointment={(apt) => {
          bookAppointment(apt);
          setBookingSuccessMsg(`✓ Booked ${apt.type} for ${apt.patientName} on ${apt.date} at ${apt.time}`);
          setTimeout(() => setBookingSuccessMsg(null), 4000);
        }}
      />

      <AppointmentCancellationModal
        isOpen={!!cancellingAppointmentId}
        appointmentId={cancellingAppointmentId}
        onClose={() => setCancellingAppointmentId(null)}
        onConfirmCancel={(id) => {
          cancelAppointment(id);
          setCancellingAppointmentId(null);
        }}
      />

      <PrescribeRemedyModal
        isOpen={!!prescribeModalPatient}
        patient={prescribeModalPatient}
        onClose={() => setPrescribeModalPatient(null)}
        onPrescribeRemedy={(patientId, newVisit, medicineId, customDosageNote) => {
          const medObj = MEDICINE_CATALOGUE.find((m) => m.id === medicineId);
          if (medObj) {
            if (!medObj.prescribedToPatientIds) medObj.prescribedToPatientIds = [];
            if (!medObj.prescribedToPatientIds.includes(patientId)) {
              medObj.prescribedToPatientIds.push(patientId);
            }
            medObj.doctorNote = `Prescribed by ${CLINIC.DOCTOR_NAME}: ${customDosageNote}`;
          }
          addVisitSummary(patientId, newVisit);
        }}
      />

      <PostConsultationFeeModal
        isOpen={!!postFeeModalPatient}
        patient={postFeeModalPatient}
        onClose={() => setPostFeeModalPatient(null)}
        onPostInvoice={(newInvoice) => {
          postConsultationInvoice(newInvoice);
        }}
      />

      <DoctorPrescriptionUploadModal
        isOpen={isUploadPrescriptionOpen}
        onClose={() => setIsUploadPrescriptionOpen(false)}
        patientList={patientList}
        initialPatientId={uploadTargetPatientId}
        initialChiefDiagnosis={uploadChiefDiagnosis}
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
      />

      <CustomPOModal
        isOpen={isCreatePOModalOpen}
        onClose={() => setIsCreatePOModalOpen(false)}
        onDispatchPO={(newOrder) => {
          setPharmacyOrders((prev) => [newOrder, ...prev]);
          setBatchOrderSuccessMsg(`✓ PO #${newOrder.id} dispatched via WhatsApp to ${newOrder.supplierSummary}!`);
          setTimeout(() => setBatchOrderSuccessMsg(null), 4000);
        }}
      />

      <ConsolidatedBatchOrderModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        requisitionBatch={requisitionBatch}
        onUpdateBatchQuantity={updateBatchQuantity}
        onToggleAddToBatch={toggleAddToBatch}
        onDispatchOrder={(newOrder) => {
          setPharmacyOrders((prev) => [newOrder, ...prev]);
          setRequisitionBatch([]);
          setBatchOrderSuccessMsg(`✓ Consolidated PO #${newOrder.id} dispatched successfully!`);
          setTimeout(() => setBatchOrderSuccessMsg(null), 4000);
        }}
      />

      <LogisticsTimelineModal
        isOpen={!!inspectingOrder}
        order={inspectingOrder}
        onClose={() => setInspectingOrder(null)}
      />

      <ClinicalMediaUploadModal
        isOpen={isMediaUploadModalOpen}
        onClose={() => setIsMediaUploadModalOpen(false)}
        patientList={patientList}
        initialPatientId={mediaTargetPatientId}
        onUploadMedia={(media) => {
          setPatientMedia((prev) => [media, ...prev]);
          setMediaSuccessMsg(`✓ Clinical ${media.category} attached to patient #${media.patientId}!`);
          setTimeout(() => setMediaSuccessMsg(null), 3500);
        }}
      />

      <ClinicalMediaLightboxModal
        isOpen={!!viewingMedia}
        media={viewingMedia}
        onClose={() => setViewingMedia(null)}
      />

      <UtrReconciliationModal
        isOpen={!!reconcilingInvoice}
        invoice={reconcilingInvoice}
        onClose={() => setReconcilingInvoice(null)}
        onConfirmReconciliation={(invoiceId, utrRef, isPaid) => {
          if (isPaid) {
            updateInvoiceTransactionRef(invoiceId, utrRef);
          } else {
            confirmConsultationPayment(
              invoiceId,
              formatDateTime(),
              utrRef
            );
          }
        }}
      />

      {/* Lazy-Loaded Modals wrapped in Suspense */}
      <Suspense fallback={null}>
        {isExcelSyncModalOpen && (
          <ExcelSyncModal
            isOpen={isExcelSyncModalOpen}
            onClose={() => setIsExcelSyncModalOpen(false)}
            inventory={inventory}
            onSyncInventory={(updatedInventory) => {
              dispatch({ type: "SET_INVENTORY", payload: updatedInventory });
            }}
          />
        )}

        {voiceStudioPatient && (
          <AdminVoiceStudioModal
            isOpen={!!voiceStudioPatient}
            patient={voiceStudioPatient}
            onClose={() => setVoiceStudioPatient(null)}
          />
        )}
      </Suspense>
    </div>
  );
};

export default AdminDashboard;
