/**
 * Stable DOM ids for document section headings — the shared anchor scheme behind
 * the guides' and legal pages' "on this page" table of contents and copy-link
 * affordances. Pure (no DOM), so it stays unit-testable.
 */

/** Stable DOM id for a section heading at `index` (e.g. `sec-2-fuel-reserves`). */
export function sectionId(index: number, heading: string): string {
  const base = heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `sec-${index}-${base || 'section'}`;
}

/**
 * A clean, predictable clause anchor for a GACAR section heading, derived from
 * the "§ P.n" number in its text (e.g. `§ 91.155 …` → `sec-91-155`). The corpus
 * HTML's own heading ids are only ~clean for a fraction of sections — many are
 * OCR-noisy (`sec-bfxi91-65-…`) — so the reader injects this stable id beside
 * each heading, giving every section a shareable, citation-shaped deep link
 * (`/library/part-91#sec-91-155`). Running-header rows ("GACAR PART 91 — …") and
 * subpart titles carry no "P.n" and return null. Pure (no DOM), so it's tested.
 */
export function gacarSectionAnchor(headingText: string): string | null {
  const m = /(\d{1,3})\.(\d{1,4})/.exec(headingText);
  return m ? `sec-${m[1]}-${m[2]}` : null;
}
