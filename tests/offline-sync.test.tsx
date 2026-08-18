/**
 * useOfflineBookmarkSync warms the parent documents of the user's Library
 * bookmarks into the offline cache. It is online-gated, skips when offline
 * caching is unsupported or there are no bookmarks, and dedupes / skips slugs
 * already saved — so a pilot who bookmarked a section keeps it after losing
 * signal, without re-caching what's already there.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

const h = vi.hoisted(() => ({
  online: true,
  supported: true,
  saved: [] as string[],
  bookmarks: [] as { kind: string; slug: string }[],
  saveDocs: vi.fn((_: unknown) => Promise.resolve()),
}));

vi.mock('@/lib/native/pwa', () => ({ useOnline: () => h.online }));
vi.mock('@/lib/prefs/libraryPrefs', () => ({
  useLibraryPrefs: () => ({ bookmarks: h.bookmarks }),
}));
vi.mock('@/lib/native/offlineCache', () => ({
  offlineSupported: () => h.supported,
  loadSaved: () => h.saved,
  saveDocs: h.saveDocs,
}));
vi.mock('@/lib/content', () => ({
  CORPUS: {
    regulations: { dir: '/data/parts', index: '/data/gacar-index.json' },
    reference: { dir: '/data/library', index: '/data/reference-index.json' },
  },
}));

import { useOfflineBookmarkSync } from '@/hooks/useOfflineSync';

beforeEach(() => {
  vi.useFakeTimers();
  h.online = true;
  h.supported = true;
  h.saved = [];
  h.bookmarks = [];
  h.saveDocs.mockClear();
  // Force the setTimeout path (deterministic under fake timers).
  delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useOfflineBookmarkSync', () => {
  it('caches bookmarked docs (parent HTML + index) when online', () => {
    h.bookmarks = [{ kind: 'regulations', slug: 'part-91' }];
    renderHook(() => useOfflineBookmarkSync());
    vi.advanceTimersByTime(2000);

    expect(h.saveDocs).toHaveBeenCalledTimes(1);
    expect(h.saveDocs).toHaveBeenCalledWith([
      { slug: 'part-91', urls: ['/data/parts/part-91.html', '/data/gacar-index.json'] },
    ]);
  });

  it('does nothing while offline', () => {
    h.online = false;
    h.bookmarks = [{ kind: 'regulations', slug: 'part-91' }];
    renderHook(() => useOfflineBookmarkSync());
    vi.advanceTimersByTime(2000);
    expect(h.saveDocs).not.toHaveBeenCalled();
  });

  it('does nothing when offline caching is unsupported', () => {
    h.supported = false;
    h.bookmarks = [{ kind: 'regulations', slug: 'part-91' }];
    renderHook(() => useOfflineBookmarkSync());
    vi.advanceTimersByTime(2000);
    expect(h.saveDocs).not.toHaveBeenCalled();
  });

  it('does nothing when there are no bookmarks', () => {
    renderHook(() => useOfflineBookmarkSync());
    vi.advanceTimersByTime(2000);
    expect(h.saveDocs).not.toHaveBeenCalled();
  });

  it('dedupes repeated slugs and skips already-saved ones', () => {
    h.saved = ['part-91']; // already cached
    h.bookmarks = [
      { kind: 'regulations', slug: 'part-91' }, // skipped (already saved)
      { kind: 'reference', slug: 'aim' },
      { kind: 'reference', slug: 'aim' }, // duplicate slug
    ];
    renderHook(() => useOfflineBookmarkSync());
    vi.advanceTimersByTime(2000);

    expect(h.saveDocs).toHaveBeenCalledTimes(1);
    expect(h.saveDocs).toHaveBeenCalledWith([
      { slug: 'aim', urls: ['/data/library/aim.html', '/data/reference-index.json'] },
    ]);
  });

  it('skips saveDocs entirely when every bookmark is already cached', () => {
    h.saved = ['part-91'];
    h.bookmarks = [{ kind: 'regulations', slug: 'part-91' }];
    renderHook(() => useOfflineBookmarkSync());
    vi.advanceTimersByTime(2000);
    expect(h.saveDocs).not.toHaveBeenCalled();
  });
});
