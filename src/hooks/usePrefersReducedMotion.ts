import { useSyncExternalStore } from 'react';

/**
 * Subscribes to the OS "reduce motion" setting without pulling framer-motion
 * onto the home-hero critical path. Belt-and-braces with the global
 * `prefers-reduced-motion` CSS reset — JS-driven motion (count-up, scroll
 * scrub) reads this to skip straight to the final state.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

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

export function usePrefersReducedMotion(): boolean {
  // Server snapshot is `false` — assume motion is allowed until hydration.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
