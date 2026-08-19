/**
 * Retrieval over the GACAR corpus (DESIGN §3 D2 / §6.3). v1 is a static,
 * deterministic lexical/BM25 index over `rag-chunks.json` — no vector store, no
 * extra infra. The retriever's interface is the seam a future vector/hybrid swap
 * happens behind.
 *
 * Each corpus entry is `{ d: heading, b: "Part N" badge, u: legacy URL+anchor,
 * x: passage text }`. We map every retrieved passage to a `ChatSource` carrying
 * a real part/section/url/verbatim/corpusVersion so citations are exact.
 */
import { readFile } from "node:fs/promises";
import type { ChatSource } from "./contract.js";

/** Full legal lineage emitted by the hierarchical splitter (data/rag-chunks.json —
 *  a backend input at the repo root, deliberately not served from public/data). */
export interface Lineage {
  document: string;
  subpart?: string | null;
  section?: string | null;
  paragraph?: string | null;
  sub_paragraph?: string | null;
  title?: string | null;
  effective_date?: string | null;
}

/**
 * Raw entry shape: `{d,b,u,x}` plus an optional `lineage` block, which is what
 * `scripts/build-rag-chunks.mjs` emits into `data/rag-chunks.json`.
 *
 * NOT `library-search.json` — that is the browser's search index, and
 * `scripts/normalize-corpus-data.mjs` has since replaced its `u` with structured
 * `{kind,id,anchor}` fields. Pointing CORPUS_URL at it throws
 * `corpus: entry 0 is missing a string d/b/u field` at the first question.
 */
interface SearchEntry {
  d: string;
  b: string;
  u: string;
  x?: string;
  lineage?: Lineage;
}

interface SearchIndex {
  generated: string;
  count: number;
  scope: string;
  entries: SearchEntry[];
}

export interface Retrieved {
  entry: SearchEntry;
  /** BM25 score (higher = more relevant). */
  score: number;
}

/**
 * Where the corpus is loaded from. An `http(s)` value is fetched (point it at the
 * bucket or CDN serving `/data`); anything else is read from disk (local dev,
 * tests, or a copy baked into the container image).
 */
const CORPUS_URL = process.env.CORPUS_URL ?? "/data/rag-chunks.json";

// ----------------------------------------------------------------------------
// Tokenization
// ----------------------------------------------------------------------------

// Small English stopword set — enough to denoise BM25 without dropping aviation
// terms. (Arabic queries against this English corpus are a known v1 limitation;
// see DESIGN §3 D2 — promote to embeddings if cross-lingual recall is needed.)
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are",
  "be", "as", "at", "by", "it", "this", "that", "with", "from", "what", "which",
  "how", "do", "does", "can", "i", "my", "me", "you", "your",
]);

const TOKEN_RE = /[\p{L}\p{N}]+/gu;

function tokenize(text: string): string[] {
  const out: string[] = [];
  const matches = text.toLowerCase().matchAll(TOKEN_RE);
  for (const m of matches) {
    const tok = m[0];
    if (tok.length < 2 || STOPWORDS.has(tok)) continue;
    out.push(tok);
  }
  return out;
}

// ----------------------------------------------------------------------------
// BM25 index
// ----------------------------------------------------------------------------

const K1 = 1.5;
const B = 0.75;
/** Heading (`d`) tokens count this many times — a light field boost. */
const HEADING_BOOST = 2;

interface Posting {
  id: number;
  tf: number;
}

class Bm25Index {
  readonly generated: string;
  private readonly entries: SearchEntry[];
  private readonly postings = new Map<string, Posting[]>();
  private readonly docLen: number[] = [];
  private readonly avgdl: number;
  private readonly n: number;

