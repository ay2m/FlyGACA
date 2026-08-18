/**
 * Local-first onboarding state: whether the first-run welcome tour has been
 * seen, persisted to localStorage and exposed via useSyncExternalStore so the
 * tour mount re-renders when it's dismissed or replayed.
 *
 * We store the tour *version* the user dismissed rather than a bare boolean, so
 * a future material change to the tour can re-introduce it by bumping
 * TOUR_VERSION without stranding everyone on the old "seen" flag.
 */
import { createPrefStore, readRaw, remove, saveRaw } from './createPrefStore';

const SEEN_KEY = 'flygaca:onboarding-seen';

/** Bump when the tour changes materially enough to re-show returning users. */
export const TOUR_VERSION = '1';

const seenStore = createPrefStore<string | null>(readRaw(SEEN_KEY));

/** True once the current tour version has been dismissed. During prerender
 *  (no localStorage) this is false, so the markup never assumes "seen". */
export function useOnboardingSeen(): boolean {
  return seenStore.use() === TOUR_VERSION;
}

/** Record the current tour version as seen — every dismissal path calls this. */
export function markOnboardingSeen(): void {
  if (seenStore.get() === TOUR_VERSION) return;
  saveRaw(SEEN_KEY, TOUR_VERSION);
  seenStore.set(TOUR_VERSION);
}

/** Clear the seen flag so the tour shows again (the Settings "replay" escape hatch). */
export function replayOnboarding(): void {
  remove(SEEN_KEY);
  seenStore.set(null);
}

/**
 * Whether the tour modal is open *right now*. This is deliberately separate from
 * "seen": the tour no longer auto-opens over the hero on first visit — it opens
 * only on demand (the dismissible Home hint, or the Settings "replay"), so a
 * first-time visitor sees the product, not a modal. In-memory only
 * (session-scoped) — the server snapshot is pinned to false so the tour is never
 * open in a prerendered page.
 */
const openStore = createPrefStore<boolean>(false, false);

export const useTourOpen = openStore.use;

/** Open the tour modal on demand. */
export function openTour(): void {
  if (openStore.get()) return;
  openStore.set(true);
}

/** Close the tour modal (every dismissal path calls this alongside markOnboardingSeen). */
export function closeTour(): void {
  if (!openStore.get()) return;
  openStore.set(false);
}
