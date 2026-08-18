import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useReaderAnnotations } from '@/hooks/useReaderAnnotations';
import { addNote } from '@/lib/prefs/libraryPrefs';
import type { LibNote } from '@/lib/prefs/libraryPrefs';

// Persistence is exercised by libraryPrefs' own suite; here we only assert the
// hook calls addNote with the right shape, so stub it. The DOM re-anchoring and
// selection capture run against a jsdom fixture with a stubbed Selection.
vi.mock('@/lib/prefs/libraryPrefs', async (orig) => ({
  ...(await orig<typeof import('@/lib/prefs/libraryPrefs')>()),
  addNote: vi.fn(),
}));

function reader(html: string): HTMLDivElement {
  const div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div);
  return div;
}

const note = (over: Partial<LibNote> = {}): LibNote => ({
  id: 'n1',
  sectionId: 'sec-a',
  quote: 'minimum visibility',
  note: 'check',
  created: '2026-07-23',
  ...over,
});

/** Stub window.getSelection so a dispatched mouseup yields a known selection. */
function stubSelection(container: Node, quote: string) {
  const range = {
    commonAncestorContainer: container,
    startContainer: container,
    getBoundingClientRect: () => ({ top: 5, left: 10, width: 100, height: 20 }),
  } as unknown as Range;
  vi.spyOn(window, 'getSelection').mockReturnValue({
    isCollapsed: false,
    rangeCount: 1,
    toString: () => quote,
    getRangeAt: () => range,
    removeAllRanges: vi.fn(),
  } as unknown as Selection);
}

beforeEach(() => vi.mocked(addNote).mockClear());
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

const HTML = '<h2 id="sec-a">A</h2><p>the minimum visibility rule</p>';

describe('useReaderAnnotations', () => {
  it('re-anchors saved notes into the rendered content', () => {
    const div = reader(HTML);
    renderHook(() =>
      useReaderAnnotations({
        contentRef: { current: div },
        html: HTML,
        notes: [note()],
        dk: 'dk',
        slug: 'part-91',
        annotClass: 'annot',
      }),
    );
    const marks = div.querySelectorAll('mark[data-annot="n1"]');
    expect(marks).toHaveLength(1);
    expect(marks[0].className).toBe('annot');
  });

  it('captures a valid selection on mouseup and anchors it to its section', () => {
    const div = reader(HTML);
    const textNode = div.querySelector('p')!.firstChild as Node;
    stubSelection(textNode, 'minimum visibility');
    const { result } = renderHook(() =>
      useReaderAnnotations({
        contentRef: { current: div },
        html: HTML,
        notes: undefined,
        dk: 'dk',
        slug: 'part-91',
        annotClass: 'annot',
      }),
    );
    act(() => document.dispatchEvent(new MouseEvent('mouseup')));
    expect(result.current.sel).toEqual({
      rect: { top: 5, left: 10, width: 100, height: 20 },
      quote: 'minimum visibility',
      sectionId: 'sec-a',
    });
  });

  it('ignores selections that are too short', () => {
    const div = reader(HTML);
    const textNode = div.querySelector('p')!.firstChild as Node;
    stubSelection(textNode, 'a');
    const { result } = renderHook(() =>
      useReaderAnnotations({
        contentRef: { current: div },
        html: HTML,
        notes: undefined,
        dk: 'dk',
        slug: 'part-91',
        annotClass: 'annot',
      }),
    );
    act(() => document.dispatchEvent(new MouseEvent('mouseup')));
    expect(result.current.sel).toBeNull();
  });

  it('saveAnnotation persists the selection and then clears it', () => {
    const div = reader(HTML);
    const textNode = div.querySelector('p')!.firstChild as Node;
    stubSelection(textNode, 'minimum visibility');
    const { result } = renderHook(() =>
      useReaderAnnotations({
        contentRef: { current: div },
        html: HTML,
        notes: undefined,
        dk: 'dk-91',
        slug: 'part-91',
        annotClass: 'annot',
      }),
    );
    act(() => document.dispatchEvent(new MouseEvent('mouseup')));
    act(() => result.current.saveAnnotation('my note'));
    expect(addNote).toHaveBeenCalledWith(
      'dk-91',
      expect.objectContaining({ sectionId: 'sec-a', quote: 'minimum visibility', note: 'my note' }),
    );
    expect(result.current.sel).toBeNull();
  });

  it('saveAnnotation is a no-op without a selection or slug', () => {
    const div = reader(HTML);
    const { result } = renderHook(() =>
      useReaderAnnotations({
        contentRef: { current: div },
        html: HTML,
        notes: undefined,
        dk: 'dk',
        slug: 'part-91',
        annotClass: 'annot',
      }),
    );
    act(() => result.current.saveAnnotation('orphan'));
    expect(addNote).not.toHaveBeenCalled();
  });

  it('dismissSelection clears a present selection and is inert when empty', () => {
    const div = reader(HTML);
    const textNode = div.querySelector('p')!.firstChild as Node;
    stubSelection(textNode, 'minimum visibility');
    const { result } = renderHook(() =>
      useReaderAnnotations({
        contentRef: { current: div },
        html: HTML,
        notes: undefined,
        dk: 'dk',
        slug: 'part-91',
        annotClass: 'annot',
      }),
    );
    act(() => document.dispatchEvent(new MouseEvent('mouseup')));
    expect(result.current.sel).not.toBeNull();
    act(() => result.current.dismissSelection());
    expect(result.current.sel).toBeNull();
    // Inert second call — stays null without throwing.
    act(() => result.current.dismissSelection());
    expect(result.current.sel).toBeNull();
  });
});
