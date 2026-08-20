#!/usr/bin/env node
/**
 * Per-chunk + total JS perf budget — the companion to check-bundle.mjs.
 *
 * check-bundle.mjs gates only the *initial* JS (the entry + modulepreloaded
 * vendor chunks); lazy route chunks are excluded by design, so a single page
 * that accidentally imports a heavy library balloons its own chunk with nothing
 * to catch it. This gate closes that gap: it walks EVERY emitted
 * dist/assets/*.js and fails if
 *   - any single chunk exceeds PER_CHUNK_KB gz  (one route pulling in something huge), or
 *   - the whole app's JS footprint exceeds TOTAL_KB gz (overall creep).
 *
 * Run after `vite build`, alongside check:bundle. Node-only, no browser — a
 * static complement to (not a substitute for) a runtime Lighthouse gate, which
 * needs a headless browser + a served build. Re-base the ceilings deliberately
 * (like check-bundle's BUDGET_KB) when a framework/vendor bump legitimately
 * moves the floor.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const ASSETS = 'dist/assets';

// Gzipped ceiling for any single JS chunk. Re-measured after the Firebase port:
// this used to be sized around a ~127 kB Firebase vendor chunk that no longer
// exists, which left the ceiling at roughly twice the real heaviest chunk — a
// gate that could not fail. Today's heaviest is vendor-react at ~84 kB gz, so 100
// keeps ~20% headroom while again catching a new heavyweight import on one route.
const PER_CHUNK_KB = 100;
// Gzipped ceiling for the sum of ALL chunks — a coarse guard on the app's total
// JS footprint. No user downloads all of it (the en/ar language bundles are
// mutually exclusive and route chunks load on demand), so this only trips on
// broad creep. Also re-measured: the old 820 was ~10% over a 744 kB figure that
// included the Firebase tree. Today's total is ~575 kB, so 660 restores the same
// ~15% margin.
const TOTAL_KB = 660;

let files;
try {
  files = readdirSync(ASSETS).filter((f) => f.endsWith('.js'));
} catch {
  console.error(`check:perf — ${ASSETS} not found; run after \`vite build\`.`);
  process.exit(1);
}
if (files.length === 0) {
  console.error(`check:perf — no .js chunks in ${ASSETS}`);
  process.exit(1);
}

let totalGz = 0;
const chunks = files.map((f) => {
  const gz = gzipSync(readFileSync(join(ASSETS, f))).length;
  totalGz += gz;
  return { f, kb: gz / 1024 };
});
chunks.sort((a, b) => b.kb - a.kb);

const totalKb = totalGz / 1024;
const over = chunks.filter((c) => c.kb > PER_CHUNK_KB);

console.log(
  `JS chunks: ${files.length} · total ${totalKb.toFixed(1)} kB gz (budget ${TOTAL_KB} kB)`,
);
console.log('Heaviest chunks (gz):');
for (const c of chunks.slice(0, 6)) {
  const flag = c.kb > PER_CHUNK_KB ? '  ✗ over per-chunk budget' : '';
  console.log(`  ${c.kb.toFixed(1).padStart(7)} kB  ${c.f}${flag}`);
}

const problems = [];
if (over.length)
  problems.push(`${over.length} chunk(s) exceed the ${PER_CHUNK_KB} kB per-chunk budget`);
if (totalKb > TOTAL_KB)
  problems.push(`total JS ${totalKb.toFixed(1)} kB exceeds the ${TOTAL_KB} kB budget`);

if (problems.length) {
  console.error(`\n✗ check:perf FAILED — ${problems.join('; ')}.`);
  process.exit(1);
}
console.log(
  `\n✓ All chunks within the ${PER_CHUNK_KB} kB per-chunk budget; total within ${TOTAL_KB} kB.`,
);
