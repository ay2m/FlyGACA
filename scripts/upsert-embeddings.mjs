/**
 * upsert-embeddings — embed the regulatory Markdown corpus into Supabase pgvector.
 *
 * The embeddings job of the docs-parser GitHub Action. It chunks each content/regulations/part-*.md
 * by section, embeds new/changed chunks with OpenAI text-embedding-3-small (1536 dims), and upserts
 * them into the `regulation_chunks` table (see supabase/migrations/0001_regulations_embeddings.sql)
 * so the external Captain Adel RAG service retrieves fresh, citeable content.
 *
 * SECRET-GUARDED: if SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or OPENAI_API_KEY are unset, it logs a
 * skip notice and exits 0 — forks and credential-less CI stay green, never fail (mirrors the
 * optional-secret handling in .github/workflows/deploy-cloudflare.yml).
 *
 * Idempotent: each chunk carries a content_hash; chunks whose hash already matches the stored row
 * are skipped, so re-running only embeds what actually changed.
 *
 * Usage: node scripts/upsert-embeddings.mjs [--dry-run]
 *   --dry-run   chunk + diff against the table, but do not call OpenAI or write (still needs
 *               Supabase creds to read existing hashes; without any creds it skip-exits first).
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import matter from 'gray-matter';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = join(root, 'content/regulations');

const DRY_RUN = process.argv.slice(2).includes('--dry-run');

const EMBED_MODEL = 'text-embedding-3-small';
const EMBED_DIMS = 1536;
const TABLE = 'regulation_chunks';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY } = process.env;

// --- secret guard -----------------------------------------------------------------------------
const missing = [
  ['SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_SERVICE_ROLE_KEY', SUPABASE_SERVICE_ROLE_KEY],
  ['OPENAI_API_KEY', OPENAI_API_KEY],
].filter(([, v]) => !v).map(([k]) => k);

if (missing.length) {
  console.log(
    `upsert-embeddings: skipping — missing secret(s): ${missing.join(', ')}.\n` +
      'Set them as repository secrets to enable the embeddings upsert. Exiting 0 (not a failure).',
  );
  process.exit(0);
}

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

// --- chunk the corpus by section --------------------------------------------------------------
/** Split a Part's Markdown body into { section, content } chunks at each H2 (`## `) heading. */
function chunkPart(slug, raw) {
  const { data: fm, content } = matter(raw);
  const lines = content.split('\n');
  const chunks = [];
  let section = 'Preamble';
  let buf = [];

  const flush = () => {
    const body = buf.join('\n').trim();
    if (body) chunks.push({ section, body });
    buf = [];
  };

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)$/);
    if (h2) {
      flush();
      section = h2[1].trim();
    } else {
      buf.push(line);
    }
  }
  flush();

  return chunks.map((c, i) => {
    const content = `${c.section}\n\n${c.body}`;
    return {
      id: `${slug}::${i}`,
      slug,
      part_num: Number(fm.partNum),
      section: c.section,
      content,
      content_hash: sha256(content),
      metadata: { title: String(fm.title), category: String(fm.category), slug },
    };
  });
}

const files = readdirSync(CONTENT_DIR).filter((f) => /^part-\d+\.md$/.test(f)).sort();
const chunks = files.flatMap((f) =>
  chunkPart(f.replace(/\.md$/, ''), readFileSync(join(CONTENT_DIR, f), 'utf8')),
);
console.log(`upsert-embeddings: ${files.length} Part(s) → ${chunks.length} chunk(s).`);

// --- Supabase REST helpers (PostgREST) --------------------------------------------------------
const sbBase = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1`;
const sbHeaders = {
  apikey: SUPABASE_SERVICE_ROLE_KEY,
  Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  'Content-Type': 'application/json',
};

async function fetchExistingHashes() {
  const res = await fetch(`${sbBase}/${TABLE}?select=id,content_hash`, { headers: sbHeaders });
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return new Map(rows.map((r) => [r.id, r.content_hash]));
}

async function upsertRows(rows) {
  const res = await fetch(`${sbBase}/${TABLE}`, {
    method: 'POST',
    headers: { ...sbHeaders, Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`Supabase upsert failed: ${res.status} ${await res.text()}`);
}

// --- OpenAI embeddings ------------------------------------------------------------------------
async function embed(texts) {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBED_MODEL, dimensions: EMBED_DIMS, input: texts }),
  });
  if (!res.ok) throw new Error(`OpenAI embeddings failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

// --- diff → embed → upsert --------------------------------------------------------------------
try {
  const existing = await fetchExistingHashes();
  const changed = chunks.filter((c) => existing.get(c.id) !== c.content_hash);
  const skipped = chunks.length - changed.length;

  if (changed.length === 0) {
    console.log(`✔ nothing to upsert — all ${chunks.length} chunk(s) already current.`);
    process.exit(0);
  }
  console.log(`  ${changed.length} new/changed · ${skipped} unchanged (skipped).`);

  if (DRY_RUN) {
    console.log('--dry-run: not calling OpenAI or writing. Would upsert:');
    for (const c of changed) console.log(`    ${c.id}  (${c.section})`);
    process.exit(0);
  }

  // Embed in batches to bound request size.
  const BATCH = 64;
  for (let i = 0; i < changed.length; i += BATCH) {
    const slice = changed.slice(i, i + BATCH);
    const vectors = await embed(slice.map((c) => c.content));
    const rows = slice.map((c, j) => ({ ...c, embedding: vectors[j] }));
    await upsertRows(rows);
    console.log(`  upserted ${Math.min(i + BATCH, changed.length)}/${changed.length}`);
  }

  console.log(`\n✔ upserted ${changed.length} chunk(s) into ${TABLE}.`);
} catch (err) {
  console.error(`✖ ${err.message}`);
  process.exit(1);
}
