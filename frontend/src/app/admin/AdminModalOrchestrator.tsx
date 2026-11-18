import React, { Suspense, lazy } from "react";
import type {
  UserProfile,
  ConsultationInvoice,
  PatientClinicalMedia,
  InventoryItem,
  BookedAppointment,
  VisitSummaryRecord,
} from "@core/types";
import type { BatchOrderItem, PharmacyPurchaseOrder } from "./adminTypes";
import { AppointmentBookingModal } from "../../domains/scheduling/modals/AppointmentBookingModal";
import { AppointmentCancellationModal } from "../../domains/scheduling/modals/AppointmentCancellationModal";
import { PrescribeRemedyModal } from "../../domains/dispensary-pharmacy/modals/PrescribeRemedyModal";
import { PostConsultationFeeModal } from "../../domains/billing-finance/modals/PostConsultationFeeModal";
import { DoctorPrescriptionUploadModal } from "../../domains/dispensary-pharmacy/modals/DoctorPrescriptionUploadModal";
import { CustomPOModal } from "../../domains/dispensary-pharmacy/modals/CustomPOModal";
import { ConsolidatedBatchOrderModal } from "../../domains/dispensary-pharmacy/modals/ConsolidatedBatchOrderModal";
import { LogisticsTimelineModal } from "../../domains/dispensary-pharmacy/modals/LogisticsTimelineModal";
import { ClinicalMediaUploadModal } from "../../domains/clinical-ehr/modals/ClinicalMediaUploadModal";
import { ClinicalMediaLightboxModal } from "../../domains/clinical-ehr/modals/ClinicalMediaLightboxModal";
import { UtrReconciliationModal } from "../../domains/billing-finance/modals/UtrReconciliationModal";

const ExcelSyncModal = lazy(() => import("../../domains/dispensary-pharmacy/modals/ExcelSyncModal"));
const AdminVoiceStudioModal = lazy(() => import("../../domains/clinical-ehr/components/voice/AdminVoiceStudioModal"));

export interface AdminModalOrchestratorProps {
  // Modal visibility & active record states
  isBookingModalOpen: boolean;
  onCloseBookingModal: () => void;
  onBookAppointment: (apt: BookedAppointment) => Promise<void>;

  cancellingAppointmentId: string | null;
  onCloseCancelModal: () => void;
  onConfirmCancelAppointment: (id: string) => Promise<void>;

  prescribeModalPatient: UserProfile | null;
  onClosePrescribeModal: () => void;
  onPrescribeRemedy: (patientId: string, newVisit: VisitSummaryRecord, medicineId: string, customDosageNote: string) => void;

  postFeeModalPatient: UserProfile | null;
  onClosePostFeeModal: () => void;
  onPostInvoice: (newInvoice: ConsultationInvoice) => Promise<void>;

  isUploadPrescriptionOpen: boolean;
  onCloseUploadPrescription: () => void;
  uploadTargetPatientId: string;
  uploadChiefDiagnosis: string;
  onSavePrescription: (patientId: string, newVisit: VisitSummaryRecord, attachment?: PatientClinicalMedia | { name: string; url: string }) => void;

  isCreatePOModalOpen: boolean;
  onCloseCreatePOModal: () => void;
  onDispatchPO: (newOrder: PharmacyPurchaseOrder) => void;

  isBatchModalOpen: boolean;
  onCloseBatchModal: () => void;
  requisitionBatch: BatchOrderItem[];
  onUpdateBatchQuantity: (itemId: string, qty: number) => void;
  onToggleAddToBatch: (item: InventoryItem, qty?: number) => void;
  onDispatchBatchOrder: (newOrder: PharmacyPurchaseOrder) => void;

  inspectingOrder: PharmacyPurchaseOrder | null;
  onCloseInspectingOrder: () => void;

  isMediaUploadModalOpen: boolean;
  onCloseMediaUploadModal: () => void;
  mediaTargetPatientId: string;
  onUploadMedia: (media: PatientClinicalMedia) => void;

  viewingMedia: PatientClinicalMedia | null;
  onCloseViewingMedia: () => void;

  reconcilingInvoice: ConsultationInvoice | null;
  onCloseReconcilingInvoice: () => void;
  onConfirmReconciliation: (invoiceId: string, utrRef: string, isPaid: boolean) => Promise<void>;

  isExcelSyncModalOpen: boolean;
  onCloseExcelSyncModal: () => void;
  inventory: InventoryItem[];
  onSyncInventory: (updatedInventory: InventoryItem[]) => void;

  voiceStudioPatient: UserProfile | null;
  onCloseVoiceStudio: () => void;

  patientList: UserProfile[];
}

