/**
 * normalize-corpus-data — rewrite the committed corpus JSON from legacy no-build
 * links to the semantic shapes the app models (see src/lib/content.ts ·
 * toSearchRef/linkHref), so routing lives in the frontend rather than the data.
 *
 *   • library-search.json      entry `u`            → { kind, id, anchor? }
 *   • definitions-index.json   drop dead `url`
 *   • paths-index.json         steps[].url          → { kind,id,anchor } | { route }
 *   • groundschool.json        …lessons[].read.url  → { kind,id,anchor } | { route }
 *   • quiz.json                …questions[].citeUrl → { citeRef: { kind,id,anchor } }
 *                              (the existing `cite` display label is left as-is)
 *
 * Internal `.html` page links become app routes; corpus `document.html?…` links
 * become semantic pointers. Idempotent and lossless: already-migrated records are
 * left untouched, and any link that can't be resolved keeps its original string
 * (and is reported) so nothing is silently dropped. Re-run after a corpus sync
 * (wired into `sync:gaca:apply`) until the upstream builders emit these shapes.
 *
 *   node scripts/normalize-corpus-data.mjs [--dry]
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const kb = (n) => `${(n / 1024).toFixed(0)} kB`;

/** Legacy `type=` token → corpus kind (mirrors src/lib/content.ts). */
const TYPE_TO_KIND = { regulations: 'regulations', reference: 'reference', handbooks: 'handbook' };

/** Parse a legacy `document.html?type=…&id=…#…` URL into `{ kind, id, anchor? }`. */
function parseCorpus(u) {
  const type = /[?&]type=([^&#]+)/.exec(u)?.[1];
  const id = /[?&]id=([^&#]+)/.exec(u)?.[1];
  const kind = type ? TYPE_TO_KIND[type] : undefined;
  if (!id || !kind) return null;
  const anchor = /#(.+)$/.exec(u)?.[1];
  return anchor ? { kind, id, anchor } : { kind, id };
}

/** Rewrite a legacy internal `.html` page link to its app route, or null. */
function toRoute(u) {
  let s = u.replace(/^(?:\.\.\/)+/, '').replace(/^\//, '');
  s = s.replace(/^tools\/vfr\.html$/i, 'tools/vfr-minima.html'); // stale slug: "VFR weather minima"
  const page = /^(guides|tools)\/([a-z0-9-]+)\.html$/i.exec(s);
  if (page) return `/${page[1]}/${page[2]}`;
  if (/^library\.html$/i.test(s)) return '/library';
  if (/^study\/groundschool\.html$/i.test(s)) return '/study/groundschool';
  const quiz = /^study\/quiz\.html(\?[^#]*)?$/i.exec(s);
  if (quiz) return `/study/quiz${quiz[1] ?? ''}`;
  return null;
}

/** Convert a legacy link string into semantic fields, or null if unroutable. */
function toLink(u) {
  const ref = parseCorpus(u);
  if (ref) return ref;
  const route = toRoute(u);
  if (route) return { route };
  return null;
}

/** Read JSON, remembering the file's indent so we round-trip its formatting. */
async function readJson(name) {
  const path = resolve(ROOT, 'public/data', name);
  const raw = await readFile(path, 'utf8');
  const indent = /^\{\n( +)"/.exec(raw)?.[1].length ?? 0;
  return { path, raw, indent, data: JSON.parse(raw) };
}

async function writeJson(path, data, indent, raw) {
  const out = indent ? JSON.stringify(data, null, indent) + '\n' : JSON.stringify(data);
  if (!DRY) await writeFile(path, out, 'utf8');
  return { before: raw.length, after: out.length };
}

const tag = (before, after) => `${kb(before)} → ${kb(after)}${DRY ? ' [dry-run]' : ''}`;

async function librarySearch() {
  const { path, raw, indent, data } = await readJson('library-search.json');
  let migrated = 0,
    already = 0,
    skipped = 0;
  data.entries = data.entries.map((e) => {
    if (e.u == null) return already++, e;
    const ref = parseCorpus(e.u);
    if (!ref) return skipped++, e;
    migrated++;
    const { u: _u, ...rest } = e;
    return { ...rest, ...ref };
  });
  const { before, after } = await writeJson(path, data, indent, raw);
  console.log(`library-search.json: ${migrated} migrated, ${already} kept, ${skipped} unparsable · ${tag(before, after)}`);
}

async function definitions() {
  const { path, raw, indent, data } = await readJson('definitions-index.json');
  let stripped = 0;
  data.terms = data.terms.map((t) => {
    if (!('url' in t)) return t;
    stripped++;
    const { url: _url, ...rest } = t;
    return rest;
  });
  const { before, after } = await writeJson(path, data, indent, raw);
  console.log(`definitions-index.json: ${stripped} dead url dropped · ${tag(before, after)}`);
}

async function paths() {
  const { path, raw, indent, data } = await readJson('paths-index.json');
  let migrated = 0,
    already = 0,
    skipped = 0;
  for (const p of data.paths) {
    p.steps = p.steps.map((s) => {
      if (s.url == null) return already++, s;
      const link = toLink(s.url);
      if (!link) return skipped++, s;
      migrated++;
      const { url: _url, ...rest } = s;
      return { ...rest, ...link };
    });
  }
  const { before, after } = await writeJson(path, data, indent, raw);
  console.log(`paths-index.json: ${migrated} steps migrated, ${already} kept, ${skipped} unroutable · ${tag(before, after)}`);
}

async function groundschool() {
  const { path, raw, indent, data } = await readJson('groundschool.json');
  let migrated = 0,
    already = 0,
    skipped = 0;
  for (const m of data.modules) {
    for (const lesson of m.lessons) {
      if (!lesson.read || lesson.read.url == null) {
        if (lesson.read) already++;
        continue;
      }
      const link = toLink(lesson.read.url);
      if (!link) {
        skipped++;
        continue;
      }
      migrated++;
      const { url: _url, ...rest } = lesson.read;
      lesson.read = { ...rest, ...link };
    }
  }
  const { before, after } = await writeJson(path, data, indent, raw);
  console.log(`groundschool.json: ${migrated} read links migrated, ${already} kept, ${skipped} unroutable · ${tag(before, after)}`);
}

async function quiz() {
  const { path, raw, indent, data } = await readJson('quiz.json');
  let migrated = 0,
    dropped = 0; // empty / non-corpus citeUrls: not a valid corpus citation
  for (const b of data.banks) {
    for (const q of b.questions) {
      if (q.citeUrl == null) continue;
      const ref = parseCorpus(q.citeUrl); // `cite` is a display label — never touch it
      delete q.citeUrl;
      if (ref) {
        migrated++;
        q.citeRef = ref;
      } else {
        dropped++;
      }
    }
  }
  const { before, after } = await writeJson(path, data, indent, raw);
  console.log(`quiz.json: ${migrated} citations migrated, ${dropped} non-corpus dropped · ${tag(before, after)}`);
}

await librarySearch();
await definitions();
await paths();
await groundschool();
await quiz();
