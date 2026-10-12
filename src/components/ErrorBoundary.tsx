import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore storage clear errors
    }
    window.location.reload();
  };

  private handleDismiss = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6 bg-neutral-50 dark:bg-neutral-950 font-sans text-neutral-900 dark:text-neutral-100">
          <div className="max-w-md w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5 animate-in fade-in duration-200">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight">PrintDesk Encountered an Issue</h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed">
                An unexpected interface issue occurred. Your print queue and files are safe.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-neutral-100 dark:bg-neutral-800/60 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700/60 text-xs font-mono text-neutral-600 dark:text-neutral-300 max-h-28 overflow-y-auto break-all">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reload App
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-semibold text-xs py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 active:scale-95 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Cache
              </button>
            </div>

            <div>
              <button
                onClick={this.handleDismiss}
                className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 underline transition-colors cursor-pointer"
              >
                Attempt to resume session
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