export const AdminModalOrchestrator: React.FC<AdminModalOrchestratorProps> = ({
  isBookingModalOpen,
  onCloseBookingModal,
  onBookAppointment,

  cancellingAppointmentId,
  onCloseCancelModal,
  onConfirmCancelAppointment,

  prescribeModalPatient,
  onClosePrescribeModal,
  onPrescribeRemedy,

  postFeeModalPatient,
  onClosePostFeeModal,
  onPostInvoice,

  isUploadPrescriptionOpen,
  onCloseUploadPrescription,
  uploadTargetPatientId,
  uploadChiefDiagnosis,
  onSavePrescription,

  isCreatePOModalOpen,
  onCloseCreatePOModal,
  onDispatchPO,

  isBatchModalOpen,
  onCloseBatchModal,
  requisitionBatch,
  onUpdateBatchQuantity,
  onToggleAddToBatch,
  onDispatchBatchOrder,

  inspectingOrder,
  onCloseInspectingOrder,

  isMediaUploadModalOpen,
  onCloseMediaUploadModal,
  mediaTargetPatientId,
  onUploadMedia,

  viewingMedia,
  onCloseViewingMedia,

  reconcilingInvoice,
  onCloseReconcilingInvoice,
  onConfirmReconciliation,

  isExcelSyncModalOpen,
  onCloseExcelSyncModal,
  inventory,
  onSyncInventory,

  voiceStudioPatient,
  onCloseVoiceStudio,

  patientList,
}) => {
  return (
    <>
      <AppointmentBookingModal
        isOpen={isBookingModalOpen}
        onClose={onCloseBookingModal}
        onBookAppointment={onBookAppointment}
      />

      <AppointmentCancellationModal
        isOpen={!!cancellingAppointmentId}
        appointmentId={cancellingAppointmentId}
        onClose={onCloseCancelModal}
        onConfirmCancel={onConfirmCancelAppointment}
      />

      <PrescribeRemedyModal
        isOpen={!!prescribeModalPatient}
        patient={prescribeModalPatient}
        onClose={onClosePrescribeModal}
        onPrescribeRemedy={onPrescribeRemedy}
      />

      <PostConsultationFeeModal
        isOpen={!!postFeeModalPatient}
        patient={postFeeModalPatient}
        onClose={onClosePostFeeModal}
        onPostInvoice={onPostInvoice}
      />

      <DoctorPrescriptionUploadModal
        isOpen={isUploadPrescriptionOpen}
        onClose={onCloseUploadPrescription}
        patientList={patientList}
        initialPatientId={uploadTargetPatientId}
        initialChiefDiagnosis={uploadChiefDiagnosis}
        onSavePrescription={onSavePrescription}
      />

      <CustomPOModal
        isOpen={isCreatePOModalOpen}
        onClose={onCloseCreatePOModal}
        onDispatchPO={onDispatchPO}
      />

      <ConsolidatedBatchOrderModal
        isOpen={isBatchModalOpen}
        onClose={onCloseBatchModal}
        requisitionBatch={requisitionBatch}
        onUpdateBatchQuantity={onUpdateBatchQuantity}
        onToggleAddToBatch={onToggleAddToBatch}
        onDispatchOrder={onDispatchBatchOrder}
      />

      <LogisticsTimelineModal
        isOpen={!!inspectingOrder}
        order={inspectingOrder}
        onClose={onCloseInspectingOrder}
      />

      <ClinicalMediaUploadModal
        isOpen={isMediaUploadModalOpen}
        onClose={onCloseMediaUploadModal}
        patientList={patientList}
        initialPatientId={mediaTargetPatientId}
        onUploadMedia={onUploadMedia}
      />

      <ClinicalMediaLightboxModal
        isOpen={!!viewingMedia}
        media={viewingMedia}
        onClose={onCloseViewingMedia}
      />

      <UtrReconciliationModal
        isOpen={!!reconcilingInvoice}
        invoice={reconcilingInvoice}
        onClose={onCloseReconcilingInvoice}
        onConfirmReconciliation={onConfirmReconciliation}
      />

      <Suspense fallback={null}>
        {isExcelSyncModalOpen && (
          <ExcelSyncModal
            isOpen={isExcelSyncModalOpen}
            onClose={onCloseExcelSyncModal}
            inventory={inventory}
            onSyncInventory={onSyncInventory}
          />
        )}

        {voiceStudioPatient && (
          <AdminVoiceStudioModal
            isOpen={!!voiceStudioPatient}
            patient={voiceStudioPatient}
            onClose={onCloseVoiceStudio}
          />
        )}
      </Suspense>
    </>
  );
};
