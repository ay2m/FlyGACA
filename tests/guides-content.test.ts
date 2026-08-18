import { describe, expect, it } from 'vitest';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';
import { GUIDE_SLUGS, GUIDE_META, GUIDE_STATUS } from '@/pages/guides/guides';

/**
 * Content-completeness guard for guides. The i18n-parity test only checks that
 * EN and AR have the *same* keys — a guide missing `intro` in BOTH languages
 * would pass parity yet render broken. This asserts every guide actually has all
 * required, non-empty content in both bundles, plus metadata and a valid status.
 */
interface GuideItem {
  name: unknown;
  blurb: unknown;
  intro: unknown;
  sections: unknown;
  adel: unknown;
  takeaways: unknown;
}
type Bundle = { guides: { items: Record<string, GuideItem | undefined> } };

const enItems = (en as unknown as Bundle).guides.items;
const arItems = (ar as unknown as Bundle).guides.items;

const nonEmptyStr = (v: unknown): boolean => typeof v === 'string' && v.trim().length > 0;

/** Author-facing markers a *published* guide must never carry. `new-guide.mjs`
 *  seeds the exact scaffold form `TODO (...)`, but a stray hand-written `TODO`
 *  or `FIXME` note is just as much a "forgot to finish" signal, so catch both.
 *  Case-sensitive and word-bounded so ordinary prose can't false-positive. */
const LEFTOVER_MARKER = /\b(?:TODO|FIXME)\b/;

/** Every author-facing string in a guide item, flattened — used to scan for
 *  unreplaced scaffold placeholders. */
function contentStrings(item: GuideItem | undefined): string[] {
  if (!item) return [];
  const out: string[] = [];
  for (const key of ['name', 'blurb', 'intro', 'adel'] as const) {
    if (typeof item[key] === 'string') out.push(item[key] as string);
  }
  if (Array.isArray(item.sections)) {
    for (const s of item.sections as { h?: unknown; p?: unknown }[]) {
      if (typeof s.h === 'string') out.push(s.h);
      if (typeof s.p === 'string') out.push(s.p);
    }
  }
  if (Array.isArray(item.takeaways)) {
    for (const tk of item.takeaways as unknown[]) if (typeof tk === 'string') out.push(tk);
  }
  return out;
}

function checkItem(item: GuideItem | undefined): void {
  expect(item, 'guide content missing for this language').toBeDefined();
  if (!item) return;
  for (const key of ['name', 'blurb', 'intro', 'adel'] as const) {
    expect(nonEmptyStr(item[key]), `"${key}" must be a non-empty string`).toBe(true);
  }
  expect(
    Array.isArray(item.sections) && item.sections.length > 0,
    'sections must be non-empty',
  ).toBe(true);
  for (const s of item.sections as { h: unknown; p: unknown }[]) {
    expect(nonEmptyStr(s.h) && nonEmptyStr(s.p), 'each section needs an "h" and "p"').toBe(true);
  }
  const takeaways = item.takeaways as unknown[];
  expect(Array.isArray(takeaways) && takeaways.length > 0, 'takeaways must be non-empty').toBe(
    true,
  );
  for (const tk of takeaways)
    expect(nonEmptyStr(tk), 'each takeaway must be a non-empty string').toBe(true);
}

describe('guide content completeness (EN + AR)', () => {
  for (const slug of GUIDE_SLUGS) {
    it(`${slug} has complete EN + AR content`, () => {
      checkItem(enItems[slug]);
      checkItem(arItems[slug]);
    });
    it(`${slug} has metadata + a valid status`, () => {
      expect(GUIDE_META[slug]).toBeDefined();
      expect(['draft', 'live']).toContain(GUIDE_STATUS[slug]);
    });
  }

  // `new-guide.mjs` seeds every field with a `TODO (...)` placeholder and the
  // guide as a draft; the author replaces them before flipping it to 'live'
  // (GUIDE_AUTHORING.md §8). Nothing else catches a publish that skipped that
  // step — placeholders are non-empty strings, so the completeness check above
  // passes — so a 'live' guide must carry no leftover scaffold placeholder or
  // stray TODO/FIXME note left behind while authoring.
  for (const slug of GUIDE_SLUGS) {
    if (GUIDE_STATUS[slug] !== 'live') continue;
    it(`${slug} (live) has no leftover TODO/FIXME markers`, () => {
      for (const [lang, items] of [
        ['EN', enItems],
        ['AR', arItems],
      ] as const) {
        const leftover = contentStrings(items[slug]).filter((s) => LEFTOVER_MARKER.test(s));
        expect(
          leftover,
          `${lang} ${slug} still has an unresolved TODO/FIXME marker: ${leftover.join(' | ')}`,
        ).toEqual([]);
      }
    });
  }

  it('has no orphan guides.items entries outside GUIDE_SLUGS', () => {
    const known = new Set<string>(GUIDE_SLUGS);
    const orphans = Object.keys(enItems).filter((k) => !known.has(k));
    expect(orphans, `Orphan guide items: ${orphans.join(', ')}`).toEqual([]);
  });
});
