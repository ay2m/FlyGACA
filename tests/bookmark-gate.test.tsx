/**
 * useBookmarkGate encodes a one-directional billing rule: adding a bookmark is a
 * Pro perk, but removing one is always allowed (so a lapsed user can still clean
 * up). A free user who tries to ADD is routed to /pricing instead of mutating
 * state. This is exactly the kind of gate that breaks silently on a refactor.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { LibBookmark } from '@/lib/prefs/libraryPrefs';

const h = vi.hoisted(() => ({
  canBookmark: false,
  navigate: vi.fn(),
  toggleBookmark: vi.fn(),
}));

vi.mock('react-router', () => ({ useNavigate: () => h.navigate }));
vi.mock('@/lib/services/features', () => ({ useFeature: () => h.canBookmark }));
vi.mock('@/lib/prefs/libraryPrefs', () => ({ toggleBookmark: h.toggleBookmark }));

import { useBookmarkGate } from '@/hooks/useBookmarkGate';

const bookmark = {
  kind: 'regulations',
  slug: 'part-91',
  title: 'Part 91',
} as unknown as LibBookmark;

beforeEach(() => {
  h.canBookmark = false;
  h.navigate.mockClear();
  h.toggleBookmark.mockClear();
});

describe('useBookmarkGate', () => {
  it('exposes canBookmark from the bookmarks feature flag', () => {
    h.canBookmark = true;
    const { result } = renderHook(() => useBookmarkGate());
    expect(result.current.canBookmark).toBe(true);
  });

  it('routes a free user to /pricing when they try to ADD a bookmark', () => {
    const { result } = renderHook(() => useBookmarkGate());
    result.current.toggle(bookmark, /* marked */ false);
    expect(h.navigate).toHaveBeenCalledWith('/pricing');
    expect(h.toggleBookmark).not.toHaveBeenCalled();
  });

  it('always allows a free user to REMOVE an existing bookmark', () => {
    const { result } = renderHook(() => useBookmarkGate());
    result.current.toggle(bookmark, /* marked */ true);
    expect(h.toggleBookmark).toHaveBeenCalledWith(bookmark);
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('lets a Pro user add a bookmark without routing to /pricing', () => {
    h.canBookmark = true;
    const { result } = renderHook(() => useBookmarkGate());
    result.current.toggle(bookmark, /* marked */ false);
    expect(h.toggleBookmark).toHaveBeenCalledWith(bookmark);
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('lets a Pro user remove a bookmark', () => {
    h.canBookmark = true;
    const { result } = renderHook(() => useBookmarkGate());
    result.current.toggle(bookmark, /* marked */ true);
    expect(h.toggleBookmark).toHaveBeenCalledWith(bookmark);
    expect(h.navigate).not.toHaveBeenCalled();
  });
});
