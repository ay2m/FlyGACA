import { describe, expect, it } from 'vitest';
import { sanitizeHtml, tocFromHtml } from '@/hooks/useFetchText';

// sanitizeHtml is defense-in-depth over the trusted-but-machine-made GACAR HTML
// corpus; tocFromHtml drives the reader's in-page navigation. Both are pure.

describe('sanitizeHtml', () => {
  it('strips script/style/iframe/object/embed blocks', () => {
    const dirty =
      '<p>keep</p><script>steal()</script><style>.x{}</style>' +
      '<iframe src="evil"></iframe><object></object><embed>';
    const clean = sanitizeHtml(dirty);
    expect(clean).toContain('<p>keep</p>');
    expect(clean).not.toMatch(/<script|<style|<iframe|<object|<embed/i);
    expect(clean).not.toContain('steal()');
  });

  it('removes self-closing/void embed, link and meta tags', () => {
    expect(
      sanitizeHtml('<link rel="stylesheet" href="x.css"><meta charset="utf-8"><p>ok</p>'),
    ).toBe('<p>ok</p>');
  });

  it('removes inline event-handler attributes (both quote styles)', () => {
    const clean = sanitizeHtml(`<div onclick="hack()" onmouseover='x()'>hi</div>`);
    expect(clean).not.toMatch(/onclick|onmouseover/i);
    expect(clean).toContain('>hi</div>');
  });

  it('neutralises javascript: URLs in href/src', () => {
    const clean = sanitizeHtml(`<a href="javascript:alert(1)">x</a><img src='javascript:bad()'>`);
    expect(clean).not.toMatch(/javascript:/i);
  });

  it('leaves benign markup and ordinary links untouched', () => {
    const html = '<h2 id="s1">Title</h2><p>Body with <a href="/library/part-1">a link</a>.</p>';
    expect(sanitizeHtml(html)).toBe(html);
  });
});

describe('tocFromHtml', () => {
  it('extracts id/title pairs from h2 and h3 headings', () => {
    const html = '<h2 id="intro">Introduction</h2><p>x</p><h3 id="scope">Scope &amp; limits</h3>';
    expect(tocFromHtml(html)).toEqual([
      { id: 'intro', title: 'Introduction' },
      { id: 'scope', title: 'Scope &amp; limits' },
    ]);
  });

  it('strips nested markup from heading text', () => {
    expect(tocFromHtml('<h2 id="a"><span class="n">61.51</span> Logging</h2>')).toEqual([
      { id: 'a', title: '61.51 Logging' },
    ]);
  });

  it('ignores headings without an id and returns [] when there are none', () => {
    expect(tocFromHtml('<h2>No anchor</h2><p>nothing here</p>')).toEqual([]);
    expect(tocFromHtml('')).toEqual([]);
  });
});
