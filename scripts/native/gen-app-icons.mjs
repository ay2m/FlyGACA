/**
 * Generate the per-app App Store icons for the native iOS app family
 * (apple/Apps/<App>/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png).
 *
 * Each app in the family is its own App Store product, so each needs its OWN
 * recognizable icon — before this script every app shipped the same placeholder.
 * The icons are the real Fly GACA falcon mark on the shared Falcon night
 * background, RECOLOURED per app: the mark's silhouette is used as a stencil and
 * filled with a per-module DUOTONE (a top→bottom highlight→shadow gradient) drawn
 * from a single "Desert & sky" heritage palette, so every app reads as the same
 * brand mark in its own colourway and a user with several installed can tell them
 * apart at a glance.
 *
 *   node scripts/native/gen-app-icons.mjs           # all six apps
 *   node scripts/native/gen-app-icons.mjs --app cpl # one app
 *
 * Background colour comes from the Falcon design tokens (src/styles/tokens.css).
 * Output is a FLATTENED (no alpha channel) 1024×1024 PNG — the App Store rejects
 * marketing icons with an alpha channel (see docs/RUNBOOK-ios-signing.md, "altool
 * error 1091"). Rendered with `sharp` (already a devDependency), so there's no
 * browser, network or Xcode dependency — it runs anywhere `npm ci` ran.
 *
 * These are brand-system placeholders (the real mark, recoloured), not final
 * bespoke per-app artwork — swap in real art before external distribution.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Falcon palette (src/styles/tokens.css). The night gradient is the shared canvas.
const NIGHT = '#0a0e12';
const DEEP = '#101a24';

// The real brand mark (transparent, 1024px) — its silhouette is our stencil.
const MARK = join(root, 'public', 'brand', 'flygaca-mark.png');

// App Store product → { Xcode target dir, duotone highlight (top) + shadow (bottom) }.
// Mirrors the APPS registry in scripts/build-ios-content.mjs (same six apps).
// "Desert & sky" heritage palette — one coherent family, one colourway per app.
const APPS = {
  ppl: { dir: 'PPL', hi: '#5fb585', sh: '#1f5537' }, // palm green
  elpt: { dir: 'ELPT', hi: '#6fb8e6', sh: '#245f86' }, // sky blue
  aip: { dir: 'AIP', hi: '#e6c98a', sh: '#8f6f34' }, // sand gold
  cpl: { dir: 'CPL', hi: '#e0946f', sh: '#8a4529' }, // terracotta
  ir: { dir: 'IR', hi: '#4fa2a6', sh: '#124447' }, // deep teal
  atpl: { dir: 'ATPL', hi: '#e08c66', sh: '#8a3a25' }, // sunset clay
};

const SIZE = 1024;
const MARK_SIZE = Math.round(SIZE * 0.82); // logo footprint within the canvas

// The shared night-gradient background (no chevron/label — the mark is the hero).
const backgroundSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${DEEP}"/>
      <stop offset="1" stop-color="${NIGHT}"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
</svg>`;

/** A MARK_SIZE² highlight→shadow vertical gradient to fill the falcon with. */
function duotoneSvg({ hi, sh }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${MARK_SIZE}" height="${MARK_SIZE}" viewBox="0 0 ${MARK_SIZE} ${MARK_SIZE}">
  <defs>
    <linearGradient id="d" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${hi}"/>
      <stop offset="1" stop-color="${sh}"/>
    </linearGradient>
  </defs>
  <rect width="${MARK_SIZE}" height="${MARK_SIZE}" fill="url(#d)"/>
</svg>`;
}

const contentsJson = JSON.stringify(
  {
    images: [
      { filename: 'AppIcon-1024.png', idiom: 'universal', platform: 'ios', size: '1024x1024' },
    ],
    info: { author: 'xcode', version: 1 },
  },
  null,
  2,
);

const catalogContentsJson = JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2);

async function generate(appId) {
  const app = APPS[appId];
  if (!app)
    throw new Error(
      `gen-app-icons: unknown app "${appId}" (known: ${Object.keys(APPS).join(', ')})`,
    );

  const assetsDir = join(root, 'apple', 'Apps', app.dir, 'Assets.xcassets');
  const iconSetDir = join(assetsDir, 'AppIcon.appiconset');
  mkdirSync(iconSetDir, { recursive: true });

  // Ensure the asset-catalog scaffolding exists (idempotent — matches the shape
  // Xcode/XcodeGen expects; PPL/ELPT/AIP already have these, CPL/IR/ATPL don't).
  writeFileSync(join(assetsDir, 'Contents.json'), `${catalogContentsJson}\n`);
  writeFileSync(join(iconSetDir, 'Contents.json'), `${contentsJson}\n`);

  // The falcon's own alpha channel is the stencil — preserves its shape, the gap
  // between the wings, and the soft antialiased edges.
  const mark = await sharp(MARK).resize(MARK_SIZE, MARK_SIZE, { fit: 'inside' }).png().toBuffer();

  // Fill that silhouette with the per-app duotone: render the gradient, then keep
  // it only where the mark is opaque (`dest-in` = destination ∩ source-alpha).
  const shapedMark = await sharp(Buffer.from(duotoneSvg(app)))
    .resize(MARK_SIZE, MARK_SIZE)
    .composite([{ input: mark, blend: 'dest-in' }])
    .png()
    .toBuffer();

  const composited = await sharp(Buffer.from(backgroundSvg))
    .composite([{ input: shapedMark, gravity: 'center' }])
    .png()
    .toBuffer();

  // Flatten in a SECOND pass: sharp applies flatten before composite within a
  // single pipeline, so the composite would otherwise re-introduce an alpha
  // channel. A fresh pipeline flattens the finished image onto the night
  // background, guaranteeing a no-alpha PNG (App Store marketing-icon requirement).
  const png = await sharp(composited).flatten({ background: NIGHT }).png().toBuffer();
  writeFileSync(join(iconSetDir, 'AppIcon-1024.png'), png);
  console.log(
    `✓ ${app.dir}: falcon duotone ${app.hi}→${app.sh} (${png.length.toLocaleString()} bytes)`,
  );
}

const argApp = (() => {
  const i = process.argv.indexOf('--app');
  return i >= 0 ? process.argv[i + 1]?.toLowerCase() : null;
})();

const targets = argApp ? [argApp] : Object.keys(APPS);
for (const id of targets) {
  await generate(id);
}
console.log(`\nGenerated ${targets.length} app icon${targets.length === 1 ? '' : 's'}.`);
