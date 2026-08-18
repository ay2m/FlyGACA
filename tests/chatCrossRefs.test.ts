import { describe, expect, it } from 'vitest';
import { crossRefParts } from '@/calc/chat/chatCrossRefs';

const valid = new Set(['part-61', 'part-91', 'part-121']);

describe('crossRefParts', () => {
  it('surfaces cited Parts in prose that are not already sources', () => {
    const answer = 'See Part 61 for the licence, and §121.5 for the operation.';
    const sources = [{ part: '91', citation: '91.155' }];
    expect(crossRefParts(answer, sources, valid)).toEqual([
      { slug: 'part-61', num: '61' },
      { slug: 'part-121', num: '121' },
    ]);
  });

  it('excludes Parts already shown as sources', () => {
    const answer = 'Per Part 91 §91.155 the minima apply.';
    const sources = [{ part: '91' }];
    expect(crossRefParts(answer, sources, valid)).toEqual([]);
  });

  it('ignores unknown Parts and dedupes repeats', () => {
    const answer = 'Part 61 and Part 61 again, plus Part 999.';
    expect(crossRefParts(answer, [], valid)).toEqual([{ slug: 'part-61', num: '61' }]);
  });

  it('returns nothing for prose without citations', () => {
    expect(crossRefParts('Just plain guidance here.', [], valid)).toEqual([]);
  });
});
