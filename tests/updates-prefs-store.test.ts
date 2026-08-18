/**
 * Store-layer tests for the change-tracking Updates prefs (src/lib/prefs/updatesPrefs.ts):
 * a useSyncExternalStore store persisted to localStorage. Mirrors the fresh-module
 * hydration pattern of library-prefs-store.test.ts.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { freshModule } from './helpers/freshModule';
import { renderHook, act } from '@testing-library/react';

const SEEN_KEY = 'flygaca:updates-seen';
const WATCH_KEY = 'flygaca:updates-watch';

beforeEach(() => localStorage.clear());

describe('hydration', () => {
  it('reads seen fingerprints and the watchlist from localStorage', async () => {
    localStorage.setItem(SEEN_KEY, JSON.stringify({ 'part-91': 'abc123' }));
    localStorage.setItem(WATCH_KEY, JSON.stringify(['part-91']));
    const mod = await freshModule<typeof import('@/lib/prefs/updatesPrefs')>(
      () => import('@/lib/prefs/updatesPrefs'),
    );
    const { result } = renderHook(() => mod.useUpdatesPrefs());
    expect(result.current.seen).toEqual({ 'part-91': 'abc123' });
    expect(result.current.watch).toEqual(['part-91']);
  });

  it('falls back to empty state on corrupt JSON', async () => {
    localStorage.setItem(SEEN_KEY, '{not json');
    const mod = await freshModule<typeof import('@/lib/prefs/updatesPrefs')>(
      () => import('@/lib/prefs/updatesPrefs'),
    );
    const { result } = renderHook(() => mod.useUpdatesPrefs());
    expect(result.current.seen).toEqual({});
    expect(result.current.watch).toEqual([]);
  });
});

describe('markAllSeen', () => {
  it('records the fingerprint snapshot and persists it', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/updatesPrefs')>(
      () => import('@/lib/prefs/updatesPrefs'),
    );
    const { result } = renderHook(() => mod.useUpdatesPrefs());
    act(() => mod.markAllSeen({ 'part-61': 'deadbeef' }));
    expect(result.current.seen).toEqual({ 'part-61': 'deadbeef' });
    expect(JSON.parse(localStorage.getItem(SEEN_KEY)!)).toEqual({ 'part-61': 'deadbeef' });
  });
});

describe('toggleWatch', () => {
  it('adds then removes a source id, persisting each time', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/updatesPrefs')>(
      () => import('@/lib/prefs/updatesPrefs'),
    );
    const { result } = renderHook(() => mod.useUpdatesPrefs());

    act(() => mod.toggleWatch('part-91'));
    expect(result.current.watch).toEqual(['part-91']);
    expect(JSON.parse(localStorage.getItem(WATCH_KEY)!)).toEqual(['part-91']);

    act(() => mod.toggleWatch('part-91'));
    expect(result.current.watch).toEqual([]);
    expect(JSON.parse(localStorage.getItem(WATCH_KEY)!)).toEqual([]);
  });

  it('keeps distinct ids independent', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/updatesPrefs')>(
      () => import('@/lib/prefs/updatesPrefs'),
    );
    const { result } = renderHook(() => mod.useUpdatesPrefs());
    act(() => mod.toggleWatch('part-91'));
    act(() => mod.toggleWatch('part-61'));
    expect(result.current.watch).toEqual(['part-91', 'part-61']);
    act(() => mod.toggleWatch('part-91'));
    expect(result.current.watch).toEqual(['part-61']);
  });
});

describe('hasBaseline', () => {
  it('is false before any fingerprints are recorded and true after', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/updatesPrefs')>(
      () => import('@/lib/prefs/updatesPrefs'),
    );
    expect(mod.hasBaseline({ seen: {}, watch: [] })).toBe(false);
    expect(mod.hasBaseline({ seen: { 'part-91': 'x' }, watch: [] })).toBe(true);
  });
});
