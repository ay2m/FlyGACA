import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script, no types; exercised for its pure helpers.
import {
  validateNode,
  validateHtml,
  nodesFromLd,
  isContentRoute,
  hasManagedLd,
} from '../scripts/validate-jsonld.mjs';

const ldScript = (obj: unknown) =>
  `<script type="application/ld+json">${JSON.stringify(obj)}</script>`;

describe('nodesFromLd', () => {
  it('unwraps a @graph and passes arrays through', () => {
    expect(nodesFromLd({ '@graph': [{ '@type': 'A' }, { '@type': 'B' }] })).toHaveLength(2);
    expect(nodesFromLd([{ '@type': 'A' }])).toHaveLength(1);
    expect(nodesFromLd({ '@type': 'Solo' })).toHaveLength(1);
  });
});

describe('validateNode', () => {
  it('accepts a well-formed DefinedTermSet', () => {
    const node = {
      '@type': 'DefinedTermSet',
      name: 'Glossary',
      url: 'https://flygaca.com/library/glossary',
      hasDefinedTerm: [{ '@type': 'DefinedTerm', name: 'METAR', description: 'A weather report.' }],
    };
    expect(validateNode(node)).toEqual([]);
  });

  it('flags a DefinedTerm missing its description', () => {
    const node = {
      '@type': 'DefinedTermSet',
      name: 'Glossary',
      hasDefinedTerm: [{ '@type': 'DefinedTerm', name: 'METAR' }],
    };
    expect(validateNode(node).join(' ')).toMatch(/definedTerm\[0\] missing description/);
  });

  it('flags an Article missing its headline', () => {
    expect(
      validateNode({ '@type': 'Article', url: 'https://flygaca.com/guides/x' }).join(' '),
    ).toMatch(/Article missing required "headline"/);
  });

  it('flags a breadcrumb item that is not an absolute URL', () => {
    const node = {
      '@type': 'BreadcrumbList',
      itemListElement: [{ position: 1, name: 'Home', item: '/relative' }],
    };
    expect(validateNode(node).join(' ')).toMatch(/breadcrumb\[0\] "item" is not an absolute URL/);
  });

  it('flags a missing @type', () => {
    expect(validateNode({ name: 'x' }).join(' ')).toMatch(/missing @type/);
  });
});

describe('validateHtml', () => {
  it('reports invalid JSON in a block', () => {
    const { problems } = validateHtml('<script type="application/ld+json">{ oops </script>');
    expect(problems.join(' ')).toMatch(/invalid JSON/);
  });

  it('accepts a valid @graph document and counts blocks', () => {
    const html = ldScript({
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'Organization', name: 'Fly GACA', url: 'https://flygaca.com' },
        {
          '@type': 'WebSite',
          name: 'Fly GACA',
          url: 'https://flygaca.com',
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: 'https://flygaca.com/library?q={search_term_string}',
            },
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    });
    const { blockCount, problems } = validateHtml(html);
    expect(blockCount).toBe(1);
    expect(problems).toEqual([]);
  });

  it('flags a top-level object missing @context', () => {
    const { problems } = validateHtml(
      ldScript({ '@type': 'Article', headline: 'x', url: 'https://flygaca.com/a' }),
    );
    expect(problems.join(' ')).toMatch(/missing @context/);
  });
});

describe('WebSite SearchAction contract', () => {
  const site = (action: unknown) => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Fly GACA',
    url: 'https://flygaca.com',
    ...(action === undefined ? {} : { potentialAction: action }),
  });

  it('requires a potentialAction at all — the search box cannot silently vanish', () => {
    expect(validateNode(site(undefined)).join(' ')).toMatch(/missing required "potentialAction"/);
  });

  it('rejects a target template with no {search_term_string} placeholder', () => {
    const problems = validateNode(
      site({
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://flygaca.com/library' },
        'query-input': 'required name=search_term_string',
      }),
    );
    expect(problems.join(' ')).toMatch(/no \{search_term_string\} placeholder/);
  });

  it('rejects a SearchAction with no query-input', () => {
    const problems = validateNode(
      site({
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: 'https://flygaca.com/library?q={search_term_string}' },
      }),
    );
    expect(problems.join(' ')).toMatch(/missing "query-input"/);
  });

  it('accepts the shape we actually ship', () => {
    expect(
      validateNode(
        site({
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: 'https://flygaca.com/library?q={search_term_string}',
          },
          'query-input': 'required name=search_term_string',
        }),
      ),
    ).toEqual([]);
  });
});

describe('AboutPage', () => {
  it('requires the entity the page is about', () => {
    const problems = validateNode({
      '@type': 'AboutPage',
      name: 'About Fly GACA',
      url: 'https://flygaca.com/about',
    });
    expect(problems.join(' ')).toMatch(/missing required "mainEntity"/);
  });
});

describe('content-route schema coverage', () => {
  it('treats leaf content pages as needing their own schema, in both languages', () => {
    for (const p of [
      'dist/guides/saudi-ppl-requirements/index.html',
      'dist/ar/guides/saudi-ppl-requirements/index.html',
      'dist/library/part-91/index.html',
      'dist/tools/crosswind/index.html',
      'dist/tools/aerodromes/OERK/index.html',
      'dist/study/packs/ppl-exam/index.html',
    ])
      expect(isContentRoute(p), p).toBe(true);
  });

  it('exempts the home page, hubs and non-document viewers', () => {
    for (const p of [
      'dist/index.html',
      'dist/ar/index.html',
      'dist/about/index.html',
      'dist/library/index.html',
      'dist/library/charts/index.html',
      'dist/library/glossary/index.html',
      'dist/study/quiz/index.html',
    ])
      expect(isContentRoute(p), p).toBe(false);
  });

  it('detects the managed node, not the site-wide graph', () => {
    expect(hasManagedLd('<script type="application/ld+json" data-managed-ld>{}</script>')).toBe(true);
    // The static Organization/WebSite graph is copied into every page — on its
    // own it never counts as per-route coverage.
    expect(hasManagedLd('<script type="application/ld+json">{"@graph":[]}</script>')).toBe(false);
  });
});
