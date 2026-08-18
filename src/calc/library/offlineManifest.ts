/**
 * Pure helpers for the "save Parts for offline" feature: the list of saved
 * document slugs and a byte formatter. No DOM / Cache API here (that lives in
 * src/lib/offlineCache.ts) so this stays unit-testable.
 */

/** Add a slug to the saved set (idempotent, order preserved). */
export function addSaved(saved: string[], slug: string): string[] {
  return saved.includes(slug) ? saved : [...saved, slug];
}

/** Remove a slug from the saved set. */
export function removeSaved(saved: string[], slug: string): string[] {
  return saved.filter((s) => s !== slug);
}

/** Normalise an unknown stored value into a string slug list. */
export function listSaved(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
}

/** Human-readable byte size (B / KB / MB / GB), 1 decimal above bytes. */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / 1024 ** i;
  return `${i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}
