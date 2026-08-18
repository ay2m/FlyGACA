/**
 * Local-first guide preferences: bookmarked guides and a read/completed list,
 * persisted to localStorage and exposed via useSyncExternalStore so the guides
 * hub and reader re-render on change. Reuses toolPrefs' pure `toggleId`
 * transform so the two stores stay consistent.
 */
import { createPrefStore, readStringList, save } from './createPrefStore';
import { toggleId } from '@/lib/prefs/toolPrefs';

const BOOKMARK_KEY = 'flygaca:guide-bookmarks';
const READ_KEY = 'flygaca:guide-read';

/** Add `id` to `list` if absent (idempotent). */
export function addId(list: string[], id: string): string[] {
  return list.includes(id) ? list : [...list, id];
}

export interface GuidePrefs {
  bookmarks: string[];
  read: string[];
}

const store = createPrefStore<GuidePrefs>({
  bookmarks: readStringList(BOOKMARK_KEY),
  read: readStringList(READ_KEY),
});

export const useGuidePrefs = store.use;

export function toggleBookmark(slug: string): void {
  const bookmarks = toggleId(store.get().bookmarks, slug);
  save(BOOKMARK_KEY, bookmarks);
  store.set({ ...store.get(), bookmarks });
}

export function toggleRead(slug: string): void {
  const read = toggleId(store.get().read, slug);
  save(READ_KEY, read);
  store.set({ ...store.get(), read });
}

/** Idempotent — used to auto-mark a guide read when the reader reaches the end. */
export function markRead(slug: string): void {
  const read = addId(store.get().read, slug);
  if (read === store.get().read) return;
  save(READ_KEY, read);
  store.set({ ...store.get(), read });
}
