import React, { useState, useMemo } from "react";
import type { UserProfile, VisitSummaryRecord, ConsultationInvoice, PatientClinicalMedia } from "../../types";
import { CLINIC } from "../../config";
import { MEDICINE_CATALOGUE } from "../../context/AppContext";
import { formatINR, formatDateTime, splitFullName } from "../../utils/format";
import { useTenant } from "../../context/ThemeProvider";
import { Badge, Button } from "../../components/ui";

interface PatientRecordsTabProps {
  patientList: UserProfile[];
  visitSummaries: Record<string, { patientId: string; patientName: string; bloodGroup?: string; knownAllergies?: string[]; medicalHistory?: string[]; visits: VisitSummaryRecord[] }>;
  consultationInvoices: ConsultationInvoice[];
  patientMedia: PatientClinicalMedia[];
  expandedPatientIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onOpenPrescribeModal: (patient: UserProfile) => void;
  onOpenVoiceStudio: (patient: UserProfile) => void;
  onOpenPostFeeModal: (patient: UserProfile) => void;
  onOpenUploadPrescription: (patientId: string) => void;
  onOpenMediaUploadModal: (patientId: string) => void;
  onViewMedia: (media: PatientClinicalMedia) => void;
  onOpenReconcileModal: (invoice: ConsultationInvoice) => void;
  onConfirmPayment: (invoiceId: string, paidAt: string, transactionRef?: string) => void;
  onUpdateInvoiceStatus: (invoiceId: string, status: "pending" | "processing" | "paid") => void;
}

