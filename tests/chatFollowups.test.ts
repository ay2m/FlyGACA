import { describe, expect, it } from 'vitest';
import {
  followupSuggestions,
  lastAssistantIndex,
  showFollowups,
  type TurnLike,
} from '@/calc/chat/chatFollowups';

describe('followupSuggestions', () => {
  it('offers none for a refusal', () => {
    expect(followupSuggestions({ kind: 'refusal', sources: [] })).toEqual([]);
    expect(followupSuggestions(undefined)).toEqual([]);
  });

  it('references the cited rule when sources are present', () => {
    const out = followupSuggestions({
      kind: 'grounded',
      sources: [{ citation: '91.155', part: '91' }],
    });
    expect(out).toEqual([
      { id: 'exactText', cite: '91.155' },
      { id: 'related', part: '91' },
      { id: 'simple' },
    ]);
  });

  it('derives the Part number from the citation when `part` is absent', () => {
    const out = followupSuggestions({ kind: 'grounded', sources: [{ citation: '61.57(b)' }] });
    expect(out.find((f) => f.id === 'related')).toEqual({ id: 'related', part: '61' });
  });

  it('falls back to evergreen prompts with no sources', () => {
    expect(followupSuggestions({ kind: 'grounded', sources: [] })).toEqual([
      { id: 'simple' },
      { id: 'example' },
    ]);
  });

  it('caps at three suggestions', () => {
    const out = followupSuggestions({
      kind: 'grounded',
      sources: [{ citation: '91.155', part: '91' }],
    });
    expect(out.length).toBeLessThanOrEqual(3);
  });
});

describe('lastAssistantIndex', () => {
  it('finds the newest assistant reply', () => {
    const msgs: TurnLike[] = [
      { role: 'user' },
      { role: 'assistant' },
      { role: 'user' },
      { role: 'assistant' },
    ];
    expect(lastAssistantIndex(msgs)).toBe(3);
  });

  it('is -1 with no assistant turn', () => {
    expect(lastAssistantIndex([{ role: 'user' }])).toBe(-1);
    expect(lastAssistantIndex([])).toBe(-1);
  });
});

describe('showFollowups', () => {
  const settled: TurnLike = { role: 'assistant', kind: 'grounded' };
  const idle = { gated: false, busy: false };

  it('shows after a settled, non-error assistant reply', () => {
    expect(showFollowups(settled, idle)).toBe(true);
  });

  it('hides while gated or busy', () => {
    expect(showFollowups(settled, { gated: true, busy: false })).toBe(false);
    expect(showFollowups(settled, { gated: false, busy: true })).toBe(false);
  });

  it('hides for pending, streaming, or error replies', () => {
    expect(showFollowups({ ...settled, pending: true }, idle)).toBe(false);
    expect(showFollowups({ ...settled, streaming: true }, idle)).toBe(false);
    expect(showFollowups({ ...settled, error: true }, idle)).toBe(false);
  });

  it('hides for refusals, user turns, and an empty thread', () => {
    expect(showFollowups({ role: 'assistant', kind: 'refusal' }, idle)).toBe(false);
    expect(showFollowups({ role: 'user' }, idle)).toBe(false);
    expect(showFollowups(undefined, idle)).toBe(false);
  });
});
