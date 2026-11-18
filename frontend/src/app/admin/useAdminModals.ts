import { useState, useCallback } from "react";
import type { UserProfile, ConsultationInvoice, PatientClinicalMedia } from "@core/types";
import type { PharmacyPurchaseOrder } from "./adminTypes";

export function useAdminModals() {
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
  const [viewingMedia, setViewingMedia] = useState<PatientClinicalMedia | null>(null);
  const [voiceStudioPatient, setVoiceStudioPatient] = useState<UserProfile | null>(null);
  const [isMediaUploadModalOpen, setIsMediaUploadModalOpen] = useState(false);
  const [mediaTargetPatientId, setMediaTargetPatientId] = useState("usr-001");
  const [inspectingOrder, setInspectingOrder] = useState<PharmacyPurchaseOrder | null>(null);

  const openUploadForPatient = useCallback((patientId: string, chiefDiagnosis?: string) => {
    setUploadTargetPatientId(patientId);
    if (chiefDiagnosis) setUploadChiefDiagnosis(chiefDiagnosis);
    setIsUploadPrescriptionOpen(true);
  }, []);

  const openMediaUpload = useCallback((patientId: string) => {
    setMediaTargetPatientId(patientId);
    setIsMediaUploadModalOpen(true);
  }, []);

  return {
    isBookingModalOpen,
    setIsBookingModalOpen,
    cancellingAppointmentId,
    setCancellingAppointmentId,
    prescribeModalPatient,
    setPrescribeModalPatient,
    postFeeModalPatient,
    setPostFeeModalPatient,
    isUploadPrescriptionOpen,
    setIsUploadPrescriptionOpen,
    uploadTargetPatientId,
    uploadChiefDiagnosis,
    openUploadForPatient,
    isCreatePOModalOpen,
    setIsCreatePOModalOpen,
    isBatchModalOpen,
    setIsBatchModalOpen,
    isExcelSyncModalOpen,
    setIsExcelSyncModalOpen,
    reconcilingInvoice,
    setReconcilingInvoice,
    viewingMedia,
    setViewingMedia,
    voiceStudioPatient,
    setVoiceStudioPatient,
    isMediaUploadModalOpen,
    setIsMediaUploadModalOpen,
    mediaTargetPatientId,
    openMediaUpload,
    inspectingOrder,
    setInspectingOrder,
  };
}
