/**
 * markdown-splitter — a HIERARCHICAL splitter for the GACAR regulatory corpus.
 *
 * Intentionally side-effect free (no top-level I/O) so it is unit-tested
 * directly (tests/markdown-splitter.test.ts) and reused by the build driver
 * scripts/build-rag-chunks.mjs — mirroring the pure-lib convention of
 * scripts/lib/sync-merge.mjs (root has no `tsx`, so a `.mjs` build script can
 * only import another `.mjs` without a build step).
 *
 * Unlike a generic recursive character splitter, this parses each document by
 * its LEGAL NUMBERING STRUCTURE (`§ section → (a) paragraph → (1) → (i) → (A)`)
 * so every emitted chunk inherits its full lineage as metadata:
 *
 *   { document, subpart, section, paragraph, sub_paragraph, title, effective_date }
 *
 * The source is the OCR-derived HTML in public/data/parts/part-*.html — flat
 * <h2>/<h3>/<p> blocks, no nesting, with real-world OCR noise the parser is
 * deliberately tolerant of (see the OCR notes inline and the `dropped` flag).
 */

// ---------------------------------------------------------------------------
// HTML → flat node stream
// ---------------------------------------------------------------------------

const BLOCK_RE = /<(h2|h3|p)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
const ID_RE = /\bid="([^"]+)"/i;

/** Decode the handful of HTML entities the corpus actually contains. */
function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2f;/gi, '/')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

