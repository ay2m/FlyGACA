import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Keeps a small set of string inputs in sync with the URL query string, so any
 * calculator setup is shareable/bookmarkable. Replaces the legacy FGCalc.urlState.
 *
 * Empty values are dropped from the URL. Hydration on mount reads ?key=value,
 * and Back/Forward (popstate) re-reads it so history traversal restores inputs.
 */
export function useUrlState<T extends Record<string, string>>(
  defaults: T,
): [T, (key: keyof T, value: string) => void] {
  // Held in a ref so the popstate listener sees the defaults without callers
  // having to memoize the object they pass in.
  const defaultsRef = useRef(defaults);
  const [state, setState] = useState<T>(() => readOwnedKeys(defaultsRef.current));

  useEffect(() => {
    // Start from the live query so params we don't own (e.g. ?lang= used by
    // i18n/SEO) survive; only set/clear our own keys.
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(state)) {
      if (value !== '') params.set(key, value);
      else params.delete(key);
    }
    const q = params.toString();
    window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : ''));
  }, [state]);

  useEffect(() => {
    const onPopState = () => setState(readOwnedKeys(defaultsRef.current));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const set = useCallback((key: keyof T, value: string) => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  return [state, set];
}

/** The current query's values for the owned keys, falling back to defaults. */
function readOwnedKeys<T extends Record<string, string>>(defaults: T): T {
  const params = new URLSearchParams(window.location.search);
  const next = { ...defaults };
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const v = params.get(String(key));
    if (v !== null) next[key] = v as T[keyof T];
  }
  return next;
}
