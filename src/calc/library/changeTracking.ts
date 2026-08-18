/**
 * Regulatory change-tracking maths. Pure (no DOM / i18n): given the shipped
 * source manifest (`/data/sources.json`) plus the public freshness snapshot
 * (`/data/source-status.json`), work out what has changed since the user last
 * looked and where the AIRAC cycle stands. The Updates page renders this; real
 * push/email alerts live in the backend (out of scope here) — this is the
 * in-app "what changed since you last looked" slice, gated to Pro in the UI.
 */

/** One source in `/data/sources.json` (only the fields we read). */
export interface SourceEntry {
  id: string;
  label: string;
  kind?: string;
  enabled?: boolean;
  airacBound?: boolean;
  /** Content hash the updater owns; the change signal. */
  fingerprint?: string;
}

/** One source in `/data/source-status.json` (only the fields we read). */
export interface SourceStatus {
  id: string;
  status?: string;
  documents?: number;
  /** Effective date for AIRAC-bound sources, ISO `YYYY-MM-DD`. */
  effective?: string | null;
}

/** AIRAC block from `source-status.json`. */
export interface Airac {
  current: string;
  next: string;
  cycleDays: number;
}

/** A source the user is tracking, merged with its freshness + change state. */
export interface TrackedSource {
  id: string;
  label: string;
  kind?: string;
  airacBound: boolean;
  fingerprint: string;
  status?: string;
  effective?: string | null;
  /** True when this source's fingerprint differs from the user's last-seen one. */
  changed: boolean;
}

/** Last-seen fingerprints, keyed by source id (persisted in updatesPrefs). */
export type SeenMap = Record<string, string>;

import { DAY_MS } from '@/calc/recency';

/** Only the enabled sources that actually carry a fingerprint, sorted by label. */
export function trackableSources(sources: SourceEntry[]): SourceEntry[] {
  return sources
    .filter((s) => s.enabled !== false && !!s.fingerprint)
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** A fresh baseline snapshot (id → fingerprint) to store as "seen". */
export function snapshot(sources: SourceEntry[]): SeenMap {
  const map: SeenMap = {};
  for (const s of trackableSources(sources)) map[s.id] = s.fingerprint as string;
  return map;
}

/**
 * Merge the manifest with its status snapshot and mark each source changed vs
 * `seen`. A source is "changed" when we have a baseline for it and the
 * fingerprint moved, OR it is brand-new since the baseline was taken. With no
 * baseline at all (first visit) nothing is flagged — the page seeds the baseline
 * silently so the first real change is the first alert.
 */
export function mergeSources(
  sources: SourceEntry[],
  statuses: SourceStatus[],
  seen: SeenMap,
): TrackedSource[] {
  const hasBaseline = Object.keys(seen).length > 0;
  const statusById = new Map(statuses.map((s) => [s.id, s]));
  return trackableSources(sources).map((s) => {
    const st = statusById.get(s.id);
    const fingerprint = s.fingerprint as string;
    const known = Object.prototype.hasOwnProperty.call(seen, s.id);
    const changed = hasBaseline && (!known || seen[s.id] !== fingerprint);
    return {
      id: s.id,
      label: s.label,
      kind: s.kind,
      airacBound: !!s.airacBound,
      fingerprint,
      status: st?.status,
      effective: st?.effective ?? null,
      changed,
    };
  });
}

/** The subset that changed since the baseline. */
export function changedSources(merged: TrackedSource[]): TrackedSource[] {
  return merged.filter((s) => s.changed);
}

/** Changed sources the user is watching (by id). */
export function watchedChanges(merged: TrackedSource[], watch: string[]): TrackedSource[] {
  const set = new Set(watch);
  return changedSources(merged).filter((s) => set.has(s.id));
}

export interface AiracState {
  current: string;
  next: string;
  /** Whole days from `now` until the next cycle (never negative). */
  daysToNext: number;
  /** True when the next cycle is within `withinDays`. */
  due: boolean;
}

/** Where the AIRAC cycle stands relative to `now`. */
export function airacStatus(
  airac: Airac | undefined,
  now: Date = new Date(),
  withinDays = 7,
): AiracState | null {
  if (!airac?.current || !airac?.next) return null;
  const next = Date.parse(airac.next);
  if (!Number.isFinite(next)) return null;
  const daysToNext = Math.max(0, Math.ceil((next - now.getTime()) / DAY_MS));
  return { current: airac.current, next: airac.next, daysToNext, due: daysToNext <= withinDays };
}
