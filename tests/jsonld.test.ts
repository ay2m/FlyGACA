import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN } from '@/lib/seo/seo';
import {
  ORG_ID,
  SITE_ID,
  aboutPageLd,
  airportLd,
  articleLd,
  breadcrumbLd,
  courseLd,
  definedTermSetLd,
  faqLd,
  itemListLd,
  organizationLd,
  softwareAppLd,
  techArticleLd,
  webSiteLd,
} from '@/lib/seo/jsonld';

describe('organization + website', () => {
  it('uses stable @id anchors matching the static graph', () => {
    expect(ORG_ID).toBe(`${SITE_ORIGIN}/#organization`);
    expect(SITE_ID).toBe(`${SITE_ORIGIN}/#website`);
    expect(organizationLd()['@id']).toBe(ORG_ID);
  });
  it('website exposes a SearchAction into the library', () => {
    const ld = webSiteLd();
    expect(ld['@type']).toBe('WebSite');
    expect(ld.publisher).toEqual({ '@id': ORG_ID });
    const action = ld.potentialAction as { target: { urlTemplate: string } };
    expect(action.target.urlTemplate).toBe(`${SITE_ORIGIN}/library?q={search_term_string}`);
  });
});

describe('breadcrumbLd', () => {
  it('numbers positions and canonicalizes each path', () => {
    const ld = breadcrumbLd([
      { name: 'Home', path: '/' },
      { name: 'Library', path: '/library' },
      { name: 'Part 91', path: '/library/part-91' },
    ]);
    const items = ld.itemListElement as Array<{ position: number; name: string; item: string }>;
    expect(items.map((i) => i.position)).toEqual([1, 2, 3]);
    expect(items[2].item).toBe(`${SITE_ORIGIN}/library/part-91`);
  });
});

describe('itemListLd', () => {
  it('numbers positions, counts items and canonicalizes each url', () => {
    const ld = itemListLd([
      { name: 'Crosswind', path: '/tools/crosswind' },
      { name: 'Density altitude', path: '/tools/density-altitude' },
    ]);
    expect(ld['@type']).toBe('ItemList');
    expect(ld.numberOfItems).toBe(2);
    const items = ld.itemListElement as Array<{ position: number; name: string; url: string }>;
    expect(items.map((i) => i.position)).toEqual([1, 2]);
    expect(items[0].url).toBe(`${SITE_ORIGIN}/tools/crosswind`);
  });
});

describe('article builders', () => {
  it('TechArticle carries url, language and self-contained author/publisher', () => {
    const ld = techArticleLd({
      title: 'Part 91',
      description: 'General operating rules',
      path: '/library/part-91',
      lang: 'ar',
      dateModified: '2026-01-15',
    });
    expect(ld['@type']).toBe('TechArticle');
    expect(ld.headline).toBe('Part 91');
    expect(ld.inLanguage).toBe('ar');
    expect(ld.url).toBe(`${SITE_ORIGIN}/library/part-91`);
    expect(ld.isPartOf).toEqual({ '@id': SITE_ID });
    // author + publisher are self-contained Organization nodes (not bare @id refs)
    // so a per-item validator resolves them without the site-wide graph.
    expect(ld.author).toMatchObject({ '@type': 'Organization', '@id': ORG_ID, name: 'Fly GACA' });
    expect(ld.publisher).toMatchObject({
      '@type': 'Organization',
      '@id': ORG_ID,
      name: 'Fly GACA',
    });
    // a single revision date is emitted as both datePublished and dateModified.
    expect(ld.datePublished).toBe('2026-01-15');
    expect(ld.dateModified).toBe('2026-01-15');
  });
  it('Article defaults language to en and omits empty description + dates', () => {
    const ld = articleLd({ title: 'Airspace explained', path: '/guides/airspace-explained' });
    expect(ld['@type']).toBe('Article');
    expect(ld.inLanguage).toBe('en');
    expect('description' in ld).toBe(false);
    expect('datePublished' in ld).toBe(false);
    expect(ld.author).toMatchObject({ '@type': 'Organization', '@id': ORG_ID });
  });
});

