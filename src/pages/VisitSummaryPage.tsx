import React, { useState, useMemo, useEffect } from "react";
import { useApp, MEDICINE_CATALOGUE } from "../context/AppContext";
import type { VisitSummaryRecord, ConsultationInvoice } from "../types";
import { getPatientVisibleCaseRecord } from "../services/voiceStudio";
import { PHASE_CONFIG, CLINIC, DOCTOR, INDIAN_BANKS } from "../config";
import { formatINR, formatDateTime } from "../utils/format";

export const VisitSummaryPage: React.FC = () => {
  const { state, addToCart, navigateTo, submitConsultationPayment, openAuthModal } = useApp();
  const { authUser, visitSummaries, consultationInvoices } = state;

  const patientId = authUser?.id || "usr-001";
  const medicalFile = visitSummaries[patientId] || {
    patientId: patientId,
    patientName: authUser?.name || "John Doe (Demo Patient)",
    age: 34,
    gender: "Male",
    bloodGroup: "O+",
    knownAllergies: ["Dust Mites", "Penicillin"],
    medicalHistory: ["Chronic Dyspepsia since 2024", "Trauma Soreness", "Constitutional Rash"],
    visits: [
      {
        id: "vis-101",
        visitDate: "Sep 15, 2026",
        doctorName: CLINIC.DOCTOR_TITLE,
        clinicBranch: CLINIC.BRANCHES.TELE,
        chiefDiagnosis: "Acute Dyspepsia with Post-Exercise Muscle Fatigue",
        symptomsObserved: ["Bloating post meals", "Hamstring strain", "Acidity after coffee"],
        prescribedRemedies: [
          { medicineId: "m1", medicineName: "Arnica Montana", potency: "30C", dosage: "4 globules twice daily after meals", duration: "10 days" },
          { medicineId: "m3", medicineName: "Nux Vomica", potency: "30C", dosage: "4 drops post dinner", duration: "7 days" },
        ],
        clinicalNotes: "Patient reports improvement in indigestion. Prescribed Arnica 30C for muscular soreness post marathon training. Nux Vomica 30C added for hyperacidity.",
        lifestyleAdvice: "Avoid caffeine after 6 PM. Drink warm water post meals.",
        followUpDate: "Oct 15, 2026",
      },
    ],
  };

  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(medicalFile.visits[0]?.id || null);
  const [viewJsonModalVisit, setViewJsonModalVisit] = useState<VisitSummaryRecord | null>(null);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // ── Portal Tab State (Medical Records vs Billing & Payments) ───────────────
  const [activePortalTab, setActivePortalTab] = useState<"records" | "payments">(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = new URLSearchParams(window.location.search).get("tab");
      if (
        path.includes("payment") ||
        path.includes("billing") ||
        hash.includes("payment") ||
        hash.includes("billing") ||
        search === "payments" ||
        search === "billing"
      ) {
        return "payments";
      }
    }
    return "records";
  });

  const handleTabSwitch = (tab: "records" | "payments") => {
    setActivePortalTab(tab);
    if (typeof window !== "undefined") {
      const newPath = tab === "payments" ? "/visit-summary/payments" : "/visit-summary/records";
      window.history.pushState({ tab }, "", newPath);
      document.title =
        tab === "payments"
          ? "My Consultation Billing & Payment History — Agastya Homoeopathy Clinic"
          : "My Medical Records & Clinical History — Agastya Homoeopathy Clinic";
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const search = new URLSearchParams(window.location.search).get("tab");
      if (
        path.includes("payment") ||
        path.includes("billing") ||
        search === "payments" ||
        search === "billing"
      ) {
        setActivePortalTab("payments");
      } else {
        setActivePortalTab("records");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // ── Consultation Invoices & Settlement State (Pending -> Processing -> Paid) ─
  const patientInvoices = useMemo(
    () => (consultationInvoices || []).filter((inv) => inv.patientId === patientId),
    [consultationInvoices, patientId]
  );
  const pendingInvoices = useMemo(
    () => patientInvoices.filter((inv) => inv.status === "pending"),
    [patientInvoices]
  );
  const processingInvoices = useMemo(
    () => patientInvoices.filter((inv) => inv.status === "processing"),
    [patientInvoices]
  );
  const paidInvoices = useMemo(
    () => patientInvoices.filter((inv) => inv.status === "paid"),
    [patientInvoices]
  );

  const totalBilledINR = useMemo(
    () => patientInvoices.reduce((sum, inv) => sum + (inv.amountINR || 0), 0),
    [patientInvoices]
  );
  const totalPendingINR = useMemo(
    () => pendingInvoices.reduce((sum, inv) => sum + (inv.amountINR || 0), 0),
    [pendingInvoices]
  );
  const totalPaidINR = useMemo(
    () => paidInvoices.reduce((sum, inv) => sum + (inv.amountINR || 0), 0),
    [paidInvoices]
  );

  const [payingInvoice, setPayingInvoice]                   = useState<ConsultationInvoice | null>(null);
  const [paymentMethodTab, setPaymentMethodTab]             = useState<"upi" | "card" | "netbanking">("upi");
  const [selectedUpiApp, setSelectedUpiApp]                 = useState<"gpay" | "phonepe" | "paytm" | "custom">("gpay");
  const [customPatientUpi, setCustomPatientUpi]             = useState<string>(authUser?.savedUpiId || "");
  const [bankSearchQuery, setBankSearchQuery]               = useState<string>("");
  const [selectedBank, setSelectedBank]                     = useState<string>("HDFC Bank");
  const [cardNumber, setCardNumber]                         = useState<string>("4242 •••• •••• 4242");
  const [cardHolder, setCardHolder]                         = useState<string>(authUser?.name || "John Doe");
  const [cardExpiry, setCardExpiry]                         = useState<string>("12/28");
  const [cardCvv, setCardCvv]                               = useState<string>("•••");
  const [isProcessingPayment, setIsProcessingPayment]       = useState<boolean>(false);
  const [paymentSuccessData, setPaymentSuccessData]         = useState<{
    invoice: ConsultationInvoice;
    txRef: string;
    submittedAt: string;
    method: string;
  } | null>(null);
  const [viewingReceiptInvoice, setViewingReceiptInvoice]   = useState<ConsultationInvoice | null>(null);

  const filteredBanks = useMemo(() => {
    if (!bankSearchQuery.trim()) return INDIAN_BANKS;
    const q = bankSearchQuery.toLowerCase();
    return INDIAN_BANKS.filter(
      (b) => b.name.toLowerCase().includes(q) || b.shortName.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)
    );
  }, [bankSearchQuery]);

  const handlePayInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice) return;
    setIsProcessingPayment(true);

    setTimeout(() => {
      const txRef = paymentMethodTab === "upi"
        ? `UPI-${Math.floor(100000000 + Math.random() * 900000000)}-IN`
        : paymentMethodTab === "card"
        ? `CARD-AUTH-${Math.floor(100000 + Math.random() * 900000)}`
        : `NB-${selectedBank.replace(/[^A-Za-z0-9]/g, "").toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const submittedAt = formatDateTime();

      submitConsultationPayment(
        payingInvoice.id,
        paymentMethodTab,
        txRef,
        submittedAt,
        customPatientUpi.trim() || authUser?.savedUpiId,
        paymentMethodTab === "netbanking" ? selectedBank : undefined
      );

      setIsProcessingPayment(false);
      setPaymentSuccessData({
        invoice: {
          ...payingInvoice,
          status: "processing",
          paymentMethod: paymentMethodTab,
          transactionRef: txRef,
          submittedAt,
          patientUpiId: customPatientUpi.trim() || authUser?.savedUpiId,
          selectedBank: paymentMethodTab === "netbanking" ? selectedBank : undefined,
        },
        txRef,
        submittedAt,
        method: paymentMethodTab.toUpperCase(),
      });
      setPayingInvoice(null);
    }, 1100);
  };

  const toggleExpand = (id: string) => {
    setExpandedVisitId((prev) => (prev === id ? null : id));
  };

  const handleCopyPatientJson = (record: any) => {
    navigator.clipboard.writeText(JSON.stringify(record, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleOrderRemedy = (medicineId: string) => {
    const remedy = MEDICINE_CATALOGUE.find((m) => m.id === medicineId);
    if (remedy) {
      addToCart(remedy);
    }
  };

  if (!authUser) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4 space-y-5" style={{ animation: "fadeInUp 0.3s ease both" }}>
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-3xl shadow-sm">
          📋
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-stone-800">Sign in to View Your Summary</h2>
          <p className="text-stone-500 text-sm leading-relaxed">
            Your clinical consultations, prescribed remedies, and billing invoices are protected. Please sign in to access your personal medical summary.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={openAuthModal}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-sm shadow-md transition-all active:scale-95 cursor-pointer"
          >
            🔑 Sign In / Register
          </button>
          <button
            onClick={() => navigateTo("home")}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm transition-all cursor-pointer border border-stone-200"
          >
            ← Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" style={{ animation: "fadeInUp 0.4s ease both" }}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-3xl p-6 card-shadow border border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{activePortalTab === "records" ? "📋" : "💳"}</span>
            <h1 className="text-2xl font-black text-stone-800">
              {activePortalTab === "records"
                ? "My Medical Records & Clinical History"
                : "My Consultation Billing & Payment History"}
            </h1>
          </div>
          <p className="text-stone-500 text-xs mt-1">
            {activePortalTab === "records"
              ? "Complete timeline of classical homeopathy consultations, clinical notes, and prescribed remedies"
              : "Doctor consultation fees, online settlement, verification tracking, and official digital tax receipts"}
          </p>
        </div>

        {/* Strictly Read-Only Status Indicator */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <span>🔒</span> Verified Patient View · Official Clinical Record
        </div>
      </div>

      {/* ── Patient Portal Split Tabs Navigation ────────────────────────── */}
      <div
        className="bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200 flex flex-wrap sm:flex-nowrap items-center gap-2 card-shadow"
        role="tablist"
        aria-label="Patient Portal Modules"
      >
        <button
          type="button"
          role="tab"
          id="portal-tab-records"
          aria-selected={activePortalTab === "records"}
          onClick={() => handleTabSwitch("records")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activePortalTab === "records"
              ? "bg-stone-900 text-white shadow-md"
              : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
          }`}
        >
          <span className="text-base">🩺</span>
          <span>Medical History & Records</span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              activePortalTab === "records" ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"
            }`}
          >
            {medicalFile.visits.length} {medicalFile.visits.length === 1 ? "Visit" : "Visits"}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          id="portal-tab-payments"
          aria-selected={activePortalTab === "payments"}
          onClick={() => handleTabSwitch("payments")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activePortalTab === "payments"
              ? "bg-emerald-800 text-white shadow-md"
              : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
          }`}
        >
          <span className="text-base">💳</span>
          <span>Billing & Payment History</span>
          {pendingInvoices.length > 0 ? (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 animate-pulse shadow-xs">
              {pendingInvoices.length} Due ({formatINR(totalPendingINR)})
            </span>
          ) : processingInvoices.length > 0 ? (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-400 text-stone-950 animate-pulse shadow-xs">
              {processingInvoices.length} In Review
            </span>
          ) : (
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                activePortalTab === "payments" ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"
              }`}
            >
              {paidInvoices.length} Paid
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: MEDICAL RECORDS & CLINICAL HISTORY ──────────────────── */}
      {activePortalTab === "records" && (
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
          <div className="text-right">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Medical Record ID</span>
            <p className="font-mono text-xs text-emerald-400 font-bold">#REC-{patientId.toUpperCase()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Known Allergies</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {medicalFile.knownAllergies.map((alg) => (
                <span key={alg} className="bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-semibold px-2.5 py-0.5 rounded-full">
                  ⚠️ {alg}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[10px] text-stone-400 uppercase font-bold tracking-wider">Previous Medical History</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {medicalFile.medicalHistory.map((hist) => (
                <span key={hist} className="bg-stone-700/60 text-stone-200 text-[11px] font-medium px-2.5 py-0.5 rounded-full">
                  🩺 {hist}
                </span>
              ))}
            </div>
          </div>
        </div>
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
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                      {visit.visitDate}
                    </span>
                    <h3 className="text-base font-bold text-stone-800 mt-2">{visit.chiefDiagnosis}</h3>
                    <p className="text-xs text-stone-400 mt-0.5">Consultant: <strong>{visit.doctorName}</strong> ({visit.clinicBranch})</p>

                    {/* Classical Homeopathy Voice Record Indicator */}
                    {visit.homeopathicCaseRecord && (
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-[10px] font-extrabold bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <span>🎙️</span> VoiceStudio Classical Homeopathy Case
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          Ref: {visit.homeopathicCaseRecord.metadata.interaction_id}
                        </span>
                        <button
                          type="button"
                          onClick={() => setViewJsonModalVisit(visit)}
                          className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2.5 py-0.5 rounded-full transition-all cursor-pointer flex items-center gap-1 border border-purple-200"
                        >
                          <span>📋</span> View Certified JSON Slice
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => toggleExpand(visit.id)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{isExpanded ? "▲ Hide Details" : "▼ View Detailed Notes & Prescription"}</span>
                  </button>
                </div>

                {/* Prescribed Remedies Summary Pills */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                    {PHASE_CONFIG.SHOW_RAW_MEDICINE_NAMES
                      ? "Prescribed Homeopathic Remedies"
                      : "Prescribed Remedy Formulations (Dispensed at Clinic)"}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {visit.prescribedRemedies.map((item, i) => (
                      <div key={i} className="bg-sage-50 border border-sage-200 text-sage-900 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs flex-1 min-w-[240px]">
                        <div>
                          <p className="font-bold flex items-center gap-1.5">
                            <span>🌿</span>
                            {PHASE_CONFIG.SHOW_RAW_MEDICINE_NAMES ? (
                              <span>{item.medicineName} <span className="text-sage-700 font-mono text-[11px]">{item.potency}</span></span>
                            ) : (
                              <span>Formulation #{i + 1} <span className="text-stone-500 font-normal text-[11px]">(Classical Totality Prescription)</span></span>
                            )}
                          </p>
                          <p className="text-[11px] text-sage-800 mt-1">
                            <strong className="text-stone-700">Dosage:</strong> {item.dosage} ({item.duration})
                          </p>
                        </div>
                        {PHASE_CONFIG.ENABLE_MEDICINE_ORDERING && (
                          <button
                            onClick={() => handleOrderRemedy(item.medicineId)}
                            className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-all shadow-sm flex-shrink-0 active:scale-95 cursor-pointer"
                          >
                            + Add to Cart
                          </button>
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
                          <span className="text-[10px] text-purple-700 font-semibold bg-white/80 px-2 py-0.5 rounded-full border border-purple-200">
                            Doctor Verified & Approved
                          </span>
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
                            Physician discretion applied: Sensitive constitutional miasms & psychiatric notes remain private to {CLINIC.DOCTOR_NAME}.
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
                        <span className="font-bold text-stone-600 uppercase tracking-wider text-[10px]">Diet & Lifestyle Advice</span>
                        <p className="text-stone-700 mt-1">{visit.lifestyleAdvice}</p>
                      </div>
                    </div>

                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-1 text-amber-900">
                      <span className="font-bold uppercase tracking-wider text-[10px]">Doctor's Clinical Assessment Notes</span>
                      <p className="text-xs leading-relaxed font-medium">{visit.clinicalNotes}</p>
                    </div>

                    {visit.prescriptionImageUri && (
                      <div className="border border-stone-200 rounded-2xl p-3 space-y-2">
                        <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px]">Uploaded Prescription Paper Attachment</span>
                        <div className="w-full max-h-48 rounded-xl overflow-hidden bg-stone-100 border flex items-center justify-center">
                          <img src={visit.prescriptionImageUri} alt="Uploaded Prescription" className="h-full object-contain" />
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs text-stone-500 pt-1">
                      <span>Next Recommended Consultation: <strong className="text-stone-800 font-semibold">{visit.followUpDate}</strong></span>
                      <button
                        onClick={() => navigateTo("appointments")}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 transition-colors cursor-pointer"
                      >
                        Book Follow-up Appointment →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

        </div>
      )}

      {/* ── TAB 2: BILLING & PAYMENT HISTORY ──────────────────────────── */}
      {activePortalTab === "payments" && (
        <div className="space-y-6 animate-fadeIn">
          {/* Financial Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 card-shadow border border-stone-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Total Invoiced</span>
              <p className="text-2xl font-black text-stone-900 mt-1">{formatINR(totalBilledINR)}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">{patientInvoices.length} Total Invoices</p>
            </div>

            <div className={`rounded-3xl p-5 card-shadow border transition-all ${
              pendingInvoices.length > 0 
                ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20" 
                : "bg-white border-stone-200/80"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pending Due</span>
                {pendingInvoices.length > 0 && (
                  <span className="text-[10px] font-black bg-amber-500 text-stone-950 px-2 py-0.5 rounded-full animate-pulse">
                    Action Needed
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-amber-900 mt-1">{formatINR(totalPendingINR)}</p>
              <p className="text-[11px] text-amber-700/80 mt-0.5">{pendingInvoices.length} Bills Awaiting Settlement</p>
            </div>

            <div className={`rounded-3xl p-5 card-shadow border transition-all ${
              processingInvoices.length > 0
                ? "bg-sky-50/80 border-sky-300 ring-2 ring-sky-400/20"
                : "bg-white border-stone-200/80"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">Under Verification</span>
                {processingInvoices.length > 0 && (
                  <span className="text-[10px] font-black bg-sky-500 text-white px-2 py-0.5 rounded-full animate-pulse">
                    In Review
                  </span>
                )}
              </div>
              <p className="text-2xl font-black text-sky-900 mt-1">{processingInvoices.length}</p>
              <p className="text-[11px] text-sky-700/80 mt-0.5">Submitted · Awaiting Doctor Receipt Match</p>
            </div>

            <div className="bg-emerald-50/80 rounded-3xl p-5 card-shadow border border-emerald-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Confirmed & Settled</span>
              <p className="text-2xl font-black text-emerald-900 mt-1">{formatINR(totalPaidINR)}</p>
              <p className="text-[11px] text-emerald-700/80 mt-0.5">{paidInvoices.length} Paid with Official Tax Receipts</p>
            </div>
          </div>

          {/* ── Consultation Fees & Online Invoicing ───────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-stone-400 flex items-center gap-2">
            <span>💳</span> Consultation Fees & Invoicing ({patientInvoices.length} Records)
          </h2>
          {pendingInvoices.length > 0 && (
            <span className="text-xs font-black bg-amber-500 text-stone-950 px-2.5 py-0.5 rounded-full animate-pulse">
              {pendingInvoices.length} Payment Due
            </span>
          )}
        </div>

        {/* Urgent / Outstanding Consultation Fee Alert Card */}
        {pendingInvoices.length > 0 ? (
          <div className="space-y-3">
            {pendingInvoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border-2 border-amber-400 rounded-3xl p-5 card-shadow transition-all space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 font-black flex items-center justify-center text-lg shadow-xs">
                      💳
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-xs font-black text-amber-900 uppercase tracking-wider">
                          Doctor Consultation Fee Posted
                        </span>
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                          #{inv.id}
                        </span>
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                          Action Required
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">
                        Consultant: <strong>{inv.doctorName}</strong> · Visit Date: <strong>{inv.visitDate}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                        Amount Due
                      </span>
                      <span className="text-xl font-black text-stone-900">
                        {formatINR(inv.amountINR)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPayingInvoice(inv)}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <span>💳</span> Settle Fee Online ({formatINR(inv.amountINR)}) →
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-600 bg-white/70 p-3 rounded-2xl border border-amber-100">
                  <div>
                    <strong>Consultation Mode:</strong> {inv.consultationType}
                  </div>
                  <div>
                    <strong>Clinical Billing Notes:</strong> {inv.notes || "Case taking evaluation & totality assessment"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* ── Processing Invoices — Submitted by Patient, Awaiting Doctor Confirmation ── */}
        {processingInvoices.length > 0 && (
          <div className="space-y-3">
            {processingInvoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-white border-2 border-sky-400 rounded-3xl p-5 card-shadow transition-all space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sky-200/60 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white font-black flex items-center justify-center text-lg shadow-xs animate-pulse">
                      ⏳
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span className="text-xs font-black text-sky-900 uppercase tracking-wider">
                          Payment Under Doctor Verification
                        </span>
                        <span className="bg-sky-100 text-sky-900 border border-sky-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap">
                          #{inv.id}
                        </span>
                        <span className="bg-sky-100 text-sky-900 border border-sky-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap">
                          Status: Processing Verification
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 mt-0.5">
                        Consultant: <strong>{inv.doctorName}</strong> · Visit Date: <strong>{inv.visitDate}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                      Submitted Amount
                    </span>
                    <span className="text-xl font-black text-stone-900">
                      {formatINR(inv.amountINR)}
                    </span>
                  </div>
                </div>

                {/* 3-Step Lifecycle Visualizer */}
                <div className="bg-white/90 p-3.5 rounded-2xl border border-sky-200 space-y-2">
                  <div className="flex flex-wrap items-center justify-between text-[11px] font-bold gap-2">
                    <span className="text-emerald-700 flex items-center gap-1">
                      <span>✓</span> 1. Consultation Fee Posted
                    </span>
                    <span className="text-sky-700 flex items-center gap-1 font-extrabold">
                      <span>⏳</span> 2. Payment Details Submitted (Current)
                    </span>
                    <span className="text-stone-400 flex items-center gap-1">
                      <span>🔒</span> 3. Doctor Confirmed & Receipt
                    </span>
                  </div>
                  <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden flex">
                    <div className="bg-emerald-600 w-1/3" />
                    <div className="bg-sky-500 w-1/3 animate-pulse" />
                    <div className="bg-stone-300 w-1/3" />
                  </div>
                </div>

                {/* Submission Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-700 bg-white/70 p-3 rounded-2xl border border-sky-100 font-mono">
                  <div>
                    <strong>Payment Mode:</strong> {inv.paymentMethod?.toUpperCase()}
                    {inv.selectedBank && ` · ${inv.selectedBank}`}
                  </div>
                  <div>
                    <strong>Txn / UTR Ref:</strong> <span className="font-bold text-stone-900">{inv.transactionRef}</span>
                  </div>
                  {inv.patientUpiId && (
                    <div>
                      <strong>Patient UPI:</strong> {inv.patientUpiId}
                    </div>
                  )}
                  <div>
                    <strong>Submitted At:</strong> {inv.submittedAt}
                  </div>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-[11px] text-sky-900 flex items-start gap-2">
                  <span className="text-base flex-shrink-0">ℹ️</span>
                  <p>
                    Your payment details have been forwarded to {CLINIC.DOCTOR_TITLE}'s clinic console. Once the clinic confirms the credit in their bank/UPI accounts, your status will update to <strong>"Confirmed"</strong> and your official digital tax receipt will unlock automatically.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Previously Paid / Settled Invoices List */}
        {paidInvoices.length > 0 && (
          <div className="bg-white rounded-3xl p-5 card-shadow border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
              <h3 className="font-bold text-stone-800 text-xs flex items-center gap-2">
                <span>🧾</span> Official Paid Consultation Receipts ({paidInvoices.length})
              </h3>
              <span className="text-[11px] text-stone-400">Digital Tax-Exempt Healthcare Receipts</span>
            </div>

            <div className="divide-y divide-stone-100">
              {paidInvoices.map((inv) => (
                <div key={inv.id} className="py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded">
                        #{inv.id}
                      </span>
                      <strong className="text-stone-900 font-bold">{formatINR(inv.amountINR)}</strong>
                      <span className="text-stone-500">· {inv.consultationType}</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                        <span>✓</span> Paid
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Visit Date: {inv.visitDate} · Settled on: {inv.paidAt || inv.issuedAt}
                      {inv.transactionRef && <span className="font-mono ml-2">(Ref: {inv.transactionRef})</span>}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setViewingReceiptInvoice(inv)}
                    className="px-3.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>🧾</span> View Receipt
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {patientInvoices.length === 0 && (
          <div className="bg-white rounded-3xl p-5 card-shadow border border-stone-200/80 text-center py-6 text-xs text-stone-500 space-y-1">
            <span>✨</span>
            <p className="font-semibold text-stone-700">All Consultation Accounts Up to Date</p>
            <p className="text-[11px] text-stone-400">
              When your doctor posts a consultation fee after your visit, it will appear here for 1-click settlement.
            </p>
          </div>
        )}
      </div>
        </div>
      )}

            {/* MODAL: PATIENT-CERTIFIED CLASSICAL HOMEOPATHY JSON SLICE */}
      {viewJsonModalVisit && viewJsonModalVisit.homeopathicCaseRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full card-shadow border border-stone-100 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 bg-stone-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <span>⚡</span> Certified Classical Homeopathy Record (JSON)
                </h3>
                <p className="text-xs text-stone-400">
                  Interaction: <code className="text-purple-300 font-mono">{viewJsonModalVisit.homeopathicCaseRecord.metadata.interaction_id}</code>
                </p>
              </div>
              <button
                onClick={() => setViewJsonModalVisit(null)}
                className="text-stone-300 hover:text-white text-base px-2 py-1 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-purple-900 space-y-1">
                <p className="font-bold">🛡️ Doctor Certified & Privacy Filtered Record</p>
                <p className="text-[11px] text-purple-800">
                  This structured JSON reflects your consultation mapped strictly to the Classical Homeopathy schema.
                  Internal miasmatic classifications and physician psychiatric assessments have been sanitized for your privacy.
                </p>
              </div>

              <div className="relative">
                <pre className="bg-stone-950 text-emerald-400 p-4 rounded-2xl text-[11px] font-mono overflow-auto max-h-96 leading-relaxed border border-stone-800 shadow-inner">
                  {JSON.stringify(getPatientVisibleCaseRecord(viewJsonModalVisit.homeopathicCaseRecord), null, 2)}
                </pre>
              </div>
            </div>

            <div className="px-6 py-3 bg-stone-100 border-t border-stone-200 flex justify-between items-center">
              <span className="text-[11px] text-stone-500 font-mono">
                Language: {viewJsonModalVisit.homeopathicCaseRecord.metadata.speech_language.original} → English
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopyPatientJson(getPatientVisibleCaseRecord(viewJsonModalVisit.homeopathicCaseRecord!))}
                  className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs transition-all cursor-pointer shadow-sm"
                >
                  {copiedJson ? "✓ Copied to Clipboard!" : "📋 Copy Patient JSON"}
                </button>
                <button
                  type="button"
                  onClick={() => setViewJsonModalVisit(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-white font-bold text-xs hover:bg-stone-900 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: PAY CONSULTATION FEE ─────────────────────────────────── */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-fadeIn">
          <div
            className="bg-white rounded-3xl max-w-lg w-full card-shadow border border-stone-100 overflow-hidden flex flex-col max-h-[90vh]"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-stone-950 via-stone-900 to-emerald-950 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-lg">💳</span>
                  <h3 className="font-bold text-base">Settle Consultation Fee</h3>
                </div>
                <p className="text-xs text-stone-300 mt-0.5">
                  Invoice #{payingInvoice.id} · {CLINIC.FULL_NAME}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayingInvoice(null)}
                className="text-stone-400 hover:text-white transition-colors cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Bill Summary Banner */}
            <div className="bg-amber-500/10 border-b border-amber-200 px-6 py-3.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900">
                  {payingInvoice.consultationType}
                </span>
                <p className="text-xs text-stone-700 font-semibold mt-0.5">
                  Consultant: {payingInvoice.doctorName} ({payingInvoice.visitDate})
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-500 uppercase tracking-wider block">Total Amount</span>
                <span className="text-xl font-black text-stone-900">{formatINR(payingInvoice.amountINR)}</span>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="px-6 pt-4 pb-2 border-b border-stone-100 flex items-center gap-2 bg-stone-50/50">
              <button
                type="button"
                onClick={() => setPaymentMethodTab("upi")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  paymentMethodTab === "upi"
                    ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-100"
                }`}
              >
                <span>📱</span> UPI / QR Code
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethodTab("card")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  paymentMethodTab === "card"
                    ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-100"
                }`}
              >
                <span>💳</span> Credit / Debit Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethodTab("netbanking")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${
                  paymentMethodTab === "netbanking"
                    ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-100"
                }`}
              >
                <span>🏦</span> Net Banking
              </button>
            </div>

            {/* Interactive Form Body */}
            <form onSubmit={handlePayInvoice} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* ── UPI Tab ─────────────────────────────────────────────────── */}
              {paymentMethodTab === "upi" && (
                <div className="space-y-4">
                  {/* Dynamic QR Code & Doctor UPI ID */}
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                    {/* Simulated QR Code Canvas */}
                    <div className="w-28 h-28 bg-white border border-stone-300 rounded-xl p-2 shadow-xs flex flex-col items-center justify-center flex-shrink-0">
                      <div className="w-full h-full bg-stone-900 p-1 rounded grid grid-cols-4 gap-0.5">
                        <div className="bg-white rounded-xs" />
                        <div className="bg-white rounded-xs" />
                        <div className="bg-amber-400 rounded-xs" />
                        <div className="bg-white rounded-xs" />
                        <div className="bg-white rounded-xs" />
                        <div className="bg-stone-900 rounded-xs" />
                        <div className="bg-white rounded-xs" />
                        <div className="bg-white rounded-xs" />
                        <div className="bg-white rounded-xs" />
                        <div className="bg-white rounded-xs" />
                        <div className="bg-emerald-400 rounded-xs" />
                        <div className="bg-white rounded-xs" />
                        <div className="bg-white rounded-xs" />
                        <div className="bg-stone-900 rounded-xs" />
                        <div className="bg-white rounded-xs" />
                        <div className="bg-white rounded-xs" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest block">
                        Clinic Direct UPI ID
                      </span>
                      <p className="font-mono text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 inline-block">
                        {DOCTOR.UPI_ID}
                      </p>
                      <p className="text-[11px] text-stone-500">
                        Scan with GPay, PhonePe, Paytm, or BHIM to send {formatINR(payingInvoice.amountINR)} directly to {CLINIC.DOCTOR_TITLE}.
                      </p>
                    </div>
                  </div>

                  {/* UPI App Selection */}
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1.5">
                      Select UPI App / Provider:
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: "gpay", label: "Google Pay", icon: "🟢", handle: "@oksbi" },
                        { id: "phonepe", label: "PhonePe", icon: "🟣", handle: "@ybl" },
                        { id: "paytm", label: "Paytm", icon: "🔵", handle: "@paytm" },
                        { id: "custom", label: "Any VPA / BHIM", icon: "⚡", handle: "" },
                      ].map((app) => (
                        <button
                          key={app.id}
                          type="button"
                          onClick={() => {
                            setSelectedUpiApp(app.id as "gpay" | "phonepe" | "paytm" | "custom");
                            if (app.handle && (!customPatientUpi || !customPatientUpi.includes("@"))) {
                              const base = customPatientUpi.replace(/@.*/, "") || "patient";
                              setCustomPatientUpi(`${base}${app.handle}`);
                            }
                          }}
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            selectedUpiApp === app.id
                              ? "bg-amber-500/10 border-amber-500 text-stone-900 font-bold shadow-xs"
                              : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                          }`}
                        >
                          <div className="text-base">{app.icon}</div>
                          <div className="text-[10px] leading-tight truncate">{app.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Patient UPI ID Option (Pre-filled if saved, or allow entering if not present) */}
                  <div className="bg-white p-3.5 rounded-2xl border border-stone-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-stone-600 uppercase tracking-wider">
                        Patient UPI ID / VPA
                      </label>
                      {authUser?.savedUpiId && (
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Saved: {authUser.savedUpiId}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                      value={customPatientUpi}
                      onChange={(e) => setCustomPatientUpi(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold outline-none focus:border-amber-500 focus:bg-white transition-all font-mono"
                    />
                    <p className="text-[10px] text-stone-400">
                      {customPatientUpi ? "UPI collect request will be sent to this ID." : "If you don't have a saved UPI ID, enter your personal VPA or mobile number to receive the payment collect request."}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Card Tab ────────────────────────────────────────────────── */}
              {paymentMethodTab === "card" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      required
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-mono font-bold outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      required
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        required
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-mono outline-none focus:border-amber-500 focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block mb-1">
                        CVV / CVC
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={4}
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-mono outline-none focus:border-amber-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Net Banking Tab (All Indian Banks Supported) ────────────── */}
              {paymentMethodTab === "netbanking" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      Select Any Indian Bank ({INDIAN_BANKS.length} Available)
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold font-mono">
                      Selected: {selectedBank}
                    </span>
                  </div>

                  {/* Bank Search Input */}
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-stone-400">🔍</span>
                    <input
                      type="text"
                      placeholder="Search bank name (e.g. SBI, Canara, Bank of Baroda, Union, Axis...)"
                      value={bankSearchQuery}
                      onChange={(e) => setBankSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold outline-none focus:border-amber-500 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Quick Popular Banks Chips */}
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                      Popular Banks:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {INDIAN_BANKS.filter(b => b.category === "popular").map((bank) => (
                        <button
                          key={bank.id}
                          type="button"
                          onClick={() => setSelectedBank(bank.name)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                            selectedBank === bank.name
                              ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                              : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                          }`}
                        >
                          {bank.shortName}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Full Categorized Dropdown / Select List */}
                  <div>
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block mb-1">
                      All Scheduled Indian Commercial Banks:
                    </label>
                    <select
                      value={selectedBank}
                      onChange={(e) => setSelectedBank(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-stone-200 bg-stone-50 text-xs font-semibold outline-none focus:border-amber-500 focus:bg-white transition-all"
                    >
                      {bankSearchQuery.trim() ? (
                        filteredBanks.length > 0 ? (
                          filteredBanks.map((b) => (
                            <option key={b.id} value={b.name}>
                              {b.name} ({b.code}) — {b.category.replace("_", " ").toUpperCase()}
                            </option>
                          ))
                        ) : (
                          <option value="">No matching banks found</option>
                        )
                      ) : (
                        <>
                          <optgroup label="Popular & Public Sector Banks">
                            {filteredBanks.filter((b) => b.category === "popular" || b.category === "public").map((b) => (
                              <option key={b.id} value={b.name}>
                                {b.name} ({b.code})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Private Sector Banks">
                            {filteredBanks.filter((b) => b.category === "private").map((b) => (
                              <option key={b.id} value={b.name}>
                                {b.name} ({b.code})
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Small Finance & Digital Payments Banks">
                            {filteredBanks.filter((b) => b.category === "small_finance" || b.category === "payments").map((b) => (
                              <option key={b.id} value={b.name}>
                                {b.name} ({b.code})
                              </option>
                            ))}
                          </optgroup>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  disabled={isProcessingPayment}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 text-stone-600 font-bold hover:bg-stone-200 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black shadow-md transition-all active:scale-95 cursor-pointer disabled:opacity-60 flex items-center gap-2"
                >
                  {isProcessingPayment ? (
                    <>
                      <span className="w-4 h-4 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                      <span>Submitting Payment...</span>
                    </>
                  ) : (
                    <>
                      <span>📤 Submit Payment for Verification</span>
                      <span>({formatINR(payingInvoice.amountINR)}) →</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: PAYMENT SUBMITTED (UNDER DOCTOR VERIFICATION) ───────── */}
      {paymentSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full card-shadow border border-stone-100 p-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-sky-100 text-sky-800 text-3xl font-black flex items-center justify-center mx-auto shadow-inner">
              ⏳
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full inline-block mb-1">
                Status: Under Doctor Verification
              </span>
              <h3 className="text-lg font-black text-stone-900">Payment Submitted Successfully</h3>
              <p className="text-xs text-stone-500 mt-1">
                Your payment submission of <strong className="text-stone-900">{formatINR(paymentSuccessData.invoice.amountINR)}</strong> has been recorded and forwarded to the doctor.
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-left space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-stone-600">
                <span>Transaction Ref:</span>
                <span className="font-bold text-stone-900">{paymentSuccessData.txRef}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Payment Mode:</span>
                <span className="font-bold text-stone-900">{paymentSuccessData.method}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Submitted At:</span>
                <span className="font-bold text-stone-900">{paymentSuccessData.submittedAt}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 text-left space-y-1">
              <p className="font-bold">🛡️ Doctor Confirmation Policy:</p>
              <p className="text-[10px] text-amber-800">
                Per clinic audit compliance, payments remain in <strong>"Under Processing / Verification"</strong> until confirmed by {CLINIC.DOCTOR_TITLE}. Once the doctor confirms the credit in the clinic console, your status will update to <strong>"Done"</strong> and your official digital tax receipt will unlock.
              </p>
            </div>

            <div className="flex items-center justify-center pt-2">
              <button
                type="button"
                onClick={() => setPaymentSuccessData(null)}
                className="w-full py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors cursor-pointer shadow-sm"
              >
                Return to Medical Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: OFFICIAL CLINIC PAYMENT RECEIPT ───────────────────────── */}
      {viewingReceiptInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full card-shadow border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-gradient-to-r from-stone-900 to-emerald-950 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase">
                  Official Healthcare Receipt
                </span>
                <h3 className="font-bold text-lg">{CLINIC.FULL_NAME}</h3>
                <p className="text-xs text-stone-300">{CLINIC.TAGLINE}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptInvoice(null)}
                className="text-stone-400 hover:text-white text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Doctor & Patient Info Block */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-stone-200">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Attending Physician</span>
                  <p className="font-bold text-stone-900 text-sm">{viewingReceiptInvoice.doctorName}</p>
                  <p className="text-stone-500">{DOCTOR.TITLE} · {CLINIC.PHONE_DISPLAY}</p>
                  <p className="text-stone-500 text-[11px]">{CLINIC.ADDRESS.STREET}, {CLINIC.ADDRESS.CITY}</p>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Patient Name</span>
                  <p className="font-bold text-stone-900 text-sm">{viewingReceiptInvoice.patientName}</p>
                  <p className="text-stone-500 font-mono">ID: #{viewingReceiptInvoice.patientId}</p>
                  <p className="text-stone-500 text-[11px]">Visit Date: {viewingReceiptInvoice.visitDate}</p>
                </div>
              </div>

              {/* Receipt Metadata */}
              <div className="grid grid-cols-3 gap-2 bg-stone-50 p-3 rounded-2xl border border-stone-200 font-mono text-[11px]">
                <div>
                  <span className="text-stone-400 block text-[9px] uppercase">Receipt No.</span>
                  <strong className="text-stone-900">REC-{viewingReceiptInvoice.id.toUpperCase()}</strong>
                </div>
                <div>
                  <span className="text-stone-400 block text-[9px] uppercase">Payment Mode</span>
                  <strong className="text-stone-900 uppercase">{viewingReceiptInvoice.paymentMethod || "ONLINE UPI"}</strong>
                </div>
                <div>
                  <span className="text-stone-400 block text-[9px] uppercase">Transaction Ref</span>
                  <strong className="text-stone-900 truncate block">{viewingReceiptInvoice.transactionRef || "TX-VERIFIED"}</strong>
                </div>
              </div>

              {/* Itemized Table */}
              <div className="border border-stone-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-100 text-stone-600 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Amount (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    <tr>
                      <td className="p-3">
                        <strong className="text-stone-900 block">{viewingReceiptInvoice.consultationType}</strong>
                        <span className="text-[11px] text-stone-500">{viewingReceiptInvoice.notes || "Case taking evaluation & analysis"}</span>
                      </td>
                      <td className="p-3 text-right font-mono">1</td>
                      <td className="p-3 text-right font-bold text-stone-900">{formatINR(viewingReceiptInvoice.amountINR)}</td>
                    </tr>
                    <tr className="bg-stone-50/50 text-stone-500 text-[11px]">
                      <td className="p-3" colSpan={2}>CGST (0%) & SGST (0%) — Healthcare Services Exemption</td>
                      <td className="p-3 text-right font-mono">₹0.00</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-stone-900 text-white font-bold">
                    <tr>
                      <td className="p-3 text-sm" colSpan={2}>Total Amount Paid</td>
                      <td className="p-3 text-right text-base text-amber-400 font-mono">
                        {formatINR(viewingReceiptInvoice.amountINR)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <p className="text-[10px] text-stone-400 text-center italic">
                This is a computer-generated digital receipt issued under Notification No. 12/2017-Central Tax (Rate). No physical signature required.
              </p>
            </div>

            <div className="p-4 bg-stone-100 border-t border-stone-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <span>🖨️</span> Print / Save Receipt
              </button>
              <button
                type="button"
                onClick={() => setViewingReceiptInvoice(null)}
                className="px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitSummaryPage;
