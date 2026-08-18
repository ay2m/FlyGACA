import { describe, expect, it } from 'vitest';
import {
  clearAnnotations,
  clearHighlights,
  decorateHeadings,
  highlightMatches,
  nearestSectionId,
  wrapAnnotation,
} from '@/lib/readerMarks';
import type { LibNote } from '@/lib/prefs/libraryPrefs';

// The Document reader's mark helpers rewrite live DOM. The behaviors pinned
// here are the ones a regression would silently break: repeated highlight runs
// must not double-wrap, teardown must restore the original text (normalized),
// search teardown must leave annotations standing, and annotation re-anchoring
// must stay within the note's section and give up on element-spanning quotes.

const note = (over: Partial<LibNote> = {}): LibNote => ({
  id: 'n1',
  sectionId: 'sec-a',
  quote: 'minimum visibility',
  note: 'check this',
  created: '2026-07-23',
  ...over,
});

function reader(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
}

describe('highlightMatches', () => {
  it('wraps every case-insensitive hit and returns the first mark', () => {
    const root = reader('<p>VFR rules. vfr again in the same node.</p><p>More VFR here.</p>');
    const first = highlightMatches(root, 'vfr');
    const marks = root.querySelectorAll('mark[data-hit]');
    expect(marks).toHaveLength(3);
    expect(first).toBe(marks[0]);
    expect(root.textContent).toBe('VFR rules. vfr again in the same node.More VFR here.');
  });

  it('does not double-wrap on repeated runs (text inside a mark is skipped)', () => {
    const root = reader('<p>ceiling and ceiling</p>');
    highlightMatches(root, 'ceiling');
    highlightMatches(root, 'ceiling');
    expect(root.querySelectorAll('mark').length).toBe(2);
  });

  it('returns null for an empty needle', () => {
    const root = reader('<p>anything</p>');
    expect(highlightMatches(root, '')).toBeNull();
  });
});

describe('clearHighlights', () => {
  it('round-trips: unwraps marks and re-normalizes the text nodes', () => {
    const root = reader('<p>alpha bravo alpha</p>');
    highlightMatches(root, 'alpha');
    clearHighlights(root);
    expect(root.querySelectorAll('mark')).toHaveLength(0);
    const p = root.querySelector('p') as HTMLElement;
    expect(p.childNodes).toHaveLength(1);
    expect(p.textContent).toBe('alpha bravo alpha');
  });

  it('leaves annotation marks standing', () => {
    const root = reader('<h2 id="sec-a">A</h2><p>the minimum visibility rule</p>');
    wrapAnnotation(root, note(), 'annot');
    highlightMatches(root, 'rule');
    clearHighlights(root);
    expect(root.querySelectorAll('mark[data-annot]')).toHaveLength(1);
    expect(root.querySelectorAll('mark[data-hit]')).toHaveLength(0);
  });
});

describe('nearestSectionId', () => {
  it('resolves the closest preceding heading, empty before the first', () => {
    const root = reader(
      '<p id="pre">intro</p><h2 id="sec-a">A</h2><p id="pa">a</p><h3 id="sec-b">B</h3><p id="pb">b</p>',
    );
    expect(nearestSectionId(root, root.querySelector('#pb') as Node)).toBe('sec-b');
    expect(nearestSectionId(root, root.querySelector('#pa') as Node)).toBe('sec-a');
    expect(nearestSectionId(root, root.querySelector('#pre') as Node)).toBe('');
  });
});

describe('wrapAnnotation / clearAnnotations', () => {
  it('wraps the quote inside its section with id, class and title', () => {
    const root = reader(
      '<h2 id="sec-a">A</h2><p>the minimum visibility rule</p><h2 id="sec-b">B</h2><p>minimum visibility elsewhere</p>',
    );
    expect(wrapAnnotation(root, note(), 'annot')).toBe(true);
    const marks = root.querySelectorAll<HTMLElement>('mark[data-annot]');
    expect(marks).toHaveLength(1);
    expect(marks[0].dataset.annot).toBe('n1');
    expect(marks[0].className).toBe('annot');
    expect(marks[0].title).toBe('check this');
    // Anchored in sec-a, not the sec-b occurrence.
    expect(nearestSectionId(root, marks[0])).toBe('sec-a');
  });

  it('returns false when the quote is missing or spans elements', () => {
    const root = reader('<h2 id="sec-a">A</h2><p>minimum <em>visibility</em> rule</p>');
    expect(wrapAnnotation(root, note({ quote: 'not present' }), 'annot')).toBe(false);
    // The quote exists as rendered text but spans an element boundary.
    expect(wrapAnnotation(root, note(), 'annot')).toBe(false);
    expect(root.querySelectorAll('mark')).toHaveLength(0);
  });

  it('clearAnnotations removes annotation marks but not search marks', () => {
    const root = reader('<h2 id="sec-a">A</h2><p>the minimum visibility rule</p>');
    wrapAnnotation(root, note(), 'annot');
    highlightMatches(root, 'rule');
    clearAnnotations(root);
    expect(root.querySelectorAll('mark[data-annot]')).toHaveLength(0);
    expect(root.querySelectorAll('mark[data-hit]')).toHaveLength(1);
  });
});

describe('decorateHeadings', () => {
  const opts = (onCopy: (id: string) => void) => ({
    anchorTargetClass: 'anchorTarget',
    anchorClass: 'anchor',
    label: 'Copy link',
    onCopy,
  });

  it('injects a clean clause anchor and a copy-link button per section heading', () => {
    const root = reader('<h2 id="sec-noise91-155">§ 91.155 Basic VFR weather minimums</h2>');
    decorateHeadings(
      root,
      opts(() => {}),
    );
    const target = root.querySelector('span#sec-91-155');
    expect(target).not.toBeNull();
    expect(target?.getAttribute('aria-hidden')).toBe('true');
    expect(target?.className).toBe('anchorTarget');
    const btn = root.querySelector('button.anchor');
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute('aria-label')).toBe('Copy link');
    expect(btn?.textContent).toBe('#');
  });

  it('copies the clean id when derivable, else the heading id', () => {
    const copied: string[] = [];
    const root = reader(
      '<h2 id="sec-noise91-155">§ 91.155 minimums</h2><h3 id="sec-intro">Introduction</h3>',
    );
    decorateHeadings(
      root,
      opts((id) => copied.push(id)),
    );
    root.querySelectorAll<HTMLButtonElement>('button.anchor').forEach((b) => b.click());
    // The § P.n heading copies the clean id; the prose heading falls back to its own id.
    expect(copied).toEqual(['sec-91-155', 'sec-intro']);
  });

  it('is idempotent — a second run adds no duplicate anchor or button', () => {
    const root = reader('<h2 id="sec-noise91-155">§ 91.155 minimums</h2>');
    decorateHeadings(
      root,
      opts(() => {}),
    );
    decorateHeadings(
      root,
      opts(() => {}),
    );
    expect(root.querySelectorAll('span#sec-91-155')).toHaveLength(1);
    expect(root.querySelectorAll('button.anchor')).toHaveLength(1);
  });

  it('does not inject a target when the heading already carries the clean id', () => {
    const root = reader('<h2 id="sec-91-155">§ 91.155 minimums</h2>');
    decorateHeadings(
      root,
      opts(() => {}),
    );
    // No extra span — the heading's own id already is the clean anchor.
    expect(root.querySelector('span#sec-91-155')).toBeNull();
    expect(root.querySelectorAll('button.anchor')).toHaveLength(1);
  });
});
