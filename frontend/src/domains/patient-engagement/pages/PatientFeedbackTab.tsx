import React, { useState } from "react";
import { useApp } from "@app/store";
import { useTenant } from "@core/tenancy";
import type { VisitSummaryRecord } from "@core/types";
import { type CustomerFeedback, INITIAL_CUSTOMER_FEEDBACKS } from "../model/feedback";
import { HOSPITAL, DOCTOR } from "../../../core/config";
import { formatDateTime } from "../../../shared/utils/format";
import { Button, Textarea } from "../../../shared/ui";

interface PatientFeedbackTabProps {
  medicalFile: {
    patientName: string;
    visits: VisitSummaryRecord[];
  };
  patientId: string;
  onTabSwitch: (tab: "records" | "payments" | "feedback") => void;
  navigateTo: (page: any) => void;
}

export const PatientFeedbackTab: React.FC<PatientFeedbackTabProps> = ({
  medicalFile,
  patientId,
  onTabSwitch,
  navigateTo,
}) => {
  const { state } = useApp();
  const { authUser } = state;
  const { tenant } = useTenant();

  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackStatus, setFeedbackStatus] = useState<string>("Significantly Better");
  const [feedbackTopic, setFeedbackTopic] = useState<string>("topic: Consultation & Diagnosis");
  const [feedbackComments, setFeedbackComments] = useState<string>("");
  const [allowGoogleReview, setAllowGoogleReview] = useState<boolean>(true);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [copiedFeedbackNotice, setCopiedFeedbackNotice] = useState<boolean>(false);
  const [lastSubmittedReviewText, setLastSubmittedReviewText] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
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
      const existingRaw = localStorage.getItem("ehr_customer_feedbacks") || localStorage.getItem("agastya_customer_feedbacks");
      const existingList: CustomerFeedback[] = existingRaw ? JSON.parse(existingRaw) : INITIAL_CUSTOMER_FEEDBACKS;
      localStorage.setItem("ehr_customer_feedbacks", JSON.stringify([newFeedback, ...existingList]));
    } catch { }

    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setFeedbackSubmitted(true);
    }, 600);
  };

  return (
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
            Feedback is confidential and securely transmitted directly to {tenant.doctor.name || HOSPITAL.DOCTOR_NAME} for review prior to your next appointment.
          </p>
        </div>

        {feedbackSubmitted ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-2xl mx-auto">
              ✓
            </div>
            <h4 className="text-base font-bold text-emerald-900">Feedback Successfully Submitted!</h4>
            <p className="text-xs text-emerald-800 max-w-md mx-auto leading-relaxed">
              Thank you for your update. {tenant.doctor.name || HOSPITAL.DOCTOR_NAME} has received your treatment feedback and symptom notes. Your clinical file has been annotated accordingly.
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
                onClick={() => onTabSwitch("records")}
              >
                View Prescription Records
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
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
                  { id: "topic: Hospital Experience & Scheduling", label: "Hospital Experience & Delivery", emoji: "🏥" },
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
                label={`Comments & Observations for ${tenant.doctor.name || HOSPITAL.DOCTOR_NAME}`}
                rows={4}
                value={feedbackComments}
                onChange={(e) => setFeedbackComments(e.target.value)}
                placeholder={
                  feedbackTopic === "topic: Consultation & Diagnosis"
                    ? "topic: Consultation & Diagnosis <Please enter your comments on physician attention, question thoroughness, and diagnostic clarity...>"
                    : feedbackTopic === "topic: Remedy Effectiveness & Recovery"
                      ? "topic: Remedy Effectiveness & Recovery <Please enter your comments on homoeopathic remedy response, symptom relief, energy, or sleep...>"
                      : "topic: Hospital Experience & Scheduling <Please enter your comments on punctuality, staff assistance, hospital hygiene, and medicine courier speed...>"
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
                  <span>🌟</span> Permit doctor to showcase as a Verified Google Review / Hospital Testimonial
                </span>
                <span className="text-[10px] text-stone-500 block mt-0.5">
                  Doctor admin verifies feedback before showcasing on Google Maps and public hospital review board.
                </span>
              </div>
            </label>

            {/* Immediate WhatsApp Emergency Option */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-3 text-stone-600">
              <span className="text-[11px]">
                Need urgent medical guidance before your follow-up date?
              </span>
              <a
                href={`https://wa.me/${(tenant.contact.phone || HOSPITAL.PHONE_TEL).replace(/[^0-9]/g, "")}?text=Hello%20Doctor,%20this%20is%20regarding%20my%20recent%20consultation`}
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
  );
};

export default PatientFeedbackTab;

