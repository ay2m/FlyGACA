import { describe, expect, it } from 'vitest';
import {
  MAX_BOX,
  boxIntervalDays,
  dueCount,
  dueKeys,
  isDue,
  masteredCount,
  nextBox,
  scheduleCard,
  srsDay,
} from '@/calc/study/srs';

const now = new Date('2026-06-20T09:00:00Z');

describe('nextBox', () => {
  it('promotes on correct (capped at MAX_BOX) and resets on wrong', () => {
    expect(nextBox(0, true)).toBe(1);
    expect(nextBox(MAX_BOX, true)).toBe(MAX_BOX);
    expect(nextBox(3, false)).toBe(0);
  });
});

describe('scheduleCard', () => {
  it('schedules a first correct review one day out (box 1)', () => {
    expect(scheduleCard(undefined, true, now)).toEqual({ box: 1, due: '2026-06-21' });
  });

  it('sends a wrong answer back to box 0, due same day', () => {
    expect(scheduleCard({ box: 4, due: '2026-07-01' }, false, now)).toEqual({
      box: 0,
      due: '2026-06-20',
    });
  });

  it('lengthens the interval as the box climbs', () => {
    expect(boxIntervalDays(2)).toBe(3);
    expect(scheduleCard({ box: 1, due: srsDay(now) }, true, now).due).toBe('2026-06-23');
  });
});

describe('isDue / dueKeys / dueCount', () => {
  const entries = {
    a: { box: 1, due: '2026-06-19' }, // past → due
    b: { box: 2, due: '2026-06-20' }, // today → due
    c: { box: 3, due: '2026-06-30' }, // future → not due
  };

  it('treats unseen and past/today cards as due, future as not', () => {
    expect(isDue(undefined, now)).toBe(true);
    expect(isDue(entries.a, now)).toBe(true);
    expect(isDue(entries.b, now)).toBe(true);
    expect(isDue(entries.c, now)).toBe(false);
  });

  it('returns due keys (incl. unseen) in input order', () => {
    expect(dueKeys(entries, ['a', 'b', 'c', 'd'], now)).toEqual(['a', 'b', 'd']);
    expect(dueCount(entries, ['a', 'b', 'c', 'd'], now)).toBe(3);
  });
});

describe('masteredCount', () => {
  it('counts cards at or above the box threshold', () => {
    const entries = { a: { box: 1, due: '' }, b: { box: 3, due: '' }, c: { box: 5, due: '' } };
    expect(masteredCount(entries)).toBe(2);
    expect(masteredCount(entries, 5)).toBe(1);
  });
});
