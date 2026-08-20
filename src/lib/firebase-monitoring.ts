/**
 * Firebase Crash Reporting for client-side error tracking on production.
 * Integrates with the ErrorBoundary to report uncaught exceptions.
 */
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { isNative } from '@/lib/native/nativeBridge';

let initialized = false;

/** Initialize Firebase for crash reporting (production web only). */
export function initializeFirebaseMonitoring(): void {
  if (initialized || !import.meta.env.PROD || isNative()) return;
  if (typeof window === 'undefined') return;

  const firebaseConfig = {
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'flygaca-prod',
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  // Only initialize if we have minimal config (projectId is enough for Crash Reporting)
  if (!firebaseConfig.projectId) return;

  try {
    const app = initializeApp(firebaseConfig);
    const analytics = getAnalytics(app);

    // Log app start event for analytics
    logEvent(analytics, 'app_start');

    // Wire the global error handler to Firebase
    const originalError = window.onerror;
    window.onerror = (msg: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) => {
      logEvent(analytics, 'exception', {
        description: `${error?.message || msg} at ${source}:${lineno}:${colno}`,
        fatal: false,
      });
      if (typeof originalError === 'function') {
        return originalError.call(window, msg, source, lineno, colno, error);
      }
      return false;
    };

    // Wire unhandled promise rejections
    const originalReject = window.onunhandledrejection;
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      logEvent(analytics, 'exception', {
        description: `Unhandled promise rejection: ${event.reason}`,
        fatal: false,
      });
      if (typeof originalReject === 'function') {
        return originalReject.call(window, event);
      }
      return false;
    };

    initialized = true;
  } catch (err) {
    // Firebase initialization can fail silently; don't break the app
    console.warn('Firebase monitoring initialization failed:', err);
  }
}

/** Report a caught error to Firebase. Called by ErrorBoundary. */
export function reportErrorToFirebase(error: unknown, info?: Record<string, string>): void {
  if (!initialized || !import.meta.env.PROD || isNative()) return;

  try {
    const app = initializeApp({ projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'flygaca-prod' });
    const analytics = getAnalytics(app);
    const message = error instanceof Error ? error.message : String(error);
    logEvent(analytics, 'exception', {
      description: message.slice(0, 200),
      ...info,
      fatal: false,
    });
  } catch {
    // Silently fail; don't break the app
  }
}
