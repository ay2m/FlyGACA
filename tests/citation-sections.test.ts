import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Section-level citation gate for the copy bundles.
 *
 * The product's load-bearing promise is that it cites the EXACT Part and section, so a
 * citation that names a section GACAR does not have is a direct breach of it — and the
 * worst kind, because a wrong-but-real section number sends a pilot to authoritative
 * text about something else entirely. Three FAA numbers had leaked in this way:
 * `§91.155` (FAA VFR minima; GACAR's is §91.165, and 91.155 does not exist here at all),
 * `§61.57` (in GACAR that is "Temporary Flight Authorization…Foreign License", not
 * recency — which is §61.17), and `§61.65` (FAA instrument rating; GACAR's is §61.89).
 *
 * `tests/quiz-citations.test.ts` already resolves a question's `citeRef` to a real Part.
 * This is the missing half: it resolves the SECTION inside that Part, for the i18n copy
 * that renders citation chips, guide takeaways and FAQ answers.
 *
 * Sections are harvested from the `§ N.nnn` occurrences in each part file rather than
 * from its heading anchors, because the ingest left a number of headings OCR-mangled
 * (e.g. `id="sec-bfdeltadelta-61-65-…"`) — the anchor is unreliable, the printed section
 * number is not.
 */

const PARTS_DIR = join(process.cwd(), 'public/data/parts');

/** part number -> the set of `N.nnn` sections that part actually prints. */
function loadSections(): Map<string, Set<string>> {
  const byPart = new Map<string, Set<string>>();
  for (const file of readdirSync(PARTS_DIR)) {
    const part = /^part-(\d+)\.html$/.exec(file)?.[1];
    if (!part) continue;
    const html = readFileSync(join(PARTS_DIR, file), 'utf8');
    const found = new Set<string>();
    // Only sections belonging to THIS part — a cross-reference to §61.17 inside Part 91
    // must not be taken as evidence that Part 91 has that section.
    for (const m of html.matchAll(/§\s?(\d{1,3})\.(\d{1,3})/g)) {
      if (m[1] === part) found.add(`${m[1]}.${m[2]}`);
    }
    byPart.set(part, found);
  }
  return byPart;
}

/** Every `§N.nnn` a user could read, with the i18n path that renders it. */
function collectCitations(bundle: string): { cite: string; at: string }[] {
  const out: { cite: string; at: string }[] = [];
  const walk = (node: unknown, path: string): void => {
    if (typeof node === 'string') {
      for (const m of node.matchAll(/§\s?(\d{1,3})\.(\d{1,3})/g)) {
        out.push({ cite: `${m[1]}.${m[2]}`, at: path });
      }
      // Citation chips carry a bare `"code": "91.165"` with no § sign.
      if (path.endsWith('.code') && /^\d{1,3}\.\d{1,3}/.test(node)) {
        const m = /^(\d{1,3})\.(\d{1,3})/.exec(node);
        if (m) out.push({ cite: `${m[1]}.${m[2]}`, at: path });
      }
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
      return;
    }
    if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(JSON.parse(readFileSync(join(process.cwd(), 'src/i18n', bundle), 'utf8')), '');
  return out;
}

const sections = loadSections();

describe('GACAR section citations resolve against the shipped corpus', () => {
  it('harvested a plausible corpus to check against', () => {
    expect(sections.size).toBeGreaterThan(50);
    // Spot-check the two sections the leaked FAA numbers should have pointed at.
    expect(sections.get('91')?.has('91.165')).toBe(true);
    expect(sections.get('61')?.has('61.17')).toBe(true);
    // ...and confirm the FAA number genuinely is not in GACAR, so this test has teeth.
    expect(sections.get('91')?.has('91.155')).toBe(false);
  });

  for (const bundle of ['en.json', 'ar.json']) {
    it(`${bundle} cites only sections that exist`, () => {
      const cites = collectCitations(bundle);
      // Non-vacuity: if a copy restructure ever stops the collector from matching, this
      // gate would pass by finding nothing rather than by finding nothing wrong.
      expect(cites.length).toBeGreaterThanOrEqual(5);
      expect(new Set(cites.map((c) => c.cite))).toContain('91.165');

      const broken = cites.filter(({ cite }) => {
        const part = cite.split('.')[0];
        const known = sections.get(part);
        return !known || !known.has(cite);
      });
      const detail = broken.map((b) => `§${b.cite} at ${b.at}`).join('\n  ');
      expect(broken, `citations with no matching GACAR section:\n  ${detail}`).toEqual([]);
    });
  }
});
