import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFindInPage } from '@/hooks/useFindInPage';
import * as readerMarks from '@/lib/readerMarks';

vi.mock('@/lib/readerMarks');

describe('useFindInPage', () => {
  let containerRef: React.RefObject<HTMLElement | null>;
  const testHtml = '<h1>Test</h1><p>Find this text</p>';

  beforeEach(() => {
    containerRef = { current: null };
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with empty search state', () => {
    containerRef.current = document.createElement('div');
    const { result } = renderHook(() => useFindInPage(containerRef, testHtml));

    expect(result.current.find).toBe('');
    expect(result.current.matchCount).toBe(0);
    expect(result.current.activeMatch).toBe(0);
    expect(typeof result.current.cycle).toBe('function');
  });

  it('initializes with provided initial query', () => {
    containerRef.current = document.createElement('div');
    const { result } = renderHook(() => useFindInPage(containerRef, testHtml, 'test'));

    expect(result.current.find).toBe('test');
  });

  it('updates find value when setFind is called', () => {
    containerRef.current = document.createElement('div');
    const { result } = renderHook(() => useFindInPage(containerRef, testHtml));

    act(() => {
      result.current.setFind('search term');
    });

    expect(result.current.find).toBe('search term');
  });

  it('returns early when ref is null', () => {
    containerRef.current = null;
    const { result } = renderHook(() => useFindInPage(containerRef, testHtml, 'test'));

    expect(result.current.matchCount).toBe(0);
    expect(result.current.activeMatch).toBe(0);
    expect(vi.mocked(readerMarks.highlightMatches)).not.toHaveBeenCalled();
  });

  it('returns early when html is empty', () => {
    containerRef.current = document.createElement('div');
    const { result } = renderHook(() => useFindInPage(containerRef, ''));

    expect(result.current.matchCount).toBe(0);
    expect(result.current.activeMatch).toBe(0);
    expect(vi.mocked(readerMarks.highlightMatches)).not.toHaveBeenCalled();
  });

  it('clears highlights when search is empty', () => {
    containerRef.current = document.createElement('div');
    const { result } = renderHook(() => useFindInPage(containerRef, testHtml, '  '));

    expect(vi.mocked(readerMarks.clearHighlights)).toHaveBeenCalled();
    expect(result.current.matchCount).toBe(0);
    expect(result.current.activeMatch).toBe(0);
  });

  it('highlights matches when search term is provided', () => {
    containerRef.current = document.createElement('div');
    // Create mock mark elements
    const mark1 = document.createElement('mark');
    mark1.dataset.hit = '1';
    const mark2 = document.createElement('mark');
    mark2.dataset.hit = '2';
    containerRef.current.appendChild(mark1);
    containerRef.current.appendChild(mark2);

    vi.mocked(readerMarks.clearHighlights).mockImplementation(() => {});
    vi.mocked(readerMarks.highlightMatches).mockImplementation(() => {});

    const { result } = renderHook(() => useFindInPage(containerRef, testHtml, 'test'));

    expect(vi.mocked(readerMarks.clearHighlights)).toHaveBeenCalled();
    expect(vi.mocked(readerMarks.highlightMatches)).toHaveBeenCalled();
  });

  it('cycles through matches forward', () => {
    containerRef.current = document.createElement('div');
    const mark1 = document.createElement('mark');
    mark1.dataset.hit = '1';
    const mark2 = document.createElement('mark');
    mark2.dataset.hit = '2';
    const mark3 = document.createElement('mark');
    mark3.dataset.hit = '3';

    containerRef.current.appendChild(mark1);
    containerRef.current.appendChild(mark2);
    containerRef.current.appendChild(mark3);

    vi.mocked(readerMarks.highlightMatches).mockImplementation(() => {});
    vi.mocked(readerMarks.clearHighlights).mockImplementation(() => {});

    const { result } = renderHook(() => useFindInPage(containerRef, testHtml, 'test'));

    // Cycle forward
    act(() => {
      result.current.cycle(1);
    });

    expect(result.current.activeMatch).toBe(1);
    expect(mark2.dataset.active).toBe('1');
  });

  it('cycles through matches backward', () => {
    containerRef.current = document.createElement('div');
    const mark1 = document.createElement('mark');
    mark1.dataset.hit = '1';
    const mark2 = document.createElement('mark');
    mark2.dataset.hit = '2';
    const mark3 = document.createElement('mark');
    mark3.dataset.hit = '3';

    containerRef.current.appendChild(mark1);
    containerRef.current.appendChild(mark2);
    containerRef.current.appendChild(mark3);

    vi.mocked(readerMarks.highlightMatches).mockImplementation(() => {});
    vi.mocked(readerMarks.clearHighlights).mockImplementation(() => {});

    const { result } = renderHook(() => useFindInPage(containerRef, testHtml, 'test'));

    // Cycle forward twice to get to index 2
    act(() => {
      result.current.cycle(1);
    });
    act(() => {
      result.current.cycle(1);
    });

    // Now cycle backward
    act(() => {
      result.current.cycle(-1);
    });

    // Should be at 1 (2 - 1 = 1)
    expect(result.current.activeMatch).toBe(1);
  });

  it('wraps around when cycling past end', () => {
    containerRef.current = document.createElement('div');
    const mark1 = document.createElement('mark');
    mark1.dataset.hit = '1';
    const mark2 = document.createElement('mark');
    mark2.dataset.hit = '2';

    containerRef.current.appendChild(mark1);
    containerRef.current.appendChild(mark2);

    vi.mocked(readerMarks.highlightMatches).mockImplementation(() => {});
    vi.mocked(readerMarks.clearHighlights).mockImplementation(() => {});

    const { result } = renderHook(() => useFindInPage(containerRef, testHtml, 'test'));

    // Cycle forward once to get to index 1
    act(() => {
      result.current.cycle(1);
    });

    // Now cycle forward again (should wrap to 0)
    act(() => {
      result.current.cycle(1);
    });

    expect(result.current.activeMatch).toBe(0);
  });

  it('returns early from cycle when no marks', () => {
    containerRef.current = document.createElement('div');
    const { result } = renderHook(() => useFindInPage(containerRef, testHtml));

    // Should not throw when cycling with no marks
    act(() => {
      result.current.cycle(1);
    });

    expect(result.current.activeMatch).toBe(0);
  });

  it('sets first match as active when highlighting completes', () => {
    containerRef.current = document.createElement('div');
    const mark1 = document.createElement('mark');
    mark1.dataset.hit = '1';
    mark1.scrollIntoView = vi.fn();
    const mark2 = document.createElement('mark');
    mark2.dataset.hit = '2';

    containerRef.current.appendChild(mark1);
    containerRef.current.appendChild(mark2);

    vi.mocked(readerMarks.highlightMatches).mockImplementation(() => {});
    vi.mocked(readerMarks.clearHighlights).mockImplementation(() => {});

    renderHook(() => useFindInPage(containerRef, testHtml, 'test'));

    expect(mark1.dataset.active).toBe('1');
    expect(mark1.scrollIntoView).toHaveBeenCalled();
  });

  it('does not scroll when no matches found', () => {
    containerRef.current = document.createElement('div');

    vi.mocked(readerMarks.highlightMatches).mockImplementation(() => {});
    vi.mocked(readerMarks.clearHighlights).mockImplementation(() => {});

    const { result } = renderHook(() => useFindInPage(containerRef, testHtml, 'test'));

    // No marks added, so nothing to scroll
    expect(result.current.matchCount).toBe(0);
  });
});
