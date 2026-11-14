import React from "react";
import type { PrescribedRemedy } from "../../types";
import { Button } from "../ui/Button";

export interface PrescribedRemediesListProps {
  remedies: PrescribedRemedy[];
  canAddToCart?: boolean;
  onAddToCart?: (medicineId: string) => void;
  className?: string;
  variant?: "light" | "sage";
}

export const PrescribedRemediesList: React.FC<PrescribedRemediesListProps> = ({
  remedies,
  canAddToCart = false,
  onAddToCart,
  className = "",
  variant = "light",
}) => {
  if (!remedies || remedies.length === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <span className="font-bold text-stone-500 uppercase tracking-wider text-[10px] block">
        Prescribed Remedies &amp; Regimen:
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {remedies.map((item, i) => (
          <div
            key={i}
            className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs ${
              variant === "sage"
                ? "bg-sage-50/50 border-sage-200/80"
                : "bg-white border-stone-200 shadow-2xs"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-stone-900 leading-snug">
                {item.medicineName ? (
                  <span>
                    {item.medicineName}{" "}
                    <span className="text-emerald-700 font-mono text-[11px] font-bold">
                      {item.potency}
                    </span>
                  </span>
                ) : (
                  <span>
                    Formulation #{i + 1}{" "}
                    <span className="text-stone-500 font-normal text-[11px]">
                      (Classical Totality)
                    </span>
                  </span>
                )}
              </p>
              <p className="text-[11px] text-stone-600 mt-1">
                <strong className="text-stone-700">Dosage:</strong> {item.dosage} ({item.duration})
              </p>
            </div>

            {canAddToCart && onAddToCart && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAddToCart(item.medicineId)}
                className="text-[11px] py-1 px-2.5 shrink-0"
              >
                + Add to Cart
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

