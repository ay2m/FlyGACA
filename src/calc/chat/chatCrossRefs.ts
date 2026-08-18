/**
 * Pure helper for "Also referenced" chips: the GACAR Parts an answer mentions in
 * its prose beyond the ones already listed as sources. No DOM imports; the page
 * passes the valid Part slugs (from `gacar-index.json`). Reuses `partSlug` for
 * resolving the source list, and scans the answer text with the same citation
 * grammar the inline linkifier uses.
 */

import { partSlug, type SourceLike } from './chatSources';

/** GACAR citation tokens in prose: "Part 91", "§91.155", or a bare "91.155(a)". */
const CITATION = /\bPart\s+(\d+)\b|§\s*(\d+)(?:\.\d+)*|\b(\d+)\.\d+(?:\([a-z0-9]+\))*/gi;

export interface CrossRef {
  /** Library slug, e.g. `part-61`. */
  slug: string;
  /** Part number as a string, e.g. `61`. */
  num: string;
}

/**
 * Parts cited in `answer` that resolve to a known Library Part and are NOT
 * already shown in `sources` (those have their own chips). Deduped, in order of
 * first mention. Pure.
 */
export function crossRefParts(
  answer: string,
  sources: SourceLike[] | undefined,
  valid: Set<string>,
): CrossRef[] {
  // Parts already surfaced as sources — don't repeat them.
  const shown = new Set<string>();
  for (const s of sources ?? []) {
    const slug = partSlug(valid, s.part, s.section, s.citation);
    if (slug) shown.add(slug);
  }

  const out: CrossRef[] = [];
  const seen = new Set<string>();
  CITATION.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CITATION.exec(answer)) !== null) {
    const num = m[1] ?? m[2] ?? m[3];
    if (!num) continue;
    const slug = `part-${num}`;
    if (!valid.has(slug) || shown.has(slug) || seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, num });
  }
  return out;
}
