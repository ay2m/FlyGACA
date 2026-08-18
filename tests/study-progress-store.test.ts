/**
 * Store-layer tests for study progress. The pure date/streak/history helpers are
 * covered in study-progress.test.ts; this exercises hydration (incl. the legacy
 * per-key quiz/ground-school storage) and the persisting mutators, which carry
 * the bulk of the module's uncovered branches.
 */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ExamResult } from '@/lib/studyProgress';

type Mod = typeof import('@/lib/studyProgress');
async function fresh(): Promise<Mod> {
  vi.resetModules();
  return import('@/lib/studyProgress');
}

const DAY1 = new Date('2026-06-20T10:00:00Z');
const DAY2 = new Date('2026-06-21T10:00:00Z');
const DAY_GAP = new Date('2026-06-25T10:00:00Z');

beforeEach(() => localStorage.clear());

describe('hydration', () => {
  it('reads legacy per-key quiz scores and ground-school completion', async () => {
    localStorage.setItem('flygaca:quiz:air-law', '82');
    localStorage.setItem('flygaca:gs:lesson-1', '1');
    localStorage.setItem('flygaca:gs:lesson-2', '0'); // not "1" → not done
    const mod = await fresh();
    const { result } = renderHook(() => mod.useStudyProgress());
    expect(result.current.quizBest['air-law']).toBe(82);
    expect(result.current.gsDone['lesson-1']).toBe(true);
    expect(result.current.gsDone['lesson-2']).toBeUndefined();
  });
});

describe('recordStudyDay (streak)', () => {
  it('starts at 1, no-ops same day, increments consecutive, resets on a gap', async () => {
    const mod = await fresh();
    const { result } = renderHook(() => mod.useStudyProgress());

    act(() => mod.recordStudyDay(DAY1));
    expect(result.current.streak).toEqual({ day: '2026-06-20', count: 1 });
    expect(JSON.parse(localStorage.getItem('flygaca:study:streak')!).count).toBe(1);

    const ref = result.current.streak;
    act(() => mod.recordStudyDay(DAY1));
    expect(result.current.streak).toBe(ref); // same day — unchanged reference

    act(() => mod.recordStudyDay(DAY2));
    expect(result.current.streak).toEqual({ day: '2026-06-21', count: 2 });

    act(() => mod.recordStudyDay(DAY_GAP));
    expect(result.current.streak.count).toBe(1); // gap resets
  });
});

describe('setQuizBest', () => {
  it('records a new best but never regresses', async () => {
    const mod = await fresh();
    const { result } = renderHook(() => mod.useStudyProgress());

    act(() => mod.setQuizBest('air-law', 70));
    expect(result.current.quizBest['air-law']).toBe(70);

    act(() => mod.setQuizBest('air-law', 60)); // lower — ignored
    expect(result.current.quizBest['air-law']).toBe(70);

    act(() => mod.setQuizBest('air-law', 90));
    expect(result.current.quizBest['air-law']).toBe(90);
    expect(localStorage.getItem('flygaca:quiz:air-law')).toBe('90');
  });
});

describe('toggleLesson', () => {
  it('marks a lesson done (persist "1") then clears it', async () => {
    const mod = await fresh();
    const { result } = renderHook(() => mod.useStudyProgress());

    act(() => mod.toggleLesson('lesson-1'));
    expect(result.current.gsDone['lesson-1']).toBe(true);
    expect(localStorage.getItem('flygaca:gs:lesson-1')).toBe('1');

    act(() => mod.toggleLesson('lesson-1'));
    expect(result.current.gsDone['lesson-1']).toBeUndefined();
    expect(localStorage.getItem('flygaca:gs:lesson-1')).toBeNull();
  });
});

describe('setExamResult', () => {
  it('stores the latest result and caps history at 10', async () => {
    const mod = await fresh();
    const { result } = renderHook(() => mod.useStudyProgress());
    const mk = (pct: number): ExamResult => ({ pct, passed: pct >= 75, date: '2026-06-21' });

    for (let i = 0; i < 12; i++) act(() => mod.setExamResult(mk(i)));
    expect(result.current.exam?.pct).toBe(11);
    expect(result.current.examHistory).toHaveLength(10);
    expect(result.current.examHistory[0].pct).toBe(2); // oldest dropped
  });
});

describe('setLastBank', () => {
  it('persists a change and no-ops when unchanged', async () => {
    const mod = await fresh();
    const { result } = renderHook(() => mod.useStudyProgress());

    act(() => mod.setLastBank('air-law'));
    expect(result.current.lastBank).toBe('air-law');
    const ref = result.current;
    act(() => mod.setLastBank('air-law'));
    expect(result.current).toBe(ref); // unchanged — no new state object
  });
});

describe('toggleFlag', () => {
  it('builds a sorted review deck and drops the bank when empty', async () => {
    const mod = await fresh();
    const { result } = renderHook(() => mod.useStudyProgress());

    act(() => mod.toggleFlag('air-law', 5));
    act(() => mod.toggleFlag('air-law', 2));
    expect(result.current.flagged['air-law']).toEqual([2, 5]);

    act(() => mod.toggleFlag('air-law', 2));
    act(() => mod.toggleFlag('air-law', 5));
    expect(result.current.flagged['air-law']).toBeUndefined(); // emptied → key removed
  });
});

describe('togglePathStep', () => {
  it('toggles reading-path steps, kept sorted', async () => {
    const mod = await fresh();
    const { result } = renderHook(() => mod.useStudyProgress());

    act(() => mod.togglePathStep('ppl', 3));
    act(() => mod.togglePathStep('ppl', 1));
    expect(result.current.pathDone['ppl']).toEqual([1, 3]);

    act(() => mod.togglePathStep('ppl', 1));
    expect(result.current.pathDone['ppl']).toEqual([3]);
  });
});

describe('gradeCard', () => {
  it('schedules an SRS entry for the card and persists it', async () => {
    const mod = await fresh();
    const { result } = renderHook(() => mod.useStudyProgress());

    act(() => mod.gradeCard('air-law', 'q1', true, DAY1));
    expect(result.current.fcSrs['air-law']?.['q1']).toBeDefined();
    expect(localStorage.getItem('flygaca:study:srs')).toContain('q1');
  });
});
