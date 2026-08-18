import { describe, expect, it } from 'vitest';
import {
  airacStatus,
  changedSources,
  mergeSources,
  snapshot,
  trackableSources,
  watchedChanges,
  type SourceEntry,
  type SourceStatus,
} from '@/calc/library/changeTracking';

// The Updates page reads these pure helpers to tell a Pro user what regulatory
// sources moved since they last looked. The branches below are that contract.

const SOURCES: SourceEntry[] = [
  { id: 'gacar', label: 'GACAR — Rules', kind: 'regulations', fingerprint: 'sha256:aaa' },
  { id: 'aip', label: 'AIP', kind: 'aip', airacBound: true, fingerprint: 'sha256:bbb' },
  { id: 'disabled', label: 'Old source', enabled: false, fingerprint: 'sha256:ccc' },
  { id: 'nohash', label: 'No fingerprint' },
];

const STATUSES: SourceStatus[] = [
  { id: 'gacar', status: 'ok', documents: 12, effective: null },
  { id: 'aip', status: 'ok', documents: 30, effective: '2026-06-11' },
];

describe('trackableSources', () => {
  it('keeps only enabled, fingerprinted sources, sorted by label', () => {
    const out = trackableSources(SOURCES).map((s) => s.id);
    expect(out).toEqual(['aip', 'gacar']); // 'disabled' + 'nohash' dropped; sorted by label
  });
});

describe('snapshot', () => {
  it('captures id → fingerprint for trackable sources only', () => {
    expect(snapshot(SOURCES)).toEqual({ gacar: 'sha256:aaa', aip: 'sha256:bbb' });
  });
});

describe('mergeSources', () => {
  it('flags nothing on a first visit (no baseline yet)', () => {
    const merged = mergeSources(SOURCES, STATUSES, {});
    expect(changedSources(merged)).toEqual([]);
  });

  it('flags a source whose fingerprint moved since the baseline', () => {
    const seen = { gacar: 'sha256:aaa', aip: 'sha256:OLD' };
    const changed = changedSources(mergeSources(SOURCES, STATUSES, seen)).map((s) => s.id);
    expect(changed).toEqual(['aip']);
  });

  it('flags a source that is new since the baseline', () => {
    const seen = { aip: 'sha256:bbb' }; // gacar absent from the baseline
    const changed = changedSources(mergeSources(SOURCES, STATUSES, seen)).map((s) => s.id);
    expect(changed).toEqual(['gacar']);
  });

  it('merges status freshness onto the source', () => {
    const aip = mergeSources(SOURCES, STATUSES, {}).find((s) => s.id === 'aip');
    expect(aip).toMatchObject({ airacBound: true, status: 'ok', effective: '2026-06-11' });
  });
});

describe('watchedChanges', () => {
  it('returns only changed sources the user watches', () => {
    const seen = { gacar: 'sha256:OLD', aip: 'sha256:OLD' };
    const merged = mergeSources(SOURCES, STATUSES, seen);
    expect(watchedChanges(merged, ['aip']).map((s) => s.id)).toEqual(['aip']);
    expect(watchedChanges(merged, []).length).toBe(0);
  });
});

describe('airacStatus', () => {
  const NOW = new Date('2026-06-26T00:00:00Z');

  it('returns null without a valid cycle', () => {
    expect(airacStatus(undefined, NOW)).toBeNull();
    expect(airacStatus({ current: '2026-06-11', next: 'nope', cycleDays: 28 }, NOW)).toBeNull();
  });

  it('counts whole days to the next cycle and flags an imminent one', () => {
    const s = airacStatus({ current: '2026-06-11', next: '2026-07-09', cycleDays: 28 }, NOW);
    expect(s?.daysToNext).toBe(13);
    expect(s?.due).toBe(false);
  });

  it('marks the cycle due within the window and never goes negative', () => {
    const soon = airacStatus({ current: '2026-06-11', next: '2026-06-29', cycleDays: 28 }, NOW);
    expect(soon?.due).toBe(true);
    const past = airacStatus({ current: '2026-05-14', next: '2026-06-11', cycleDays: 28 }, NOW);
    expect(past?.daysToNext).toBe(0);
  });
});
