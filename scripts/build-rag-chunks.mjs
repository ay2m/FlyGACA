/**
 * build-rag-chunks — generate public/data/rag-chunks.json.
 *
 * Runs the hierarchical splitter (scripts/lib/markdown-splitter.mjs) over every
 * GACAR Part HTML in public/data/parts/, joins per-document metadata from
 * gacar-index.json, and emits a lineage-tagged chunk index. The output reuses
 * the `{d,b,u,x}` keys of library-search.json (so the BM25 retriever in
 * functions/src/corpus.ts ingests it with zero structural change) plus an
 * additive `lineage` block the new code reads when present.
 *
 *   npm run build:chunks
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { splitPartHtml } from './lib/markdown-splitter.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const INDEX_PATH = resolve(ROOT, 'public/data/gacar-index.json');
const PARTS_DIR = resolve(ROOT, 'public/data/parts');
const OUT_PATH = resolve(ROOT, 'public/data/rag-chunks.json');

/** "2026-06-13" → "2026-06" (corpus-wide effective-date fallback). */
function toMonth(generated) {
  return typeof generated === 'string' ? generated.slice(0, 7) : '';
}

async function main() {
  const index = JSON.parse(await readFile(INDEX_PATH, 'utf8'));
  const fallbackDate = toMonth(index.generated);
  const documents = Array.isArray(index.documents) ? index.documents : [];

  const entries = [];
  let docs = 0;
  let dropped = 0;
  for (const doc of documents) {
    const htmlPath = resolve(PARTS_DIR, `${doc.slug}.html`);
    if (!existsSync(htmlPath)) continue; // not every indexed doc has HTML yet
    const html = await readFile(htmlPath, 'utf8');
    const meta = {
      slug: doc.slug,
      part: doc.part,
      title: doc.title,
      effectiveDate: doc.effectiveDate ?? fallbackDate,
      revision: doc.revision,
    };
    const chunks = splitPartHtml(html, meta);
    docs++;
    for (const c of chunks) {
      if (c.dropped) dropped++;
      entries.push({
        d: c.title,
        b: `Part ${doc.part}`,
        u: c.url,
        x: c.text,
        lineage: {
          document: c.document,
          subpart: c.subpart,
          section: c.section,
          paragraph: c.paragraph,
          sub_paragraph: c.sub_paragraph,
          title: c.title,
          effective_date: c.effective_date,
        },
        ...(c.dropped ? { dropped: true } : {}),
      });
    }
  }

  const out = {
    generated: toMonth(index.generated) ? index.generated : '',
    source: 'hierarchical-splitter@1',
    count: entries.length,
    entries,
  };
  await writeFile(OUT_PATH, JSON.stringify(out), 'utf8');
  console.log(
    `build-rag-chunks: ${entries.length} chunks from ${docs} parts ` +
      `(${dropped} flagged dropped) → ${OUT_PATH}`,
  );
}

main().catch((err) => {
  console.error('build-rag-chunks failed:', err);
  process.exit(1);
});
