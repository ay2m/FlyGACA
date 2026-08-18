import { describe, expect, it } from 'vitest';
import {
  feedbackKey,
  getFeedback,
  recordFeedback,
  normalizeFeedback,
} from '@/calc/chat/chatFeedback';

describe('feedbackKey', () => {
  it('is stable for the same text and differs across answers', () => {
    expect(feedbackKey('same answer')).toBe(feedbackKey('same answer'));
    expect(feedbackKey('a')).not.toBe(feedbackKey('b'));
  });
});

describe('recordFeedback', () => {
  it('records a rating', () => {
    expect(recordFeedback({}, 'k', 'up')).toEqual({ k: 'up' });
  });

  it('toggles off when the same rating is re-applied', () => {
    expect(recordFeedback({ k: 'up' }, 'k', 'up')).toEqual({});
  });

  it('replaces a rating with the opposite', () => {
    expect(recordFeedback({ k: 'up' }, 'k', 'down')).toEqual({ k: 'down' });
  });

  it('does not mutate the input map', () => {
    const map = { k: 'up' as const };
    recordFeedback(map, 'k', 'down');
    expect(map).toEqual({ k: 'up' });
  });
});

describe('getFeedback', () => {
  it('returns the stored rating or undefined', () => {
    expect(getFeedback({ k: 'down' }, 'k')).toBe('down');
    expect(getFeedback({}, 'missing')).toBeUndefined();
  });
});

describe('normalizeFeedback', () => {
  it('keeps only valid up/down entries', () => {
    expect(normalizeFeedback({ a: 'up', b: 'down', c: 'sideways', d: 3 })).toEqual({
      a: 'up',
      b: 'down',
    });
  });

  it('returns an empty map for non-objects', () => {
    expect(normalizeFeedback(null)).toEqual({});
    expect(normalizeFeedback('nope')).toEqual({});
  });
});
