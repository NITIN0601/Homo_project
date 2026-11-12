import React, { useState, useMemo, useEffect } from "react";
import { useApp, MEDICINE_CATALOGUE } from "../context/AppContext";
import { useTenant } from "../context/ThemeProvider";
import type { VisitSummaryRecord, ConsultationInvoice } from "../types";
import { CLINIC } from "../config";
import { formatINR } from "../utils/format";
import { Button, Tabs } from "../components/ui";

import MedicalRecordsTab from "./patient/MedicalRecordsTab";
import PatientInvoicesTab from "./patient/PatientInvoicesTab";
import PatientFeedbackTab from "./patient/PatientFeedbackTab";
import EditPatientProfileModal from "./patient/modals/EditPatientProfileModal";
import ViewCaseRecordJsonModal from "./patient/modals/ViewCaseRecordJsonModal";
import PayConsultationModal from "./patient/modals/PayConsultationModal";
import PaymentSubmittedModal from "./patient/modals/PaymentSubmittedModal";
import ReceiptModal from "./patient/modals/ReceiptModal";

export const VisitSummaryPage: React.FC = () => {
  const { state, addToCart, navigateTo, openAuthModal, updatePatientMedicalFile } = useApp();
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

  // Modals state
  const [viewJsonModalVisit, setViewJsonModalVisit] = useState<VisitSummaryRecord | null>(null);
  const [isEditPatientModalOpen, setIsEditPatientModalOpen] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState<ConsultationInvoice | null>(null);
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    invoice: ConsultationInvoice;
    txRef: string;
    submittedAt: string;
    method: string;
  } | null>(null);
  const [viewingReceiptInvoice, setViewingReceiptInvoice] = useState<ConsultationInvoice | null>(null);

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

  // ── Consultation Invoices & Settlement State ──────────────────────────────
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
        <MedicalRecordsTab
          medicalFile={medicalFile}
          patientId={patientId}
          onEditProfile={() => setIsEditPatientModalOpen(true)}
          onViewJsonModalVisit={(v) => setViewJsonModalVisit(v)}
          onOrderRemedy={handleOrderRemedy}
        />
      )}

      {/* ── TAB 2: BILLING & PAYMENT HISTORY ──────────────────── */}
      {activePortalTab === "payments" && tenant.features.enableBillingHistory !== false && (
        <PatientInvoicesTab
          patientInvoices={patientInvoices}
          pendingInvoices={pendingInvoices}
          processingInvoices={processingInvoices}
          paidInvoices={paidInvoices}
          totalBilledINR={totalBilledINR}
          totalPendingINR={totalPendingINR}
          totalPaidINR={totalPaidINR}
          onPayInvoice={(inv) => setPayingInvoice(inv)}
          onViewReceipt={(inv) => setViewingReceiptInvoice(inv)}
        />
      )}

      {/* ── TAB 3: POST-CONSULTATION FOLLOW-UP & PATIENT FEEDBACK ─────────── */}
      {activePortalTab === "feedback" && tenant.features.enableFollowupFeedback !== false && (
        <PatientFeedbackTab
          medicalFile={medicalFile}
          patientId={patientId}
          onTabSwitch={handleTabSwitch}
          navigateTo={navigateTo}
        />
      )}

      {/* ── MODALS ── */}
      <ViewCaseRecordJsonModal
        visit={viewJsonModalVisit}
        onClose={() => setViewJsonModalVisit(null)}
      />

      <PayConsultationModal
        payingInvoice={payingInvoice}
        onClose={() => setPayingInvoice(null)}
        onPaymentSubmitted={(data) => setPaymentSuccessData(data)}
      />

      <PaymentSubmittedModal
        paymentSuccessData={paymentSuccessData}
        onClose={() => setPaymentSuccessData(null)}
      />

      <ReceiptModal
        invoice={viewingReceiptInvoice}
        onClose={() => setViewingReceiptInvoice(null)}
      />

      <EditPatientProfileModal
        isOpen={isEditPatientModalOpen}
        onClose={() => setIsEditPatientModalOpen(false)}
        patientId={patientId}
        initialName={medicalFile.patientName}
        initialAge={medicalFile.age}
        initialGender={medicalFile.gender}
        initialBloodGroup={medicalFile.bloodGroup}
        initialAllergies={medicalFile.knownAllergies || []}
        initialHistory={medicalFile.medicalHistory || []}
        onSave={(data) => updatePatientMedicalFile(patientId, data)}
      />
    </div>
  );
};

export default VisitSummaryPage;
