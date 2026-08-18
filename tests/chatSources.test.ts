import { describe, expect, it } from 'vitest';
import {
  partSlug,
  conversationParts,
  linkifyCitations,
  type SourcedMessage,
} from '@/calc/chat/chatSources';
import type { Inline } from '@/calc/chat/markdown';

const valid = new Set(['part-61', 'part-91', 'part-121']);

/** Map a Part number to a Library href only when the slug is known. */
const resolve = (n: string) => (valid.has(`part-${n}`) ? `/library/part-${n}` : null);

describe('partSlug', () => {
  it('resolves the leading Part number from any candidate field', () => {
    expect(partSlug(valid, '61', undefined, undefined)).toBe('part-61');
    expect(partSlug(valid, undefined, undefined, '91.155(a)')).toBe('part-91');
  });

  it('returns null when no candidate names a known Part', () => {
    expect(partSlug(valid, undefined, undefined, undefined)).toBeNull();
    expect(partSlug(valid, '999')).toBeNull(); // not in the valid set
    expect(partSlug(valid, 'no digits here')).toBeNull();
  });

  it('prefers the first candidate that resolves', () => {
    expect(partSlug(valid, '999', '61')).toBe('part-61');
  });
});

describe('conversationParts', () => {
  const messages: SourcedMessage[] = [
    { role: 'user' },
    {
      role: 'assistant',
      sources: [{ part: '61', citation: '61.57(b)' }, { citation: '91.155' }],
    },
    { role: 'user' },
    {
      role: 'assistant',
      sources: [{ citation: '61.51' }, { part: '999' }, { url: 'https://x' }],
    },
  ];

  it('aggregates unique cited Parts with a count, busiest first', () => {
    expect(conversationParts(messages, valid)).toEqual([
      { slug: 'part-61', num: '61', count: 2 },
      { slug: 'part-91', num: '91', count: 1 },
    ]);
  });

  it('ignores user turns, unknown Parts and sourceless answers', () => {
    expect(conversationParts([{ role: 'user', sources: [{ citation: '61' }] }], valid)).toEqual([]);
    expect(conversationParts([{ role: 'assistant' }], valid)).toEqual([]);
  });
});

describe('linkifyCitations', () => {
  it('links a "Part N" citation in prose', () => {
    const spans: Inline[] = [{ type: 'text', value: 'See Part 91 for minima.' }];
    expect(linkifyCitations(spans, resolve)).toEqual([
      { type: 'text', value: 'See ' },
      { type: 'link', value: 'Part 91', href: '/library/part-91' },
      { type: 'text', value: ' for minima.' },
    ]);
  });

  it('links a bare section reference by its Part number', () => {
    const spans: Inline[] = [{ type: 'text', value: 'per 61.57(b) currency' }];
    expect(linkifyCitations(spans, resolve)).toEqual([
      { type: 'text', value: 'per ' },
      { type: 'link', value: '61.57(b)', href: '/library/part-61' },
      { type: 'text', value: ' currency' },
    ]);
  });

  it('leaves prose untouched when the Part is unknown', () => {
    const spans: Inline[] = [{ type: 'text', value: 'Part 999 does not exist' }];
    expect(linkifyCitations(spans, resolve)).toEqual(spans);
  });

  it('passes bold/code/link spans through unchanged', () => {
    const spans: Inline[] = [
      { type: 'bold', value: 'Part 91' },
      { type: 'code', value: '91.155' },
      { type: 'link', value: 'x', href: '/library/part-61' },
    ];
    expect(linkifyCitations(spans, resolve)).toEqual(spans);
  });
});
