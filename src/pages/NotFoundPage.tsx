import React from "react";
import { useApp } from "../context/AppContext";

export const NotFoundPage: React.FC = () => {
  const { navigateTo } = useApp();

  return (
    <div className="max-w-2xl mx-auto py-12 text-center space-y-6" style={{ animation: "fadeInUp 0.4s ease both" }}>
      <div className="w-24 h-24 mx-auto rounded-3xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-5xl font-extrabold card-shadow border border-emerald-200">
        404
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-black text-stone-800">Page Not Found</h1>
        <p className="text-stone-500 text-xs sm:text-sm max-w-md mx-auto">
          The consultation page or remedy resource you are looking for doesn't exist or has been moved.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 card-shadow border border-stone-100 space-y-4 max-w-md mx-auto">
        <p className="text-xs font-bold text-stone-500 uppercase tracking-widest">Suggested Quick Navigation</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <button
            onClick={() => navigateTo("home")}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 text-stone-800 font-bold border border-stone-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🌿</span> Home Catalogue
          </button>
          <button
            onClick={() => navigateTo("appointments")}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 text-stone-800 font-bold border border-stone-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📅</span> Appointments
          </button>
          <button
            onClick={() => navigateTo("visit-summary")}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 text-stone-800 font-bold border border-stone-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>📋</span> Visit Summary
          </button>
          <button
            onClick={() => navigateTo("cart-page")}
            className="p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 text-stone-800 font-bold border border-stone-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>🛒</span> Shopping Cart
          </button>
        </div>
      </div>

      <button
        onClick={() => navigateTo("home")}
        className="px-6 py-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-lg transition-all active:scale-95 cursor-pointer"
      >
        ← Return to Agastya Homoeopathy Homepage
      </button>
    </div>
  );
};

export default NotFoundPage;
