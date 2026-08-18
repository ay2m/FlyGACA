import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useFindInPage } from '@/hooks/useFindInPage';

// The hook drives the reader's find-in-page over a live DOM body. jsdom has no
// scrollIntoView, so stub it; an initialQuery seeds the debounced value on mount,
// so the first highlight lands synchronously (no timer needed for those cases).
// NB: `html` is passed as a stable string (in the page it's a useMemo over the
// fetched text), not the live innerHTML — highlighting mutates innerHTML, and
// feeding that back would re-trigger the highlight effect on every render.

function reader(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('useFindInPage', () => {
  it('highlights every hit and marks the first active from the initial query', () => {
    const html = '<p>VFR and vfr</p><p>more VFR</p>';
    const div = reader(html);
    const { result } = renderHook(() => useFindInPage({ current: div }, html, 'vfr'));
    expect(result.current.matchCount).toBe(3);
    expect(div.querySelectorAll('mark[data-hit]')).toHaveLength(3);
    expect(div.querySelector('mark[data-active]')).toBe(div.querySelector('mark[data-hit]'));
    expect(result.current.activeMatch).toBe(0);
  });

  it('cycles the active match forward and wraps around the ends', () => {
    const html = '<p>a a a</p>';
    const div = reader(html);
    const { result } = renderHook(() => useFindInPage({ current: div }, html, 'a'));
    expect(result.current.matchCount).toBe(3);

    act(() => result.current.cycle(1));
    expect(result.current.activeMatch).toBe(1);
    expect(div.querySelectorAll('mark[data-active]')).toHaveLength(1);

    act(() => result.current.cycle(-1));
    expect(result.current.activeMatch).toBe(0);

    // Stepping back past the start wraps to the last match.
    act(() => result.current.cycle(-1));
    expect(result.current.activeMatch).toBe(2);
  });

  it('cycle is a no-op when there are no matches', () => {
    const html = '<p>nothing here</p>';
    const div = reader(html);
    const { result } = renderHook(() => useFindInPage({ current: div }, html));
    act(() => result.current.cycle(1));
    expect(result.current.activeMatch).toBe(0);
    expect(result.current.matchCount).toBe(0);
  });

  it('clears highlights when the debounced query goes empty', () => {
    vi.useFakeTimers();
    const html = '<p>VFR VFR</p>';
    const div = reader(html);
    const { result } = renderHook(() => useFindInPage({ current: div }, html, 'vfr'));
    expect(result.current.matchCount).toBe(2);

    act(() => result.current.setFind(''));
    act(() => vi.advanceTimersByTime(250));
    expect(result.current.matchCount).toBe(0);
    expect(div.querySelectorAll('mark[data-hit]')).toHaveLength(0);
  });
});
