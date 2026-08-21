import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Metric } from 'web-vitals';
import { initializeGoogleAnalytics, webVitalPayload } from '@/lib/analytics';

const metric = (over: Partial<Metric>): Metric =>
  ({
    name: 'LCP',
    value: 0,
    rating: 'good',
    id: 'v1',
    delta: 0,
    entries: [],
    navigationType: 'navigate',
    ...over,
  }) as Metric;

describe('webVitalPayload', () => {
  it('rounds timing metrics (LCP/INP/FCP/TTFB) to whole milliseconds', () => {
    expect(
      webVitalPayload(metric({ name: 'LCP', value: 2345.678, rating: 'needs-improvement', id: 'a' })),
    ).toEqual({ name: 'LCP', value: 2346, rating: 'needs-improvement', id: 'a' });
  });

  it('keeps CLS as a unitless ratio to 3 decimal places', () => {
    expect(webVitalPayload(metric({ name: 'CLS', value: 0.12345, rating: 'good', id: 'b' }))).toEqual({
      name: 'CLS',
      value: 0.123,
      rating: 'good',
      id: 'b',
    });
  });
});

describe('initializeGoogleAnalytics', () => {
  type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };
  const w = window as AnalyticsWindow;

  afterEach(() => {
    vi.unstubAllEnvs();
    delete w.dataLayer;
    delete w.gtag;
    document.querySelectorAll('script[src*="googletagmanager"]').forEach((s) => s.remove());
  });

  it('does nothing outside production', () => {
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST');
    initializeGoogleAnalytics();
    expect(w.gtag).toBeUndefined();
  });

  it('skips gtag entirely when Firebase Analytics is configured — one GA4 pipeline per host', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST');
    vi.stubEnv('VITE_FIREBASE_APP_ID', '1:123:web:abc');
    initializeGoogleAnalytics();
    expect(w.gtag).toBeUndefined();
    expect(document.querySelector('script[src*="googletagmanager"]')).toBeNull();
  });

  it('installs the command queue synchronously and loads gtag.js for the measurement id', () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-TEST');
    initializeGoogleAnalytics();
    // The queue exists immediately, pre-seeded with the js + config commands…
    expect(typeof w.gtag).toBe('function');
    expect(w.dataLayer?.length).toBeGreaterThanOrEqual(2);
    // …and the script tag targets the configured stream (jsdom reports the
    // document complete, so the deferred injection has already run).
    const script = document.querySelector<HTMLScriptElement>('script[src*="googletagmanager"]');
    expect(script?.src).toContain('id=G-TEST');
    expect(script?.async).toBe(true);
  });
});
