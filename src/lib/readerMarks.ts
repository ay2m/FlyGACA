/**
 * DOM mark/annotation helpers for the regulatory Document reader: search-hit
 * highlighting, annotation wrapping, and their teardown. Framework-free but
 * DOM-touching, so they live in lib (like `scrollLock`), never in `src/calc`
 * (the pure, DOM-free bar).
 */
import { gacarSectionAnchor } from '@/calc/library/anchor';
import type { LibNote } from '@/lib/prefs/libraryPrefs';

/**
 * Wrap every case-insensitive occurrence of `needle` inside `root`'s text nodes
 * in `<mark data-hit>`, skipping text already inside a mark so repeated runs
 * don't double-wrap. Returns the first mark created (to scroll into view).
 */
export function highlightMatches(root: HTMLElement, needle: string): HTMLElement | null {
  const n = needle.toLowerCase();
  if (!n) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const targets: Text[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const tn = node as Text;
    const val = tn.nodeValue;
    if (!val || !val.toLowerCase().includes(n)) continue;
    if (tn.parentElement?.closest('mark')) continue;
    targets.push(tn);
  }
  let first: HTMLElement | null = null;
  for (const tn of targets) {
    const text = tn.nodeValue as string;
    const lower = text.toLowerCase();
    const frag = document.createDocumentFragment();
    let i = 0;
    let idx = lower.indexOf(n);
    while (idx !== -1) {
      if (idx > i) frag.appendChild(document.createTextNode(text.slice(i, idx)));
      const mark = document.createElement('mark');
      mark.dataset.hit = '1';
      mark.textContent = text.slice(idx, idx + n.length);
      frag.appendChild(mark);
      if (!first) first = mark;
      i = idx + n.length;
      idx = lower.indexOf(n, i);
    }
    if (i < text.length) frag.appendChild(document.createTextNode(text.slice(i)));
    tn.parentNode?.replaceChild(frag, tn);
  }
  return first;
}

/** Unwrap every search `<mark>` back into plain text so a new query starts clean. */
export function clearHighlights(root: HTMLElement): void {
  root.querySelectorAll('mark[data-hit]').forEach((m) => {
    m.replaceWith(document.createTextNode(m.textContent ?? ''));
  });
  root.normalize();
}

/** The id of the nearest heading at or above `node`, for anchoring an annotation. */
export function nearestSectionId(root: HTMLElement, node: Node): string {
  let id = '';
  for (const h of Array.from(root.querySelectorAll<HTMLElement>('h2[id],h3[id]'))) {
    if (h.compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING) id = h.id;
    else break;
  }
  return id;
}

/** Remove every annotation `<mark>` (leaving search marks untouched). */
export function clearAnnotations(root: HTMLElement): void {
  root.querySelectorAll('mark[data-annot]').forEach((m) => {
    m.replaceWith(document.createTextNode(m.textContent ?? ''));
  });
  root.normalize();
}

/**
 * Best-effort re-anchor of a saved annotation: find the first text node inside
 * its section that contains the stored quote and wrap that run in
 * `<mark data-annot=id>`. Single-text-node match keeps it robust and cheap;
 * a selection that spanned elements simply isn't re-highlighted (the note still
 * lives in the panel). Returns true when the highlight was placed.
 */
export function wrapAnnotation(root: HTMLElement, note: LibNote, markClass: string): boolean {
  const q = note.quote.trim();
  if (!q) return false;
  const heads = Array.from(root.querySelectorAll<HTMLElement>('h2[id],h3[id]'));
  const hIdx = heads.findIndex((h) => h.id === note.sectionId);
  const startEl = hIdx >= 0 ? heads[hIdx] : null;
  const endEl = hIdx >= 0 ? (heads[hIdx + 1] ?? null) : null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const tn = node as Text;
    if (tn.parentElement?.closest('mark')) continue;
    if (startEl && !(startEl.compareDocumentPosition(tn) & Node.DOCUMENT_POSITION_FOLLOWING))
      continue;
    if (endEl && !(endEl.compareDocumentPosition(tn) & Node.DOCUMENT_POSITION_PRECEDING)) continue;
    const text = tn.nodeValue ?? '';
    const idx = text.indexOf(q);
    if (idx < 0) continue;
    const frag = document.createDocumentFragment();
    if (idx > 0) frag.appendChild(document.createTextNode(text.slice(0, idx)));
    const mark = document.createElement('mark');
    mark.dataset.annot = note.id;
    mark.className = markClass;
    if (note.note) mark.title = note.note;
    mark.textContent = text.slice(idx, idx + q.length);
    frag.appendChild(mark);
    if (idx + q.length < text.length) {
      frag.appendChild(document.createTextNode(text.slice(idx + q.length)));
    }
    tn.parentNode?.replaceChild(frag, tn);
    return true;
  }
  return false;
}

export interface DecorateHeadingsOptions {
  /** Class applied to the injected clean-anchor target `<span>`. */
  anchorTargetClass: string;
  /** Class applied to the appended copy-link `<button>` (also the idempotency marker). */
  anchorClass: string;
  /** aria-label for the copy-link button. */
  label: string;
  /** Copy the shareable link for an anchor id (the clean id when derivable, else the heading's own). */
  onCopy: (id: string) => void;
}

/**
 * Decorate every `h2[id]`/`h3[id]` in `root` with (a) a clean, citation-shaped
 * clause anchor derived from the "§ P.n" in the heading text — injected as an
 * `aria-hidden` `<span id>` so the often OCR-noisy corpus id isn't the only
 * deep-link target — and (b) a trailing copy-link button. Idempotent: a heading
 * already carrying the copy-link button is skipped, and a clean id that already
 * exists in `root` isn't re-injected, so repeated runs (e.g. content re-render)
 * are safe. The injected ids are the exact `sec-<part>-<n>` slugs that the
 * sitemap's clause anchors and shareable citations depend on — see
 * {@link gacarSectionAnchor}.
 */
export function decorateHeadings(root: HTMLElement, opts: DecorateHeadingsOptions): void {
  root.querySelectorAll<HTMLElement>('h2[id],h3[id]').forEach((h) => {
    const clean = gacarSectionAnchor(h.textContent ?? '');
    if (clean && h.id !== clean && !root.querySelector(`[id="${clean}"]`)) {
      const target = document.createElement('span');
      target.id = clean;
      target.className = opts.anchorTargetClass;
      target.setAttribute('aria-hidden', 'true');
      h.prepend(target);
    }
    if (h.querySelector(`.${opts.anchorClass}`)) return;
    const a = document.createElement('button');
    a.type = 'button';
    a.className = opts.anchorClass;
    a.textContent = '#';
    a.setAttribute('aria-label', opts.label);
    a.addEventListener('click', () => opts.onCopy(clean ?? h.id));
    h.appendChild(a);
  });
}
