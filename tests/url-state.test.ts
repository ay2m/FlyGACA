import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useUrlState } from '@/hooks/useUrlState';
import { useNumericInputs } from '@/hooks/useNumericInputs';

// useUrlState keeps calculator inputs in the query string so a setup is
// shareable/bookmarkable — the contract every tool page leans on. We drive the
// hooks directly and assert against jsdom's window.location after each change.

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

const search = () => window.location.search;

describe('useUrlState', () => {
  it('hydrates from the query string on mount, falling back to defaults', () => {
    window.history.replaceState(null, '', '/?wind=270&gust=');
    const { result } = renderHook(() => useUrlState({ wind: '0', speed: '15', gust: '0' }));
    const [state] = result.current;
    expect(state).toEqual({ wind: '270', speed: '15', gust: '' });
  });

  it('writes set values back to the URL', () => {
    const { result } = renderHook(() => useUrlState({ wind: '', speed: '' }));
    act(() => result.current[1]('wind', '270'));
    expect(result.current[0].wind).toBe('270');
    expect(search()).toBe('?wind=270');
  });

  it('drops empty values from the URL', () => {
    window.history.replaceState(null, '', '/?wind=270&speed=15');
    const { result } = renderHook(() => useUrlState({ wind: '', speed: '' }));
    act(() => result.current[1]('wind', ''));
    expect(search()).toBe('?speed=15');
  });

  it('clears the query string entirely when nothing is set', () => {
    window.history.replaceState(null, '', '/?wind=270');
    const { result } = renderHook(() => useUrlState({ wind: '' }));
    act(() => result.current[1]('wind', ''));
    expect(search()).toBe('');
    expect(window.location.pathname).toBe('/');
  });

  it('rehydrates from the URL on popstate (Back/Forward)', () => {
    window.history.replaceState(null, '', '/?wind=270');
    const { result } = renderHook(() => useUrlState({ wind: '', speed: '10' }));
    expect(result.current[0]).toEqual({ wind: '270', speed: '10' });

    // Simulate the browser restoring an earlier entry: the URL changes and
    // popstate fires without a re-mount.
    act(() => {
      window.history.replaceState(null, '', '/?wind=090&speed=25');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toEqual({ wind: '090', speed: '25' });
  });

  it('falls back to defaults for keys absent after popstate', () => {
    window.history.replaceState(null, '', '/?wind=270&speed=25');
    const { result } = renderHook(() => useUrlState({ wind: '', speed: '10' }));
    act(() => {
      window.history.replaceState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current[0]).toEqual({ wind: '', speed: '10' });
  });
});

describe('useNumericInputs', () => {
  it('exposes inputs parsed as numbers alongside the raw strings', () => {
    window.history.replaceState(null, '', '/?rwy=30&wind=270');
    const { result } = renderHook(() => useNumericInputs({ rwy: '', wind: '' }));
    expect(result.current.inputs).toEqual({ rwy: '30', wind: '270' });
    expect(result.current.nums).toEqual({ rwy: 30, wind: 270 });
  });

  it('yields NaN for blank or non-numeric inputs', () => {
    const { result } = renderHook(() => useNumericInputs({ a: '', b: 'abc' }));
    expect(result.current.nums.a).toBeNaN();
    expect(result.current.nums.b).toBeNaN();
  });

  it('reparses after a value changes', () => {
    const { result } = renderHook(() => useNumericInputs({ wind: '' }));
    act(() => result.current.set('wind', '12.5'));
    expect(result.current.nums.wind).toBeCloseTo(12.5);
  });
});
