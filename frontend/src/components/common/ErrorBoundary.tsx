import React, { Component, ErrorInfo, ReactNode } from 'react';
import Icon from './Icon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[70vh] bg-surface text-on-surface flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full p-8 sm:p-10 rounded-3xl bg-surface-container-high/70 backdrop-blur-xl border border-surface-container-highest/70 shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/15 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30 shadow-[0_0_24px_rgba(245,158,11,0.2)]">
              <Icon name="warning" className="text-[32px]" />
            </div>

            <div className="space-y-2">
              <h2 className="font-headline-sm text-xl sm:text-2xl font-bold text-on-surface">
                Something Went Wrong
              </h2>
              <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                An unexpected interface error occurred. Your saved event and booking data remain safe in local storage.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-surface-container text-left text-xs font-mono text-outline overflow-x-auto max-h-24">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary text-xs font-bold transition-all shadow-[0_0_15px_rgba(242,202,80,0.25)] flex items-center gap-1.5"
              >
                <Icon name="refresh" className="text-[16px]" />
                <span>Try Again</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-xs font-semibold transition-colors border border-surface-container-highest flex items-center gap-1.5"
              >
                <Icon name="restart_alt" className="text-[16px]" />
                <span>Reload Page</span>
              </button>

              <a
                href="/"
                className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-xs font-semibold transition-colors border border-surface-container-highest flex items-center gap-1.5"
              >
                <Icon name="home" className="text-[16px]" />
                <span>Return Home</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
