import { useSyncExternalStore } from 'react';

/**
 * The shared machinery behind every `src/lib/prefs/*` store.
 *
 * Each preference store is the same three things: a module-level snapshot
 * hydrated from localStorage at import time, a listener set so
 * `useSyncExternalStore` can re-render subscribers, and a persist-then-emit
 * mutator. Every store used to carry its own copy of all three, which is a lot
 * of surface for something that must behave identically everywhere — in
 * particular the "storage unavailable" path, which has to keep the value in
 * memory rather than throw (Safari private mode, prerender, a full quota).
 *
 * Storage is always best-effort: a read that fails yields the fallback, a write
 * that fails is dropped, and the in-memory snapshot stays authoritative for the
 * session. That is what keeps the app usable with no storage at all.
 */

/** Read and JSON-parse a key; `fallback` on absent, malformed, or unavailable storage. */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Read a JSON array of strings, dropping any non-string entries. `[]` on any failure. */
export function readStringList(key: string): string[] {
  const parsed = readJson<unknown>(key, []);
  return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
}

/** Read a raw string value (no JSON), or null when absent/unavailable. */
export function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** JSON-serialize and persist. Silently a no-op when storage is unavailable. */
export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable — the in-memory snapshot stays authoritative */
  }
}

/** Persist a raw string (no JSON). Silently a no-op when storage is unavailable. */
export function saveRaw(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — the in-memory snapshot stays authoritative */
  }
}

/** Delete a key. Silently a no-op when storage is unavailable. */
export function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable — nothing to clear */
  }
}

export interface PrefStore<T> {
  /** The current snapshot. */
  get(): T;
  /** Replace the snapshot and notify subscribers. Persisting is the caller's job. */
  set(next: T): void;
  /** `useSyncExternalStore` bound to this store. */
  use(): T;
}

/**
 * Build a store around `initial`.
 *
 * `serverSnapshot` is what SSR/prerender sees; it defaults to the initial value,
 * which is right for anything hydrated from storage (no storage → the fallback).
 * Pass it explicitly for session-scoped state that must never appear "on" in a
 * prerendered snapshot.
 */
export function createPrefStore<T>(initial: T, serverSnapshot: T = initial): PrefStore<T> {
  let state = initial;
  const listeners = new Set<() => void>();

  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  };

  return {
    get: () => state,
    set(next: T) {
      state = next;
      for (const l of listeners) l();
    },
    use: () =>
      useSyncExternalStore(
        subscribe,
        () => state,
        () => serverSnapshot,
      ),
  };
}
