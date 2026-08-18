/**
 * parse-regulations — compile the regulatory Markdown corpus into a single lookup dictionary.
 *
 * Reads every content/regulations/part-*.md, parses each to an mdast AST, extracts internal
 * cross-references (Part NN refs + ./part-NN.md links) and section citations, validates that every
 * cross-reference resolves to a real GACAR Part (public/data/gacar-index.json), then writes the
 * optimized lookup to public/data/regulations-lookup.json.
 *
 * This is the "compile + validate" gate of the docs-parser GitHub Action: an unresolved cross-
 * reference (e.g. a typo'd `Part 999`) exits non-zero and fails the merge.
 *
 * Usage:
 *   node scripts/parse-regulations.mjs [--check]
 *     --check   parse + validate only; do not write the output file (fails if anything is wrong).
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseRegulationFile, buildLookup } from './lib/regulations-parse.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(root, 'content/regulations');
const REGISTRY = join(root, 'public/data/gacar-index.json');
const OUT = join(root, 'public/data/regulations-lookup.json');

const CHECK = process.argv.slice(2).includes('--check');

// --- canonical GACAR part registry (source of truth for cross-ref validation) ----------------
const registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
const knownParts = new Set((registry.documents ?? []).map((d) => `part-${d.partNum}`));

// --- read + parse every authored Markdown Part ------------------------------------------------
const files = readdirSync(CONTENT_DIR)
  .filter((f) => /^part-\d+\.md$/.test(f))
  .sort();

if (files.length === 0) {
  console.error(`parse-regulations: no part-*.md files found in ${CONTENT_DIR}`);
  process.exit(1);
}

const records = [];
for (const file of files) {
  const slug = file.replace(/\.md$/, '');
  const raw = readFileSync(join(CONTENT_DIR, file), 'utf8');
  try {
    records.push(parseRegulationFile({ slug, raw }));
  } catch (err) {
    console.error(`✖ ${err.message}`);
    process.exit(1);
  }
}

// --- compile + validate cross-references ------------------------------------------------------
let lookup;
try {
  // Stamp `generated` from the registry so output is deterministic in CI (no wall-clock).
  lookup = buildLookup(records, { knownParts, generated: registry.generated ?? null });
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exit(1);
}

const totalRefs = records.reduce((n, r) => n + r.references.length, 0);
console.log(
  `parse-regulations: ${records.length} Part(s) · ${totalRefs} cross-reference(s) — all resolve.`,
);
for (const r of records) {
  console.log(`  ${r.slug}: → [${r.references.join(', ') || '—'}]`);
}

if (CHECK) {
  console.log('\n--check: validation passed; not writing output.');
  process.exit(0);
}

// Match the repo convention for generated data: 1-space indent + trailing newline.
writeFileSync(OUT, JSON.stringify(lookup, null, 1) + '\n');
console.log(`\n✔ wrote ${OUT}`);
