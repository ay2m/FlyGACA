import { describe, expect, it } from 'vitest';
// @ts-expect-error — plain ESM script, no types; exercised for its pure helpers.
import { validateNode, validateHtml, nodesFromLd } from '../scripts/validate-jsonld.mjs';

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
        { '@type': 'WebSite', name: 'Fly GACA', url: 'https://flygaca.com' },
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
