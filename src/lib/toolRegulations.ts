/**
 * The tool ↔ library cross-link map: which GACAR Part (and, where it's a clean
 * single citation, which section) governs each flight tool. It powers two
 * reciprocal internal links — a "governing regulation" link on the tool page
 * (`CalcShell`) and a "related tools" list on the regulation's Part page
 * (`Document`). Internal linking between the calculators and the cited source is
 * an SEO/citability win and reinforces the product's cite-the-exact-Part ethos.
 *
 * Accuracy is load-bearing: only tools with a genuine, specific GACAR anchor are
 * listed, and `anchor` is set **only** where that clean section id actually
 * exists in the corpus HTML (`public/data/parts/part-*.html`) — otherwise the
 * link lands on the Part page, which always resolves. Never invent a citation.
 */
export interface ToolRegulation {
  /** Tool id — matches `tools.ts` and the `tools.items.<id>` i18n namespace. */
  toolId: string;
  /** GACAR Part number, e.g. `'91'` — the Part page slug is `part-<part>`. */
  part: string;
  /** Specific section shown in the link label, e.g. `'91.211'`. */
  section?: string;
  /**
   * Clean anchor id on the Part page (`sec-<part>-<n>`), set only when that id
   * exists in the corpus HTML so the deep link resolves. Omitted → Part page top.
   */
  anchor?: string;
}

export const TOOL_REGULATIONS: readonly ToolRegulation[] = [
  { toolId: 'oxygen', part: '91', section: '91.211', anchor: 'sec-91-211' },
  { toolId: 'fuel-reserves', part: '91', section: '91.167', anchor: 'sec-91-167' },
  { toolId: 'vfr-minima', part: '91', section: '91.155' },
  { toolId: 'transponder', part: '91', section: '91.215' },
  { toolId: 'altimeter', part: '91', section: '91.121' },
  { toolId: 'part61-currency', part: '61', section: '61.57', anchor: 'sec-61-57' },
  { toolId: 'medical-validity', part: '61', section: '61.23', anchor: 'sec-61-23' },
  { toolId: 'flight-review', part: '61', section: '61.56' },
];

export interface RegulationLink {
  /** Library route to the governing Part (with a section anchor where it resolves). */
  to: string;
  /** Display label, e.g. `GACAR §91.211` or `GACAR Part 91` — an identifier, not prose. */
  label: string;
}

/** The library link for a regulation entry (Part page, plus anchor where it resolves). */
export function regulationLink(reg: ToolRegulation): RegulationLink {
  return {
    to: `/library/part-${reg.part}${reg.anchor ? `#${reg.anchor}` : ''}`,
    label: reg.section ? `GACAR §${reg.section}` : `GACAR Part ${reg.part}`,
  };
}

/** The governing-regulation entry for a tool route (`/tools/<id>`), or null. */
export function regulationForRoute(pathname: string): ToolRegulation | null {
  const m = /^\/tools\/([^/?#]+)/.exec(pathname);
  if (!m) return null;
  return TOOL_REGULATIONS.find((r) => r.toolId === m[1]) ?? null;
}

/** The tools governed by a Part page slug (`part-91`), for the reader's back-link. */
export function toolsForPartSlug(slug: string | undefined): ToolRegulation[] {
  if (!slug) return [];
  const m = /^part-(\d+)$/.exec(slug);
  if (!m) return [];
  return TOOL_REGULATIONS.filter((r) => r.part === m[1]);
}
