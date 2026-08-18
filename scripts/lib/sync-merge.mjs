/**
 * sync-merge — pure helpers for the sync-gaca apply step.
 *
 * This module is intentionally side-effect free (no top-level I/O) so it can be
 * unit-tested directly and reused by scripts/sync-gaca.mjs. The collection
 * config lives here too, so the diff (sync-gaca.mjs) and the merge (this file)
 * share one source of truth for each content type's identity and provenance.
 */

// --- collection config: one entry per content type the agents produce ------
// `diffKey` is the stable identity; `changeKey` is the provenance fingerprint
// used to tell a re-import of the same item apart from a genuine revision.
export const COLLECTIONS = {
  part: {
    label: 'GACAR Parts',
    index: 'public/data/gacar-index.json',
    arrayKey: 'documents',
    diffKey: (r) => r.slug ?? (r.partNum != null ? `part-${r.partNum}` : `part-${r.part}`),
    changeKey: (r) => r.contentHash ?? r.revision ?? r.effectiveDate ?? null,
    describe: (r) => `${r.slug ?? `part-${r.partNum ?? r.part}`} — ${r.title ?? ''}`.trim(),
  },
  ac: {
    label: 'Advisory Circulars',
    index: 'public/data/reference-index.json',
    arrayKey: 'documents',
    diffKey: (r) => r.slug,
    changeKey: (r) => r.contentHash ?? r.revision ?? r.effectiveDate ?? r.date ?? null,
    describe: (r) => `${r.slug} — ${r.title ?? ''}`.trim(),
  },
  airport: {
    label: 'Aerodromes (AIP AD 2)',
    index: 'public/data/airports.json',
    arrayKey: 'airports',
    diffKey: (r) => r.icao,
    changeKey: (r) => r.contentHash ?? r.effectiveDate ?? r.airac ?? null,
    describe: (r) => `${r.icao} — ${r.name_en ?? ''}`.trim(),
  },
  airspace: {
    label: 'Airspaces (AIP ENR 2)',
    index: 'public/data/airspaces-index.json',
    arrayKey: 'airspaces',
    diffKey: (r) => r.id,
    changeKey: (r) => r.contentHash ?? r.effectiveDate ?? r.airac ?? null,
    describe: (r) => `${r.id} — ${r.name ?? ''}`.trim(),
  },
  chart: {
    label: 'Visual charts (AIP)',
    index: 'public/data/charts-index.json',
    arrayKey: 'documents',
    diffKey: (r) => r.slug,
    changeKey: (r) => r.date ?? r.airacDate ?? r.effectiveDate ?? r.contentHash ?? null,
    describe: (r) => `${r.slug} — ${r.label ?? ''}`.trim(),
  },
};

// Agent-only fields that describe the handoff, not the published index record.
// `kind` is the routing key; `body` points at a raw asset awaiting conversion.
const AGENT_ONLY_FIELDS = ['kind', 'body'];

/**
 * Project an incoming agent record onto a clean index record: drop the
 * agent-only routing/asset fields, keep everything else — including the
 * provenance fingerprint (`contentHash` / `revision` / `effectiveDate` …) so a
 * future diff can detect the next revision via `changeKey`.
 */
export function projectRecord(record) {
  const out = {};
  for (const [k, v] of Object.entries(record)) {
    if (AGENT_ONLY_FIELDS.includes(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Split records into those we can merge now (metadata-only — no raw asset) and
 * those that must wait for the Phase-1 conversion step (they carry a `body`).
 */
export function partitionByBody(records) {
  const metadata = [];
  const deferred = [];
  for (const r of records) {
    if (r && r.body) deferred.push(r);
    else metadata.push(r);
  }
  return { metadata, deferred };
}

/**
 * Merge metadata-only deltas into an index. Returns a NEW index object (the
 * input is never mutated). `changedRecs` replace the existing entry with the
 * same `diffKey`; `newRecs` are appended. `count` is recomputed when present.
 */
export function mergeIndex(idx, cfg, { newRecs = [], changedRecs = [] } = {}) {
  const next = structuredClone(idx);
  const list = Array.isArray(next[cfg.arrayKey]) ? next[cfg.arrayKey] : [];

  const pos = new Map();
  list.forEach((rec, i) => pos.set(cfg.diffKey(rec), i));

  let updated = 0;
  for (const r of changedRecs) {
    const key = cfg.diffKey(r);
    const at = pos.get(key);
    if (at != null) {
      list[at] = projectRecord(r);
      updated += 1;
    } else {
      // Defensive: a "changed" record whose key is absent is treated as new.
      pos.set(key, list.push(projectRecord(r)) - 1);
    }
  }

  let added = 0;
  for (const r of newRecs) {
    const key = cfg.diffKey(r);
    if (pos.has(key)) {
      // Already present (e.g. duplicate in the bundle) — overwrite, don't dupe.
      list[pos.get(key)] = projectRecord(r);
    } else {
      pos.set(key, list.push(projectRecord(r)) - 1);
      added += 1;
    }
  }

  next[cfg.arrayKey] = list;
  if (typeof next.count === 'number') next.count = list.length;

  return { index: next, added, updated };
}