/** Strip inner tags, decode entities, collapse whitespace. */
function cleanText(inner) {
  return decodeEntities(inner.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize a part's HTML into an ordered flat stream of block nodes.
 * @param {string} html
 * @returns {{kind:'h2'|'h3'|'p', id:string|null, text:string}[]}
 */
export function tokenizeHtml(html) {
  const out = [];
  let m;
  BLOCK_RE.lastIndex = 0;
  while ((m = BLOCK_RE.exec(html))) {
    const kind = m[1].toLowerCase();
    const id = ID_RE.exec(m[2] ?? '')?.[1] ?? null;
    const text = cleanText(m[3] ?? '');
    if (text) out.push({ kind, id, text });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Running-header noise injected at page breaks, e.g.
 * `<h3 id="sec-gacar-part-61-...-72">GACAR PART 61 - CERTIFICATION…</h3>`.
 * Must be ignored, never treated as a heading.
 * @param {{kind:string, id:string|null, text:string}} node
 */
export function isRunningHeaderNoise(node) {
  if (node.kind !== 'h3') return false;
  // OCR varies the spacing/hyphenation: `sec-gacar-part-61` vs `sec-gacar-part105`,
  // `GACAR PART 61` vs `GACAR PART105`.
  return (
    (node.id != null && /^sec-gacar-part/i.test(node.id)) ||
    /^\s*GACAR\s+PART\s*\d+/i.test(node.text)
  );
}

/** Letter of a `<h2>SUBPART X - …` header, or null. (OCR collapses spacing.) */
export function subpartOf(node) {
  if (node.kind !== 'h2') return null;
  return /SUBPART\s*([A-Z])\b/i.exec(node.text)?.[1]?.toUpperCase() ?? null;
}

/**
 * Detect a real section heading — whether it appears as a clean
 * `<h3 id="sec-61-107">§ 61.107 Title.</h3>` or a bare `<p>§ 61.107 Title.</p>`.
 * Rejects running-header noise, inline cross-refs (`…GACAR § 61.5(b)…`), and
 * TOC lines (multi-§, page-leader dots). For non-numbered parts (e.g. Part 1
 * Definitions) any non-noise `<h3 id>` is a heading with `section: null`.
 *
 * @param {{kind:string, id:string|null, text:string}} node
 * @param {string} part  the document's part number, e.g. "61"
 * @returns {{section:string|null, title:string, anchor:string}|null}
 */
export function isSectionHeading(node, part) {
  if (isRunningHeaderNoise(node)) return null;

  // 1. Authored numeric anchor — the strongest, most reliable signal.
  if (node.id) {
    const idm = /^sec-(\d+)-(\d+)$/.exec(node.id);
    if (idm) {
      const section = `${idm[1]}.${idm[2]}`;
      return { section, title: stripSectionPrefix(node.text), anchor: node.id };
    }
  }

  // 2. Text-based "§ NN.NNN Title" at the very start of the node.
  const tm = /^\s*§?\s*(\d+)\.(\d+)(?!\s*\()\s+(.+)$/.exec(node.text);
  if (tm) {
    const looksLikeToc =
      node.text.length > 120 || // real headings are short
      (node.text.match(/§/g) ?? []).length > 1 || // TOC packs many §
      /[·.]{2,}|·\s*\d|\s\d{2,4}\s*$/.test(node.text); // page-leader dots / trailing page no.
    const title = stripSectionPrefix(node.text);
    if (!looksLikeToc && tm[1] === part && /[A-Za-z]{2,}/.test(title)) {
      const section = `${tm[1]}.${tm[2]}`;
      return { section, title, anchor: buildAnchor(part, section) };
    }
  }

  // 3. Non-numbered heading (Definitions etc.): any non-noise <h3 id>.
  if (node.kind === 'h3' && node.id) {
    return { section: null, title: node.text.replace(/\.$/, '').trim(), anchor: node.id };
  }
  return null;
}

/** Drop a leading `§ NN.NNN` and a trailing period from a heading title. */
function stripSectionPrefix(text) {
  return text
    .replace(/^\s*§?\s*\d+\.\d+\s*/, '')
    .replace(/\.\s*$/, '')
    .trim();
}

/** Anchor for a numbered section, matching the corpus's authored ids. */
export function buildAnchor(part, section) {
  const sub = String(section).split('.')[1] ?? section;
  return `sec-${part}-${sub}`;
}

// ---------------------------------------------------------------------------
// Marker parsing & lineage levels
// ---------------------------------------------------------------------------

const ROMAN_MULTI = /^[ivxlcdm]{2,}$/;

/**
 * Map a marker key to a nesting level by its character class, NOT document
 * order (OCR drops levels): `(a)`→0 paragraph, `(1)`→1, `(i)`→2, `(A)`→3.
 * Single `i/v/x` is roman (level 2) only when a numbered sub is already open.
 * @param {string} key
 * @param {(string|undefined)[]} stack  current lineage stack
 * @returns {number}
 */
export function levelOf(key, stack = []) {
  if (/^\d+$/.test(key)) return 1;
  if (/^[A-Z]$/.test(key)) return 3;
  const lower = key.toLowerCase();
  if (ROMAN_MULTI.test(lower)) return 2;
  if ((lower === 'i' || lower === 'v' || lower === 'x') && stack[0] != null && stack[1] != null) {
    return 2; // inside a numbered sub already → treat as roman
  }
  return 0; // single lowercase letter → paragraph
}

const OCR_LEAD = { '3e': 'b' }; // conservative leading-token corrections

/**
 * Parse one `<p>` into ordered leaf items, each with the FULL leading marker
 * chain it opens. Handles nested leads (`(b)(1)`), a leading OCR token (`3e`),
 * and semicolon-delimited interior siblings (`(1) …; (2) …; (3) …`).
 * Returns `{markers:[], text}` for an unmarked (BODY) paragraph.
 *
 * @param {string} text
 * @returns {{markers:string[], text:string, dropped?:boolean}[]}
 */
export function parseMarkers(text) {
  let rest = text.trim();
  const markers = [];

  // Leading OCR token (e.g. "3e Be at least…" → paragraph (b)).
  const ocr = /^([0-9a-z]{1,3})\s+/i.exec(rest);
  if (ocr && OCR_LEAD[ocr[1].toLowerCase()]) {
    markers.push(OCR_LEAD[ocr[1].toLowerCase()]);
    rest = rest.slice(ocr[0].length);
  }

  // Leading marker chain: (b) or (b)(1) or (1) …
  let lm;
  while ((lm = /^\(([a-zA-Z0-9]{1,4})\)\s*/.exec(rest))) {
    markers.push(lm[1]);
    rest = rest.slice(lm[0].length);
  }

  if (markers.length === 0) return [{ markers: [], text: rest }];

  // Interior siblings, semicolon-delimited only (avoids splitting on the
  // ". (a)" of a cross-reference). Each sibling replaces the last lead key.
  const SIB = /;\s*(?:or\s+|and\s+)?\(([a-zA-Z0-9]{1,4})\)\s*/g;
  const sibs = [];
  let sib;
  let firstEnd = rest.length;
  while ((sib = SIB.exec(rest))) {
    if (sibs.length === 0) firstEnd = sib.index; // ";" before the first sibling
    sibs.push({ key: sib[1], textStart: SIB.lastIndex, markerStart: sib.index });
  }

  const items = [{ markers: markers.slice(), text: rest.slice(0, firstEnd).trim() }];
  for (let i = 0; i < sibs.length; i++) {
    const end = i + 1 < sibs.length ? sibs[i + 1].markerStart : rest.length;
    items.push({
      markers: [...markers.slice(0, -1), sibs[i].key],
      text: rest.slice(sibs[i].textStart, end).trim(),
      dropped: true, // interior split is approximate
    });
  }
  return items;
}

// ---------------------------------------------------------------------------
// Split a part into lineage-tagged chunks
// ---------------------------------------------------------------------------

const MERGE_TARGET = 1000; // pack consecutive same-paragraph leaves up to this
const HARD_CAP = 1500;

/**
 * @typedef {Object} DocMeta
 * @property {string} slug          "part-61"
 * @property {string} part          "61"
 * @property {string} title         document title (from gacar-index)
 * @property {string} effectiveDate "2026-06" (fallback: index `generated` month)
 * @property {string} [revision]
 */

/**
 * Split one part's HTML into ordered, lineage-tagged chunks.
 * @param {string} html
 * @param {DocMeta} meta
 * @returns {Object[]} chunks
 */
export function splitPartHtml(html, meta) {
  const nodes = tokenizeHtml(html);
  const document = `GACAR_Part_${meta.part}`;
  const effective_date = meta.effectiveDate ?? null;

  let subpart = null;
  /** @type {{section:string|null, title:string, anchor:string}|null} */
  let heading = null;
  let stack = [];
  const occ = new Map(); // dedup collapsed siblings within a section
  const leaves = [];
  let open = null; // current leaf to which BODY continuation appends

  const makeLeaf = (text, dropped) => {
    const paragraph = stack[0] ?? null;
    const sub = stack.length > 1 ? stack.slice(1).filter(Boolean).join('_') : null;
    const url = `document.html?type=regulations&id=${meta.slug}${heading?.anchor ? `#${heading.anchor}` : ''}`;
    return {
      document,
      subpart,
      section: heading?.section ?? null,
      paragraph,
      sub_paragraph: sub || null,
      title: heading?.title ?? meta.title,
      effective_date,
      text: text.trim(),
      anchor: heading?.anchor ?? null,
      url,
      dropped: Boolean(dropped),
    };
  };

  const applyMarker = (key) => {
    const lvl = levelOf(key, stack);
    stack.length = lvl;
    // Dedup collapsed siblings (OCR turns (ii)/(iii) into repeated (i)).
    const sig = `${lvl}:${stack.slice(0, lvl).join('_')}:${key}`;
    const seen = occ.get(sig) ?? 0;
    occ.set(sig, seen + 1);
    stack[lvl] = seen === 0 ? key : `${key}#${seen + 1}`;
    return seen > 0; // dropped if this was a collapsed duplicate
  };

  for (const node of nodes) {
    if (isRunningHeaderNoise(node)) continue;

    const sp = subpartOf(node);
    if (sp) {
      subpart = sp;
      continue;
    }

    const h = isSectionHeading(node, meta.part);
    if (h) {
      heading = h;
      stack = [];
      occ.clear();
      open = null;
      continue;
    }

    if (!heading) continue; // skip front-matter / TOC before the first heading

    if (node.kind !== 'p') continue;

    const items = parseMarkers(node.text);
    for (const item of items) {
      if (item.markers.length === 0) {
        // BODY: continuation of the open leaf, or section-intro text.
        if (open) {
          open.text = `${open.text} ${item.text}`.trim();
        } else if (item.text) {
          open = makeLeaf(item.text, false);
          leaves.push(open);
        }
        continue;
      }
      let dropped = Boolean(item.dropped);
      for (const key of item.markers) dropped = applyMarker(key) || dropped;
      open = makeLeaf(item.text, dropped);
      leaves.push(open);
    }
  }

  return mergeLeaves(leaves);
}

/**
 * Coalesce only consecutive leaves that share the EXACT same lineage
 * (section + paragraph + sub_paragraph) and stay under the size cap — so every
 * distinct legal sub-unit `(a)/(1)/(i)` remains its own precisely-cited chunk
 * (the whole point: each chunk carries its full lineage). This merges adjacent
 * section-intro paragraphs and over-long body runs, never across a boundary.
 */
function mergeLeaves(leaves) {
  const chunks = [];
  for (const leaf of leaves) {
    if (!leaf.text) continue;
    const last = chunks[chunks.length - 1];
    const sameLineage =
      last &&
      last.anchor === leaf.anchor &&
      last.paragraph === leaf.paragraph &&
      last.sub_paragraph === leaf.sub_paragraph &&
      last.text.length < MERGE_TARGET &&
      last.text.length + leaf.text.length + 1 <= HARD_CAP;
    if (sameLineage) {
      last.text = `${last.text} ${leaf.text}`.trim();
      last.dropped = last.dropped || leaf.dropped;
    } else {
      chunks.push({ ...leaf });
    }
  }
  return chunks;
}
