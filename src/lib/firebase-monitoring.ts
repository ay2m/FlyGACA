/**
 * Firebase Analytics telemetry (crash reporting + app_start) for production web.
 * The `firebase/*` SDK is **dynamically imported after window load**, so it never
 * enters the initial JS bundle (check:bundle stays untouched), and the whole
 * module is inert unless `VITE_FIREBASE_APP_ID` is provided at build time —
 * `getAnalytics()` cannot work without an appId, so the guard doubles as the
 * off-switch for local/dev/mirror builds.
 */
import { isNative } from '@/lib/native/nativeBridge';

type LogEventFn = (eventName: string, params?: Record<string, unknown>) => void;

let logToAnalytics: LogEventFn | null = null;
let started = false;

/** True only where telemetry can actually run and is configured to. */
function telemetryConfigured(): boolean {
  return (
    import.meta.env.PROD &&
    typeof window !== 'undefined' &&
    !isNative() &&
    Boolean(import.meta.env.VITE_FIREBASE_APP_ID)
  );
}

/** Run `fn` when the browser is idle after load — telemetry never races the app. */
function whenIdle(fn: () => void): void {
  const idle = () =>
    'requestIdleCallback' in window ? window.requestIdleCallback(() => fn()) : setTimeout(fn, 1);
  if (document.readyState === 'complete') idle();
  else window.addEventListener('load', () => idle(), { once: true });
}

async function loadAnalytics(): Promise<void> {
  try {
    const [{ initializeApp }, { getAnalytics, logEvent, isSupported }] = await Promise.all([
      import('firebase/app'),
      import('firebase/analytics'),
    ]);
    // Analytics needs cookies/IndexedDB; bail quietly where the environment
    // can't support it rather than throwing into the app.
    if (!(await isSupported().catch(() => false))) return;

    const app = initializeApp({
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'flygaca-prod',
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    });
    const analytics = getAnalytics(app);
    logToAnalytics = (eventName, params) => logEvent(analytics, eventName, params);
    logToAnalytics('app_start');

    // Wire the global error hooks, preserving any handler already installed.
    const originalError = window.onerror;
    window.onerror = (msg, source, lineno, colno, error) => {
      logToAnalytics?.('exception', {
        description: `${error?.message || String(msg)} at ${source}:${lineno}:${colno}`,
        fatal: false,
      });
      if (typeof originalError === 'function') {
        return originalError.call(window, msg, source, lineno, colno, error);
      }
      return false;
    };
    const originalReject = window.onunhandledrejection;
    window.onunhandledrejection = (event: PromiseRejectionEvent) => {
      logToAnalytics?.('exception', {
        description: `Unhandled promise rejection: ${event.reason}`,
        fatal: false,
      });
      if (typeof originalReject === 'function') {
        return originalReject.call(window, event);
      }
      return false;
    };
  } catch (err) {
    // Best-effort telemetry — a failed chunk load never breaks the app.
    console.warn('Firebase monitoring initialization failed:', err);
  }
}

/** Kick off Firebase telemetry (production web only; no-op without an appId). */
export function initializeFirebaseMonitoring(): void {
  if (started || !telemetryConfigured()) return;
  started = true;
  whenIdle(() => void loadAnalytics());
}

/** Report a caught error. Called by the ErrorBoundary; no-op until analytics is up. */
export function reportErrorToFirebase(error: unknown, info?: Record<string, string>): void {
  if (!logToAnalytics) return;
  try {
    const message = error instanceof Error ? error.message : String(error);
    logToAnalytics('exception', {
      description: message.slice(0, 200),
      ...info,
      fatal: false,
    });
  } catch {
    // Silently fail; don't break the app.
  }
}
