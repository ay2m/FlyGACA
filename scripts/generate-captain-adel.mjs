#!/usr/bin/env node
/**
 * Generate more images of Captain Adel with Gemini "Nano Banana"
 * (image-to-image, using public/img/captain/avatar.png as the identity reference
 * so every new render still looks like the same character).
 *
 * Dependency-free: talks to the Gemini REST API with plain `fetch`. Reads the key
 * from the environment or a gitignored .env.local / .env (GEMINI_API_KEY,
 * GOOGLE_GENAI_API_KEY, or GOOGLE_API_KEY). Never logs or commits the key.
 *
 * Usage:
 *   node scripts/generate-captain-adel.mjs --dry-run            # print prompts only (free, no key)
 *   node scripts/generate-captain-adel.mjs --only expressions --limit 2   # smoke test
 *   node scripts/generate-captain-adel.mjs --only turnaround    # Pass A (reference sheet)
 *   node scripts/generate-captain-adel.mjs                      # full batch
 *   node scripts/generate-captain-adel.mjs --only scenes --hires  # 2K via /interactions
 *   MODEL=gemini-3.1-flash-image node scripts/generate-captain-adel.mjs   # newer model
 *
 * Flags: --dry-run  --only <category|slug>  --limit N  --force  --hires
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CAPTAIN_DIR = join(ROOT, 'public/img/captain');
// Heavy originals live OUTSIDE public/ so Vite never ships them to dist; only the
// hand-picked, downscaled -256 variants graduate into public/img/captain/.
const OUT_DIR = join(ROOT, 'captain-art');
const REF_HEAD = join(CAPTAIN_DIR, 'avatar.png');
const REF_FULLBODY = join(OUT_DIR, '_ref-fullbody.png'); // produced in Pass A; optional

const MODEL = process.env.MODEL || 'gemini-2.5-flash-image';
const GEN_ENDPOINT = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;
const INTERACTIONS_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';

// ── Style lock: prefixed to every prompt so his identity holds across renders ──
const STYLE = [
  'In the exact same flat, clean cartoon vector-illustration style as the reference image:',
  'bold clean outlines, smooth cel shading, no photorealism.',
  'It is the same man — same face, warm brown skin tone, neatly trimmed black beard, same short',
  'hairstyle — wearing the white airline-pilot shirt with gold-striped epaulettes, a black tie,',
  'and the small gold winged pilot badge. Keep him clearly recognizable as the same person.',
].join(' ');

// ── Prompt catalog. refs: which reference image(s) to condition on. ──
const JOBS = [
  // Pass A — turnaround / full-body reference (white background)
  {
    slug: 'turnaround-sheet', category: 'turnaround', refs: ['head'],
    prompt:
      'Full-body character turnaround model sheet of Captain Adel on a plain white background: four views of the SAME standing pose in a row — front, three-quarter, side profile, and back — wearing the full pilot uniform (white shirt, black trousers, black shoes). Even studio lighting, consistent proportions across all four views.',
  },
  {
    slug: 'fullbody-front', category: 'turnaround', refs: ['head'],
    prompt:
      'Full-body front view of Captain Adel standing relaxed and friendly, arms at his sides, on a plain white background, wearing the complete pilot uniform: white epauletted shirt, black tie, black trousers, black shoes. Whole body visible head to toe, centered.',
  },

  // Pass B — expressions & poses (bust, soft brand-teal circular backdrop)
  { slug: 'smile', category: 'expressions', refs: ['head'],
    prompt: 'Head-and-shoulders bust, warm confident smile, looking at the viewer, on a soft teal circular backdrop.' },
  { slug: 'wave', category: 'expressions', refs: ['head'],
    prompt: 'Head-and-shoulders bust, friendly smile, raising one hand in a welcoming wave, on a soft teal circular backdrop.' },
  { slug: 'thumbs-up', category: 'expressions', refs: ['head'],
    prompt: 'Head-and-shoulders bust, encouraging smile, giving a thumbs-up, on a soft teal circular backdrop.' },
  { slug: 'thinking', category: 'expressions', refs: ['head'],
    prompt: 'Head-and-shoulders bust, thoughtful expression with a hand to his chin as if considering a question, on a soft teal circular backdrop.' },
  { slug: 'hold-caution', category: 'expressions', refs: ['head'],
    prompt: 'Head-and-shoulders bust, gentle cautious expression with an open palm raised in a calm "hold on" gesture (not alarmed), on a soft amber circular backdrop.' },
  { slug: 'pointing-explain', category: 'expressions', refs: ['head'],
    prompt: 'Head-and-shoulders bust, mid-explanation, pointing upward with one finger as if citing a regulation, on a soft teal circular backdrop.' },

  // Full scenes (16:9, environmental). Conditioned on head + full-body refs.
  { slug: 'cockpit', category: 'scenes', refs: ['head', 'fullbody'], aspect: '16:9',
    prompt: 'Captain Adel seated in a modern airliner cockpit, hands near the controls, calm and professional, glass instrument panels glowing softly behind him. Cinematic but in the same clean cartoon style.' },
  { slug: 'teaching-desk', category: 'scenes', refs: ['head', 'fullbody'], aspect: '16:9',
    prompt: 'Captain Adel standing beside a desk teaching, gesturing toward aviation charts and a stack of regulation books, friendly and approachable, in the same clean cartoon style.' },
  { slug: 'beside-jet', category: 'scenes', refs: ['head', 'fullbody'], aspect: '16:9',
    prompt: 'Captain Adel standing confidently on an airport apron beside a small business jet under a clear sky, full body visible, in the same clean cartoon style.' },
  { slug: 'fullbody-welcome', category: 'scenes', refs: ['head', 'fullbody'], aspect: '16:9',
    prompt: 'Captain Adel standing full-body with an open-handed welcoming gesture and a warm smile, on a clean dark teal gradient background (cockpit-dark brand backdrop), in the same clean cartoon style.' },

  // App-slot art (generated; favicons/social crops are produced by
  // archive/scripts/scripts/captain-derivatives.mjs — run it by hand after this)
  { slug: 'og-card', category: 'appslot', refs: ['head'], aspect: '16:9',
    prompt: 'Wide 16:9 social share banner, landscape orientation: Captain Adel bust on the right third, facing left, on a deep cockpit-dark navy-to-teal gradient background with empty negative space on the left for a headline. Clean cartoon style.' },
  { slug: 'loading-hero', category: 'appslot', refs: ['head'], aspect: '1:1',
    prompt: 'Captain Adel bust centered on a deep cockpit-dark circular brand backdrop with a subtle teal glow ring, friendly and ready, clean cartoon style — suitable as an app loading/splash image.' },
];

// ── CLI args ──
const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);
const getOpt = (f) => {
  const i = argv.indexOf(f);
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--')) return argv[i + 1];
  const inline = argv.find((a) => a.startsWith(`${f}=`));
  return inline ? inline.split('=').slice(1).join('=') : undefined;
};
const DRY = hasFlag('--dry-run');
const FORCE = hasFlag('--force');
const HIRES = hasFlag('--hires');
const ONLY = getOpt('--only');
const LIMIT = getOpt('--limit') ? parseInt(getOpt('--limit'), 10) : Infinity;

// ── Key loading (env, then gitignored .env.local / .env) ──
function loadKey() {
  const names = ['GEMINI_API_KEY', 'GOOGLE_GENAI_API_KEY', 'GOOGLE_API_KEY'];
  for (const n of names) if (process.env[n]) return process.env[n];
  for (const f of ['.env.local', '.env']) {
    const p = join(ROOT, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*(GEMINI_API_KEY|GOOGLE_GENAI_API_KEY|GOOGLE_API_KEY)\s*=\s*(.+?)\s*$/);
      if (m) return m[2].replace(/^["']|["']$/g, '');
    }
  }
  return null;
}

const REF_PATHS = { head: REF_HEAD, fullbody: REF_FULLBODY };

function loadRef(name) {
  const p = REF_PATHS[name];
  if (!p || !existsSync(p)) return null;
  return { mime_type: 'image/png', data: readFileSync(p).toString('base64') };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGenerateContent(fullPrompt, refParts, key) {
  const res = await fetch(GEN_ENDPOINT(MODEL), {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }, ...refParts.map((r) => ({ inline_data: r }))] }],
      generationConfig: { responseModalities: ['IMAGE'] },
    }),
  });
  if (!res.ok) return { status: res.status, error: await res.text() };
  const data = await res.json();
  const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data);
  const b64 = part?.inlineData?.data || part?.inline_data?.data;
  return b64 ? { b64 } : { status: 200, error: JSON.stringify(data).slice(0, 400) };
}

async function callInteractions(fullPrompt, refParts, key, aspect) {
  const res = await fetch(INTERACTIONS_ENDPOINT, {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'content-type': 'application/json', 'Api-Revision': '2026-05-20' },
    body: JSON.stringify({
      model: MODEL,
      input: [
        { type: 'text', text: fullPrompt },
        ...refParts.map((r) => ({ type: 'image', mime_type: r.mime_type, data: r.data })),
      ],
      response_format: { type: 'image', aspect_ratio: aspect || '16:9', image_size: '2K' },
    }),
  });
  if (!res.ok) return { status: res.status, error: await res.text() };
  const data = await res.json();
  const b64 =
    data?.output_image?.data ||
    data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
  return b64 ? { b64 } : { status: 200, error: JSON.stringify(data).slice(0, 400) };
}

async function generate(job, key) {
  const fullPrompt = `${STYLE}\n\n${job.prompt}`;
  const refParts = job.refs.map(loadRef).filter(Boolean);
  if (refParts.length === 0) refParts.push(loadRef('head')); // always anchor on the head
  const useHires = HIRES || job.hires;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const out = useHires
      ? await callInteractions(fullPrompt, refParts, key, job.aspect)
      : await callGenerateContent(fullPrompt, refParts, key);
    if (out.b64) return out.b64;
    const retriable = out.status === 429 || out.status >= 500;
    const msg = String(out.error || '').replace(key, '«key»').slice(0, 300);
    if (!retriable || attempt === 3) throw new Error(`HTTP ${out.status}: ${msg}`);
    const backoff = 2000 * 2 ** (attempt - 1);
    console.log(`    ↻ retry ${attempt}/2 in ${backoff / 1000}s (HTTP ${out.status})`);
    await sleep(backoff);
  }
  throw new Error('unreachable');
}

function writeContactSheet() {
  if (!existsSync(OUT_DIR)) return;
  const files = readdirSync(OUT_DIR).filter((f) => f.endsWith('.png') && !f.startsWith('_'));
  const byCat = {};
  for (const j of JOBS) (byCat[j.category] ??= []).push(j);
  const cards = files
    .map((f) => f.replace('.png', ''))
    .map((slug) => {
      const job = JOBS.find((j) => j.slug === slug);
      const cat = job?.category || 'derivative';
      return `<figure data-cat="${cat}"><img src="./${slug}.png" alt="${slug}" loading="lazy"><figcaption>${slug}<small>${cat}</small></figcaption></figure>`;
    })
    .join('\n');
  const html = `<!doctype html><meta charset="utf-8"><title>Captain Adel — contact sheet</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;padding:32px;background:#0a0e12;color:#e8edf2;font:15px/1.5 system-ui,sans-serif}
  h1{font-size:20px;margin:0 0 4px} p{color:#9da9b4;margin:0 0 24px}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px}
  figure{margin:0;background:#0f1a24;border:1px solid #26384a;border-radius:14px;overflow:hidden}
  img{display:block;width:100%;aspect-ratio:1;object-fit:contain;background:#13212e}
  figcaption{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;font-weight:600}
  small{color:#4a9cb8;font-weight:500;text-transform:uppercase;letter-spacing:.06em;font-size:11px}
</style>
<h1>Captain Adel — generated contact sheet</h1>
<p>${files.length} image(s) · model ${MODEL} · review and flag any off-model renders</p>
<div class="grid">
${cards}
</div>`;
  writeFileSync(join(OUT_DIR, 'contact-sheet.html'), html);
}

async function main() {
  let jobs = JOBS.filter((j) => !ONLY || j.category === ONLY || j.slug === ONLY);
  if (jobs.length === 0) {
    console.error(`No jobs match --only "${ONLY}". Categories: ${[...new Set(JOBS.map((j) => j.category))].join(', ')}`);
    process.exit(1);
  }
  jobs = jobs.slice(0, LIMIT);

  console.log(`Captain Adel generator — ${jobs.length} job(s)${DRY ? ' (DRY RUN)' : ''}, model=${MODEL}${HIRES ? ', hires' : ''}\n`);

  if (DRY) {
    for (const j of jobs) {
      console.log(`• ${j.slug}  [${j.category}]  refs=${j.refs.join('+')}${j.hires ? '  hires' : ''}`);
      console.log(`    ${STYLE}\n    ${j.prompt}\n`);
    }
    console.log('Dry run only — no API calls, no cost. Provide GEMINI_API_KEY and re-run without --dry-run.');
    return;
  }

  const key = loadKey();
  if (!key) {
    console.error('✗ No API key. Set GEMINI_API_KEY in your shell or in a gitignored .env.local, then re-run.');
    console.error('  Get one free at https://aistudio.google.com/apikey');
    process.exit(1);
  }
  if (!existsSync(REF_HEAD)) {
    console.error(`✗ Missing reference image: ${REF_HEAD}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const manifest = [];
  let ok = 0;
  for (const job of jobs) {
    const outFile = job.slug === 'fullbody-front' ? REF_FULLBODY : join(OUT_DIR, `${job.slug}.png`);
    if (existsSync(outFile) && !FORCE) {
      console.log(`• ${job.slug} — exists, skipping (use --force to regenerate)`);
      continue;
    }
    process.stdout.write(`• ${job.slug} [${job.category}] … `);
    try {
      const b64 = await generate(job, key);
      const buf = Buffer.from(b64, 'base64');
      writeFileSync(outFile, buf);
      // Also keep a copy of the picked full-body in captain-art/ for the contact sheet.
      if (job.slug === 'fullbody-front') writeFileSync(join(OUT_DIR, 'fullbody-front.png'), buf);
      console.log(`✓ ${(buf.length / 1024).toFixed(0)} KB`);
      manifest.push({ slug: job.slug, category: job.category, file: outFile.replace(ROOT + '/', ''), bytes: buf.length, model: MODEL });
      ok++;
    } catch (e) {
      console.log(`✗ ${e.message}`);
      manifest.push({ slug: job.slug, category: job.category, error: e.message });
    }
  }

  writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify({ generatedAt: new Date().toISOString(), model: MODEL, results: manifest }, null, 2));
  writeContactSheet();
  console.log(`\nDone: ${ok}/${jobs.length} generated → ${OUT_DIR.replace(ROOT + '/', '')}/`);
  console.log('Open captain-art/contact-sheet.html to review.');
}

main().catch((e) => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
