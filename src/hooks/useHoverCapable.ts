import { useSyncExternalStore } from 'react';

/**
 * Subscribes to whether the primary pointer can actually hover. Hover-only
 * affordances (the bento cursor glow, scale lift, arrow nudge) read this so a
 * tap on a touch device never leaves them stuck in their hover state. A live
 * subscription — not a load-time constant — because capability changes when a
 * mouse is attached to or detached from a tablet. Belt-and-braces with the
 * `@media (hover: hover)` gates in the CSS modules.
 */
const QUERY = '(hover: hover)';

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

export function useHoverCapable(): boolean {
  // Server snapshot is `false` — touch-safe until hydration proves otherwise.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
