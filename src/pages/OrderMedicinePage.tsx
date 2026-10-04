import React, { useMemo } from "react";
import { useApp, MEDICINE_CATALOGUE } from "../context/AppContext";
import { CLINIC, REMEDY_CATEGORIES, THEME_GRADIENTS } from "../config";
import { formatINR } from "../utils/format";
import type { Medicine } from "../types";

// ─── Prescribed Medicine Card ─────────────────────────────────────────────────
const PrescribedCard: React.FC<{ medicine: Medicine }> = ({ medicine }) => {
  const { addToCart, state } = useApp();
  const inCart = state.cart.some((c) => c.medicine.id === medicine.id);

  const colors = REMEDY_CATEGORIES[medicine.category] ?? REMEDY_CATEGORIES.combination;

  return (
    <article
      className={`bg-white rounded-2xl border p-4 flex flex-col gap-3 transition-all duration-200 hover:shadow-md ${
        inCart ? "border-emerald-500/50 ring-2 ring-emerald-500/10" : "border-stone-100"
      }`}
      aria-label={`${medicine.name} ${medicine.potency}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-base font-extrabold text-white shadow-sm"
            style={{ background: THEME_GRADIENTS.PRIMARY_SHORT }}
            aria-hidden="true"
          >
            {medicine.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-extrabold text-stone-800 text-sm leading-tight">{medicine.name}</h3>
            <p className="text-stone-500 text-xs mt-0.5">{medicine.potency} · {medicine.formulation}</p>
          </div>
        </div>

        {/* Category badge */}
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${colors.bg} ${colors.text} ${colors.border} flex-shrink-0`}>
          {medicine.category}
        </span>
      </div>

      {/* Doctor note */}
      {medicine.doctorNote && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-800 leading-relaxed flex gap-2">
          <span className="text-base flex-shrink-0" role="img" aria-label="Doctor">🩺</span>
          <p>{medicine.doctorNote}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="font-extrabold text-stone-800">{formatINR(medicine.priceINR)}</span>
        <button
          onClick={() => addToCart(medicine)}
          disabled={inCart}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all active:scale-95 cursor-pointer ${
            inCart
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
              : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm"
          }`}
          aria-label={inCart ? `${medicine.name} already in cart` : `Add ${medicine.name} to cart`}
        >
          {inCart ? "✓ In Cart" : "Add to Cart"}
        </button>
      </div>
    </article>
  );
};

// ─── Order Medicine Page ──────────────────────────────────────────────────────
const OrderMedicinePage: React.FC = () => {
  const { state, navigateTo } = useApp();
  const { authUser } = state;

  // Only show medicines prescribed to this patient
  const prescribedMedicines = useMemo(() => {
    if (!authUser) return [];
    return MEDICINE_CATALOGUE.filter(
      (m) => m.prescribedToPatientIds?.includes(authUser.id)
    );
  }, [authUser]);

  // All medications from their latest visit summary
  const latestVisit = useMemo(() => {
    if (!authUser) return null;
    const medFile = state.visitSummaries[authUser.id];
    return medFile?.visits?.[0] ?? null;
  }, [authUser, state.visitSummaries]);

  // Guest / not logged in
  if (!authUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl">💊</div>
        <div>
          <h1 className="font-extrabold text-xl text-stone-800">Your Prescribed Medicines</h1>
          <p className="text-stone-500 text-sm mt-1 max-w-xs">
            Please sign in to view medicines prescribed by {CLINIC.DOCTOR_NAME}.
          </p>
        </div>
        <button
          onClick={() => navigateTo("home")}
          className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-sm transition-all"
        >
          Sign In to View
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-700 flex items-center justify-center text-xl" aria-hidden="true">💊</div>
        <div>
          <h1 className="font-extrabold text-stone-800 text-xl leading-tight">Your Prescribed Medicines</h1>
          <p className="text-stone-500 text-xs mt-0.5">Prescribed by {CLINIC.DOCTOR_TITLE}</p>
        </div>
      </div>

      {/* Latest visit context banner */}
      {latestVisit && (
        <div
          className="rounded-2xl p-4 text-white text-sm flex flex-col gap-1"
          style={{ background: THEME_GRADIENTS.PRIMARY }}
        >
          <div className="flex items-center gap-2 font-extrabold text-base">
            <span role="img" aria-label="Stethoscope">🩺</span>
            Last Visit: {latestVisit.visitDate}
          </div>
          <p className="text-emerald-100 text-xs">{latestVisit.chiefDiagnosis}</p>
          <p className="text-emerald-200 text-[11px] mt-1">
            Next follow-up: <span className="font-bold text-white">{latestVisit.followUpDate}</span>
            {" · "}
            <button
              onClick={() => navigateTo("visit-summary")}
              className="underline font-bold text-white hover:text-emerald-200"
            >
              View full visit summary →
            </button>
          </p>
        </div>
      )}

      {/* Prescribed medicines grid */}
      {prescribedMedicines.length > 0 ? (
        <>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3">
              {prescribedMedicines.length} Medicine{prescribedMedicines.length > 1 ? "s" : ""} Prescribed for You
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prescribedMedicines.map((m) => (
                <PrescribedCard key={m.id} medicine={m} />
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              onClick={() => navigateTo("cart-page")}
              className="flex items-center justify-center gap-2 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-sm transition-all shadow-sm active:scale-95"
            >
              🛒 Go to Cart
            </button>
            <button
              onClick={() => navigateTo("appointments")}
              className="flex items-center justify-center gap-2 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-extrabold rounded-xl text-sm transition-all active:scale-95"
            >
              📅 Book Follow-up
            </button>
          </div>
        </>
      ) : (
        /* Empty state — no prescriptions yet */
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-3xl">🌿</div>
          <div>
            <p className="font-extrabold text-stone-700">No medicines prescribed yet</p>
            <p className="text-stone-500 text-sm mt-1 max-w-xs">
              Once {CLINIC.DOCTOR_NAME} assigns medicines to your profile after your consultation, they'll appear here.
            </p>
          </div>
          <button
            onClick={() => navigateTo("appointments")}
            className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold rounded-xl text-sm transition-all"
          >
            📅 Book Consultation
          </button>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-stone-400 text-center pb-4">
        These medicines are prescribed specifically for you by {CLINIC.DOCTOR_TITLE}. Do not share with others.
        For queries, contact <a href={`tel:${CLINIC.PHONE_TEL}`} className="underline font-medium">{CLINIC.PHONE_DISPLAY}</a>.
      </p>
    </div>
  );
};

export default OrderMedicinePage;
