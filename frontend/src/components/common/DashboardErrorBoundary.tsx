import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../ui";
import { sendCrashReport } from "../../utils/telemetry";

interface DashboardErrorBoundaryProps {
  children: ReactNode;
  dashboardName?: string;
  tabName?: string;
  featureName?: string;
  onReset?: () => void;
}

interface DashboardErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  reporting: boolean;
  reportedIncidentId: string | null;
  dismissed: boolean;
}

export class DashboardErrorBoundary extends Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  constructor(props: DashboardErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      reporting: false,
      reportedIncidentId: null,
      dismissed: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<DashboardErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error(`[${this.props.dashboardName || "Dashboard"} Error Boundary Caught]`, {
      tab: this.props.tabName,
      error: error.message,
      componentStack: errorInfo.componentStack?.slice(0, 300),
    });
  }

  handleReportAndRetry = async (): Promise<void> => {
    this.setState({ reporting: true });
    const { error, errorInfo } = this.state;
    try {
      const res = await sendCrashReport({
        error,
        componentStack: errorInfo?.componentStack || undefined,
        source: `${this.props.dashboardName || "Dashboard"}${this.props.tabName ? `:${this.props.tabName}` : ""}`,
        userAction: "report_and_retry",
      });
      this.setState({ reportedIncidentId: res.incidentId });
    } catch {
      // Best-effort delivery
    }

    setTimeout(() => {
      this.handleReset();
    }, 600);
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      reporting: false,
      reportedIncidentId: null,
      dismissed: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const scopeLabel = this.props.tabName
        ? `${this.props.tabName.charAt(0).toUpperCase() + this.props.tabName.slice(1)} Tab`
        : `${this.props.dashboardName || "Dashboard"} View`;

      if (this.state.dismissed) {
        return (
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 my-4 flex items-center justify-between text-xs text-stone-600 max-w-xl mx-auto shadow-2xs">
            <span>Notice closed for {scopeLabel}.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => this.setState({ dismissed: false, hasError: false, error: null })}
            >
              Reopen
            </Button>
          </div>
        );
      }

      const isDev = Boolean(import.meta.env.DEV);

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="relative bg-white rounded-3xl p-8 card-shadow border border-rose-200 text-center space-y-4 my-6 max-w-xl mx-auto animate-fadeIn"
        >
          {/* Top-Right Dismiss / Close Button (No report sent) */}
          <button
            type="button"
            onClick={() => this.setState({ dismissed: true })}
            className="absolute top-4 right-4 text-stone-400 hover:text-stone-700 hover:bg-stone-100 p-1.5 rounded-xl cursor-pointer transition-colors"
            title="Close without reporting"
            aria-label="Close section alert"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <div className="w-14 h-14 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-inner">
            ⚠️
          </div>

          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-stone-900">
              Unable to load {scopeLabel}
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              An unexpected display issue occurred in this section. Your patient records, clinical data, and other platform tabs remain safe and active.
            </p>
            {isDev && this.state.error?.message && (
              <details className="text-left bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800">
                <summary className="font-semibold cursor-pointer text-[11px] uppercase tracking-wider text-rose-600">
                  Developer Diagnostics (Dev Only)
                </summary>
                <p className="font-mono text-[11px] mt-2 whitespace-pre-wrap break-all">
                  {this.state.error.name}: {this.state.error.message}
                </p>
              </details>
            )}
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={this.handleReportAndRetry}
              disabled={this.state.reporting}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
            >
              {this.state.reportedIncidentId
                ? `✓ Reported (#${this.state.reportedIncidentId.slice(0, 10)}) • Retrying...`
                : this.state.reporting
                ? "Sending Zero-PHI Report..."
                : "🛡️ Report Issue & Retry"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={this.handleReset}
            >
              🔄 Retry {scopeLabel}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => this.setState({ dismissed: true })}
              className="text-stone-500 hover:text-stone-800"
            >
              Just Close
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

