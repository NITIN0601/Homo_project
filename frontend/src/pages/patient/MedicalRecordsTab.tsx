import React, { useState } from "react";
import { useTenant } from "../../context/ThemeProvider";
import type { VisitSummaryRecord } from "../../types";
import { CLINIC } from "../../config";
import { Button, Badge } from "../../components/ui";

interface MedicalRecordsTabProps {
  medicalFile: {
    patientId: string;
    patientName: string;
    age: number;
    gender: string;
    bloodGroup: string;
    knownAllergies?: string[];
    medicalHistory?: string[];
    visits: VisitSummaryRecord[];
  };
  patientId: string;
  onEditProfile: () => void;
  onViewJsonModalVisit: (visit: VisitSummaryRecord) => void;
  onOrderRemedy: (medicineId: string) => void;
}

export const MedicalRecordsTab: React.FC<MedicalRecordsTabProps> = ({
  medicalFile,
  patientId,
  onEditProfile,
  onViewJsonModalVisit,
  onOrderRemedy,
}) => {
  const { tenant } = useTenant();
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(medicalFile.visits[0]?.id || null);

  const toggleExpand = (id: string) => {
    setExpandedVisitId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Patient Medical File Summary Card */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-800 to-emerald-950 text-white rounded-3xl p-6 card-shadow space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border-2 border-emerald-400/40 flex items-center justify-center font-bold text-lg text-emerald-300">
              {medicalFile.patientName.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold">{medicalFile.patientName}</h2>
              <p className="text-stone-400 text-xs">
                {medicalFile.gender} · {medicalFile.age} years old · Blood Group: <strong className="text-emerald-400 font-mono">{medicalFile.bloodGroup}</strong>
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-1">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Medical Record ID</span>
            <p className="font-mono text-xs text-emerald-400 font-bold">#REC-{patientId.toUpperCase()}</p>
            {tenant.features.enablePatientProfileEdit !== false ? (
              <button
                type="button"
                onClick={onEditProfile}
                className="mt-1 px-3 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              >
                <span>✏️</span> Edit Details
              </button>
            ) : (
              <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-stone-800 text-stone-400 border border-stone-700">
                <span>🔒</span> Read-Only
              </span>
            )}
          </div>
        </div>

        {((medicalFile.knownAllergies && medicalFile.knownAllergies.length > 0) ||
          (medicalFile.medicalHistory && medicalFile.medicalHistory.length > 0)) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-3 border-t border-stone-800/80">
              {medicalFile.knownAllergies && medicalFile.knownAllergies.length > 0 && (
                <div>
                  <span className="text-[10px] text-stone-300 uppercase font-bold tracking-wider flex items-center gap-1 mb-1.5">
                    <span>⚠️</span> Known Allergies
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {medicalFile.knownAllergies.map((alg) => (
                      <span
                        key={alg}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-950/90 border border-rose-500/60 text-rose-100 font-bold text-xs shadow-xs"
                      >
                        <span className="text-rose-400 text-xs">⚠️</span>
                        <span className="text-white font-extrabold">{alg}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {medicalFile.medicalHistory && medicalFile.medicalHistory.length > 0 && (
                <div>
                  <span className="text-[10px] text-stone-300 uppercase font-bold tracking-wider flex items-center gap-1 mb-1.5">
                    <span>🩺</span> Previous Medical History
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {medicalFile.medicalHistory.map((hist) => (
                      <span
                        key={hist}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-800/90 border border-stone-600/70 text-emerald-200 font-bold text-xs shadow-xs"
                      >
                        <span className="text-emerald-400 text-xs">🩺</span>
                        <span className="text-white font-extrabold">{hist}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Consultation Timeline */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
          <span>🗓️</span> Consultation & Prescription Timeline ({medicalFile.visits.length} Visits)
        </h2>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-4 before:bottom-4 before:w-0.5 before:bg-stone-200">
          {medicalFile.visits.map((visit, index) => {
            const isExpanded = expandedVisitId === visit.id;

            return (
              <div key={visit.id} className="relative bg-white rounded-3xl card-shadow border border-stone-200/80 p-6 space-y-4 hover:border-emerald-500/40 transition-all">
                {/* Timeline node icon */}
                <div className="absolute -left-6 top-6 w-5 h-5 rounded-full bg-emerald-600 border-4 border-white shadow-sm flex items-center justify-center text-white text-[9px] font-bold">
                  {index + 1}
                </div>

                {/* Visit Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-stone-400">#{visit.id}</span>
                      <h3 className="font-bold text-stone-900 text-sm sm:text-base">{visit.chiefDiagnosis}</h3>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {visit.visitDate} · Attending: <span className="font-semibold text-stone-700">{visit.doctorName}</span> · {visit.clinicBranch}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {tenant.features.enableRawCaseJson && visit.homeopathicCaseRecord && (
                      <Button
                        variant="purple"
                        size="sm"
                        onClick={() => onViewJsonModalVisit(visit)}
                      >
                        <span>⚡</span> View JSON Record
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(visit.id)}
                      aria-label={isExpanded ? "Collapse visit details" : "Expand visit details"}
                    >
                      {isExpanded ? "Collapse ▲" : "View Clinical Details ▼"}
                    </Button>
                  </div>
                </div>

                {/* Prescribed Remedies Overview */}
                <div className="space-y-2">
                  <span className="font-bold text-stone-600 uppercase tracking-wider text-[10px] block">
                    Prescribed Remedies & Regimen
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {visit.prescribedRemedies.map((item, i) => (
                      <div
                        key={i}
                        className="p-3 rounded-2xl bg-sage-50/50 border border-sage-200/80 flex items-center justify-between gap-2"
                      >
                        <div>
                          <p className="font-extrabold text-stone-900 text-xs">
                            {item.medicineName ? (
                              <span>{item.medicineName} <span className="text-sage-700 font-mono text-[11px]">{item.potency}</span></span>
                            ) : (
                              <span>Formulation #{i + 1} <span className="text-stone-500 font-normal text-[11px]">(Classical Totality Prescription)</span></span>
                            )}
                          </p>
                          <p className="text-[11px] text-sage-800 mt-1">
                            <strong className="text-stone-700">Dosage:</strong> {item.dosage} ({item.duration})
                          </p>
                        </div>
                        {tenant.features.enableECommerce && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => onOrderRemedy(item.medicineId)}
                            className="text-[11px] py-1 px-2.5 shrink-0"
                          >
                            + Add to Cart
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Collapsible Clinical Details Section */}
                {isExpanded && (
                  <div className="pt-4 border-t border-stone-100 space-y-4 text-xs animate-fadeIn">
                    {/* CLASSICAL HOMEOPATHY DETAILED MODALITY CARD (IF PRESENT & APPROVED) */}
                    {visit.homeopathicCaseRecord && visit.homeopathicCaseRecord.patient_visibility_permissions?.share_modalities && (
                      <div className="bg-gradient-to-br from-purple-50/70 to-indigo-50/70 border border-purple-100 rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-extrabold text-xs text-purple-950 flex items-center gap-1.5">
                            <span>🌿</span> Classical Homeopathy Modalities & Case Totality
                          </h4>
                          <Badge variant="purple" size="micro">
                            Doctor Verified & Approved
                          </Badge>
                        </div>

                        {visit.homeopathicCaseRecord.homeopathic_case_analysis?.chief_complaints?.map((cc, cIdx) => (
                          <div key={cIdx} className="bg-white/90 rounded-xl p-3 border border-purple-100 space-y-2">
                            <div>
                              <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wide">Location & Sensation</span>
                              <p className="font-semibold text-stone-900 mt-0.5">{cc.location} — {cc.sensation}</p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                              <div className="bg-red-50/70 p-2.5 rounded-lg border border-red-100">
                                <span className="text-[10px] font-bold text-red-800 uppercase flex items-center gap-1">
                                  <span>🔴</span> Aggravation (Triggers / Makes Worse)
                                </span>
                                <p className="text-stone-800 mt-1 leading-relaxed">{cc.modalities.aggravation}</p>
                              </div>
                              <div className="bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-100">
                                <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                                  <span>🟢</span> Amelioration (Relief Factors)
                                </span>
                                <p className="text-stone-800 mt-1 leading-relaxed">{cc.modalities.amelioration}</p>
                              </div>
                            </div>

                            {cc.concomitants && (
                              <div className="text-[11px] text-stone-700 bg-stone-50 p-2 rounded-lg border border-stone-100">
                                <strong>Associated Symptoms (Concomitants):</strong> {cc.concomitants}
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Generals & Constitution */}
                        {visit.homeopathicCaseRecord.homeopathic_case_analysis?.generals_and_constitution && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1">
                            <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100">
                              <span className="text-[10px] font-bold text-stone-500 uppercase">Thermal State</span>
                              <p className="font-bold text-stone-900">{visit.homeopathicCaseRecord.homeopathic_case_analysis.generals_and_constitution.thermal_state}</p>
                            </div>
                            <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100">
                              <span className="text-[10px] font-bold text-stone-500 uppercase">Thirst Profile</span>
                              <p className="font-bold text-stone-900 truncate">{visit.homeopathicCaseRecord.homeopathic_case_analysis.generals_and_constitution.thirst}</p>
                            </div>
                            <div className="bg-white/80 p-2.5 rounded-xl border border-purple-100 col-span-2 sm:col-span-1">
                              <span className="text-[10px] font-bold text-stone-500 uppercase">Sleep Pattern</span>
                              <p className="font-bold text-stone-900 truncate">{visit.homeopathicCaseRecord.homeopathic_case_analysis.generals_and_constitution.sleep_and_dreams}</p>
                            </div>
                          </div>
                        )}

                        {/* Patient Privacy Guarantee */}
                        <div className="text-[10px] text-stone-500 bg-white/70 p-2 rounded-lg flex items-center gap-1.5 border border-purple-100">
                          <span>🔒</span>
                          <span>
                            Physician discretion applied: Sensitive constitutional miasms & psychiatric notes remain private to {tenant.doctor.name || CLINIC.DOCTOR_NAME}.
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-stone-50 rounded-2xl p-4">
                      <div>
                        <span className="font-bold text-stone-600 uppercase tracking-wider text-[10px]">Observed Symptoms</span>
                        <ul className="list-disc list-inside mt-1 text-stone-700 space-y-1">
                          {visit.symptomsObserved.map((sym, i) => <li key={i}>{sym}</li>)}
                        </ul>
                      </div>

                      <div>
                        <span className="font-bold text-stone-600 uppercase tracking-wider text-[10px]">Clinical Notes & Assessment</span>
                        <p className="mt-1 text-stone-700 leading-relaxed">{visit.clinicalNotes}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50/60 border border-emerald-100 p-3 rounded-2xl text-emerald-950">
                      <div>
                        <span className="font-bold text-[10px] uppercase text-emerald-800 tracking-wider">Lifestyle & Dietetic Advice</span>
                        <p className="mt-0.5 text-xs text-stone-800">{visit.lifestyleAdvice}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[10px] uppercase text-emerald-800 tracking-wider">Next Follow-up Due</span>
                        <p className="font-bold text-xs text-emerald-900">{visit.followUpDate}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MedicalRecordsTab;