  constructor(index: SearchIndex) {
    this.generated = index.generated;
    this.entries = index.entries;
    this.n = index.entries.length;

    let total = 0;
    for (let id = 0; id < this.entries.length; id++) {
      const e = this.entries[id];
      const tokens = tokenize(e.x ?? "");
      // Boost heading tokens by repeating them.
      const headingTokens = tokenize(e.d ?? "");
      for (let i = 0; i < HEADING_BOOST; i++) tokens.push(...headingTokens);

      const tf = new Map<string, number>();
      for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);

      this.docLen[id] = tokens.length;
      total += tokens.length;

      for (const [term, freq] of tf) {
        let list = this.postings.get(term);
        if (!list) {
          list = [];
          this.postings.set(term, list);
        }
        list.push({ id, tf: freq });
      }
    }
    this.avgdl = this.n > 0 ? total / this.n : 0;
  }

  private idf(term: string): number {
    const df = this.postings.get(term)?.length ?? 0;
    if (df === 0) return 0;
    // BM25 idf with the +1 smoothing so it never goes negative.
    return Math.log(1 + (this.n - df + 0.5) / (df + 0.5));
  }

  search(query: string, k: number): Retrieved[] {
    const terms = new Set(tokenize(query));
    if (terms.size === 0) return [];

    const scores = new Map<number, number>();
    for (const term of terms) {
      const list = this.postings.get(term);
      if (!list) continue;
      const idf = this.idf(term);
      for (const { id, tf } of list) {
        const dl = this.docLen[id];
        const denom = tf + K1 * (1 - B + (B * dl) / (this.avgdl || 1));
        const contribution = idf * ((tf * (K1 + 1)) / (denom || 1));
        scores.set(id, (scores.get(id) ?? 0) + contribution);
      }
    }

    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, k)
      .map(([id, score]) => ({ entry: this.entries[id], score }));
  }
}

// ----------------------------------------------------------------------------
// Lazy, cached load
// ----------------------------------------------------------------------------

let indexPromise: Promise<Bm25Index> | null = null;

/**
 * Validate parsed JSON against the `SearchIndex` shape, or throw a clear
 * `corpus: …` error. Defense-in-depth: the index is loaded at runtime (fetched
 * from Hosting, or read from disk in the emulator/tests), and a truncated,
 * wrong-content, or otherwise malformed response would otherwise be cast blindly
 * and flow into the BM25 index that grounds Captain Adel's citations.
 */
export function parseSearchIndex(value: unknown): SearchIndex {
  if (typeof value !== "object" || value === null) {
    throw new Error("corpus: index is not an object");
  }
  const obj = value as Record<string, unknown>;
  if (!Array.isArray(obj.entries) || obj.entries.length === 0) {
    throw new Error("corpus: 'entries' is missing or empty");
  }
  for (let i = 0; i < obj.entries.length; i++) {
    const e = obj.entries[i] as Record<string, unknown> | null;
    if (typeof e !== "object" || e === null) {
      throw new Error(`corpus: entry ${i} is not an object`);
    }
    if (typeof e.d !== "string" || typeof e.b !== "string" || typeof e.u !== "string") {
      throw new Error(`corpus: entry ${i} is missing a string d/b/u field`);
    }
    if (e.x !== undefined && typeof e.x !== "string") {
      throw new Error(`corpus: entry ${i} has a non-string 'x'`);
    }
    // Lineage is optional and additive: a malformed block is dropped (the entry
    // still indexes/retrieves), never fatal.
    if (e.lineage !== undefined) {
      const lin = e.lineage as Record<string, unknown> | null;
      if (typeof lin !== "object" || lin === null || typeof lin.document !== "string") {
        console.warn(`corpus: entry ${i} has a malformed 'lineage' — dropping it`);
        delete e.lineage;
      }
    }
  }
  // `generated`/`scope` are tolerant — `generated` only labels the citation rev.
  const generated = typeof obj.generated === "string" ? obj.generated : "";
  const scope = typeof obj.scope === "string" ? obj.scope : "";
  if (typeof obj.count === "number" && obj.count !== obj.entries.length) {
    // A count/length mismatch is a truncation signal, but not necessarily fatal.
    console.warn(`corpus: count ${obj.count} != entries.length ${obj.entries.length}`);
  }
  return { generated, scope, count: obj.entries.length, entries: obj.entries as SearchEntry[] };
}

async function loadRaw(): Promise<SearchIndex> {
  const source = CORPUS_URL;
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`corpus fetch failed: ${res.status} ${source}`);
    return parseSearchIndex(await res.json());
  }
  return parseSearchIndex(JSON.parse(await readFile(source, "utf8")));
}

