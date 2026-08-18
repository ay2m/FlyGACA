import { describe, expect, it } from 'vitest';
import type { Metric } from 'web-vitals';
import { webVitalPayload } from '@/lib/analytics';

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
