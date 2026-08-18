/**
 * Local-first state for the regulatory change-tracking feature: the user's
 * last-seen fingerprint snapshot (so we can show "what changed since you last
 * looked") and the set of source ids they're watching. Persisted to localStorage
 * and exposed via useSyncExternalStore so the Updates page re-renders on change.
 */
import type { SeenMap } from '@/calc/library/changeTracking';
import { createPrefStore, readJson, readStringList, save } from './createPrefStore';

const SEEN_KEY = 'flygaca:updates-seen';
const WATCH_KEY = 'flygaca:updates-watch';

export interface UpdatesPrefs {
  /** id → last-seen fingerprint. */
  seen: SeenMap;
  /** Watched source ids. */
  watch: string[];
}

const store = createPrefStore<UpdatesPrefs>({
  seen: readJson<SeenMap>(SEEN_KEY, {}),
  watch: readStringList(WATCH_KEY),
});

export const useUpdatesPrefs = store.use;

/** Record the current fingerprints as seen (the "mark all read" action / baseline). */
export function markAllSeen(seen: SeenMap): void {
  save(SEEN_KEY, seen);
  store.set({ ...store.get(), seen });
}

/** Add or remove a source id from the watchlist. */
export function toggleWatch(id: string): void {
  const current = store.get().watch;
  const watch = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
  save(WATCH_KEY, watch);
  store.set({ ...store.get(), watch });
}

/** True when the user has never set a baseline (first-ever visit). */
export function hasBaseline(prefs: UpdatesPrefs): boolean {
  return Object.keys(prefs.seen).length > 0;
}
