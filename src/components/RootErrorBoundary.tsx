import { Component, type ErrorInfo, type ReactNode } from "react";

interface RootErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface RootErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

/**
 * Root Error Boundary for Agastya Clinic Web Platform.
 * Catches unhandled JavaScript runtime exceptions across all pages (HomePage,
 * AppointmentsPage, VisitSummaryPage, AdminDashboard, etc.) and presents a reassuring,
 * HIPAA/DPDP-conscious clinical recovery screen instead of a blank white screen crash.
 */
export class RootErrorBoundary extends Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<RootErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // Privacy & clinical safety: sanitize sensitive PHI/patient data from console
    console.error("[Clinical Root Error Boundary Caught Exception]:", {
      name: error.name,
      message: error.message,
      componentStack: errorInfo.componentStack?.slice(0, 300),
    });
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    this.handleReset();
    window.location.href = "/";
  };

  handleCopyDiagnostics = (): void => {
    const { error, errorInfo } = this.state;
    const text = `Diagnostic Details:\nError: ${error?.name}: ${error?.message}\nStack: ${error?.stack}\nComponent Stack: ${errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, copied } = this.state;

      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-stone-200 p-6 sm:p-8 space-y-6">
            {/* Header Badge */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
                <span className="text-xs font-bold tracking-wider uppercase text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                  Clinical Safety Boundary
                </span>
              </div>
              <span className="text-xs text-stone-400 font-mono">Agastya System Recovery</span>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
                An unexpected interface error occurred
              </h1>
              <p className="text-sm text-stone-600 leading-relaxed">
                The application encountered an unhandled exception during rendering.
                Your session and clinical records stored in local storage remain secure.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-3 px-4 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white font-bold rounded-2xl text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>↻</span>
                <span>Reload Application</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 py-3 px-4 bg-stone-100 hover:bg-stone-200 active:scale-[0.98] text-stone-800 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2"
              >
                <span>🏠</span>
                <span>Return to Home</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="py-3 px-4 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-2xl text-sm border border-amber-200 transition-all"
                title="Attempt view re-render"
              >
                Try Again
              </button>
            </div>

            {/* Collapsible Technical Details */}
            <details className="group border border-stone-200 rounded-2xl p-4 bg-stone-50 text-xs transition-all">
              <summary className="font-semibold text-stone-700 cursor-pointer flex items-center justify-between select-none">
                <span>View Technical Diagnostics</span>
                <span className="text-stone-400 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="mt-3 space-y-3 pt-3 border-t border-stone-200">
                <div className="bg-rose-50 border border-rose-100 p-2.5 rounded-xl font-mono text-[11px] text-rose-900 break-all">
                  <strong>{error?.name || "Error"}:</strong> {error?.message || "Unknown runtime failure"}
                </div>
                {errorInfo?.componentStack && (
                  <pre className="p-3 bg-stone-900 text-stone-200 rounded-xl overflow-x-auto text-[10px] leading-relaxed max-h-48">
                    {errorInfo.componentStack}
                  </pre>
                )}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={this.handleCopyDiagnostics}
                    className="px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    {copied ? "✓ Copied to Clipboard" : "Copy Diagnostic Stack"}
                  </button>
                </div>
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RootErrorBoundary;
