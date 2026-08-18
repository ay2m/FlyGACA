/**
 * Three small, previously-untested hooks:
 *  - src/hooks/useViewMode.ts          (localStorage-persisted grid/list toggle)
 *  - src/hooks/useDebouncedValue.ts    (trailing-edge debounce)
 *  - src/hooks/usePrefersReducedMotion (OS reduce-motion via matchMedia)
 * renderHook + act + fake timers, per fetch-hooks.test.tsx / pwa-hooks.test.ts.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useViewMode } from '@/hooks/useViewMode';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

beforeEach(() => localStorage.clear());

describe('useViewMode', () => {
  it('defaults to grid when nothing is stored', () => {
    const { result } = renderHook(() => useViewMode('flygaca:test-view'));
    expect(result.current[0]).toBe('grid');
  });

  it('hydrates "list" from localStorage', () => {
    localStorage.setItem('flygaca:test-view', 'list');
    const { result } = renderHook(() => useViewMode('flygaca:test-view'));
    expect(result.current[0]).toBe('list');
  });

  it('persists the choice on change', () => {
    const { result } = renderHook(() => useViewMode('flygaca:test-view'));
    act(() => result.current[1]('list'));
    expect(result.current[0]).toBe('list');
    expect(localStorage.getItem('flygaca:test-view')).toBe('list');
  });
});

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebouncedValue('a', 200));
    expect(result.current).toBe('a');
  });

  it('only updates after the delay of quiet elapses', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'b' });
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(199));
    expect(result.current).toBe('a');
    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe('b');
  });

  it('resets the timer on rapid changes (only the last value lands)', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 200), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'b' });
    act(() => vi.advanceTimersByTime(100));
    rerender({ v: 'c' });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('a'); // 200ms of quiet never elapsed
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('c');
  });
});

describe('usePrefersReducedMotion', () => {
  let listeners: Array<() => void>;
  let matches: boolean;

  beforeEach(() => {
    listeners = [];
    matches = false;
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches,
        media: query,
        addEventListener: (_: string, cb: () => void) => listeners.push(cb),
        removeEventListener: (_: string, cb: () => void) => {
          listeners = listeners.filter((l) => l !== cb);
        },
      })),
    );
  });

  afterEach(() => vi.unstubAllGlobals());

  it('reflects the current matchMedia result', () => {
    matches = true;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('defaults to false when reduce-motion is not set', () => {
    matches = false;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('re-reads when the media query fires a change', () => {
    matches = false;
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
    matches = true;
    act(() => listeners.forEach((l) => l()));
    expect(result.current).toBe(true);
  });
});
