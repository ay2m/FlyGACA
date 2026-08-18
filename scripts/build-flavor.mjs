#!/usr/bin/env node
/**
 * Build a standalone prep-app (flavor) bundle: one pack, one branded app,
 * fully offline. Usage:
 *
 *   npm run build:flavor -- elp        # or ppl-exam · conversion · medical · aip
 *
 * What it does (see docs/RUNBOOK-native.md → "Per-flavor app pipeline"):
 *   1. Slices public/data/* down to the pack's content (scripts/lib/flavor-slice.mjs)
 *      into a staged .flavor/<id>/public/ tree — Vite's publicDir for this build,
 *      so the service-worker precache manifest sees only the slice.
 *   2. Runs `tsc -b` + `vite build` with VITE_APP_FLAVOR/APP_FLAVOR set; the
 *      router, branding, PWA manifest and capacitor.config.ts all key off it.
 *
 * The web-SEO steps of the main build (sitemap, prerender-head, coverage and
 * bundle-budget checks) are deliberately skipped — flavor bundles ship inside
 * native apps, not on flygaca.com. dist/ holds ONE flavor at a time; rebuild
 * when switching. Requires Node ≥ 22.18 (imports the TS flavor registry via
 * type stripping).
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { slicePack, CORPUS_FILES } from './lib/flavor-slice.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

let FLAVORS, toFlavorId, PACKS;
try {
  ({ FLAVORS, toFlavorId } = await import('../src/flavors/registry.ts'));
  ({ PACKS } = await import('../src/lib/prepCatalog.ts'));
} catch (err) {
  console.error('Could not import the TS flavor registry — Node ≥ 22.18 is required.');
  throw err;
}

const rawId = process.argv[2];
const flavorId = toFlavorId(rawId);
if (!flavorId || flavorId === 'main') {
  const ids = Object.keys(FLAVORS).filter((id) => id !== 'main');
  console.error(`Usage: npm run build:flavor -- <${ids.join('|')}>`);
  console.error(rawId ? `Unknown flavor: ${rawId}` : 'Missing flavor id.');
  process.exit(1);
}
const flavor = FLAVORS[flavorId];
const pack = PACKS.find((p) => p.id === flavor.packId);
if (!pack) throw new Error(`Flavor ${flavorId} names unknown pack ${flavor.packId}`);

// ── 1. Slice the data ────────────────────────────────────────────────────────
const dataDir = join(root, 'public/data');
const readIndex = (file) => JSON.parse(readFileSync(join(dataDir, file), 'utf8'));

const slice = slicePack(pack, {
  quiz: readIndex('quiz.json'),
  groundschool: readIndex('groundschool.json'),
  paths: readIndex('paths-index.json'),
  pdfs: readIndex('pdfs-index.json'),
  regulations: readIndex(CORPUS_FILES.regulations.index),
  reference: readIndex(CORPUS_FILES.reference.index),
  handbook: readIndex(CORPUS_FILES.handbook.index),
});

// Explicitly listed content MUST exist; a dangling quiz citation only warns.
const gotSheets = new Set(slice.pdfs.documents.map((d) => d.slug));
const gotRefs = new Set(slice.corpusIndexes.reference.documents.map((d) => d.slug));
for (const slug of pack.sheetSlugs ?? [])
  if (!gotSheets.has(slug)) throw new Error(`Pack sheet not in pdfs-index.json: ${slug}`);
for (const slug of pack.librarySlugs ?? [])
  if (!gotRefs.has(slug)) throw new Error(`Pack librarySlug not in reference-index.json: ${slug}`);
for (const ref of slice.missingRefs)
  console.warn(`warn: ${ref.kind}/${ref.id} cited by pack content but not in its corpus index`);

// ── 2. Stage the flavor publicDir ────────────────────────────────────────────
const stage = join(root, '.flavor', flavorId, 'public');
rmSync(stage, { recursive: true, force: true });
mkdirSync(join(stage, 'data'), { recursive: true });

const writeJson = (rel, value) => writeFileSync(join(stage, rel), JSON.stringify(value));
writeJson('data/quiz.json', slice.quiz);
writeJson('data/groundschool.json', slice.groundschool);
writeJson('data/paths-index.json', slice.paths);
writeJson('data/pdfs-index.json', slice.pdfs);
for (const [kind, meta] of Object.entries(CORPUS_FILES))
  writeJson(`data/${meta.index}`, slice.corpusIndexes[kind]);

let corpusBytes = 0;
for (const f of slice.corpusFiles) {
  const src = join(dataDir, f.path);
  if (!existsSync(src)) {
    console.warn(`warn: missing corpus file ${f.path} (skipped)`);
    continue;
  }
  const dest = join(stage, 'data', f.path);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
  corpusBytes += readFileSync(src).length;
}
for (const rel of slice.sheetFiles) {
  const src = join(root, 'public', rel);
  if (!existsSync(src)) throw new Error(`Missing study sheet: public/${rel}`);
  const dest = join(stage, rel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest);
}
cpSync(join(root, 'public/img'), join(stage, 'img'), { recursive: true });

// Arabic install manifest (src/i18n/index.ts swaps to it for lang=ar) — the
// flavor's Arabic pack name/blurb come from the ar i18n bundle.
const ar = JSON.parse(readFileSync(join(root, 'src/i18n/ar.json'), 'utf8'));
const arPack = ar.study?.packCatalog?.[pack.id] ?? {};
writeJson('manifest-ar.webmanifest', {
  id: '/',
  name: arPack.name ?? flavor.manifest.shortName,
  short_name: arPack.name ?? flavor.manifest.shortName,
  description: arPack.desc ?? flavor.manifest.description,
  start_url: '/?lang=ar',
  scope: '/',
  display: 'standalone',
  background_color: flavor.manifest.themeColor,
  theme_color: flavor.manifest.themeColor,
  lang: 'ar',
  dir: 'rtl',
  categories: ['education', 'reference'],
  icons: [
    { src: 'img/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: 'img/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
});

console.log(
  `Staged ${flavorId}: ${slice.quiz.banks.length} banks · ` +
    `${slice.groundschool.modules.length} modules · ${slice.paths.paths.length} paths · ` +
    `${slice.pdfs.documents.length} sheets · ${slice.corpusFiles.length} corpus docs ` +
    `(${(corpusBytes / 1024 / 1024).toFixed(1)} MB)`,
);

// ── 3. Build ─────────────────────────────────────────────────────────────────
const env = { ...process.env, VITE_APP_FLAVOR: flavorId, APP_FLAVOR: flavorId };
for (const args of [
  ['tsc', '-b'],
  ['vite', 'build'],
]) {
  const res = spawnSync('npx', ['--no-install', ...args], { cwd: root, env, stdio: 'inherit' });
  if (res.status !== 0) process.exit(res.status ?? 1);
}
console.log(`\nFlavor build ready: dist/ is now the ${flavor.appName} (${flavor.appId}) bundle.`);
console.log(
  'Preview with `npm run preview` · package with `npm run flavor:ios -- ' + flavorId + '`',
);
