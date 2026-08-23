/**
 * Find-in-page for the Library reader: a debounced query that highlights every
 * hit inside the reader body, tracks the match count and the active match, and
 * cycles through them. The DOM surgery lives in `@/lib/readerMarks`
 * (`highlightMatches`/`clearHighlights`); this hook owns only the React state and
 * the effect that re-highlights when the debounced query (or the rendered HTML)
 * changes. Extracted from the Document page so it is unit-testable against a
 * jsdom fixture. Returns exactly the prop cluster `ReaderToolbar` consumes.
 */
import { useEffect, useRef, useState } from 'react';
import { clearHighlights, highlightMatches } from '@/lib/readerMarks';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export interface FindInPage {
  /** The live (un-debounced) query bound to the toolbar's input. */
  find: string;
  setFind: (v: string) => void;
  /** Number of `<mark data-hit>` currently placed. */
  matchCount: number;
  /** Zero-based index of the active match (0 when none). */
  activeMatch: number;
  /** Step the active match by `delta` (wraps), scrolling it into view. */
  cycle: (delta: number) => void;
}

export function useFindInPage(
  contentRef: React.RefObject<HTMLElement | null>,
  html: string,
  initialQuery = '',
): FindInPage {
  const [find, setFind] = useState(initialQuery);
  const debouncedFind = useDebouncedValue(find, 200);
  const [matchCount, setMatchCount] = useState(0);
  const [activeMatch, setActiveMatch] = useState(0);
  const marksRef = useRef<HTMLElement[]>([]);

  // Re-highlight the content whenever the (debounced) find query changes.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !html) return;
    clearHighlights(root);
    marksRef.current = [];
    const needle = debouncedFind.trim();
    if (!needle) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMatchCount(0);
      setActiveMatch(0);
      return;
    }
    highlightMatches(root, needle);
    const marks = Array.from(root.querySelectorAll<HTMLElement>('mark[data-hit]'));
    marksRef.current = marks;
    setMatchCount(marks.length);
    setActiveMatch(0);
    if (marks[0]) {
      marks[0].dataset.active = '1';
      marks[0].scrollIntoView({ block: 'center' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFind, html]);

  function cycle(delta: number) {
    const marks = marksRef.current;
    if (!marks.length) return;
    marks[activeMatch]?.removeAttribute('data-active');
    const nextI = (activeMatch + delta + marks.length) % marks.length;
    setActiveMatch(nextI);
    marks[nextI].dataset.active = '1';
    marks[nextI].scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  return { find, setFind, matchCount, activeMatch, cycle };
}
