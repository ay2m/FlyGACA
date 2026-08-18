/**
 * Store-layer tests for guide prefs (the pure `addId`/`toggleId` helpers are
 * covered in guide-prefs.test.ts). Exercises hydration + the persisting mutators.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { freshModule } from './helpers/freshModule';
import { renderHook, act } from '@testing-library/react';

beforeEach(() => localStorage.clear());

describe('hydration', () => {
  it('reads bookmarks and read-list, ignoring non-string entries', async () => {
    localStorage.setItem('flygaca:guide-bookmarks', JSON.stringify(['g1', 2, 'g2']));
    localStorage.setItem('flygaca:guide-read', JSON.stringify(['g9']));
    const mod = await freshModule<typeof import('@/lib/prefs/guidePrefs')>(
      () => import('@/lib/prefs/guidePrefs'),
    );
    const { result } = renderHook(() => mod.useGuidePrefs());
    expect(result.current.bookmarks).toEqual(['g1', 'g2']);
    expect(result.current.read).toEqual(['g9']);
  });

  it('falls back to empty arrays on corrupt JSON', async () => {
    localStorage.setItem('flygaca:guide-read', 'nope{');
    const mod = await freshModule<typeof import('@/lib/prefs/guidePrefs')>(
      () => import('@/lib/prefs/guidePrefs'),
    );
    const { result } = renderHook(() => mod.useGuidePrefs());
    expect(result.current.read).toEqual([]);
  });
});

describe('toggleBookmark / toggleRead', () => {
  it('toggles and persists each list independently', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/guidePrefs')>(
      () => import('@/lib/prefs/guidePrefs'),
    );
    const { result } = renderHook(() => mod.useGuidePrefs());

    act(() => mod.toggleBookmark('g1'));
    expect(result.current.bookmarks).toEqual(['g1']);
    expect(JSON.parse(localStorage.getItem('flygaca:guide-bookmarks')!)).toEqual(['g1']);

    act(() => mod.toggleRead('g1'));
    expect(result.current.read).toEqual(['g1']);

    act(() => mod.toggleBookmark('g1'));
    expect(result.current.bookmarks).toEqual([]);
  });
});

describe('markRead', () => {
  it('is idempotent — a second mark does not duplicate or re-persist', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/guidePrefs')>(
      () => import('@/lib/prefs/guidePrefs'),
    );
    const { result } = renderHook(() => mod.useGuidePrefs());

    act(() => mod.markRead('g1'));
    expect(result.current.read).toEqual(['g1']);
    const ref = result.current.read;

    act(() => mod.markRead('g1'));
    expect(result.current.read).toBe(ref); // unchanged reference — no-op
  });
});
