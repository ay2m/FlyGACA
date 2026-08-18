/**
 * One-shot raster-image optimizer for the few oversized images in public/img.
 * Run after changing one of the source files: `npm run optimize:img`. Idempotent
 * (re-encoding an already-optimized file just rewrites it the same way). Results
 * are committed to the repo — Vite copies public/ into dist/ verbatim, there is
 * no build-time image step.
 *
 * Why: the brand mark shipped at 777×777 / ~256 KB but renders at ≤36 px, and the
 * og-card was a 650 KB PNG — together the bulk of PageSpeed's "improve image
 * delivery" finding. We keep filenames + dimensions (except the intentional mark
 * downscale) so no markup/meta references change.
 */
import sharp from 'sharp';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMG = join(root, 'public/img');
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

// Curated, high-impact set only — favicons, PWA icons and captain art are left
// untouched (not on the critical path / avoid quality regressions).
const JOBS = [
  // The lockup mark renders at ≤36 px CSS; 96 px covers up to ~2.6× DPR.
  { file: 'flygaca-mark.png', maxSize: 96 },
  // 1200×630 social card — recompress, keep dimensions.
  { file: 'og-card.png' },
];

for (const { file, maxSize } of JOBS) {
  const path = join(IMG, file);
  const before = (await stat(path)).size;
  let img = sharp(await readFile(path)).rotate();
  if (maxSize) img = img.resize(maxSize, maxSize, { fit: 'inside', withoutEnlargement: true });
  const out = await img.png({ compressionLevel: 9, quality: 82, effort: 10, palette: true }).toBuffer();
  await writeFile(path, out);
  console.log(`  ${basename(path).padEnd(22)} ${kb(before).padStart(10)} → ${kb(out.length).padStart(9)}`);
}
console.log('Done.');
