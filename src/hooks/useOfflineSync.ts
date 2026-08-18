/**
 * Auto-cache the user's bookmarked Library sections for offline use. Mounted once
 * in the app shell (src/app/Layout.tsx). When online and idle, it warms the parent
 * document of each bookmark into the `flygaca-data` cache via offlineCache.saveDocs,
 * so a pilot who bookmarked a section keeps it available after losing signal.
 *
 * Online-gated (never fights the network offline), idle-deferred (off the critical
 * path), slug-deduped, and skips anything already saved — so it's cheap and quiet.
 * Read-only against libraryPrefs.
 */
import { useEffect } from 'react';
import { CORPUS } from '@/lib/content';
import { useLibraryPrefs } from '@/lib/prefs/libraryPrefs';
import { useOnline } from '@/lib/native/pwa';
import { loadSaved, offlineSupported, saveDocs } from '@/lib/native/offlineCache';

interface IdleWindow {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
}

export function useOfflineBookmarkSync(): void {
  const { bookmarks } = useLibraryPrefs();
  const online = useOnline();

  useEffect(() => {
    if (!online || !offlineSupported() || bookmarks.length === 0) return;

    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      const already = new Set(loadSaved());
      const seen = new Set<string>();
      const pending = bookmarks
        .filter((b) => {
          // The saved manifest is keyed by slug (as in Document.tsx's save flow),
          // so dedupe and skip on slug too.
          if (already.has(b.slug) || seen.has(b.slug)) return false;
          seen.add(b.slug);
          return true;
        })
        .map((b) => ({
          slug: b.slug,
          urls: [`${CORPUS[b.kind].dir}/${b.slug}.html`, CORPUS[b.kind].index],
        }));
      if (pending.length) void saveDocs(pending);
    };

    const w = window as Window & IdleWindow;
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 5000 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }
    const id = window.setTimeout(run, 2000);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [bookmarks, online]);
}
