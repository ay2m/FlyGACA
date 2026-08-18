import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown, safeHref, toSpeechText } from '@/calc/chat/markdown';

describe('parseInline', () => {
  it('splits bold and code out of surrounding text', () => {
    expect(parseInline('see **GACAR** at `91.155` now')).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'bold', value: 'GACAR' },
      { type: 'text', value: ' at ' },
      { type: 'code', value: '91.155' },
      { type: 'text', value: ' now' },
    ]);
  });

  it('returns a single text span for plain input', () => {
    expect(parseInline('just words')).toEqual([{ type: 'text', value: 'just words' }]);
  });

  it('parses a markdown link with a safe href', () => {
    expect(parseInline('see [Part 91](/library/part-91) for rules')).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'link', value: 'Part 91', href: '/library/part-91' },
      { type: 'text', value: ' for rules' },
    ]);
  });

  it('parses an external https link', () => {
    expect(parseInline('[GACA](https://gaca.gov.sa)')).toEqual([
      { type: 'link', value: 'GACA', href: 'https://gaca.gov.sa' },
    ]);
  });

  it('degrades a javascript: link to inert literal text (no link span)', () => {
    const spans = parseInline('[x](javascript:void)');
    expect(spans.some((s) => s.type === 'link')).toBe(false);
    expect(spans.map((s) => s.value).join('')).toBe('[x](javascript:void)');
  });
});

describe('safeHref', () => {
  it('allows site-relative paths and http(s)/mailto', () => {
    expect(safeHref('/library/part-61')).toBe('/library/part-61');
    expect(safeHref('https://gaca.gov.sa')).toBe('https://gaca.gov.sa');
    expect(safeHref('mailto:info@example.com')).toBe('mailto:info@example.com');
  });

  it('rejects protocol-relative and dangerous schemes', () => {
    expect(safeHref('//evil.example')).toBeNull();
    expect(safeHref('javascript:alert(1)')).toBeNull();
    expect(safeHref('data:text/html;base64,xxx')).toBeNull();
    expect(safeHref('')).toBeNull();
  });
});

describe('parseMarkdown', () => {
  it('separates paragraphs on blank lines', () => {
    const blocks = parseMarkdown('first line\n\nsecond line');
    expect(blocks).toHaveLength(2);
    expect(blocks.every((b) => b.type === 'paragraph')).toBe(true);
  });

  it('parses headings with their level', () => {
    const [h] = parseMarkdown('## Weather minima');
    expect(h).toMatchObject({ type: 'heading', level: 2 });
  });

  it('parses an unordered list as one block of items', () => {
    const blocks = parseMarkdown('- one\n- two\n- three');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'ul' });
    expect(blocks[0].type === 'ul' && blocks[0].items).toHaveLength(3);
  });

  it('parses an ordered list distinctly from bullets', () => {
    const blocks = parseMarkdown('1. first\n2. second');
    expect(blocks[0].type).toBe('ol');
  });

  it('keeps a paragraph and a following list as separate blocks', () => {
    const blocks = parseMarkdown('Intro text\n- a\n- b');
    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'ul']);
  });

  it('degrades empty/whitespace input to no blocks without throwing', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown('   \n  \n')).toEqual([]);
  });

  it('parses a blockquote, stripping the marker and parsing inline spans', () => {
    const blocks = parseMarkdown('> In practice: revise **Part 91** before the exam.');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'blockquote' });
    expect(blocks[0].type === 'blockquote' && blocks[0].spans).toContainEqual({
      type: 'bold',
      value: 'Part 91',
    });
  });

  it('joins a multi-line blockquote into one block', () => {
    const blocks = parseMarkdown('> line one\n> line two');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe('blockquote');
  });

  it('keeps a paragraph and a following blockquote separate', () => {
    expect(parseMarkdown('Answer text\n> note').map((b) => b.type)).toEqual([
      'paragraph',
      'blockquote',
    ]);
  });
});

describe('toSpeechText', () => {
  it('drops bold and inline-code markers so symbols are not spoken', () => {
    expect(toSpeechText('see **GACAR** at `91.155` now')).toBe('see GACAR at 91.155 now.');
  });

  it('speaks only the link text, not the href', () => {
    expect(toSpeechText('[Part 91](/library/part-91)')).toBe('Part 91.');
  });

  it('flattens headings and lists with pauses and no markup', () => {
    expect(toSpeechText('## Weather minima\n- one\n- two')).toBe('Weather minima. one. two.');
  });

  it('reads the section sign as a word', () => {
    expect(toSpeechText('§91.155')).toBe('section 91.155.');
  });

  it('returns an empty string for whitespace-only input', () => {
    expect(toSpeechText('   \n  ')).toBe('');
  });
});
