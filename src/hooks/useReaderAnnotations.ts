/**
 * Text-selection annotations for the Library reader: capture a selection inside
 * the reader body to offer a highlight/note popover, persist a note against the
 * nearest section heading, and re-anchor saved notes into the rendered content
 * on each render. The DOM surgery lives in `@/lib/readerMarks`
 * (`wrapAnnotation`/`clearAnnotations`/`nearestSectionId`); persistence lives in
 * `@/lib/prefs/libraryPrefs` (`addNote`). This hook owns the selection state and
 * the effects that bind them. Extracted from the Document page so the
 * choreography is testable against a jsdom fixture.
 */
import { useCallback, useEffect, useState } from 'react';
import { clearAnnotations, nearestSectionId, wrapAnnotation } from '@/lib/readerMarks';
import { addNote, type LibNote } from '@/lib/prefs/libraryPrefs';
import type { SelectionRect } from '@/components/library/SelectionPopover';

/** A live text selection inside the reader, positioned for the popover. */
export interface ReaderSelection {
  rect: SelectionRect;
  quote: string;
  sectionId: string;
}

export interface ReaderAnnotations {
  /** The current selection to anchor the popover to, or null. */
  sel: ReaderSelection | null;
  /** Fully dismiss the selection (also clears the browser range). */
  closeSel: () => void;
  /**
   * Scroll-safe dismissal: clears the stale rect only when a selection is
   * present, so a plain scroll doesn't churn state or nuke the user's selection.
   */
  dismissSelection: () => void;
  /** Persist the current selection as a note (empty string = highlight only). */
  saveAnnotation: (note: string) => void;
}

export function useReaderAnnotations(opts: {
  contentRef: React.RefObject<HTMLElement | null>;
  html: string;
  notes: LibNote[] | undefined;
  /** The document key (`docKey`) notes are stored under. */
  dk: string;
  slug: string | undefined;
  /** CSS-module class applied to a re-anchored annotation `<mark>`. */
  annotClass: string;
}): ReaderAnnotations {
  const { contentRef, html, notes, dk, slug, annotClass } = opts;
  const [sel, setSel] = useState<ReaderSelection | null>(null);

  const closeSel = useCallback(() => {
    setSel(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  const dismissSelection = useCallback(() => setSel((s) => (s ? null : s)), []);

  // Capture a text selection inside the reader to offer highlight / note.
  useEffect(() => {
    const onMouseUp = () => {
      const root = contentRef.current;
      const selection = window.getSelection();
      if (!root || !selection || selection.isCollapsed || !selection.rangeCount) return;
      const range = selection.getRangeAt(0);
      if (!root.contains(range.commonAncestorContainer)) return;
      const quote = selection.toString().trim();
      if (quote.length < 3 || quote.length > 400) return;
      const r = range.getBoundingClientRect();
      setSel({
        rect: { top: r.top, left: r.left, width: r.width, height: r.height },
        quote,
        sectionId: nearestSectionId(root, range.startContainer),
      });
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html]);

  // Re-anchor saved annotations into the rendered content (best-effort).
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !html) return;
    clearAnnotations(root);
    for (const n of notes ?? []) wrapAnnotation(root, n, annotClass);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, notes]);

  const saveAnnotation = useCallback(
    (note: string) => {
      if (!sel || !slug) return;
      const entry: LibNote = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sectionId: sel.sectionId,
        quote: sel.quote,
        note,
        created: new Date().toISOString(),
      };
      addNote(dk, entry);
      closeSel();
    },
    [sel, slug, dk, closeSel],
  );

  return { sel, closeSel, dismissSelection, saveAnnotation };
}