export const PatientRecordsTab: React.FC<PatientRecordsTabProps> = ({
  patientList,
  visitSummaries,
  consultationInvoices,
  patientMedia,
  expandedPatientIds,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
  onOpenPrescribeModal,
  onOpenVoiceStudio,
  onOpenPostFeeModal,
  onOpenUploadPrescription,
  onOpenMediaUploadModal,
  onViewMedia,
  onOpenReconcileModal,
  onConfirmPayment,
  onUpdateInvoiceStatus,
}) => {
  const { tenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPatients = useMemo(() => {
    return patientList.filter((p) => {
      const q = searchQuery.toLowerCase();
      return (
        q === "" ||
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [patientList, searchQuery]);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Controls: Search and Expand/Collapse All */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 p-3 rounded-2xl border border-stone-200">
        <div className="max-w-md w-full">
          <input
            type="search"
            placeholder="Search by Patient ID (#usr-001), Name, or Email…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 px-3.5 py-2 text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-stone-400 font-semibold text-[11px]">
            {filteredPatients.length} Registered Patients (Sorted by ID)
          </span>
          <button
            onClick={onExpandAll}
            className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-bold hover:bg-stone-100 cursor-pointer"
          >
            Expand All
          </button>
          <button
            onClick={onCollapseAll}
            className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-700 font-bold hover:bg-stone-100 cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Accordion List of Patients */}
      <div className="space-y-3">
        {filteredPatients.map((patient) => {
          const isExpanded = expandedPatientIds.has(patient.id);
          const pFile = visitSummaries[patient.id];
          const visits = pFile?.visits || [];
          const assignedRemedies = MEDICINE_CATALOGUE.filter((m) =>
            m.prescribedToPatientIds?.includes(patient.id)
          );

          const sendEmailNotification = () => {
            const clinicName = tenant.name || CLINIC.FULL_NAME;
            const doctorTitle = tenant.doctor.title || CLINIC.DOCTOR_TITLE;
            const phoneDisplay = tenant.contact.phoneDisplay || CLINIC.PHONE_DISPLAY;
            const subject = `Clinical Consultation Summary — ${clinicName}`;
            const body = `Dear ${patient.name},\n\nYour clinical notes and follow-up consultation records have been updated by ${doctorTitle}.\n\nRecord ID: #${patient.id.toUpperCase()}\nClinic: ${clinicName}\nPhone: ${phoneDisplay}\n\nWarm regards,\n${doctorTitle}`;
            window.open(
              `mailto:${patient.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
              "_blank"
            );
          };

          const patientMedias = patientMedia.filter((m) => m.patientId === patient.id);
          const patientInvoices = (consultationInvoices || []).filter((inv) => inv.patientId === patient.id);

          return (
            <div
              key={patient.id}
              className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden transition-all"
            >
              {/* Accordion Header */}
              <div
                onClick={() => onToggleExpand(patient.id)}
                className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-stone-50/80 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-black flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                    {patient.initials}
                  </div>

                  <div>
                    {(() => {
                      const names = splitFullName(patient.name || "");
                      const pFirstName = patient.firstName || names.firstName;
                      const pMiddleName = patient.middleName || names.middleName;
                      const pLastName = patient.lastName || names.lastName;
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black bg-stone-900 text-emerald-400 px-2 py-0.5 rounded">
                              #{patient.id}
                            </span>
                            <h3 className="font-black text-stone-800 text-sm">{patient.name}</h3>
                            {pFile?.bloodGroup && (
                              <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                {pFile.bloodGroup}
                              </span>
                            )}
                          </div>
                          <p className="text-stone-500 text-xs mt-0.5">
                            {pFirstName && (
                              <span className="text-stone-700 font-semibold">
                                {pFirstName} {pMiddleName ? `${pMiddleName} ` : ""}{pLastName} ·{" "}
                              </span>
                            )}
                            {patient.email} · {patient.phone}
                            {patient.address && ` · ${patient.address.city}`}
                          </p>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="success" size="sm">
                    {visits.length} {visits.length === 1 ? "Consultation" : "Consultations"}
                  </Badge>

                  {assignedRemedies.length > 0 && (
                    <Badge variant="purple" size="sm" className="hidden sm:inline-flex">
                      {assignedRemedies.length} Prescriptions
                    </Badge>
                  )}

                  <span className="text-stone-400 font-bold text-xs ml-2">
                    {isExpanded ? "▲ Collapse" : "▼ Expand History"}
                  </span>
                </div>
              </div>

              {/* Accordion Collapsible Body */}
              {isExpanded && (
                <div className="p-5 border-t border-stone-100 bg-stone-50/40 space-y-4 animate-fadeIn">
                  {/* Doctor Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-xl border border-stone-200">
                    <div className="flex items-center gap-2 text-xs flex-wrap">
                      <span className="font-bold text-stone-500">Actions:</span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPrescribeModal(patient);
                        }}
                      >
                        + Prescribe Remedy
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenVoiceStudio(patient);
                        }}
                      >
                        <span>🎙️</span> Voice Studio
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenPostFeeModal(patient);
                        }}
                        title="Post consultation fee for this patient to pay in their portal"
                      >
                        <span>💳</span> + Post Fee
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenUploadPrescription(patient.id);
                        }}
                        title="Upload Doctor Prescription for this patient"
                      >
                        <span>📄</span> Upload Prescription
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenMediaUploadModal(patient.id);
                        }}
                        title="Upload voice note, tongue photo, skin lesion image, or lab report"
                      >
                        <span>📸</span> Attach Voice / Photo
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendEmailNotification();
                        }}
                        title="Send Email Summary"
                      >
                        <span>📧</span> Email
                      </Button>
                    </div>
                  </div>

                  {/* Patient Overview Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-1">
                      <p className="font-extrabold text-stone-500 uppercase tracking-wide text-[10px]">
                        Medical Background
                      </p>
                      <p className="text-stone-800 font-medium">
                        {pFile?.medicalHistory?.join(" · ") || "No prior systemic illness recorded."}
                      </p>
                    </div>

                    <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-1">
                      <p className="font-extrabold text-stone-500 uppercase tracking-wide text-[10px]">
                        Known Drug &amp; Contact Allergies
                      </p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {pFile?.knownAllergies && pFile.knownAllergies.length > 0 ? (
                          pFile.knownAllergies.map((alg, i) => (
                            <span
                              key={i}
                              className="bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded text-[10px] font-bold"
                            >
                              ⚠️ {alg}
                            </span>
                          ))
                        ) : (
                          <span className="text-stone-400 text-xs">No known drug allergies reported.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Clinical Consultations & Visit Records */}
                  <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
                    <h4 className="font-extrabold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-100 pb-2">
                      <span>🩺</span> Clinical Consultations &amp; Visit Timeline ({visits.length})
                    </h4>

                    {visits.length === 0 ? (
                      <p className="text-stone-400 text-xs italic">No clinical consultations recorded yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {visits.map((vis) => (
                          <div
                            key={vis.id}
                            className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/80 space-y-2 text-xs"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200/60 pb-2">
                              <div>
                                <h5 className="font-extrabold text-stone-900 text-sm">{vis.chiefDiagnosis}</h5>
                                <p className="text-[11px] text-stone-500">
                                  {vis.visitDate} · {vis.clinicBranch} · Treating Doctor: {vis.doctorName}
                                </p>
                              </div>
                              <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                                #{vis.id}
                              </span>
                            </div>

                            {vis.symptomsObserved && vis.symptomsObserved.length > 0 && (
                              <div>
                                <span className="font-bold text-[10px] text-stone-500 uppercase">
                                  Symptoms Observed &amp; Modalities:
                                </span>
                                <p className="text-stone-700 mt-0.5">{vis.symptomsObserved.join(" · ")}</p>
                              </div>
                            )}

                            {vis.prescribedRemedies && vis.prescribedRemedies.length > 0 && (
                              <div>
                                <span className="font-bold text-[10px] text-stone-500 uppercase">
                                  Prescribed Remedies:
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                  {vis.prescribedRemedies.map((rem, i) => (
                                    <div
                                      key={i}
                                      className="p-2 bg-white rounded-lg border border-stone-200 text-[11px]"
                                    >
                                      <p className="font-black text-stone-900">
                                        {rem.medicineName} {rem.potency}
                                      </p>
                                      <p className="text-stone-600 text-[10px]">
                                        Dosage: {rem.dosage} · Duration: {rem.duration}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {vis.clinicalNotes && (
                              <p className="text-stone-600 bg-white p-2 rounded-lg border border-stone-200/70 text-[11px]">
                                <strong>Doctor Notes:</strong> {vis.clinicalNotes}
                              </p>
                            )}

                            {vis.lifestyleAdvice && (
                              <p className="text-emerald-900 bg-emerald-50 p-2 rounded-lg border border-emerald-200 text-[11px]">
                                <strong>Lifestyle Advice:</strong> {vis.lifestyleAdvice} · Follow-up:{" "}
                                <strong>{vis.followUpDate}</strong>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attached Clinical Media Gallery */}
                  {patientMedias.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
                      <h4 className="font-extrabold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-100 pb-2">
                        <span>📸</span> Clinical Media &amp; Diagnostic Records ({patientMedias.length})
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {patientMedias.map((media) => (
                          <div
                            key={media.id}
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewMedia(media);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                onViewMedia(media);
                              }
                            }}
                            className="p-3.5 rounded-2xl border border-stone-200 bg-stone-50/80 hover:border-teal-500 hover:bg-teal-50/40 transition-all cursor-pointer space-y-2 group shadow-xs hover:shadow-md"
                          >
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full capitalize">
                                {media.category === "voice" ? "🎙️ Voice Audio" : media.category === "lab_report" ? "🔬 Lab Report" : "📷 Photo"}
                              </span>
                              <span className="text-stone-400 font-mono">{media.uploadDate}</span>
                            </div>

                            <p className="font-extrabold text-stone-900 text-xs line-clamp-1 group-hover:text-teal-950">
                              {media.title}
                            </p>

                            {media.notes && (
                              <p className="text-stone-500 text-[10px] line-clamp-2 leading-relaxed">{media.notes}</p>
                            )}

                            <div className="pt-1 flex items-center justify-between text-teal-700 font-bold text-[11px]">
                              <span>{media.category === "voice" ? "▶ Play Audio Dictation" : "🔍 View Diagnostic Artifact"}</span>
                              <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Patient Invoices summary within case file */}
                  {patientInvoices.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-stone-200 space-y-3">
                      <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                        <h4 className="font-extrabold text-stone-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <span>💳</span> Consultation Fees &amp; Invoices ({patientInvoices.length})
                        </h4>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenPostFeeModal(patient);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs cursor-pointer"
                        >
                          + Post Fee
                        </button>
                      </div>

                      <div className="space-y-2">
                        {patientInvoices.map((inv) => (
                          <div
                            key={inv.id}
                            className="p-3 rounded-xl border border-stone-200 bg-stone-50/60 flex flex-wrap items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[10px] bg-stone-900 text-amber-400 px-2 py-0.5 rounded">
                                  #{inv.id}
                                </span>
                                <strong className="text-stone-900">{formatINR(inv.amountINR)}</strong>
                                <span className="text-stone-500 text-[11px]">· {inv.consultationType}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    inv.status === "paid"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                      : inv.status === "processing"
                                      ? "bg-sky-100 text-sky-900 border border-sky-300"
                                      : "bg-amber-100 text-amber-900 border border-amber-300"
                                  }`}
                                >
                                  {inv.status.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-stone-500 text-[11px] mt-0.5">
                                Visit: {inv.visitDate} {inv.transactionRef ? `· Ref: ${inv.transactionRef}` : ""}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {inv.status === "processing" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenReconcileModal(inv);
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs cursor-pointer hover:bg-emerald-800"
                                  >
                                    Confirm UTR
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onConfirmPayment(inv.id, formatDateTime(new Date()));
                                    }}
                                    className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-[11px] cursor-pointer"
                                  >
                                    Quick Confirm
                                  </button>
                                </>
                              )}
                              {inv.status === "pending" && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenReconcileModal(inv);
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-amber-600 text-white font-bold text-xs cursor-pointer hover:bg-amber-700"
                                >
                                  Mark Paid &amp; UTR
                                </button>
                              )}
                              {inv.status === "paid" && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenReconcileModal(inv);
                                    }}
                                    className="px-2 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs cursor-pointer hover:bg-emerald-200"
                                  >
                                    Edit UTR
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUpdateInvoiceStatus(inv.id, "pending");
                                    }}
                                    className="text-[10px] text-stone-400 hover:text-stone-700 underline cursor-pointer"
                                  >
                                    Mark Pending
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PatientRecordsTab;
