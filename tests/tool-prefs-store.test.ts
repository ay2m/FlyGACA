/**
 * Store-layer tests for tool prefs (the pure `addRecent`/`toggleId` helpers are
 * covered in tool-prefs.test.ts). Exercises hydration + persisting mutators.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { freshModule } from './helpers/freshModule';
import { renderHook, act } from '@testing-library/react';

beforeEach(() => localStorage.clear());

describe('hydration', () => {
  it('reads favorites and recents, dropping non-string entries', async () => {
    localStorage.setItem('flygaca:tool-favorites', JSON.stringify(['crosswind', 5]));
    localStorage.setItem('flygaca:tool-recents', JSON.stringify(['e6b']));
    const mod = await freshModule<typeof import('@/lib/prefs/toolPrefs')>(
      () => import('@/lib/prefs/toolPrefs'),
    );
    const { result } = renderHook(() => mod.useToolPrefs());
    expect(result.current.favorites).toEqual(['crosswind']);
    expect(result.current.recents).toEqual(['e6b']);
  });

  it('falls back to empty arrays on corrupt JSON', async () => {
    localStorage.setItem('flygaca:tool-favorites', '%%%');
    const mod = await freshModule<typeof import('@/lib/prefs/toolPrefs')>(
      () => import('@/lib/prefs/toolPrefs'),
    );
    const { result } = renderHook(() => mod.useToolPrefs());
    expect(result.current.favorites).toEqual([]);
  });
});

describe('toggleFavorite', () => {
  it('pins then unpins a tool, persisting each change', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/toolPrefs')>(
      () => import('@/lib/prefs/toolPrefs'),
    );
    const { result } = renderHook(() => mod.useToolPrefs());

    act(() => mod.toggleFavorite('crosswind'));
    expect(result.current.favorites).toEqual(['crosswind']);
    expect(JSON.parse(localStorage.getItem('flygaca:tool-favorites')!)).toEqual(['crosswind']);

    act(() => mod.toggleFavorite('crosswind'));
    expect(result.current.favorites).toEqual([]);
  });
});

describe('pushRecent', () => {
  it('records most-recent-first, de-duplicates, and caps at 6', async () => {
    const mod = await freshModule<typeof import('@/lib/prefs/toolPrefs')>(
      () => import('@/lib/prefs/toolPrefs'),
    );
    const { result } = renderHook(() => mod.useToolPrefs());
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) act(() => mod.pushRecent(id));
    expect(result.current.recents).toHaveLength(6);
    expect(result.current.recents[0]).toBe('g');

    act(() => mod.pushRecent('b'));
    expect(result.current.recents[0]).toBe('b');
    expect(result.current.recents).toHaveLength(6);
  });
});
