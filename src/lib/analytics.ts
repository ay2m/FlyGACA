import { track } from '@vercel/analytics';
import type { Metric } from 'web-vitals';
import { isNative } from '@/lib/native/nativeBridge';

/**
 * True only where the Vercel beacon endpoints (`/_vercel/insights/*`,
 * `/_vercel/speed-insights/*`) actually exist: a `*.vercel.app` host, or any
 * host when explicitly opted in via `VITE_VERCEL_ANALYTICS=1` (e.g. a custom
 * domain served by Vercel). On the Cloud Run / Netlify / Cloudflare fronts those endpoints are the
 * SPA fallback — the scripts would 404 with MIME-type console errors and every
 * `track()` call would fire a dead request.
 */
export function isVercelHost(): boolean {
  if (import.meta.env.VITE_VERCEL_ANALYTICS === '1') return true;
  if (typeof window === 'undefined') return false;
  return window.location.hostname.endsWith('.vercel.app');
}

/**
 * True on Firebase Hosting or any other production host. Falls back to generic
 * Google Analytics (gtag) when Vercel endpoints aren't available.
 */
export function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return import.meta.env.PROD && !isNative();
}

/** Whether Vercel analytics specifically should run. */
export function isVercelAnalyticsEnabled(): boolean {
  return isAnalyticsEnabled() && isVercelHost();
}

/** Whether analytics should run at all: web only (the native App Store builds
 *  stay free of web beacons), production only (dev/test never emit). */
export function enabled(): boolean {
  return isAnalyticsEnabled();
}

type GtagFn = (...args: unknown[]) => void;
type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: GtagFn };

/**
 * Route one event to whichever sink this host actually serves: the Vercel
 * beacon on Vercel hosts, gtag (GA4) where `initializeGoogleAnalytics` or
 * Firebase Analytics installed it, else drop it — a `track()` call on a
 * non-Vercel host would only fire a dead request into the SPA fallback.
 */
function sendEvent(name: string, params: Record<string, string | number>): void {
  if (isVercelAnalyticsEnabled()) {
    track(name, params);
    return;
  }
  (window as AnalyticsWindow).gtag?.('event', name, params);
}

/**
 * Report a caught client error to the analytics sink. This is the single hook
 * the top-level ErrorBoundary calls, and the natural insertion point for a
 * dedicated error tracker (e.g. Sentry) later. No-op off the web/prod path.
 */
export function reportError(error: unknown, info?: Record<string, string>): void {
  if (!enabled()) return;
  const message = error instanceof Error ? error.message : String(error);
  sendEvent('client_error', { message: message.slice(0, 200), ...info });
}

export interface WebVitalPayload {
  name: string;
  value: number;
  rating: string;
  id: string;
}

/**
 * Shape a web-vitals `Metric` into a flat analytics payload. CLS is a unitless
 * ratio (kept to 3 dp); the timing metrics (LCP/INP/FCP/TTFB) are milliseconds,
 * rounded to whole numbers. Pure, so the mapping is unit-testable without the
 * browser performance APIs.
 */
export function webVitalPayload(metric: Metric): WebVitalPayload {
  return {
    name: metric.name,
    value:
      metric.name === 'CLS' ? Math.round(metric.value * 1000) / 1000 : Math.round(metric.value),
    rating: metric.rating,
    id: metric.id,
  };
}

/**
 * Field-measure Core Web Vitals and report each to the analytics sink. The
 * `web-vitals` library is **dynamically imported** so its code lands in its own
 * async chunk and never enters the initial JS bundle (the check:bundle budget is
 * untouched). LCP/INP/CLS are the three Google ranks on; FCP/TTFB round out the
 * diagnostic picture. Best-effort telemetry — a failed chunk load never throws
 * into the app. No-op off the web/prod path.
 */
export function reportWebVitals(): void {
  if (!enabled()) return;
  void import('web-vitals')
    .then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      const report = (metric: Metric) => sendEvent('web_vital', { ...webVitalPayload(metric) });
      onCLS(report);
      onINP(report);
      onLCP(report);
      onFCP(report);
      onTTFB(report);
    })
    .catch(() => {
      /* best-effort telemetry — never break the app if the chunk fails to load */
    });
}

/**
 * Initialize Google Analytics (gtag) on the non-Vercel production fronts.
 * Exactly one GA4 pipeline runs per host: Vercel hosts use the Vercel beacon.
 * The command queue (`dataLayer` + `window.gtag`) is installed synchronously
 * so events buffer from t0, but the gtag.js network fetch is deferred past
 * window load so it never competes with the app boot.
 */
export function initializeGoogleAnalytics(): void {
  if (!isAnalyticsEnabled() || isVercelAnalyticsEnabled()) return; // Vercel has its own analytics
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;

  const w = window as AnalyticsWindow;
  w.dataLayer = w.dataLayer || [];
  const gtag: GtagFn = (...args) => {
    w.dataLayer?.push(args);
  };
  w.gtag = gtag;
  gtag('js', new Date());
  gtag('config', measurementId);

  const inject = () => {
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
  };
  if (document.readyState === 'complete') inject();
  else window.addEventListener('load', inject, { once: true });
}
