/**
 * Library-hub filtering: corpus-document filter/sort/grouping and the
 * full-text hit scoping. Pure and DOM-free; the corpus-pointer resolution is
 * injected (`resolveRef`) so this module depends only on content types.
 */
import type { CorpusDoc, SearchEntry, SearchRef, LibraryKind } from '@/lib/content';

/** Sort orders. 'size' is pages (regulations) or sections (reference/handbooks). */
export type SortKey = 'part' | 'title' | 'size';

/** Compare two docs under the active sort; ties break on title. */
export function compareDocs(a: CorpusDoc, b: CorpusDoc, sort: SortKey): number {
  if (sort === 'title') return a.title.localeCompare(b.title);
  if (sort === 'size') {
    const sa = a.pages ?? a.sections ?? 0;
    const sb = b.pages ?? b.sections ?? 0;
    return sb - sa || a.title.localeCompare(b.title);
  }
  return (a.partNum ?? 0) - (b.partNum ?? 0) || a.title.localeCompare(b.title);
}

/**
 * The hub's browse list: docs in `category` (or all) whose title, `part <n>`
 * token, or badge contains `needle` (case-insensitive), sorted under `sort`.
 */
export function filterDocs(
  documents: CorpusDoc[],
  category: string,
  needle: string,
  sort: SortKey,
): CorpusDoc[] {
  const n = needle.toLowerCase();
  return documents
    .filter((d) => category === 'all' || d.category === category)
    .filter(
      (d) =>
        !n ||
        d.title.toLowerCase().includes(n) ||
        (d.part ? `part ${d.part}`.includes(n) : false) ||
        (d.badge ? d.badge.toLowerCase().includes(n) : false),
    )
    .sort((a, b) => compareDocs(a, b, sort));
}

/** Group filtered docs under their category headers, in the index's category order. */
export function groupByCategory<C extends { id: string; label: string }>(
  categories: C[],
  docs: CorpusDoc[],
): { id: string; label: string; docs: CorpusDoc[] }[] {
  const byCat = new Map<string, CorpusDoc[]>();
  for (const d of docs) {
    const arr = byCat.get(d.category);
    if (arr) arr.push(d);
    else byCat.set(d.category, [d]);
  }
  return categories
    .filter((c) => byCat.has(c.id))
    .map((c) => ({ id: c.id, label: c.label, docs: byCat.get(c.id) as CorpusDoc[] }));
}

/**
 * Full-text hits scoped to the active corpus tab and category chip, capped at
 * `cap` matches. `resolveRef` turns an entry into its corpus pointer (inject
 * `toSearchRef(searchEntryLink(e))` from `@/lib/contentLinks`).
 */
export function filterSearchHits(
  entries: SearchEntry[],
  needle: string,
  kind: LibraryKind,
  category: string,
  docCat: Map<string, string>,
  cap: number,
  resolveRef: (e: SearchEntry) => SearchRef | null,
): SearchEntry[] {
  const n = needle.toLowerCase();
  const out: SearchEntry[] = [];
  for (const e of entries) {
    if (!e.d.toLowerCase().includes(n) && !(e.x ?? '').toLowerCase().includes(n)) {
      continue;
    }
    const ref = resolveRef(e);
    if (!ref || ref.kind !== kind) continue;
    if (category !== 'all' && docCat.get(ref.id) !== category) continue;
    out.push(e);
    if (out.length >= cap) break;
  }
  return out;
}
