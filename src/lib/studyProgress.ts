/**
 * Unified study progress: quiz best scores, ground-school completion, flashcard
 * mastery, the last mock-exam result and a daily study streak. Local-first
 * (localStorage) and exposed via useSyncExternalStore so the study hub reflects
 * progress live. Backward compatible: quiz best scores and ground-school
 * completion keep their original per-key storage (`flygaca:quiz:*`,
 * `flygaca:gs:*`) so existing data carries over. Date/streak logic is pure.
 */
import { useSyncExternalStore } from 'react';
import { scheduleCard, type SrsEntry } from '@/calc/study/srs';

const Q_PREFIX = 'flygaca:quiz:';
const GS_PREFIX = 'flygaca:gs:';
const FC_KEY = 'flygaca:study:flashcards';
const SRS_KEY = 'flygaca:study:srs';
const STREAK_KEY = 'flygaca:study:streak';
const EXAM_KEY = 'flygaca:study:exam';
const HISTORY_KEY = 'flygaca:study:exam-history';
const PATHS_KEY = 'flygaca:study:paths';
const FLAG_KEY = 'flygaca:study:flagged';
const LAST_BANK_KEY = 'flygaca:study:last-bank';

/** How many recent exam results to retain for the history sparkline. */
export const EXAM_HISTORY_MAX = 10;

export interface Streak {
  /** ISO yyyy-mm-dd of the most recent study day. */
  day: string;
  count: number;
}
export interface ExamResult {
  pct: number;
  passed: boolean;
  date: string;
}
export interface StudyState {
  quizBest: Record<string, number>;
  gsDone: Record<string, boolean>;
  /** bankId → list of mastered card keys (legacy known/unknown flow). */
  fcKnown: Record<string, string[]>;
  /** bankId → cardKey → spaced-repetition schedule. */
  fcSrs: Record<string, Record<string, SrsEntry>>;
  /** pathId → list of completed step indices. */
  pathDone: Record<string, number[]>;
  streak: Streak;
  exam: ExamResult | null;
  /** Recent mock-exam results, oldest-first, capped at EXAM_HISTORY_MAX. */
  examHistory: ExamResult[];
  /** bankId → flagged question indices (persistent "review" deck). */
  flagged: Record<string, number[]>;
  /** Last quiz bank opened, for the "resume" affordance on the hub. */
  lastBank: string | null;
}

// ── Pure helpers (unit-tested) ──
export function dayStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}
/** Advance a streak for a study event today: same day = unchanged, consecutive = +1, gap = reset. */
export function nextStreak(prev: Streak, today: string, yesterday: string): Streak {
  if (prev.day === today) return prev;
  if (prev.day === yesterday) return { day: today, count: prev.count + 1 };
  return { day: today, count: 1 };
}
/** Append a result to the history, keeping only the most recent `max`. */
export function pushHistory(
  list: ExamResult[],
  result: ExamResult,
  max = EXAM_HISTORY_MAX,
): ExamResult[] {
  return [...list, result].slice(-max);
}
/** Toggle membership of a numeric index in a sorted list. */
export function toggleIndex(list: number[], n: number): number[] {
  return list.includes(n) ? list.filter((x) => x !== n) : [...list, n].sort((a, b) => a - b);
}

function scanKeys(prefix: string): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) keys.push(k);
    }
  } catch {
    /* storage unavailable */
  }
  return keys;
}
function readJson<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {
    /* storage unavailable */
  }
}
function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* storage unavailable */
  }
}

function load(): StudyState {
  const quizBest: Record<string, number> = {};
  for (const k of scanKeys(Q_PREFIX)) {
    const n = Number(localStorage.getItem(k));
    if (Number.isFinite(n)) quizBest[k.slice(Q_PREFIX.length)] = n;
  }
  const gsDone: Record<string, boolean> = {};
  for (const k of scanKeys(GS_PREFIX)) {
    if (localStorage.getItem(k) === '1') gsDone[k.slice(GS_PREFIX.length)] = true;
  }
  return {
    quizBest,
    gsDone,
    fcKnown: readJson<Record<string, string[]>>(FC_KEY, {}),
    fcSrs: readJson<Record<string, Record<string, SrsEntry>>>(SRS_KEY, {}),
    pathDone: readJson<Record<string, number[]>>(PATHS_KEY, {}),
    streak: readJson<Streak>(STREAK_KEY, { day: '', count: 0 }),
    exam: readJson<ExamResult | null>(EXAM_KEY, null),
    examHistory: readJson<ExamResult[]>(HISTORY_KEY, []),
    flagged: readJson<Record<string, number[]>>(FLAG_KEY, {}),
    lastBank: readJson<string | null>(LAST_BANK_KEY, null),
  };
}

