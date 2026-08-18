/**
 * Pure slicing logic for the standalone prep-app (flavor) builds: given a pack
 * (src/lib/prepCatalog.ts) and the shared /data indexes, compute exactly the
 * slice of content that pack's app ships — filtered indexes plus the list of
 * corpus HTML / study-sheet PDF files to copy. No fs/process here so the rules
 * are unit-testable (tests/flavor-slice.test.ts); scripts/build-flavor.mjs does
 * the I/O.
 *
 * The corpus-pointer resolution mirrors src/lib/content.ts (toSearchRef /
 * parseSearchUrl): curated content links appear as semantic { kind|type, id }
 * objects or legacy `document.html?type=…&id=…` URL strings, and quiz questions
 * carry `citeRef` pointers. Whatever the pack's kept content can reach must
 * ship, or the reader would 404 offline.
 */

/** Mirror of CORPUS in src/lib/content.ts: kind → { index file, html dir }. */
export const CORPUS_FILES = {
  regulations: { index: 'gacar-index.json', dir: 'parts' },
  reference: { index: 'reference-index.json', dir: 'library' },
  handbook: { index: 'ebooks-index.json', dir: 'ebooks' },
};

/** Legacy `type=` tokens that don't already match a corpus kind. */
const TYPE_TO_KIND = { handbooks: 'handbook' };

function toCorpusKind(token) {
  if (!token) return undefined;
  if (token in CORPUS_FILES) return token;
  return TYPE_TO_KIND[token];
}

/** Parse a legacy `document.html?type=…&id=…#…` URL into { kind, id } or null. */
export function parseSearchUrl(u) {
  const kind = toCorpusKind(/[?&]type=([^&#]+)/.exec(u)?.[1]);
  const id = /[?&]id=([^&#]+)/.exec(u)?.[1];
  if (!id || !kind) return null;
  return { kind, id };
}

/** Normalise a ContentLink / SearchRef / legacy string into { kind, id } or null. */
export function linkToRef(link) {
  if (!link) return null;
  if (typeof link === 'string') return parseSearchUrl(link);
  if (link.url) return parseSearchUrl(link.url);
  const kind = toCorpusKind(link.kind ?? link.type);
  if (!kind || !link.id) return null;
  return { kind, id: link.id };
}

/**
 * Every corpus document the pack's kept content can reach:
 * librarySlugs (reference reading list) ∪ ground-school `lessons[].read`
 * ∪ path `steps[]` ∪ quiz questions' `citeRef`. Deduped, stable order.
 */
export function collectCorpusRefs(pack, { quizBanks, gsModules, paths }) {
  const refs = [];
  const seen = new Set();
  const push = (ref) => {
    if (!ref) return;
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    refs.push(ref);
  };

  for (const slug of pack.librarySlugs ?? []) push({ kind: 'reference', id: slug });
  for (const m of gsModules) for (const l of m.lessons ?? []) push(linkToRef(l.read));
  for (const p of paths) for (const s of p.steps ?? []) push(linkToRef(s));
  for (const b of quizBanks) for (const q of b.questions ?? []) push(linkToRef(q.citeRef));
  return refs;
}

/**
 * Compute the pack's full data slice.
 *
 * `indexes` carries the parsed shared JSON files:
 *   { quiz, groundschool, paths, pdfs, regulations, reference, handbook }
 * (the last three are the corpus indexes, any of which may be undefined in
 * tests). Returns filtered index objects plus the file copy lists.
 */
export function slicePack(pack, indexes) {
  const quizBanks = (indexes.quiz?.banks ?? []).filter((b) => pack.bankIds.includes(b.id));
  const gsModules = (indexes.groundschool?.modules ?? []).filter((m) =>
    (pack.moduleIds ?? []).includes(m.id),
  );
  const paths = (indexes.paths?.paths ?? []).filter((p) => (pack.pathIds ?? []).includes(p.id));
  const pdfDocs = (indexes.pdfs?.documents ?? []).filter((d) =>
    (pack.sheetSlugs ?? []).includes(d.slug),
  );

  const refs = collectCorpusRefs(pack, { quizBanks, gsModules, paths });

  // Filtered-but-valid corpus indexes: the Document reader always fetches the
  // index of the kind it renders, so every kind ships (possibly with zero docs).
  const corpusIndexes = {};
  const corpusFiles = [];
  const missing = [];
  for (const [kind, meta] of Object.entries(CORPUS_FILES)) {
    const source = indexes[kind];
    const wanted = refs.filter((r) => r.kind === kind);
    const bySlug = new Map((source?.documents ?? []).map((d) => [d.slug, d]));
    const documents = [];
    for (const ref of wanted) {
      const doc = bySlug.get(ref.id);
      if (doc) {
        documents.push(doc);
        corpusFiles.push({ kind, slug: ref.id, path: `${meta.dir}/${ref.id}.html` });
      } else {
        missing.push(ref);
      }
    }
    corpusIndexes[kind] = source ? { ...source, count: documents.length, documents } : undefined;
  }

  // Deployed sheet PDFs: the index stores the legacy `assets/…` path; the app
  // serves it at the root (see pdfSrc in src/pages/study/StudySheets.tsx).
  const sheetFiles = pdfDocs.filter((d) => d.file).map((d) => d.file.replace(/^assets\//, ''));

  return {
    quiz: indexes.quiz ? { ...indexes.quiz, banks: quizBanks } : undefined,
    groundschool: indexes.groundschool
      ? { ...indexes.groundschool, modules: gsModules }
      : undefined,
    paths: indexes.paths ? { ...indexes.paths, paths } : undefined,
    pdfs: indexes.pdfs ? { ...indexes.pdfs, documents: pdfDocs } : undefined,
    corpusIndexes,
    corpusFiles,
    sheetFiles,
    /** Refs that named no document in their corpus index — surfaced as warnings. */
    missingRefs: missing,
  };
}
