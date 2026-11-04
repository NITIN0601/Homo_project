export * from "./types";
export {
  MOCK_PATIENT_MEDIA as INITIAL_PATIENT_MEDIA,
  MOCK_PHARMACY_ORDERS as INITIAL_PHARMACY_ORDERS,
} from "../../data/mocks";
export * from "./AppointmentsTab";
export * from "./BillingInvoicesTab";
export * from "./DispensaryInventoryTab";
export * from "./PatientRecordsTab";
export * from "./OverviewTab";
export * from "./DispatchesTab";
export * from "./CalendarTab";
export * from "./CustomizationTab";

// Modals (ExcelSyncModal and AdminVoiceStudioModal are dynamically imported directly by consumers for chunk isolation)
export * from "./modals/AppointmentBookingModal";
export * from "./modals/AppointmentCancellationModal";
export * from "./modals/PrescribeRemedyModal";
export * from "./modals/PostConsultationFeeModal";
export * from "./modals/DoctorPrescriptionUploadModal";
export * from "./modals/CustomPOModal";
export * from "./modals/ConsolidatedBatchOrderModal";
export * from "./modals/LogisticsTimelineModal";
export * from "./modals/ClinicalMediaUploadModal";
export * from "./modals/ClinicalMediaLightboxModal";
export * from "./modals/UtrReconciliationModal";
