import React, { useState, useMemo, useEffect } from "react";
import { useApp, MEDICINE_CATALOGUE } from "../context/AppContext";
import { useTenant } from "../context/ThemeProvider";
import type { VisitSummaryRecord, ConsultationInvoice } from "../types";
import { getPatientVisibleCaseRecord } from "../services/voiceStudio";
import { CLINIC, DOCTOR, INDIAN_BANKS } from "../config";
import { formatINR, formatDateTime } from "../utils/format";
import { Button, Badge, Modal, Tabs, Input, Textarea } from "../components/ui";
import { type CustomerFeedback, INITIAL_CUSTOMER_FEEDBACKS } from "../types/feedback";

export const VisitSummaryPage: React.FC = () => {
  const { state, addToCart, navigateTo, submitConsultationPayment, openAuthModal, updatePatientMedicalFile } = useApp();
  const { authUser, visitSummaries, consultationInvoices } = state;
  const { tenant } = useTenant();

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
        doctorName: tenant.features.displayDoctorDetails !== false ? (tenant.doctor.title || CLINIC.DOCTOR_TITLE) : "Attending Homoeopathic Physician",
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

  // ── Patient Profile Edit States ──────────────────────────────────────────
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [editPatientName, setEditPatientName] = useState(medicalFile.patientName);
  const [editAge, setEditAge] = useState(medicalFile.age);
  const [editGender, setEditGender] = useState(medicalFile.gender);
  const [editBloodGroup, setEditBloodGroup] = useState(medicalFile.bloodGroup);
  const [editAllergiesText, setEditAllergiesText] = useState((medicalFile.knownAllergies || []).join(", "));
  const [editHistoryText, setEditHistoryText] = useState((medicalFile.medicalHistory || []).join(", "));
  const [editProfileSuccess, setEditProfileSuccess] = useState<string | null>(null);

  useEffect(() => {
    setEditPatientName(medicalFile.patientName);
    setEditAge(medicalFile.age);
    setEditGender(medicalFile.gender);
    setEditBloodGroup(medicalFile.bloodGroup);
    setEditAllergiesText((medicalFile.knownAllergies || []).join(", "));
    setEditHistoryText((medicalFile.medicalHistory || []).join(", "));
  }, [medicalFile.patientName, medicalFile.age, medicalFile.gender, medicalFile.bloodGroup, medicalFile.knownAllergies, medicalFile.medicalHistory]);

  const handleSavePatientProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const allergies = editAllergiesText.split(",").map((s) => s.trim()).filter(Boolean);
    const history = editHistoryText.split(",").map((s) => s.trim()).filter(Boolean);
    updatePatientMedicalFile(patientId, {
      patientName: editPatientName.trim() || medicalFile.patientName,
      age: Number(editAge) || medicalFile.age,
      gender: editGender,
      bloodGroup: editBloodGroup,
      knownAllergies: allergies,
      medicalHistory: history,
    });
    setEditProfileSuccess("✓ Profile details updated successfully!");
    setTimeout(() => {
      setEditProfileSuccess(null);
      setIsEditPatientModalOpen(false);
    }, 1500);
  };

  // ── Portal Tab State (Medical Records vs Billing & Payments vs Follow-up & Feedback) ───
  const [activePortalTab, setActivePortalTab] = useState<"records" | "payments" | "feedback">(() => {
    if (typeof window !== "undefined") {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = new URLSearchParams(window.location.search).get("tab");
      if (
        path.includes("feedback") ||
        path.includes("followup") ||
        hash.includes("feedback") ||
        hash.includes("followup") ||
        search === "feedback" ||
        search === "followup"
      ) {
        return "feedback";
      }
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

  const handleTabSwitch = (tab: "records" | "payments" | "feedback") => {
    setActivePortalTab(tab);
    if (typeof window !== "undefined") {
      const newPath =
        tab === "payments"
          ? "/visit-summary?tab=payments"
          : tab === "feedback"
            ? "/visit-summary?tab=feedback"
            : "/visit-summary?tab=records";
      window.history.pushState({ tab }, "", newPath);
      const hospitalName = tenant.name || CLINIC.NAME;
      document.title =
        tab === "payments"
          ? `My Consultation Billing & Payment History — ${hospitalName}`
          : tab === "feedback"
            ? `Post-Consultation Follow-up & Feedback — ${hospitalName}`
            : `My Medical Records & Clinical History — ${hospitalName}`;
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      const search = new URLSearchParams(window.location.search).get("tab");
      if (
        path.includes("feedback") ||
        search === "feedback" ||
        search === "followup"
      ) {
        setActivePortalTab("feedback");
      } else if (
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

  // ── Follow-up & Feedback Form State ─────────────────────────────────────────
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackStatus, setFeedbackStatus] = useState<string>("Significantly Better");
  const [feedbackTopic, setFeedbackTopic] = useState<string>("topic: Consultation & Diagnosis");
  const [feedbackComments, setFeedbackComments] = useState<string>("");
  const [allowGoogleReview, setAllowGoogleReview] = useState<boolean>(true);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [copiedFeedbackNotice, setCopiedFeedbackNotice] = useState<boolean>(false);
  const [lastSubmittedReviewText, setLastSubmittedReviewText] = useState<string>("");

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

  const [payingInvoice, setPayingInvoice] = useState<ConsultationInvoice | null>(null);
  const [paymentMethodTab, setPaymentMethodTab] = useState<"upi" | "card" | "netbanking">("upi");
  const [selectedUpiApp, setSelectedUpiApp] = useState<"gpay" | "phonepe" | "paytm" | "custom">("gpay");
  const [customPatientUpi, setCustomPatientUpi] = useState<string>(authUser?.savedUpiId || "");
  const [bankSearchQuery, setBankSearchQuery] = useState<string>("");
  const [selectedBank, setSelectedBank] = useState<string>("HDFC Bank");
  const [cardNumber, setCardNumber] = useState<string>("4242 •••• •••• 4242");
  const [cardHolder, setCardHolder] = useState<string>(authUser?.name || "John Doe");
  const [cardExpiry, setCardExpiry] = useState<string>("12/28");
  const [cardCvv, setCardCvv] = useState<string>("•••");
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    invoice: ConsultationInvoice;
    txRef: string;
    submittedAt: string;
    method: string;
  } | null>(null);
  const [viewingReceiptInvoice, setViewingReceiptInvoice] = useState<ConsultationInvoice | null>(null);

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

  // ── Available Portal Tabs (Filtered by Admin Customization SSOT) ──────────
  const availablePortalTabs = useMemo(() => {
    const list: { id: "records" | "payments" | "feedback"; label: string; icon: string; badge: React.ReactNode }[] = [];
    if (tenant.features.enablePatientMedicalRecords !== false) {
      list.push({
        id: "records",
        label: "Medical History & Records",
        icon: "🩺",
        badge: (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activePortalTab === "records" ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"}`}>
            {medicalFile.visits.length} {medicalFile.visits.length === 1 ? "Visit" : "Visits"}
          </span>
        ),
      });
    }
    if (tenant.features.enableBillingHistory !== false) {
      list.push({
        id: "payments",
        label: "Billing & Payment History",
        icon: "💳",
        badge: pendingInvoices.length > 0 ? (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 animate-pulse">
            {pendingInvoices.length} Due ({formatINR(totalPendingINR)})
          </span>
        ) : processingInvoices.length > 0 ? (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-sky-400 text-stone-950 animate-pulse">
            {processingInvoices.length} In Review
          </span>
        ) : (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activePortalTab === "payments" ? "bg-white/20 text-white" : "bg-stone-200 text-stone-700"}`}>
            {paidInvoices.length} Paid
          </span>
        ),
      });
    }
    if (tenant.features.enableFollowupFeedback !== false) {
      list.push({
        id: "feedback",
        label: "Follow-up & Feedback",
        icon: "📝",
        badge: (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activePortalTab === "feedback" ? "bg-white/20 text-white" : "bg-purple-100 text-purple-800"}`}>
            {medicalFile.visits[0]?.followUpDate ? `Due ${medicalFile.visits[0].followUpDate}` : "Active"}
          </span>
        ),
      });
    }
    return list;
  }, [tenant.features, activePortalTab, medicalFile.visits, pendingInvoices, processingInvoices, paidInvoices, totalPendingINR]);

  // Synchronize active tab if current tab is disabled by admin customization
  useEffect(() => {
    if (availablePortalTabs.length > 0 && !availablePortalTabs.some((t) => t.id === activePortalTab)) {
      setActivePortalTab(availablePortalTabs[0].id);
    }
  }, [availablePortalTabs, activePortalTab]);

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
          <Button
            variant="primary"
            onClick={openAuthModal}
            className="w-full sm:w-auto px-6 py-2.5"
          >
            🔑 Sign In / Register
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigateTo("home")}
            className="w-full sm:w-auto px-5 py-2.5"
          >
            ← Return to Home
          </Button>
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
            <span className="text-2xl">{activePortalTab === "records" ? "📋" : activePortalTab === "payments" ? "💳" : "📝"}</span>
            <h1 className="text-2xl font-black text-stone-800">
              {activePortalTab === "records"
                ? "My Medical Records & Clinical History"
                : activePortalTab === "payments"
                  ? "My Consultation Billing & Payment History"
                  : "Post-Consultation Follow-up & Feedback"}
            </h1>
          </div>
          <p className="text-stone-500 text-xs mt-1">
            {activePortalTab === "records"
              ? "Complete timeline of classical homeopathy consultations, clinical notes, and prescribed remedies"
              : activePortalTab === "payments"
                ? "Doctor consultation fees, online settlement, verification tracking, and official digital tax receipts"
                : "Share recovery progress, symptom changes, and clinical feedback directly with your doctor"}
          </p>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <span>🔒</span> Verified Patient View · {tenant.features.displayDoctorDetails !== false ? (tenant.doctor.title || CLINIC.DOCTOR_TITLE) : tenant.name}
        </div>
      </div>

      {/* ── Patient Portal Split Tabs Navigation ────────────────────────── */}
      {availablePortalTabs.length === 0 ? (
        <div className="bg-amber-50 border border-amber-300 rounded-3xl p-8 text-center text-amber-950 space-y-2">
          <span className="text-3xl">🔒</span>
          <h3 className="font-extrabold text-base">Summary Modules Restricted</h3>
          <p className="text-xs text-amber-800 max-w-md mx-auto">
            Medical history records, consultation billing, and follow-up submissions are currently restricted by the clinic administrator. Please contact clinic reception directly for assistance.
          </p>
        </div>
      ) : (
        <Tabs
          tabs={availablePortalTabs}
          activeTab={activePortalTab}
          onTabChange={(id) => handleTabSwitch(id as "records" | "payments" | "feedback")}
        />
      )}

      {/* ── TAB 1: MEDICAL RECORDS & CLINICAL HISTORY ──────────────────── */}
      {activePortalTab === "records" && tenant.features.enablePatientMedicalRecords !== false && (
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
                    onClick={() => setIsEditPatientModalOpen(true)}
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
                            onClick={() => setViewJsonModalVisit(visit)}
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
                                onClick={() => handleOrderRemedy(item.medicineId)}
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
      )}

      {/* ── TAB 2: BILLING & PAYMENT HISTORY ──────────────────────────── */}
      {activePortalTab === "payments" && tenant.features.enableBillingHistory !== false && (
        <div className="space-y-6 animate-fadeIn">
          {/* Financial Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 card-shadow border border-stone-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 block">Total Invoiced</span>
              <p className="text-2xl font-black text-stone-900 mt-1">{formatINR(totalBilledINR)}</p>
              <p className="text-[11px] text-stone-500 mt-0.5">{patientInvoices.length} Total Invoices</p>
            </div>

            <div className={`rounded-3xl p-5 card-shadow border transition-all ${pendingInvoices.length > 0
                ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/20"
                : "bg-white border-stone-200/80"
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pending Due</span>
                {pendingInvoices.length > 0 && (
                  <Badge variant="warning" size="micro" pulse>
                    Action Needed
                  </Badge>
                )}
              </div>
              <p className="text-2xl font-black text-amber-900 mt-1">{formatINR(totalPendingINR)}</p>
              <p className="text-[11px] text-amber-700/80 mt-0.5">{pendingInvoices.length} Bills Awaiting Settlement</p>
            </div>

            <div className={`rounded-3xl p-5 card-shadow border transition-all ${processingInvoices.length > 0
                ? "bg-sky-50/80 border-sky-300 ring-2 ring-sky-400/20"
                : "bg-white border-stone-200/80"
              }`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 block">Under Verification</span>
                {processingInvoices.length > 0 && (
                  <Badge variant="info" size="micro" pulse>
                    In Review
                  </Badge>
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
                <Badge variant="warning" size="sm" pulse>
                  {pendingInvoices.length} Payment Due
                </Badge>
              )}
            </div>

            {/* Urgent / Outstanding Consultation Fee Alert Card */}
            {pendingInvoices.length > 0 && (
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
                            <Badge variant="warning" size="micro">
                              Action Required
                            </Badge>
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

                        {tenant.features.enableCustomerPayments ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setPayingInvoice(inv)}
                            className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-black"
                          >
                            <span>💳</span> Settle Fee Online ({formatINR(inv.amountINR)}) →
                          </Button>
                        ) : (
                          <div className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded-xl text-xs font-semibold border border-stone-200">
                            🏥 Settle at reception desk
                          </div>
                        )}
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
            )}

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
                            <Badge variant="info" size="micro" pulse>
                              Status: Processing Verification
                            </Badge>
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
                        Your payment details have been forwarded to {tenant.doctor.title || CLINIC.DOCTOR_TITLE}'s clinic console. Once the clinic confirms the credit in their bank/UPI accounts, your status will update to <strong>"Confirmed"</strong> and your official digital tax receipt will unlock automatically.
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
                          <Badge variant="success" size="micro">
                            ✓ Paid
                          </Badge>
                        </div>
                        <p className="text-[11px] text-stone-500">
                          Visit Date: {inv.visitDate} · Settled on: {inv.paidAt || inv.issuedAt}
                          {inv.transactionRef && <span className="font-mono ml-2">(Ref: {inv.transactionRef})</span>}
                        </p>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setViewingReceiptInvoice(inv)}
                      >
                        <span>🧾</span> View Receipt
                      </Button>
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

      {/* ── TAB 3: POST-CONSULTATION FOLLOW-UP & PATIENT FEEDBACK ─────────── */}
      {activePortalTab === "feedback" && tenant.features.enableFollowupFeedback !== false && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header Card */}
          <div className="bg-gradient-to-br from-purple-950 via-stone-900 to-emerald-950 text-white rounded-3xl p-6 card-shadow space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-purple-800/40 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border-2 border-purple-400/40 flex items-center justify-center font-bold text-2xl text-purple-300">
                  🩺
                </div>
                <div>
                  <h2 className="text-lg font-bold">Post-Consultation Care & Patient Feedback</h2>
                  <p className="text-purple-200/70 text-xs">
                    Your subjective observations guide clinical remedy adjustments and potency titration
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-purple-300/70 uppercase tracking-widest">Attending Physician</span>
                <p className="font-bold text-xs text-white">{tenant.doctor.name || DOCTOR.NAME}</p>
                <p className="text-[11px] text-purple-300 font-medium">{tenant.doctor.title || DOCTOR.TITLE}</p>
              </div>
            </div>

            {/* Next Scheduled Follow-up Banner */}
            <div className="bg-white/10 rounded-2xl p-4 border border-white/15 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-400 text-stone-950 text-[10px] font-black uppercase tracking-wider">
                    Next Follow-up Due
                  </span>
                  <span className="text-white font-mono text-sm font-bold">
                    {medicalFile.visits[0]?.followUpDate || "Within 14–21 Days"}
                  </span>
                </div>
                <p className="text-xs text-purple-200/80">
                  A timely follow-up assessment is vital in classical homoeopathy to evaluate the medicinal action plane.
                </p>
              </div>
              <Button
                variant="purple"
                size="sm"
                onClick={() => navigateTo("appointments")}
              >
                <span>📅</span> Schedule Next Follow-up
              </Button>
            </div>
          </div>

          {/* Feedback & Symptom Progression Form */}
          <div className="bg-white rounded-3xl p-6 card-shadow border border-stone-200 space-y-6">
            <div className="border-b border-stone-100 pb-4">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>💬</span>
                <span>Submit Treatment Response & Doctor Feedback</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Feedback is confidential and securely transmitted directly to {tenant.doctor.name || CLINIC.DOCTOR_NAME} for review prior to your next appointment.
              </p>
            </div>

            {feedbackSubmitted ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 animate-fadeIn">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mx-auto">
                  ✓
                </div>
                <h4 className="text-base font-bold text-emerald-900">Feedback Successfully Submitted!</h4>
                <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
                  Thank you for your update. {tenant.doctor.name || CLINIC.DOCTOR_NAME} has received your treatment feedback and symptom notes. Your clinical file has been annotated accordingly.
                </p>

                {allowGoogleReview && lastSubmittedReviewText && (
                  <div className="bg-white border-2 border-emerald-300 rounded-2xl p-5 text-left max-w-lg mx-auto space-y-3 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-stone-900 flex items-center gap-1.5">
                        <span>🌟</span> Google Review Copied to Clipboard!
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (lastSubmittedReviewText) {
                            navigator.clipboard.writeText(lastSubmittedReviewText);
                            setCopiedFeedbackNotice(true);
                            setTimeout(() => setCopiedFeedbackNotice(false), 2500);
                          }
                        }}
                        className="text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        {copiedFeedbackNotice ? "✓ Copied to Clipboard!" : "📋 Re-Copy Review Text"}
                      </button>
                    </div>

                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-[11px] text-stone-700 font-sans whitespace-pre-wrap">
                      {lastSubmittedReviewText}
                    </div>

                    <p className="text-[11px] text-stone-600 leading-relaxed">
                      Google Maps opened in a new tab. To publish with your Google Account, simply <strong>paste</strong> (<kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 rounded text-[10px] font-mono">Ctrl+V</kbd> / <kbd className="px-1.5 py-0.5 bg-stone-100 border border-stone-300 rounded text-[10px] font-mono">⌘V</kbd>) into Google Reviews and select <strong>Post</strong>.
                    </p>

                    <div className="pt-1">
                      <a
                        href={tenant.contact.googleReviewUrl || "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-bold underline cursor-pointer"
                      >
                        <span>⭐ Re-open Google Maps Review Dialog</span>
                        <span>→</span>
                      </a>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex flex-wrap justify-center gap-3">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setFeedbackSubmitted(false);
                      setFeedbackComments("");
                    }}
                  >
                    Submit Additional Observation
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTabSwitch("records")}
                  >
                    View Prescription Records
                  </Button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsSubmittingFeedback(true);
                  const reviewCategory = feedbackTopic.replace("topic: ", "").trim();
                  const userComments = feedbackComments.trim() || "Consultation and care were thorough, attentive, and highly professional.";
                  const formattedReview = `[${feedbackRating}/5 Stars] ${reviewCategory} · Recovery: ${feedbackStatus}\n\n${userComments}`;
                  setLastSubmittedReviewText(formattedReview);

                  // If user permitted Google Review showcase, copy to clipboard & redirect to Google Review page
                  if (allowGoogleReview) {
                    try {
                      navigator.clipboard.writeText(formattedReview);
                    } catch { }
                    const googleUrl =
                      tenant.contact.googleReviewUrl ||
                      "https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4";
                    window.open(googleUrl, "_blank", "noopener,noreferrer");
                  }

                  const newFeedback: CustomerFeedback = {
                    id: `fb-${Date.now()}`,
                    patientId: patientId || "usr-001",
                    patientName: authUser?.name || medicalFile.patientName || "Valued Patient",
                    patientEmail: authUser?.email || "patient@example.com",
                    rating: feedbackRating,
                    status: "pending",
                    topic: feedbackTopic,
                    comments: userComments,
                    recoveryStatus: feedbackStatus,
                    submittedAt: formatDateTime(),
                    publishedToGoogle: allowGoogleReview,
                    googleReviewSyncUrl: tenant.contact.googleReviewUrl,
                  };
                  try {
                    const existingRaw = localStorage.getItem("agastya_customer_feedbacks");
                    const existingList: CustomerFeedback[] = existingRaw ? JSON.parse(existingRaw) : INITIAL_CUSTOMER_FEEDBACKS;
                    localStorage.setItem("agastya_customer_feedbacks", JSON.stringify([newFeedback, ...existingList]));
                  } catch { }

                  setTimeout(() => {
                    setIsSubmittingFeedback(false);
                    setFeedbackSubmitted(true);
                  }, 600);
                }}
                className="space-y-6 text-xs"
              >
                {/* Consultation Rating */}
                <div className="space-y-2">
                  <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block">
                    Overall Consultation & Care Experience (Star Rating)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(star)}
                        className={`text-2xl transition-transform hover:scale-125 cursor-pointer ${star <= feedbackRating ? "text-amber-400" : "text-stone-300"
                          }`}
                        title={`${star} Star${star > 1 ? "s" : ""}`}
                      >
                        ★
                      </button>
                    ))}
                    <span className="text-xs font-bold text-stone-600 ml-2">
                      {feedbackRating === 5
                        ? "5/5 — Excellent Care"
                        : feedbackRating === 4
                          ? "4/5 — Very Good"
                          : feedbackRating === 3
                            ? "3/5 — Satisfactory"
                            : feedbackRating === 2
                              ? "2/5 — Needs Improvement"
                              : "1/5 — Unsatisfactory"}
                    </span>
                  </div>
                </div>

                {/* Structured Review Topics */}
                <div className="space-y-2">
                  <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block">
                    Feedback Topic Category
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { id: "topic: Consultation & Diagnosis", label: "Consultation & Diagnosis", emoji: "🩺" },
                      { id: "topic: Remedy Effectiveness & Recovery", label: "Remedy & Recovery", emoji: "🌿" },
                      { id: "topic: Clinic Experience & Scheduling", label: "Clinic Experience & Delivery", emoji: "🏥" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setFeedbackTopic(item.id)}
                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${feedbackTopic === item.id
                            ? "bg-emerald-50 border-emerald-600 ring-2 ring-emerald-200 text-emerald-950 font-bold"
                            : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                          }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{item.emoji}</span>
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[10px] text-stone-400 font-mono mt-0.5 block">{item.id}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symptom Progression / Recovery Tracker */}
                <div className="space-y-2">
                  <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block">
                    Symptom Progression Since Remedy Administration
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      { label: "Completely Resolved", icon: "✨", desc: "All symptoms vanished" },
                      { label: "Significantly Better", icon: "📈", desc: "Noticeable relief (>70%)" },
                      { label: "Mild Improvement", icon: "🌱", desc: "Slight relief, ongoing" },
                      { label: "No Noticeable Change", icon: "⚖️", desc: "Symptoms steady" },
                      { label: "Initial Aggravation", icon: "⚡", desc: "Brief homoeopathic flare" },
                      { label: "Symptoms Worsened", icon: "⚠️", desc: "Requires urgent review" },
                    ].map((item) => (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => setFeedbackStatus(item.label)}
                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${feedbackStatus === item.label
                            ? "bg-purple-50 border-purple-500 ring-2 ring-purple-200 text-purple-950 font-bold"
                            : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                          }`}
                      >
                        <div className="flex items-center gap-1.5 text-sm">
                          <span>{item.icon}</span>
                          <span className="font-bold">{item.label}</span>
                        </div>
                        <p className="text-[10px] text-stone-500 mt-1">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Subjective Comments with Topic Placeholder */}
                <div className="space-y-1.5">
                  <Textarea
                    label={`Comments & Observations for ${tenant.doctor.name || CLINIC.DOCTOR_NAME}`}
                    rows={4}
                    value={feedbackComments}
                    onChange={(e) => setFeedbackComments(e.target.value)}
                    placeholder={
                      feedbackTopic === "topic: Consultation & Diagnosis"
                        ? "topic: Consultation & Diagnosis <Please enter your comments on physician attention, question thoroughness, and diagnostic clarity...>"
                        : feedbackTopic === "topic: Remedy Effectiveness & Recovery"
                          ? "topic: Remedy Effectiveness & Recovery <Please enter your comments on homoeopathic remedy response, symptom relief, energy, or sleep...>"
                          : "topic: Clinic Experience & Scheduling <Please enter your comments on punctuality, staff assistance, clinic hygiene, and medicine courier speed...>"
                    }
                    helperText="Include any specific symptom timelines, medication observations, or feedback for doctor review."
                  />
                </div>

                {/* Google Review Permission Toggle */}
                <label className="flex items-center gap-3 bg-stone-50 border border-stone-200 p-3.5 rounded-2xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowGoogleReview}
                    onChange={(e) => setAllowGoogleReview(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-stone-800 flex items-center gap-1.5">
                      <span>🌟</span> Permit doctor to showcase as a Verified Google Review / Clinic Testimonial
                    </span>
                    <span className="text-[10px] text-stone-500 block mt-0.5">
                      Doctor admin verifies feedback before showcasing on Google Maps and public clinic review board.
                    </span>
                  </div>
                </label>

                {/* Immediate WhatsApp Emergency Option */}
                <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-stone-600">
                  <span className="text-[11px]">
                    Need urgent medical guidance before your follow-up date?
                  </span>
                  <a
                    href={`https://wa.me/${(tenant.contact.phone || CLINIC.PHONE_TEL).replace(/[^0-9]/g, "")}?text=Hello%20Doctor,%20this%20is%20regarding%20my%20recent%20consultation`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-700 font-bold text-xs hover:underline flex items-center gap-1"
                  >
                    <span>💬 Chat on WhatsApp</span>
                    <span>→</span>
                  </a>
                </div>

                {/* Submit Action */}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="submit"
                    variant="purple"
                    size="md"
                    isLoading={isSubmittingFeedback}
                  >
                    {allowGoogleReview ? (
                      <span className="flex items-center gap-1.5 font-bold">
                        <span>🌟</span> Submit &amp; Post to Google Review →
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 font-bold">
                        <span>📨</span> Submit Consultation Feedback
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL 1: PATIENT-CERTIFIED CLASSICAL HOMEOPATHY JSON SLICE ── */}
      <Modal
        isOpen={Boolean(viewJsonModalVisit && viewJsonModalVisit.homeopathicCaseRecord)}
        onClose={() => setViewJsonModalVisit(null)}
        title="Certified Classical Homeopathy Record (JSON)"
        subtitle={viewJsonModalVisit?.homeopathicCaseRecord ? `Interaction: ${viewJsonModalVisit.homeopathicCaseRecord.metadata.interaction_id}` : undefined}
        size="lg"
        footer={
          viewJsonModalVisit?.homeopathicCaseRecord ? (
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <span className="text-[11px] text-stone-500 font-mono">
                Language: {viewJsonModalVisit.homeopathicCaseRecord.metadata.speech_language.original} → English
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="purple"
                  size="sm"
                  onClick={() => handleCopyPatientJson(getPatientVisibleCaseRecord(viewJsonModalVisit.homeopathicCaseRecord!))}
                >
                  {copiedJson ? "✓ Copied to Clipboard!" : "📋 Copy Patient JSON"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewJsonModalVisit(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : undefined
        }
      >
        {viewJsonModalVisit && viewJsonModalVisit.homeopathicCaseRecord && (
          <div className="p-6 space-y-4 text-xs">
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
        )}
      </Modal>

      {/* ── MODAL 2: PAY CONSULTATION FEE ─────────────────────────────────── */}
      <Modal
        isOpen={Boolean(payingInvoice)}
        onClose={() => setPayingInvoice(null)}
        title="Settle Consultation Fee"
        subtitle={payingInvoice ? `Invoice #${payingInvoice.id} · ${tenant.name || CLINIC.FULL_NAME}` : undefined}
        size="md"
        footer={
          payingInvoice ? (
            <div className="flex items-center justify-between gap-3 w-full">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setPayingInvoice(null)}
                disabled={isProcessingPayment}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                form="patient-settle-fee-form"
                variant="primary"
                isLoading={isProcessingPayment}
                className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-black"
              >
                <span>📤 Submit Payment for Verification</span>
                <span>({formatINR(payingInvoice.amountINR)}) →</span>
              </Button>
            </div>
          ) : undefined
        }
      >
        {payingInvoice && (
          <div className="flex flex-col">
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
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${paymentMethodTab === "upi"
                    ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-100"
                  }`}
              >
                <span>📱</span> UPI / QR Code
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethodTab("card")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${paymentMethodTab === "card"
                    ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-100"
                  }`}
              >
                <span>💳</span> Credit / Debit Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethodTab("netbanking")}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 ${paymentMethodTab === "netbanking"
                    ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                    : "bg-white border-stone-200 text-stone-600 hover:bg-stone-100"
                  }`}
              >
                <span>🏦</span> Net Banking
              </button>
            </div>

            {/* Interactive Form Body */}
            <form id="patient-settle-fee-form" onSubmit={handlePayInvoice} className="p-6 space-y-4 text-xs overflow-y-auto">
              {/* ── UPI Tab ─────────────────────────────────────────────────── */}
              {paymentMethodTab === "upi" && (
                <div className="space-y-4">
                  <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
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
                        Scan with GPay, PhonePe, Paytm, or BHIM to send {formatINR(payingInvoice.amountINR)} directly to {tenant.doctor.title || CLINIC.DOCTOR_TITLE}.
                      </p>
                    </div>
                  </div>

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
                          className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${selectedUpiApp === app.id
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

                  <Input
                    label="Patient UPI ID / VPA"
                    placeholder="e.g. yourname@oksbi or 9876543210@paytm"
                    value={customPatientUpi}
                    onChange={(e) => setCustomPatientUpi(e.target.value)}
                    helperText={customPatientUpi ? "UPI collect request will be sent to this ID." : "Enter your personal VPA to receive the payment collect request."}
                  />
                </div>
              )}

              {/* ── Card Tab ────────────────────────────────────────────────── */}
              {paymentMethodTab === "card" && (
                <div className="space-y-3">
                  <Input
                    label="Card Number"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                  />
                  <Input
                    label="Cardholder Name"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      label="Expiry Date"
                      required
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                    />
                    <Input
                      label="CVV / CVC"
                      type="password"
                      required
                      maxLength={4}
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* ── Net Banking Tab (All Indian Banks Supported) ────────────── */}
              {paymentMethodTab === "netbanking" && (
                <div className="space-y-3">
                  <Input
                    label={`Select Any Indian Bank (${INDIAN_BANKS.length} Available)`}
                    placeholder="Search bank name (e.g. SBI, Canara, Bank of Baroda, Axis...)"
                    value={bankSearchQuery}
                    onChange={(e) => setBankSearchQuery(e.target.value)}
                    helperText={`Selected: ${selectedBank}`}
                  />

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
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${selectedBank === bank.name
                              ? "bg-stone-900 text-amber-400 border-stone-900 shadow-xs"
                              : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                            }`}
                        >
                          {bank.shortName}
                        </button>
                      ))}
                    </div>
                  </div>

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
            </form>
          </div>
        )}
      </Modal>

      {/* ── MODAL 3: PAYMENT SUBMITTED (UNDER DOCTOR VERIFICATION) ───────── */}
      <Modal
        isOpen={Boolean(paymentSuccessData)}
        onClose={() => setPaymentSuccessData(null)}
        title="Payment Submitted Successfully"
        subtitle="Status: Under Doctor Verification"
        size="sm"
      >
        {paymentSuccessData && (
          <div className="p-6 text-center space-y-4 text-xs">
            <div className="w-16 h-16 rounded-full bg-sky-100 text-sky-800 text-3xl font-black flex items-center justify-center mx-auto shadow-inner">
              ⏳
            </div>

            <div>
              <p className="text-xs text-stone-500 mt-1">
                Your payment submission of <strong className="text-stone-900">{formatINR(paymentSuccessData.invoice.amountINR)}</strong> has been recorded and forwarded to the doctor.
              </p>
            </div>

            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-3 text-left space-y-1.5 font-mono">
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
                Per clinic audit compliance, payments remain in <strong>"Under Processing / Verification"</strong> until confirmed by {tenant.doctor.title || CLINIC.DOCTOR_TITLE}. Once the doctor confirms the credit in the clinic console, your status will update to <strong>"Confirmed"</strong> and your official digital tax receipt will unlock.
              </p>
            </div>

            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={() => setPaymentSuccessData(null)}
            >
              Return to Medical Records
            </Button>
          </div>
        )}
      </Modal>

      {/* ── MODAL 4: OFFICIAL CLINIC PAYMENT RECEIPT ───────────────────────── */}
      <Modal
        isOpen={Boolean(viewingReceiptInvoice)}
        onClose={() => setViewingReceiptInvoice(null)}
        title={tenant.name || CLINIC.FULL_NAME}
        subtitle="Official Healthcare Tax-Exempt Receipt"
        size="lg"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="primary"
              size="sm"
              onClick={() => window.print()}
            >
              <span>🖨️</span> Print / Save Receipt
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setViewingReceiptInvoice(null)}
            >
              Close
            </Button>
          </div>
        }
      >
        {viewingReceiptInvoice && (
          <div className="p-6 space-y-4 text-xs">
            {/* Doctor & Patient Info Block */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-stone-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Attending Physician</span>
                <p className="font-bold text-stone-900 text-sm">{viewingReceiptInvoice.doctorName}</p>
                <p className="text-stone-500">{tenant.doctor.title || DOCTOR.TITLE} · {tenant.contact.phoneDisplay || CLINIC.PHONE_DISPLAY}</p>
                <p className="text-stone-500 text-[11px]">{tenant.contact.address.street || CLINIC.ADDRESS.STREET}, {tenant.contact.address.city || CLINIC.ADDRESS.CITY}</p>
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
        )}
      </Modal>

      {/* ── Edit Patient Profile Modal ── */}
      <Modal
        isOpen={isEditPatientModalOpen}
        onClose={() => setIsEditPatientModalOpen(false)}
        title="Edit Patient Medical Profile"
        subtitle="Update personal details, blood group, allergies, and medical history"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="secondary" type="button" onClick={() => setIsEditPatientModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="edit-patient-profile-form">
              Save Profile Updates
            </Button>
          </div>
        }
      >
        <form id="edit-patient-profile-form" onSubmit={handleSavePatientProfile} className="p-5 sm:p-6 space-y-4 text-xs">
          {editProfileSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-950 font-bold rounded-2xl flex items-center gap-2">
              <span>✓</span> {editProfileSuccess}
            </div>
          )}

          <div className="space-y-3">
            <Input
              label="Full Name *"
              required
              value={editPatientName}
              onChange={(e) => setEditPatientName(e.target.value)}
              placeholder="e.g. Johnathan Doe"
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
                  Age *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  max={120}
                  value={editAge}
                  onChange={(e) => setEditAge(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-white font-medium text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
                  Gender *
                </label>
                <select
                  value={editGender}
                  onChange={(e) => setEditGender(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-white font-medium text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
                  Blood Group *
                </label>
                <select
                  value={editBloodGroup}
                  onChange={(e) => setEditBloodGroup(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-stone-200 bg-white font-medium text-xs outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"].map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
                Known Allergies (comma-separated)
              </label>
              <textarea
                rows={2}
                value={editAllergiesText}
                onChange={(e) => setEditAllergiesText(e.target.value)}
                placeholder="e.g. Dust Mites, Penicillin, Pollen, Peanuts"
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-white font-medium text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">Separate individual allergies with commas.</span>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-stone-500 uppercase tracking-wider block mb-1">
                Previous Medical History (comma-separated)
              </label>
              <textarea
                rows={2}
                value={editHistoryText}
                onChange={(e) => setEditHistoryText(e.target.value)}
                placeholder="e.g. Chronic Dyspepsia, Asthma, Hypertension"
                className="w-full p-2.5 rounded-xl border border-stone-200 bg-white font-medium text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[10px] text-stone-400 mt-0.5 block">Separate medical conditions with commas.</span>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VisitSummaryPage;
