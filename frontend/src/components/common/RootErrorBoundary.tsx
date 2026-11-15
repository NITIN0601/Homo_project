import { Component, type ErrorInfo, type ReactNode } from "react";
import { sendCrashReport } from "../../utils/telemetry";

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
  reporting: boolean;
  reportedIncidentId: string | null;
}

/**
 * Root Error Boundary for EHR Web Platform.
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
      reporting: false,
      reportedIncidentId: null,
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

  handleReportAndReload = async (): Promise<void> => {
    this.setState({ reporting: true });
    const { error, errorInfo } = this.state;
    try {
      const res = await sendCrashReport({
        error,
        componentStack: errorInfo?.componentStack || undefined,
        source: "RootErrorBoundary",
        userAction: "report_and_reload",
      });
      this.setState({ reportedIncidentId: res.incidentId });
    } catch {}

    setTimeout(() => {
      window.location.reload();
    }, 800);
  };

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      reporting: false,
      reportedIncidentId: null,
    });
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
      const isDev = Boolean(import.meta.env.DEV);

      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-stone-200 p-6 sm:p-8 space-y-6">
            {/* Header Badge & Close Button */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-bold tracking-wider uppercase text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  Clinic Portal Recovery
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-400 font-medium">Session Preserved</span>
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors p-1.5 rounded-xl cursor-pointer"
                  title="Close and return to Homepage without sending report"
                  aria-label="Close"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                    fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {/* User-Friendly Message */}
            <div className="space-y-2">
              <h1 className="text-2xl font-extrabold text-stone-900 tracking-tight">
                We're having trouble loading this section
              </h1>
              <p className="text-sm text-stone-600 leading-relaxed">
                A temporary display glitch occurred while rendering. Your clinical records, cart,
                and session details remain completely safe and preserved.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReportAndReload}
                disabled={this.state.reporting}
                className="flex-1 py-3 px-4 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white font-bold rounded-2xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-80"
              >
                <span>🛡️</span>
                <span>
                  {this.state.reportedIncidentId
                    ? `✓ Reported (#${this.state.reportedIncidentId.slice(-6)}) • Reloading...`
                    : this.state.reporting
                    ? "Sending Diagnostic Report..."
                    : "Report Issue & Reload"}
                </span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 active:scale-[0.98] text-stone-800 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>↻</span>
                <span>Just Reload</span>
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="py-3 px-4 bg-stone-100 hover:bg-stone-200 active:scale-[0.98] text-stone-800 font-bold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>🏠</span>
                <span>Homepage</span>
              </button>
            </div>

            {/* Developer-Only Collapsible Diagnostics (Hidden from real users/patients) */}
            {isDev && (
              <details className="group border border-stone-200 rounded-2xl p-4 bg-stone-50 text-xs transition-all">
                <summary className="font-semibold text-stone-600 cursor-pointer flex items-center justify-between select-none">
                  <span>Developer Diagnostics (Local Dev Mode Only)</span>
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
                      className="px-3 py-1.5 bg-white border border-stone-200 hover:bg-stone-100 text-stone-700 rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                    >
                      {copied ? "✓ Copied to Clipboard" : "Copy Diagnostic Stack"}
                    </button>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default RootErrorBoundary;
