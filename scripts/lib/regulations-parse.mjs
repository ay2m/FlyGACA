/**
 * regulations-parse — pure AST-extraction helpers for the regulatory Markdown corpus.
 *
 * No filesystem, no process exit: takes raw Markdown in, returns plain records out, so it is
 * unit-testable (tests/regulations-parse.test.ts). The CLI wrapper that reads files, writes the
 * lookup JSON and gates the build lives in scripts/parse-regulations.mjs.
 *
 * "AST-style" means we parse each file to an mdast tree (unified + remark-parse) and walk it with
 * unist-util-visit, rather than scraping raw strings — so a `Part 121` inside a code span or a
 * fenced block is never mistaken for a cross-reference.
 */
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import matter from 'gray-matter';

const REQUIRED_FRONTMATTER = ['part', 'partNum', 'title', 'category', 'slug'];

/** `Part 121` (and `Parts 121`) in prose. The H1 self-title is filtered out by the caller. */
const PART_REF = /\bParts?\s+(\d+)\b/g;
/** A Markdown link target like `./part-121.md` or `part-121.md`. */
const PART_LINK = /(?:^|\/)part-(\d+)\.md(?:#.*)?$/i;
/** A section citation such as `§ 91.205` or `§121.687`. */
const SECTION_REF = /§\s*(\d+)\.(\d+[A-Za-z]?)/g;

const partSlug = (n) => `part-${n}`;

const mdastFor = (markdown) => unified().use(remarkParse).parse(markdown);

/**
 * Parse one regulatory Markdown file into a structured record.
 * @param {{ slug: string, raw: string }} input  slug is the filename stem (e.g. "part-91").
 * @returns {{ slug, partNum, part, title, category, references: string[],
 *             sectionRefs: string[], sections: string[] }}
 * @throws if required frontmatter is missing or `slug` disagrees with the filename stem.
 */
export function parseRegulationFile({ slug, raw }) {
  const { data: fm, content } = matter(raw);

  const missing = REQUIRED_FRONTMATTER.filter((k) => fm[k] === undefined || fm[k] === '');
  if (missing.length) {
    throw new Error(`${slug}.md: missing required frontmatter: ${missing.join(', ')}`);
  }
  if (String(fm.slug) !== slug) {
    throw new Error(`${slug}.md: frontmatter slug "${fm.slug}" must equal the filename stem "${slug}"`);
  }

  const selfNum = Number(fm.partNum);
  const tree = mdastFor(content);

  const refs = new Set();
  const sectionRefs = new Set();
  const sections = [];

  visit(tree, (node) => {
    // Markdown links to a sibling Part file — `[Part 121](./part-121.md)`.
    if (node.type === 'link' && typeof node.url === 'string') {
      const m = node.url.match(PART_LINK);
      if (m) refs.add(partSlug(Number(m[1])));
    }
    // Section headings (depth >= 2) become this doc's own `sections` outline.
    if (node.type === 'heading' && node.depth >= 2) {
      const text = toString(node).trim();
      if (text) sections.push(text);
    }
    // Prose tokens: scan only leaf text/inline-code so we never read structural nodes twice.
    if (node.type === 'text' || node.type === 'inlineCode') {
      const text = node.value || '';
      for (const m of text.matchAll(PART_REF)) {
        const n = Number(m[1]);
        if (n !== selfNum) refs.add(partSlug(n)); // drop the H1 self-title
      }
      for (const m of text.matchAll(SECTION_REF)) sectionRefs.add(`§ ${m[1]}.${m[2]}`);
    }
  });

  return {
    slug,
    partNum: selfNum,
    part: String(fm.part),
    title: String(fm.title),
    category: String(fm.category),
    references: [...refs].sort((a, b) => byPartNum(a, b)),
    sectionRefs: [...sectionRefs].sort(),
    sections,
  };
}

const byPartNum = (a, b) => Number(a.replace('part-', '')) - Number(b.replace('part-', ''));

/**
 * Compile parsed records into the optimized lookup dictionary, building a reverse `referencedBy`
 * index and validating that every cross-reference resolves to a real GACAR Part.
 *
 * @param {Array} records           output of parseRegulationFile, one per file
 * @param {{ knownParts: Set<string>, generated?: string }} opts
 *   knownParts — slugs of every canonical GACAR Part (from gacar-index.json). Cross-refs are
 *   validated against THIS set, not against the authored files, so a reference to a not-yet-
 *   migrated Part is valid while a typo like `part-999` fails.
 * @returns the lookup object ready to serialize.
 * @throws with every unresolved reference listed, if any cross-ref points outside knownParts.
 */
export function buildLookup(records, { knownParts, generated }) {
  const parts = {};
  const referencedBy = {};
  const byPart = [];
  const unresolved = [];

  for (const r of records) {
    parts[r.slug] = r;
    byPart.push(r.slug);
  }

  for (const r of records) {
    for (const ref of r.references) {
      if (!knownParts.has(ref)) {
        unresolved.push(`${r.slug} → ${ref}`);
        continue;
      }
      (referencedBy[ref] ??= []).push(r.slug);
    }
  }

  if (unresolved.length) {
    throw new Error(
      'Unresolved cross-reference(s) — referenced Part is not in the GACAR registry ' +
        '(public/data/gacar-index.json). Fix the typo or the citation:\n  ' +
        unresolved.join('\n  '),
    );
  }

  for (const k of Object.keys(referencedBy)) referencedBy[k].sort(byPartNum);
  byPart.sort(byPartNum);

  return {
    generated: generated ?? null,
    count: records.length,
    parts,
    index: { byPart, referencedBy },
  };
}