/** Build (or return the cached) BM25 index. Warm instances reuse it. */
export function getIndex(): Promise<Bm25Index> {
  if (!indexPromise) {
    indexPromise = loadRaw()
      .then((raw) => new Bm25Index(raw))
      .catch((err) => {
        indexPromise = null; // allow retry on the next request
        throw err;
      });
  }
  return indexPromise;
}

/** Retrieve the top-`k` passages for a query. */
export async function retrieve(query: string, k = 6): Promise<Retrieved[]> {
  const index = await getIndex();
  return index.search(query, k);
}

// ----------------------------------------------------------------------------
// Citation mapping (replicates `searchHref` in src/lib/content.ts)
// ----------------------------------------------------------------------------

const TYPE_TO_BASE: Record<string, string> = {
  regulations: "/library",
  reference: "/library/reference",
  handbooks: "/library/handbook",
};

/** Rewrite a legacy search-index URL to the app's Document-reader route. */
export function searchHref(u: string): string | null {
  const type = /[?&]type=([^&#]+)/.exec(u)?.[1];
  const id = /[?&]id=([^&#]+)/.exec(u)?.[1];
  const base = type ? TYPE_TO_BASE[type] : undefined;
  if (!id || !base) return null;
  const anchor = /#(.+)$/.exec(u)?.[1];
  return `${base}/${id}${anchor ? `#${anchor}` : ""}`;
}

function partOf(badge: string): string | undefined {
  return /Part\s+([\w.-]+)/i.exec(badge)?.[1];
}

function sectionOf(u: string): string | undefined {
  const anchor = /#(?:sec-)?(.+)$/.exec(u)?.[1];
  return anchor ? anchor : undefined;
}

function partFromDocument(document: string): string | undefined {
  return /Part_(\w+)/.exec(document)?.[1];
}

/**
 * Render the `(b)(1)(i)` paragraph path from a lineage block. The `#N`
 * occurrence suffix the splitter adds to disambiguate OCR-collapsed siblings is
 * kept in the metadata (for lineage uniqueness) but stripped from the citation.
 */
function paragraphPath(lin: Lineage): string {
  const parts: string[] = [];
  if (lin.paragraph) parts.push(lin.paragraph);
  if (lin.sub_paragraph) parts.push(...lin.sub_paragraph.split("_"));
  return parts.map((p) => `(${p.replace(/#\d+$/, "")})`).join("");
}

/** Exact, lineage-aware citation, e.g. `GACAR Part 61 §61.107(b)(1)(i) — Title`. */
function lineageCitation(lin: Lineage, badge: string, heading: string): string {
  const part = partFromDocument(lin.document) ?? partOf(badge);
  const title = (lin.title ?? heading ?? "").trim();
  if (lin.section) {
    return `GACAR Part ${part ?? ""} §${lin.section}${paragraphPath(lin)}${title ? ` — ${title}` : ""}`.trim();
  }
  // Non-numbered passage (e.g. Part 1 Definitions): fall back to badge + title.
  return `GACAR ${badge}${title ? ` — ${title}` : ""}`.trim();
}

/** Map a retrieved entry to the public `ChatSource` shape. */
export function toChatSource(entry: SearchEntry, generated: string): ChatSource {
  const badge = entry.b?.trim() ?? "";
  const heading = entry.d?.trim() ?? "";
  const lin = entry.lineage;
  const citation = lin
    ? lineageCitation(lin, badge, heading)
    : /^Part\b/i.test(badge)
      ? `GACAR ${badge}${heading ? ` — ${heading}` : ""}`
      : [badge, heading].filter(Boolean).join(" — ") || "GACAR";
  return {
    citation,
    url: searchHref(entry.u) ?? "/library",
    verbatim: entry.x?.trim() || undefined,
    section: lin?.section ?? sectionOf(entry.u),
    part: (lin && partFromDocument(lin.document)) || partOf(badge),
    subpart: lin?.subpart ?? undefined,
    paragraph: lin?.paragraph ?? undefined,
    subParagraph: lin?.sub_paragraph ?? undefined,
    effectiveDate: lin?.effective_date ?? undefined,
    corpusVersion: `Rev ${generated}`,
  };
}

/** Test-only: inject a prebuilt index (skips network/disk load). */
export function __setIndexForTest(raw: SearchIndex): void {
  indexPromise = Promise.resolve(new Bm25Index(raw));
}
