import React from "react";
import { Button } from "../../shared/ui/Button";

interface RouteErrorFallbackProps {
  error?: Error;
  resetErrorBoundary?: () => void;
}

export const RouteErrorFallback: React.FC<RouteErrorFallbackProps> = ({ error, resetErrorBoundary }) => {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center text-xl font-bold mb-4">
        !
      </div>
      <h2 className="text-lg font-bold text-stone-800 mb-2">Unable to load this view</h2>
      <p className="text-xs text-stone-500 max-w-sm mb-6">
        {error?.message || "A temporary issue occurred while rendering this module."}
      </p>
      {resetErrorBoundary && (
        <Button variant="primary" size="sm" onClick={resetErrorBoundary}>
          Try Again
        </Button>
      )}
    </div>
  );
};

export default RouteErrorFallback;
