#!/usr/bin/env node
/**
 * Bundle budget gate. Measures the *initial* JavaScript the browser must fetch
 * for the app shell — the entry chunk plus the modulepreloaded vendor chunks
 * that `dist/index.html` references — and fails if the gzipped total exceeds the
 * budget. Route chunks are lazy (Suspense in Layout) and excluded by design.
 *
 * Run after `vite build`. Wire as `npm run check:bundle` (CI build job).
 */
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'dist';
// Gzipped initial-JS ceiling. Re-based 160 → 183 across the 2026-07 framework
// majors: react-dom 19's renderer is ~14 kB gz heavier than 18.3 and
// react-router 7's core ~9 kB heavier than 6.30, partly offset by Vite 8's Oxc
// minifier. Measured floor after the upgrades: 180.3 kB gz (app-shell index
// chunk unchanged at ~71 kB). Re-based again 183 → 186 in 2026-07 after routine
// dependabot patch bumps (react-i18next, vite/rolldown runtime chunk, etc.)
// pushed the measured floor to ~184 kB gz. Re-based 186 → 187 in 2026-07 for the
// helper-consolidation refactor: it removes ~360 source lines of duplication but
// its shared helpers (calc/guards, calc/recency date fns, components/validityStatus,
// prefs/createPrefStore, …) are imported by eagerly-loaded chunks, so initial JS
// rose ~0.3 kB (185.8 → 186.1) even as total source shrank — an accepted trade.
// Tighten as the shell shrinks. Rebased 187 → 188 when the router gained the
// /hud, /library/map and airspace-HUD route registrations (each page itself is
// a lazy chunk; only the route-table entries land in the shell). Rebased 188 →
// 189 as the /guides catalogue grew: the CommandPalette indexes every guide from
// GUIDE_SLUGS, so each new guide's registry rows in guides.ts land in the shell
// (~33 bytes gz per guide; the guide's prose stays in the lazy en/ar chunks).
const BUDGET_KB = 189;

const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const files = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);

if (files.length === 0) {
  console.error('check:bundle — no /assets/*.js referenced by dist/index.html');
  process.exit(1);
}

let totalGz = 0;
const rows = files.map((f) => {
  const buf = readFileSync(join(DIST, f.replace(/^\//, '')));
  const gz = gzipSync(buf).length;
  totalGz += gz;
  return `  ${(gz / 1024).toFixed(1).padStart(7)} kB gz  ${f}`;
});

const totalKb = totalGz / 1024;
console.log('Initial JS (entry + preloaded vendor chunks):');
console.log(rows.join('\n'));
console.log(`  ${'─'.repeat(40)}`);
console.log(`  ${totalKb.toFixed(1).padStart(7)} kB gz  total   (budget ${BUDGET_KB} kB)`);

if (totalKb > BUDGET_KB) {
  console.error(`\n✗ Initial JS ${totalKb.toFixed(1)} kB exceeds the ${BUDGET_KB} kB budget.`);
  process.exit(1);
}
console.log(`\n✓ Within budget.`);
