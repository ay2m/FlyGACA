import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PACKS, type Pack } from '@/lib/prepCatalog';

/**
 * Source-provenance guard for the exam-prep product line (the ASA-Prepware-style
 * per-certificate apps). Fly GACA's promise is that these packs are grounded in
 * GACA / SANS / Fly-GACA material — not derived from foreign regulators. This test
 * makes that promise MECHANICAL:
 *
 *  - Bundled reference documents (`librarySlugs`) surfaced on a pack MUST resolve to a
 *    GACA/SANS source in reference-index.json — i.e. the `gaca-guidance` category, which
 *    covers GACA Advisory Circulars and the Saudi AIP (SANS `saudi-aip-*` docs). FAA /
 *    ICAO / EASA / safety reference documents may live in the main library but may NOT be
 *    bundled into a pack.
 *  - Study sheets (`sheetSlugs`) are Fly-GACA-authored PDFs; each must exist in
 *    pdfs-index.json.
 *  - Every referenced bank / ground-school module / reading path id must exist.
 *
 * Note on scope: this guards the *bundled corpus* of a pack. Per the product decision,
 * universal-knowledge practice questions may still cite Fly-GACA-reproduced FAA/ICAO
 * handbooks in their `cite` text (weather/nav/aerodynamics), exactly as the shipping PPL
 * pack does — that is a study pointer, not a bundled source. The regulatory banks authored
 * for CPL/IR/ATPL cite GACAR/Saudi-AIP and are covered by quiz-citations.test.ts.
 */

const DATA = join(process.cwd(), 'public/data');
const readJson = (name: string) => JSON.parse(readFileSync(join(DATA, name), 'utf8'));

const reference = readJson('reference-index.json') as {
  documents: { slug: string; category: string }[];
};
const pdfs = readJson('pdfs-index.json') as { documents: { slug: string }[] };
const quiz = readJson('quiz.json') as { banks: { id: string }[] };
const groundschool = readJson('groundschool.json') as { modules: { id: string }[] };
const paths = readJson('paths-index.json') as { paths: { id: string }[] };

// GACA/SANS reference documents = the `gaca-guidance` category (GACA ACs + Saudi AIP).
const gacaSansLibrary = new Set(
  reference.documents.filter((d) => d.category === 'gaca-guidance').map((d) => d.slug),
);
const sheetSlugs = new Set(pdfs.documents.map((d) => d.slug));
const bankIds = new Set(quiz.banks.map((b) => b.id));
const moduleIds = new Set(groundschool.modules.map((m) => m.id));
const pathIds = new Set(paths.paths.map((p) => p.id));

describe('pack source provenance (GACA / SANS / Fly GACA only)', () => {
  it('the GACA/SANS reference allowlist is non-empty (guards against an index shape change)', () => {
    expect(gacaSansLibrary.size).toBeGreaterThan(0);
    // Saudi AIP (SANS) docs must be present in the allowlist.
    expect([...gacaSansLibrary].some((s) => s.startsWith('saudi-aip'))).toBe(true);
  });

  it.each(PACKS.map((p) => [p.id, p] as const))(
    'pack "%s" bundles only GACA/SANS reference documents',
    (_id, pack: Pack) => {
      const offenders = (pack.librarySlugs ?? []).filter((s) => !gacaSansLibrary.has(s));
      expect(
        offenders,
        `pack '${pack.id}' bundles non-GACA/SANS library docs: ${offenders.join(', ')}`,
      ).toEqual([]);
    },
  );

  it.each(PACKS.map((p) => [p.id, p] as const))(
    'pack "%s" references only material that exists',
    (_id, pack: Pack) => {
      const missing: string[] = [];
      for (const b of pack.bankIds) if (!bankIds.has(b)) missing.push(`bank:${b}`);
      for (const m of pack.moduleIds ?? []) if (!moduleIds.has(m)) missing.push(`module:${m}`);
      for (const p of pack.pathIds ?? []) if (!pathIds.has(p)) missing.push(`path:${p}`);
      for (const s of pack.sheetSlugs ?? []) if (!sheetSlugs.has(s)) missing.push(`sheet:${s}`);
      expect(
        missing,
        `pack '${pack.id}' references missing material: ${missing.join(', ')}`,
      ).toEqual([]);
    },
  );

  it('every LIVE certificate/subject pack has at least one question bank', () => {
    const empty = PACKS.filter((p) => p.status === 'live' && p.bankIds.length === 0).map(
      (p) => p.id,
    );
    expect(empty, `live packs with no banks: ${empty.join(', ')}`).toEqual([]);
  });
});
