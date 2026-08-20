import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportError } from '@/lib/analytics';
import { reportErrorToFirebase } from '@/lib/firebase-monitoring';
import { ErrorFallback } from './ErrorFallback';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary around the routed page. A render throw in any route
 * is caught here so the shared chrome (header/footer) survives instead of the
 * whole app white-screening. Placed inside Layout's pathname-keyed wrapper, so
 * navigating away remounts it and clears the error automatically.
 *
 * `componentDidCatch` forwards the error to the analytics sink — the one hook a
 * dedicated error tracker (e.g. Sentry) would slot into later.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const context = { componentStack: (info.componentStack ?? '').slice(0, 500) };
    reportError(error, context);
    reportErrorToFirebase(error, context);
  }

  render(): ReactNode {
    if (this.state.error) return <ErrorFallback />;
    return this.props.children;
  }
}