describe('course + faq + software', () => {
  it('courseLd names the org as provider and carries a free online instance', () => {
    const ld = courseLd({ title: 'PPL Ground School', path: '/study/groundschool' });
    expect(ld['@type']).toBe('Course');
    expect(ld.provider).toMatchObject({ '@type': 'Organization', '@id': ORG_ID, name: 'Fly GACA' });
    expect(ld.isAccessibleForFree).toBe(true);
    const ci = ld.hasCourseInstance as { '@type': string; courseMode: string };
    expect(ci['@type']).toBe('CourseInstance');
    expect(ci.courseMode).toBe('online');
  });
  it('faqLd maps Q/A pairs to Question/Answer', () => {
    const ld = faqLd([{ q: 'Is Fly GACA official?', a: 'No — it is independent.' }]);
    const main = ld.mainEntity as Array<{ '@type': string; acceptedAnswer: { text: string } }>;
    expect(main[0]['@type']).toBe('Question');
    expect(main[0].acceptedAnswer.text).toBe('No — it is independent.');
  });
  it('softwareAppLd marks the tool free with an SAR offer', () => {
    const ld = softwareAppLd({ title: 'Crosswind', path: '/tools/crosswind' });
    expect(ld['@type']).toBe('SoftwareApplication');
    expect(ld.isAccessibleForFree).toBe(true);
    expect(ld.offers).toEqual({ '@type': 'Offer', price: '0', priceCurrency: 'SAR' });
    expect(ld.url).toBe(`${SITE_ORIGIN}/tools/crosswind`);
  });
});

describe('aboutPageLd', () => {
  it('is an AboutPage whose mainEntity is the Organization', () => {
    const ld = aboutPageLd({
      title: 'About Fly GACA',
      description: 'Independent educational library.',
      path: '/about',
      lang: 'en',
    });
    expect(ld['@type']).toBe('AboutPage');
    expect(ld.url).toBe(`${SITE_ORIGIN}/about`);
    expect(ld.mainEntity).toEqual({ '@id': ORG_ID });
    expect(ld.isPartOf).toEqual({ '@id': SITE_ID });
    expect(ld.publisher).toMatchObject({ '@type': 'Organization', '@id': ORG_ID });
  });
});

describe('definedTermSetLd', () => {
  it('binds each term back to the set as a DefinedTerm', () => {
    const ld = definedTermSetLd({
      name: 'Aviation glossary',
      description: 'Key Saudi-aviation terms.',
      path: '/library/glossary',
      terms: [
        { term: 'METAR', def: 'A routine aerodrome weather report.' },
        { term: 'NOTAM', def: 'A notice to air missions.' },
      ],
      lang: 'en',
    });
    expect(ld['@type']).toBe('DefinedTermSet');
    expect(ld.url).toBe(`${SITE_ORIGIN}/library/glossary`);
    expect(ld.inLanguage).toBe('en');
    const terms = ld.hasDefinedTerm as Array<{
      '@type': string;
      name: string;
      description: string;
      inDefinedTermSet: string;
    }>;
    expect(terms).toHaveLength(2);
    expect(terms[0]['@type']).toBe('DefinedTerm');
    expect(terms[0].name).toBe('METAR');
    expect(terms[0].inDefinedTermSet).toBe(`${SITE_ORIGIN}/library/glossary`);
  });
});

describe('airportLd', () => {
  it('describes the aerodrome as an Airport place with codes + geo', () => {
    const ld = airportLd({
      name: 'King Khalid International',
      icao: 'OERK',
      iata: 'RUH',
      path: '/tools/aerodromes/OERK',
      lat: 24.9576,
      lon: 46.6988,
      elevationFt: 2049,
      country: 'Saudi Arabia',
    });
    expect(ld['@type']).toBe('Airport');
    expect(ld.icaoCode).toBe('OERK');
    expect(ld.iataCode).toBe('RUH');
    expect(ld.url).toBe(`${SITE_ORIGIN}/tools/aerodromes/OERK`);
    expect(ld.geo).toMatchObject({
      '@type': 'GeoCoordinates',
      latitude: 24.9576,
      longitude: 46.6988,
      elevation: '2049 ft',
    });
    expect(ld.address).toMatchObject({ '@type': 'PostalAddress', addressCountry: 'Saudi Arabia' });
  });
  it('omits optional codes/geo when absent', () => {
    const ld = airportLd({ name: 'Some Strip', icao: 'OXXX', path: '/tools/aerodromes/OXXX' });
    expect('iataCode' in ld).toBe(false);
    expect('geo' in ld).toBe(false);
    expect('address' in ld).toBe(false);
  });
});
