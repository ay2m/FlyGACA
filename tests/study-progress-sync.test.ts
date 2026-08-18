/**
 * Upload-only study-progress backup (src/lib/services/studyProgressSync.ts). The local
 * store stays the source of truth; this PUTs a compact projection to
 * `/api/account/study-progress` for the B2B cohort readiness report. Best-effort: a
 * no-op with no uid or when no backend is configured, and it swallows write failures.
 * Pins the no-op paths, the initial-upload payload/path, and the debounced re-write.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resetBackend } from './helpers/mockBackend';

const h = vi.hoisted(() => ({
  configured: true,
  responses: {} as Record<string, unknown>,
  error: null as Error | null,
  calls: [] as Array<{ path: string; method: string; body?: unknown }>,
  events: [] as Array<{ name: string; params?: Record<string, unknown> }>,
  progressCb: null as null | (() => void),
  unsubscribe: vi.fn(),
  summary: { exams: { part91: { pct: 84 } } } as unknown,
}));

vi.mock('@/lib/services/backend', async () => {
  const { makeBackendModule } = await import('./helpers/mockBackend');
  return makeBackendModule(h);
});

vi.mock('@/lib/studyProgress', () => ({
  subscribeStudyProgress: (cb: () => void) => {
    h.progressCb = cb;
    return h.unsubscribe;
  },
  getStudyState: () => ({}),
  toProgressSummary: () => h.summary,
}));

import { startStudyProgressSync } from '@/lib/services/studyProgressSync';

beforeEach(() => {
  resetBackend(h);
  h.progressCb = null;
  h.unsubscribe = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('startStudyProgressSync — no-op paths', () => {
  it('returns a noop and writes nothing when uid is null', async () => {
    const stop = startStudyProgressSync(null);
    await Promise.resolve();
    expect(h.calls).toHaveLength(0);
    expect(h.progressCb).toBeNull();
    expect(() => stop()).not.toThrow();
  });

  it('returns a noop when no backend is configured', async () => {
    h.configured = false;
    startStudyProgressSync('u1');
    await Promise.resolve();
    expect(h.calls).toHaveLength(0);
    expect(h.progressCb).toBeNull();
  });
});

describe('startStudyProgressSync — active sync', () => {
  it('PUTs the summary to /account/study-progress on start', async () => {
    startStudyProgressSync('u1');
    await vi.waitFor(() => expect(h.calls).toHaveLength(1));
    expect(h.calls[0]).toEqual({
      path: '/account/study-progress',
      method: 'PUT',
      body: h.summary,
    });
  });

  it('unsubscribes from the progress store when the returned stop() is called', async () => {
    const stop = startStudyProgressSync('u1');
    await vi.waitFor(() => expect(h.calls).toHaveLength(1));
    stop();
    expect(h.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('swallows a write failure so the study UI is never disrupted', async () => {
    h.error = new Error('offline');
    expect(() => startStudyProgressSync('u1')).not.toThrow();
    await vi.waitFor(() => expect(h.calls).toHaveLength(1));
  });

  it('debounces a progress change into a second upload', async () => {
    vi.useFakeTimers();
    startStudyProgressSync('u1');
    // Initial upload is fire-and-forget; let its microtasks settle.
    await vi.advanceTimersByTimeAsync(0);
    expect(h.calls).toHaveLength(1);

    // A progress change should not write until the debounce window elapses.
    h.progressCb?.();
    await vi.advanceTimersByTimeAsync(4000);
    expect(h.calls).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(h.calls).toHaveLength(2);
  });
});
