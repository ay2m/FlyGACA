/**
 * sync-gaca — ingest official-GACA content into the app's data corpus.
 *
 * This is the app-side half of the content-freshness pipeline. The discovery +
 * extraction half is a set of Nimble agents (one per source in
 * public/data/sources.json: gacar, advisory-circulars, aerodromes, charts,
 * airspace, notam). Those agents emit a normalised `records.json`; this script
 * DIFFS those records against the live indexes under public/data/ and reports
 * what is new / changed / unchanged — and (with --apply) merges the deltas.
 *
 * Default mode is a dry run — it never writes. `--apply` merges metadata-only
 * deltas (records with no raw `body`: new index entries and revisions) into the
 * target index JSON, persisting each record's provenance fingerprint so future
 * diffs can detect the next revision. Body-bearing records (those carrying a raw
 * PDF/eAIP asset) still need the Phase-1 conversion step and are reported as
 * deferred rather than written.
 *
 * Usage:
 *   node scripts/sync-gaca.mjs [--input <path>] [--apply] [--limit N]
 *     --input <path>  records bundle to ingest (default: sync-input/records.json,
 *                     falling back to sync-input/records.sample.json)
 *     --apply         merge metadata-only deltas into the indexes (body-bearing
 *                     records await Phase-1 conversion). Refuses the sample fixture.
 *     --limit N       cap per-section listing in the report (default 25)
 *
 * records.json contract (what the Nimble agents hand off):
 *   { "generated": "YYYY-MM-DD",
 *     "records": [ { "kind": "part"|"ac"|"airport"|"airspace"|"chart",
 *                    "sourceUrl": "...", "revision"?: "...",
 *                    "effectiveDate"?: "YYYY-MM-DD", "contentHash"?: "...",
 *                    "body"?: { "format": "pdf"|"eaip-html", "assetPath": "..." },
 *                    ...kind-specific fields mirroring the target index record },
 *                  ... ] }
 *   A bare top-level array is also accepted.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { COLLECTIONS, partitionByBody, mergeIndex } from './lib/sync-merge.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

// --- args -----------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const APPLY = flag('--apply');
const LIMIT = Number(opt('--limit', '25')) || 25;

const INPUT_CANDIDATES = [
  opt('--input', null),
  'sync-input/records.json',
  'sync-input/records.sample.json',
].filter(Boolean);
const inputPath = INPUT_CANDIDATES.find((p) => existsSync(join(root, p)));

// --- load + normalise input ------------------------------------------------
if (!inputPath) {
  console.error(
    'sync-gaca: no records bundle found. Looked for:\n  ' +
      INPUT_CANDIDATES.map((p) => `- ${p}`).join('\n  ') +
      '\nProvide one with --input <path> (see the records.json contract in this file).',
  );
  process.exit(1);
}

// The synthetic sample fixture is for exercising the diff engine only — never
// let it write its [SAMPLE] records into the real corpus.
if (APPLY && inputPath.endsWith('records.sample.json')) {
  console.error(
    'sync-gaca: refusing to --apply the synthetic sample fixture. Provide a real ' +
      'bundle via --input <path> or sync-input/records.json.',
  );
  process.exit(2);
}

const bundle = readJson(inputPath);
const records = Array.isArray(bundle) ? bundle : (bundle.records ?? []);

const byKind = new Map();
const skipped = [];
for (const r of records) {
  if (!r || !COLLECTIONS[r.kind]) {
    skipped.push(r);
    continue;
  }
  if (!COLLECTIONS[r.kind].diffKey(r)) {
    skipped.push(r);
    continue;
  }
  if (!byKind.has(r.kind)) byKind.set(r.kind, []);
  byKind.get(r.kind).push(r);
}

// --- diff each kind against its live index ---------------------------------
function diff(kind, incoming) {
  const cfg = COLLECTIONS[kind];
  const idx = readJson(cfg.index);
  const existing = new Map();
  for (const rec of idx[cfg.arrayKey] ?? []) existing.set(cfg.diffKey(rec), rec);

  const out = { new: [], changed: [], unchanged: [], baseline: existing.size };
  for (const r of incoming) {
    const key = cfg.diffKey(r);
    if (!existing.has(key)) {
      out.new.push(r);
      continue;
    }
    const cur = existing.get(key);
    const curKey = cfg.changeKey(cur);
    const inKey = cfg.changeKey(r);
    // Only call it "changed" when BOTH sides carry a provenance fingerprint and
    // they differ. Absent provenance on the existing record (the common first-
    // run case) is treated as unchanged so we never spuriously re-import.
    if (curKey != null && inKey != null && curKey !== inKey) out.changed.push(r);
    else out.unchanged.push(r);
  }
  return { cfg, ...out };
}

// --- report ----------------------------------------------------------------
const mode = APPLY ? 'APPLY' : 'DRY RUN';
console.log(`\nsync-gaca — ${mode}`);
console.log(`input: ${inputPath}  (${records.length} records, ${byKind.size} kinds)\n`);

let totalNew = 0;
let totalChanged = 0;
const plan = [];

for (const kind of Object.keys(COLLECTIONS)) {
  const incoming = byKind.get(kind);
  if (!incoming || incoming.length === 0) continue;
  const d = diff(kind, incoming);
  plan.push({ kind, d });
  totalNew += d.new.length;
  totalChanged += d.changed.length;

  console.log(
    `■ ${d.cfg.label}  [index has ${d.baseline}]  ` +
      `→ ${d.new.length} new · ${d.changed.length} changed · ${d.unchanged.length} unchanged`,
  );
  const show = (title, list) => {
    if (!list.length) return;
    console.log(`    ${title}:`);
    for (const r of list.slice(0, LIMIT)) console.log(`      + ${d.cfg.describe(r)}`);
    if (list.length > LIMIT) console.log(`      … and ${list.length - LIMIT} more (raise --limit)`);
  };
  show('new', d.new);
  show('changed', d.changed);
  console.log('');
}

if (skipped.length) {
  console.log(`⚠ skipped ${skipped.length} record(s) with unknown kind or missing id.\n`);
}

console.log(`Σ ${totalNew} new + ${totalChanged} changed across ${plan.length} content type(s).`);

if (!APPLY) {
  console.log('\nDry run only — nothing written. Re-run with --apply to merge the deltas.\n');
  process.exit(0);
}

// --- apply: merge metadata-only deltas into the indexes ---------------------
// Records carrying a raw `body` (PDF/eAIP) need the Phase-1 conversion step
// before they can be published, so they are deferred, not written.
const today = new Date().toISOString().slice(0, 10);
let wroteAdded = 0;
let wroteUpdated = 0;
const deferred = [];

console.log('\nsync-gaca — applying metadata-only deltas\n');

for (const { kind, d } of plan) {
  const { metadata, deferred: bodyBearing } = partitionByBody([...d.new, ...d.changed]);
  for (const r of bodyBearing) deferred.push({ kind, r });
  if (metadata.length === 0) continue;

  const changedKeys = new Set(d.changed.map((r) => d.cfg.diffKey(r)));
  const newRecs = metadata.filter((r) => !changedKeys.has(d.cfg.diffKey(r)));
  const changedRecs = metadata.filter((r) => changedKeys.has(d.cfg.diffKey(r)));

  const idx = readJson(d.cfg.index);
  const { index, added, updated } = mergeIndex(idx, d.cfg, { newRecs, changedRecs });
  index.generated = bundle.generated ?? today;
  // Indexes are stored with 1-space indentation + trailing newline; preserve it.
  writeFileSync(join(root, d.cfg.index), JSON.stringify(index, null, 1) + '\n');

  wroteAdded += added;
  wroteUpdated += updated;
  console.log(`✔ ${d.cfg.label}  → wrote ${added} new · ${updated} changed  (${d.cfg.index})`);
}

console.log(`\nΣ wrote ${wroteAdded} new + ${wroteUpdated} changed.`);

if (deferred.length) {
  console.log(
    `\n⚠ deferred ${deferred.length} body-bearing record(s) — these carry a raw asset and ` +
      'await the Phase-1 conversion step (PDF/eAIP → sanitized HTML); not written:',
  );
  for (const { kind, r } of deferred.slice(0, LIMIT)) {
    console.log(`      · ${COLLECTIONS[kind].describe(r)}`);
  }
  if (deferred.length > LIMIT) {
    console.log(`      … and ${deferred.length - LIMIT} more (raise --limit)`);
  }
}

console.log('');
