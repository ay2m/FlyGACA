import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TOOLS, liveTools } from '@/lib/tools';
import { LIVE_GUIDE_SLUGS } from '@/pages/guides/guides';
import en from '@/i18n/en.json';

/**
 * Marketing-number guard. The hero "stat cards" and the pricing/about copy quote
 * concrete figures — live tools, GACAR Parts, guides — that are part of the
 * product's credibility. They live in three places that must never disagree:
 *   - the live `TOOLS` catalogue and `LIVE_GUIDE_SLUGS`,
 *   - the corpus index shipped under `public/data/`,
 *   - hard-coded numbers baked into the i18n copy.
 * These canaries fail loudly the moment any one drifts, forcing the others to follow.
 */
describe('hero stats stay truthful', () => {
  const liveCount = liveTools().length;

  it('every tool is live (none silently dropped to "soon")', () => {
    // If a tool is parked as 'soon', the marketing count below must be revisited.
    expect(liveCount).toBe(TOOLS.length);
  });

  it('live tool count matches the advertised "55 flight tools"', () => {
    // Canary: bumping the catalogue is fine, but you must update this number AND
    // the copy that quotes it (the assertions below) in the same change.
    expect(liveCount).toBe(55);
    const strings = [
      en.pricing.plans.free.features[1],
      en.about.stats[1].value,
      en.about.features.items[5].p,
      en.metaDesc.schools,
    ];
    for (const s of strings) {
      expect(String(s), `copy "${s}" should quote the live tool count`).toContain(
        String(liveCount),
      );
    }
  });

  it('GACAR Parts count matches the shipped corpus index', () => {
    const path = join(process.cwd(), 'public/data/gacar-index.json');
    const index = JSON.parse(readFileSync(path, 'utf8')) as {
      count: number;
      documents: unknown[];
    };
    expect(index.documents.length).toBe(index.count);
    // The Home "proof strip" and meta copy quote 74 Parts.
    expect(index.count).toBe(74);
  });

  it('live guide count matches the Learn hub figure', () => {
    expect(LIVE_GUIDE_SLUGS.length).toBe(23);
  });
});
