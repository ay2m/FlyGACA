import { describe, expect, it } from 'vitest';
import {
  dayStr,
  nextStreak,
  pushHistory,
  toggleIndex,
  toProgressSummary,
  EXAM_HISTORY_MAX,
  type ExamResult,
  type StudyState,
} from '@/lib/studyProgress';

describe('pushHistory', () => {
  const mk = (pct: number): ExamResult => ({ pct, passed: pct >= 75, date: '2026-06-21' });

  it('appends oldest-first', () => {
    expect(pushHistory([mk(80)], mk(60)).map((r) => r.pct)).toEqual([80, 60]);
  });

  it('caps at the max, dropping the oldest', () => {
    const full = Array.from({ length: EXAM_HISTORY_MAX }, (_, i) => mk(i));
    const next = pushHistory(full, mk(99));
    expect(next).toHaveLength(EXAM_HISTORY_MAX);
    expect(next[next.length - 1].pct).toBe(99);
    expect(next[0].pct).toBe(1); // the first (pct 0) was dropped
  });
});

describe('toggleIndex', () => {
  it('adds when absent (kept sorted) and removes when present', () => {
    expect(toggleIndex([2, 5], 3)).toEqual([2, 3, 5]);
    expect(toggleIndex([2, 3, 5], 3)).toEqual([2, 5]);
  });
});

describe('dayStr', () => {
  it('formats a date as ISO yyyy-mm-dd (UTC)', () => {
    expect(dayStr(new Date('2024-06-01T23:30:00Z'))).toBe('2024-06-01');
  });
});

describe('nextStreak', () => {
  const prev = { day: '2024-06-01', count: 3 };

  it('leaves the streak unchanged for a second event on the same day', () => {
    expect(nextStreak(prev, '2024-06-01', '2024-05-31')).toBe(prev);
  });

  it('increments when the previous day was yesterday', () => {
    expect(nextStreak(prev, '2024-06-02', '2024-06-01')).toEqual({ day: '2024-06-02', count: 4 });
  });

  it('resets to 1 after a gap', () => {
    expect(nextStreak(prev, '2024-06-05', '2024-06-04')).toEqual({ day: '2024-06-05', count: 1 });
  });

  it('starts at 1 from an empty streak', () => {
    expect(nextStreak({ day: '', count: 0 }, '2024-06-01', '2024-05-31')).toEqual({
      day: '2024-06-01',
      count: 1,
    });
  });
});

describe('toProgressSummary', () => {
  const base: StudyState = {
    quizBest: { 'aip-ais': 80, airspace: 60 },
    gsDone: { 'air-law': true },
    fcKnown: {},
    fcSrs: {},
    pathDone: {},
    streak: { day: '2026-07-17', count: 3 },
    exam: { pct: 72, passed: false, date: '2026-07-16' },
    examHistory: [
      { pct: 55, passed: false, date: '2026-07-10' },
      { pct: 88, passed: true, date: '2026-07-14' },
    ],
    flagged: { 'aip-ais': [1, 2] },
    lastBank: 'aip-ais',
  };
  const now = new Date('2026-07-17T12:00:00.000Z');

  it('projects scores + completion only — no answers, SRS, flagged or lastBank', () => {
    const s = toProgressSummary(base, now);
    expect(s).toEqual({
      quizBest: { 'aip-ais': 80, airspace: 60 },
      exam: { pct: 72, passed: false, date: '2026-07-16' },
      examBest: 88,
      examCount: 2,
      gsDone: { 'air-law': true },
      updatedAt: '2026-07-17T12:00:00.000Z',
    });
    expect(Object.keys(s)).not.toContain('flagged');
    expect(Object.keys(s)).not.toContain('fcSrs');
    expect(Object.keys(s)).not.toContain('lastBank');
  });

  it('examBest falls back to the last exam when history is empty', () => {
    const s = toProgressSummary({ ...base, examHistory: [] }, now);
    expect(s.examBest).toBe(72);
    expect(s.examCount).toBe(0);
  });

  it('is 0 with no exams at all', () => {
    const s = toProgressSummary({ ...base, exam: null, examHistory: [] }, now);
    expect(s.examBest).toBe(0);
    expect(s.exam).toBeNull();
  });
});
