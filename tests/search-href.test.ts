import { describe, expect, it } from 'vitest';
import { searchHref, parseSearchUrl, toSearchRef, linkHref } from '@/lib/contentLinks';

describe('searchHref', () => {
  it('rewrites regulations URLs to the Document reader', () => {
    expect(searchHref('document.html?type=regulations&id=part-61#sec-currency')).toBe(
      '/library/part-61#sec-currency',
    );
  });

  it('rewrites reference URLs under /library/reference', () => {
    expect(searchHref('document.html?type=reference&id=ac-68-1-basicmed#sec-1')).toBe(
      '/library/reference/ac-68-1-basicmed#sec-1',
    );
  });

  it('rewrites handbooks URLs under /library/handbook', () => {
    expect(searchHref('document.html?type=handbooks&id=surveillance#sec-2')).toBe(
      '/library/handbook/surveillance#sec-2',
    );
  });

  it('works without an anchor', () => {
    expect(searchHref('document.html?type=regulations&id=part-1')).toBe('/library/part-1');
  });

  it('returns null for unknown types or missing id', () => {
    expect(searchHref('document.html?type=charts&id=oerk')).toBeNull();
    expect(searchHref('document.html?type=regulations')).toBeNull();
  });

  it('carries the search phrase as ?q before the anchor', () => {
    expect(
      searchHref('document.html?type=regulations&id=part-61#sec-currency', 'night currency'),
    ).toBe('/library/part-61?q=night%20currency#sec-currency');
    // Blank/whitespace queries add no query string.
    expect(searchHref('document.html?type=regulations&id=part-1', '  ')).toBe('/library/part-1');
  });

  it('routes a semantic pointer object identically to the legacy URL', () => {
    // Back-compat shim: when the upstream corpus switches to semantic fields,
    // the frontend needs no change. `kind` (LibraryKind) and legacy `type` both work.
    expect(searchHref({ kind: 'regulations', id: 'part-61', anchor: 'sec-currency' })).toBe(
      '/library/part-61#sec-currency',
    );
    expect(searchHref({ type: 'handbooks', id: 'surveillance', anchor: 'sec-2' })).toBe(
      '/library/handbook/surveillance#sec-2',
    );
    expect(searchHref({ kind: 'charts', id: 'oerk' })).toBeNull();
  });
});

describe('parseSearchUrl', () => {
  it('extracts kind, id and anchor', () => {
    expect(parseSearchUrl('document.html?type=reference&id=ac-68-1#sec-1')).toEqual({
      kind: 'reference',
      id: 'ac-68-1',
      anchor: 'sec-1',
    });
  });

  it('returns null when unroutable', () => {
    expect(parseSearchUrl('document.html?type=charts&id=oerk')).toBeNull();
    expect(parseSearchUrl('nonsense')).toBeNull();
  });
});

describe('toSearchRef', () => {
  it('passes through a semantic object, normalising legacy type to kind', () => {
    expect(toSearchRef({ type: 'handbooks', id: 'surveillance', anchor: 'sec-2' })).toEqual({
      kind: 'handbook',
      id: 'surveillance',
      anchor: 'sec-2',
    });
    expect(toSearchRef({ kind: 'reference', id: 'ac-68-1' })).toEqual({
      kind: 'reference',
      id: 'ac-68-1',
    });
  });

  it('parses a legacy string identically to parseSearchUrl', () => {
    const u = 'document.html?type=reference&id=ac-68-1#sec-1';
    expect(toSearchRef(u)).toEqual(parseSearchUrl(u));
  });

  it('returns null for an unroutable object', () => {
    expect(toSearchRef({ kind: 'charts', id: 'oerk' })).toBeNull();
    expect(toSearchRef({ type: 'regulations', id: '' })).toBeNull();
  });
});

describe('linkHref', () => {
  it('routes semantic corpus pointers via the Library reader', () => {
    expect(linkHref({ kind: 'regulations', id: 'part-61', anchor: 'sec-x' })).toBe(
      '/library/part-61#sec-x',
    );
    expect(linkHref({ kind: 'handbook', id: 'foreword' })).toBe('/library/handbook/foreword');
  });

  it('passes through explicit app routes', () => {
    expect(linkHref({ route: '/study/quiz?bank=medical' })).toBe('/study/quiz?bank=medical');
  });

  it('rewrites legacy internal .html links to app routes', () => {
    expect(linkHref('../guides/saudi-ppl-requirements.html')).toBe(
      '/guides/saudi-ppl-requirements',
    );
    expect(linkHref('tools/e6b.html')).toBe('/tools/e6b');
    expect(linkHref('../library.html')).toBe('/library');
    expect(linkHref('study/groundschool.html')).toBe('/study/groundschool');
    expect(linkHref('study/quiz.html?bank=medical')).toBe('/study/quiz?bank=medical');
  });

  it('still resolves legacy corpus URL strings (back-compat)', () => {
    expect(linkHref('../document.html?type=handbooks&id=foreword')).toBe(
      '/library/handbook/foreword',
    );
  });

  it('resolves the deprecated url field on a link object', () => {
    expect(linkHref({ url: '../tools/vfr-minima.html' })).toBe('/tools/vfr-minima');
  });

  it('returns null for anything unroutable', () => {
    expect(linkHref('https://gaca.gov.sa')).toBeNull();
    expect(linkHref('nonsense')).toBeNull();
    expect(linkHref({})).toBeNull();
  });
});
