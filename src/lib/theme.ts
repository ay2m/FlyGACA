/**
 * Theme state: the Falcon (default) dark palette, the Cockpit / Night-Ops dark
 * palette (amber/charcoal, night-vision friendly), and the Day / reading light
 * palette (ivory/ink, for long-form regulation reading). The choice is applied
 * as `data-theme` on <html> — `falcon` removes the attribute so the `:root`
 * defaults reign, every other theme sets its own — and the token overrides in
 * `tokens.css` (`html[data-theme="…"]`) cascade app-wide. Persisted to localStorage.
 *
 * A `useSyncExternalStore` wrapper (mirroring `toolPrefs.ts`) keeps the Header
 * and Footer toggles in lockstep. The persisted key + the two theme-color hexes
 * are mirrored by the no-flash inline script in `index.html` — keep them in sync.
 */
import { useSyncExternalStore } from 'react';

export const THEMES = ['falcon', 'cockpit', 'day'] as const;
export type Theme = (typeof THEMES)[number];

export const STORAGE_KEY = 'flygaca:theme';

/** Mobile browser-chrome colour per theme — mirrors the <meta name="theme-color">
 *  default in index.html (Falcon) and the inline no-flash script (Cockpit / Day). */
const THEME_COLOR: Record<Theme, string> = {
  falcon: '#0A0E12',
  cockpit: '#121212',
  day: '#F5F2ED',
};

function isTheme(v: unknown): v is Theme {
  return v === 'falcon' || v === 'cockpit' || v === 'day';
}

/** localStorage → 'falcon' (default). Tolerates storage being unavailable. */
export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isTheme(v) ? v : 'falcon';
  } catch {
    return 'falcon';
  }
}

/** Reflect the theme on <html> + the theme-color meta. Idempotent; SSR-safe. */
export function applyTheme(theme: Theme): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  // Falcon is the default (no attribute); every other theme sets its own.
  if (theme === 'falcon') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLOR[theme]);
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* storage unavailable — keep in-memory */
  }
}

let state: Theme = readTheme();

const listeners = new Set<() => void>();
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Set the active theme: apply to the DOM, persist, and notify subscribers. */
export function setTheme(theme: Theme): void {
  if (theme === state) return;
  state = theme;
  applyTheme(theme);
  persistTheme(theme);
  for (const l of listeners) l();
}

/** Reactive `[theme, setTheme]` for chrome toggles; stays in sync across mounts. */
export function useTheme(): [Theme, (t: Theme) => void] {
  const theme = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
  return [theme, setTheme];
}