let state: StudyState = load();
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
}
function commit(next: StudyState) {
  state = next;
  emit();
}

export function useStudyProgress(): StudyState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

/** Non-React subscription to progress changes (for the B2B progress-sync writer). */
export function subscribeStudyProgress(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Current study state snapshot (for the progress-sync writer). */
export function getStudyState(): StudyState {
  return state;
}

/**
 * Compact, server-syncable readiness projection of the study state — the SCORES +
 * COMPLETION a B2B readiness report needs, and nothing more (no answers, no flashcard
 * SRS, no flagged questions). See docs/b2b/DESIGN-study-progress-sync.md. Pure so the
 * local→doc mapping is unit-testable without Firestore.
 */
export interface ProgressSummary {
  /** bankId → best quiz % (0–100). */
  quizBest: Record<string, number>;
  /** Last Mock Exam result. */
  exam: ExamResult | null;
  /** Best Mock Exam % across history (denormalised for the report). */
  examBest: number;
  /** Number of Mock Exam attempts retained (for the "median attempts" KPI). */
  examCount: number;
  /** moduleId → completed (ground-school). */
  gsDone: Record<string, boolean>;
  /** ISO write time (client clock) — staleness / last-active. */
  updatedAt: string;
}

export function toProgressSummary(s: StudyState, now: Date = new Date()): ProgressSummary {
  const examBest = s.examHistory.reduce((max, r) => (r.pct > max ? r.pct : max), s.exam?.pct ?? 0);
  return {
    quizBest: s.quizBest,
    exam: s.exam,
    examBest,
    examCount: s.examHistory.length,
    gsDone: s.gsDone,
    updatedAt: now.toISOString(),
  };
}

export function recordStudyDay(now: Date = new Date()): void {
  const today = dayStr(now);
  const yesterday = dayStr(new Date(now.getTime() - 86400000));
  const streak = nextStreak(state.streak, today, yesterday);
  if (streak === state.streak) return;
  save(STREAK_KEY, JSON.stringify(streak));
  commit({ ...state, streak });
}

export function setQuizBest(bankId: string, pct: number): void {
  recordStudyDay();
  if (pct <= (state.quizBest[bankId] ?? 0)) return;
  save(Q_PREFIX + bankId, String(pct));
  commit({ ...state, quizBest: { ...state.quizBest, [bankId]: pct } });
}

export function toggleLesson(id: string): void {
  const done = !state.gsDone[id];
  const gsDone = { ...state.gsDone };
  if (done) {
    save(GS_PREFIX + id, '1');
    gsDone[id] = true;
    recordStudyDay();
  } else {
    remove(GS_PREFIX + id);
    delete gsDone[id];
  }
  commit({ ...state, gsDone });
}

/** Grade a flashcard (spaced repetition): promote/reset its box + due date. */
export function gradeCard(
  bankId: string,
  cardKey: string,
  correct: boolean,
  now: Date = new Date(),
): void {
  recordStudyDay(now);
  const bankMap = { ...(state.fcSrs[bankId] ?? {}) };
  bankMap[cardKey] = scheduleCard(bankMap[cardKey], correct, now);
  const fcSrs = { ...state.fcSrs, [bankId]: bankMap };
  save(SRS_KEY, JSON.stringify(fcSrs));
  commit({ ...state, fcSrs });
}

/** Toggle a reading-path step's completion. */
export function togglePathStep(pathId: string, step: number): void {
  const cur = new Set(state.pathDone[pathId] ?? []);
  if (cur.has(step)) cur.delete(step);
  else {
    cur.add(step);
    recordStudyDay();
  }
  const pathDone = { ...state.pathDone, [pathId]: [...cur].sort((a, b) => a - b) };
  save(PATHS_KEY, JSON.stringify(pathDone));
  commit({ ...state, pathDone });
}

export function setExamResult(result: ExamResult): void {
  recordStudyDay();
  const examHistory = pushHistory(state.examHistory, result);
  save(EXAM_KEY, JSON.stringify(result));
  save(HISTORY_KEY, JSON.stringify(examHistory));
  commit({ ...state, exam: result, examHistory });
}

/** Remember the last quiz bank opened so the hub can offer a "resume" link. */
export function setLastBank(bankId: string): void {
  if (state.lastBank === bankId) return;
  save(LAST_BANK_KEY, JSON.stringify(bankId));
  commit({ ...state, lastBank: bankId });
}

/** Toggle a flag on a quiz question, building a persistent review deck. */
export function toggleFlag(bankId: string, idx: number): void {
  const next = toggleIndex(state.flagged[bankId] ?? [], idx);
  const flagged = { ...state.flagged };
  if (next.length) flagged[bankId] = next;
  else delete flagged[bankId];
  save(FLAG_KEY, JSON.stringify(flagged));
  commit({ ...state, flagged });
}
