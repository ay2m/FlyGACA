import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { organizationLd, webSiteLd, ORG_ID, SITE_ID } from '@/lib/seo/jsonld';
import { SITE_ORIGIN } from '@/lib/seo/seo';

/**
 * index.html ships the site-wide Organization + WebSite graph as literal JSON so
 * it is present for crawlers that never run our JS. `organizationLd()` and
 * `webSiteLd()` build the same two nodes for runtime use. Nothing linked the two
 * copies, so an edit to one silently drifted from the other — this pins them
 * together. When a builder changes, update index.html in the same commit.
 */
const graph = (() => {
  const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
  const block = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )?.[1];
  if (!block) throw new Error('index.html has no ld+json block');
  return JSON.parse(block)['@graph'] as Array<Record<string, unknown>>;
})();

const nodeOfType = (type: string) => {
  const node = graph.find((n) => n['@type'] === type);
  if (!node) throw new Error(`index.html graph has no ${type} node`);
  return node;
};

describe('static index.html graph matches the runtime builders', () => {
  it('Organization identity, address and market agree', () => {
    const stat = nodeOfType('Organization');
    const built = organizationLd();
    for (const key of [
      '@id',
      'name',
      'legalName',
      'alternateName',
      'url',
      'description',
      'address',
      'areaServed',
      'identifier',
      'vatID',
      'taxID',
      'sameAs',
      'contactPoint',
    ]) {
      expect(stat[key], `Organization.${key} drifted from organizationLd()`).toEqual(built[key]);
    }
    expect(stat['@id']).toBe(ORG_ID);
  });

  it('WebSite identity and the site-search action agree', () => {
    const stat = nodeOfType('WebSite');
    const built = webSiteLd();
    for (const key of ['@id', 'name', 'url', 'inLanguage', 'publisher', 'potentialAction']) {
      expect(stat[key], `WebSite.${key} drifted from webSiteLd()`).toEqual(built[key]);
    }
    expect(stat['@id']).toBe(SITE_ID);
  });

  it('the search action points at a real, seedable library query', () => {
    const action = nodeOfType('WebSite').potentialAction as {
      target: { urlTemplate: string };
      'query-input': string;
    };
    // /library reads ?q= into its search box (src/pages/library/Library.tsx), so
    // the template resolves to a page that actually runs the query.
    expect(action.target.urlTemplate).toBe(`${SITE_ORIGIN}/library?q={search_term_string}`);
    expect(action['query-input']).toContain('search_term_string');
  });
});
