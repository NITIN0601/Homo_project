import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "../ui";

interface DashboardErrorBoundaryProps {
  children: ReactNode;
  dashboardName?: string;
  tabName?: string;
  onReset?: () => void;
}

interface DashboardErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
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
    };
  }

  static getDerivedStateFromError(error: Error): DashboardErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[${this.props.dashboardName || "Dashboard"} Error Boundary Caught]`, {
      tab: this.props.tabName,
      error: error.message,
      componentStack: errorInfo.componentStack?.slice(0, 300),
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const scopeLabel = this.props.tabName
        ? `${this.props.tabName.charAt(0).toUpperCase() + this.props.tabName.slice(1)} Tab`
        : `${this.props.dashboardName || "Dashboard"} View`;

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-white rounded-3xl p-8 card-shadow border border-rose-200 text-center space-y-4 my-6 max-w-xl mx-auto animate-fadeIn"
        >
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
            {this.state.error?.message && (
              <p className="font-mono text-[11px] text-rose-600 bg-rose-50 rounded-lg p-2 max-w-sm mx-auto overflow-hidden text-ellipsis">
                {this.state.error.message}
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={this.handleReset}
              className="bg-rose-700 hover:bg-rose-800 text-white font-bold"
            >
              🔄 Retry {scopeLabel}
            </Button>
            <Button
              variant="outline"
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

