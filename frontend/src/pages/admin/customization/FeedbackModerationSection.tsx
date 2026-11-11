import React from "react";
import type { CustomerFeedback } from "../../../types/feedback";
import { Button, Card, Badge } from "../../../components/ui";

interface FeedbackModerationSectionProps {
  feedbackList: CustomerFeedback[];
  onApproveFeedback: (id: string) => void;
  onHideFeedback: (id: string) => void;
  onDeleteFeedback: (id: string) => void;
  onSyncToGoogle: (feedback: CustomerFeedback) => void;
  onResetTenant: () => void;
}

export const FeedbackModerationSection: React.FC<FeedbackModerationSectionProps> = ({
  feedbackList,
  onApproveFeedback,
  onHideFeedback,
  onDeleteFeedback,
  onSyncToGoogle,
  onResetTenant,
}) => {
  return (
    <>
      <Card variant="default" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <h3 className="text-stone-900 font-extrabold text-base flex items-center gap-2">
              <span>⭐</span> Customer Feedback &amp; Google Reviews Showcase
            </h3>
            <p className="text-stone-500 text-xs mt-0.5">
              Review submitted patient testimonials, approve for public display, or sync directly to Google Maps reviews.
            </p>
          </div>
          <Badge variant="purple" size="sm">
            {feedbackList.length} Total Feedback Records
          </Badge>
        </div>

        {feedbackList.length === 0 ? (
          <p className="text-stone-400 text-xs py-4 text-center italic">No customer feedback submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {feedbackList.map((fb) => (
              <div
                key={fb.id}
                className="p-4 rounded-2xl border border-stone-200 bg-stone-50/70 space-y-2.5 transition-all hover:bg-white hover:shadow-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <strong className="text-stone-900 text-xs">{fb.patientName}</strong>
                    <span className="text-[10px] text-stone-400 font-mono">({fb.submittedAt})</span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        fb.status === "approved"
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : fb.status === "hidden"
                          ? "bg-stone-200 text-stone-600"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}
                    >
                      {fb.status}
                    </span>
                    {fb.publishedToGoogle && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300">
                        ✓ Synced to Google
                      </span>
                    )}
                  </div>

                  {/* Star Rating */}
                  <div className="flex items-center gap-1 text-amber-400 text-sm">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < fb.rating ? "text-amber-400" : "text-stone-300"}>
                        ★
                      </span>
                    ))}
                    <span className="text-[11px] font-bold text-stone-700 ml-1">({fb.rating}/5)</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-stone-200/80 space-y-1 text-xs">
                  <span className="text-[10px] font-bold font-mono text-purple-700 block">
                    {fb.topic}
                  </span>
                  <p className="text-stone-800 leading-relaxed font-medium">{fb.comments}</p>
                  {fb.recoveryStatus && (
                    <span className="text-[10px] text-stone-500 font-medium block pt-1">
                      Recovery Status: <strong>{fb.recoveryStatus}</strong>
                    </span>
                  )}
                </div>

                {/* Doctor Moderation Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-200/60">
                  <span className="text-[10px] text-stone-400">
                    ID: {fb.id} · Verified Clinical Patient
                  </span>

                  <div className="flex items-center gap-2">
                    {fb.status !== "approved" && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onApproveFeedback(fb.id)}
                        className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300"
                      >
                        ✓ Approve &amp; Feature
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() => onSyncToGoogle(fb)}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      title="Copy text & launch Google Maps review window"
                    >
                      🌐 Sync / Post to Google Review
                    </Button>

                    {fb.status !== "hidden" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onHideFeedback(fb.id)}
                        className="text-stone-500 hover:text-stone-700 text-xs"
                      >
                        Hide
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onApproveFeedback(fb.id)}
                        className="text-stone-500 hover:text-stone-700 text-xs"
                      >
                        Unhide
                      </Button>
                    )}

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteFeedback(fb.id)}
                      className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 text-xs"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── FACTORY RESET & UTILITIES ── */}
      <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 text-xs bg-stone-50/70 p-4 rounded-2xl border border-stone-200/80">
        <div>
          <p className="font-extrabold text-stone-800 text-xs">Clinic Defaults &amp; Factory Reset</p>
          <p className="text-[11px] text-stone-500">
            Settings are saved directly per group using each card's dedicated Save &amp; Apply button.
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResetTenant}
          className="text-stone-600 hover:text-rose-700 hover:bg-rose-50 font-bold border border-stone-300"
        >
          <span>↺</span> Reset Tenant to Factory Defaults
        </Button>
      </div>
    </>
  );
};

export default FeedbackModerationSection;

