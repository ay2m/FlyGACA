import { describe, expect, it } from 'vitest';
import {
  addPreset,
  removePreset,
  presetsFor,
  normalizePresets,
  type Preset,
} from '@/calc/app/toolPresets';

const p = (path: string, name: string, query = ''): Preset => ({ path, name, query });

describe('addPreset', () => {
  it('prepends a preset, newest-first', () => {
    const list = addPreset(addPreset([], p('/tools/x', 'a')), p('/tools/x', 'b'));
    expect(list.map((x) => x.name)).toEqual(['b', 'a']);
  });

  it('replaces by path+name (trimmed) instead of duplicating', () => {
    const list = addPreset(addPreset([], p('/tools/x', 'a', 'old')), p('/tools/x', ' a ', 'new'));
    expect(list).toEqual([{ path: '/tools/x', name: 'a', query: 'new' }]);
  });

  it('ignores a blank name', () => {
    expect(addPreset([], p('/tools/x', '   '))).toEqual([]);
  });

  it('prunes to max, newest-first', () => {
    const list = addPreset(addPreset(addPreset([], p('/t', '1')), p('/t', '2')), p('/t', '3'), 2);
    expect(list.map((x) => x.name)).toEqual(['3', '2']);
  });
});

describe('removePreset / presetsFor', () => {
  const list = [p('/tools/x', 'a'), p('/tools/y', 'b'), p('/tools/x', 'c')];
  it('removes the matching path+name only', () => {
    expect(removePreset(list, '/tools/x', 'a').map((x) => x.name)).toEqual(['b', 'c']);
  });
  it('filters by path', () => {
    expect(presetsFor(list, '/tools/x').map((x) => x.name)).toEqual(['a', 'c']);
  });
});

describe('normalizePresets', () => {
  it('keeps valid rows and drops malformed ones', () => {
    const raw = [
      { path: '/t', name: 'ok', query: 'a=1' },
      { path: '/t', name: '  ' },
      { name: 'no-path' },
      null,
      5,
      { path: '/t', name: 'noquery' },
    ];
    expect(normalizePresets(raw)).toEqual([
      { path: '/t', name: 'ok', query: 'a=1' },
      { path: '/t', name: 'noquery', query: '' },
    ]);
  });
  it('returns [] for non-arrays', () => {
    expect(normalizePresets(null)).toEqual([]);
    expect(normalizePresets({})).toEqual([]);
  });
});
