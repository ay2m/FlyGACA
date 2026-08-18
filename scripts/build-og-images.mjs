/**
 * Generate the per-section Open Graph cards (1200×630) referenced by
 * `ogImageFor()` in src/lib/seo/seo.ts. One-shot, idempotent generator — run it when
 * the template or section list changes (`npm run gen:og`); the PNGs are committed
 * to public/img/ and Vite copies public/ into dist/ verbatim (there is no
 * build-time image step, matching scripts/optimize-images.mjs).
 *
 * The default card (og-card.png) is the existing site-wide card and is left
 * untouched here — these only add the section variants.
 */
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMG = join(root, 'public/img');

// Falcon palette (mirrors src/styles/tokens.css).
const NIGHT = '#0a0e12';
const DEEP = '#0f1a24';
const TEAL = '#2d6e8a';
const SAGE = '#8fc9a8';
const GOLD = '#c8a04a';
const TEXT = '#e8edf2';
const MUTED = '#9da9b4';

// Section → headline + eyebrow shown on the card. Keys match ogImageFor()'s
// per-section files (og-<section>.png).
const SECTIONS = [
  { id: 'tools', eyebrow: 'Flight tools', title: 'Free flight calculators' },
  { id: 'guides', eyebrow: 'Study guides', title: 'Saudi aviation study guides' },
  { id: 'library', eyebrow: 'Regulatory library', title: 'GACAR — the Saudi reg library' },
  { id: 'study', eyebrow: 'Study', title: 'Practice, drill & stay current' },
  { id: 'pricing', eyebrow: 'Plans', title: 'Fly GACA plans' },
];

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function card({ eyebrow, title }) {
  // 1200×630, dark canvas with a teal→sage hairline, brand wordmark, eyebrow and
  // headline. Plain SVG so sharp rasterizes it without a browser.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${NIGHT}"/>
      <stop offset="1" stop-color="${DEEP}"/>
    </linearGradient>
    <linearGradient id="wing" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${TEAL}"/>
      <stop offset="1" stop-color="${SAGE}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="8" fill="url(#wing)"/>
  <g font-family="'Readex Pro', system-ui, -apple-system, Segoe UI, Roboto, sans-serif">
    <text x="80" y="150" fill="${TEXT}" font-size="40" font-weight="700">Fly GACA</text>
    <text x="310" y="150" fill="${GOLD}" font-size="22" font-weight="600" letter-spacing="3">SAUDI AVIATION</text>
    <text x="80" y="330" fill="${SAGE}" font-size="26" font-weight="600" letter-spacing="4">${esc(
      eyebrow,
    ).toUpperCase()}</text>
    <text x="80" y="410" fill="${TEXT}" font-size="64" font-weight="700">${esc(title)}</text>
    <text x="80" y="560" fill="${MUTED}" font-size="26" font-weight="400">Independent · Educational · Bilingual · Not affiliated with GACA</text>
  </g>
</svg>`;
}

let out = '';
for (const s of SECTIONS) {
  const png = await sharp(Buffer.from(card(s))).png({ compressionLevel: 9 }).toBuffer();
  const file = join(IMG, `og-${s.id}.png`);
  await writeFile(file, png);
  out += `  og-${s.id}.png  ${(png.length / 1024).toFixed(1)} KB\n`;
}
process.stdout.write(`Generated ${SECTIONS.length} OG cards:\n${out}`);
