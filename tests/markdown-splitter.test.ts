/**
 * Hierarchical Markdown Splitter — lineage inheritance over the GACAR corpus.
 *
 * Asserts that chunks parsed from the OCR HTML inherit their full legal lineage
 * (document → subpart → section → paragraph → sub_paragraph) and that the
 * parser is resilient to the corpus's real-world OCR noise.
 */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — pure ESM JS lib, no types (mirrors scripts/lib/sync-merge.mjs).
import {
  splitPartHtml,
  isSectionHeading,
  isRunningHeaderNoise,
  parseMarkers,
  levelOf,
  buildAnchor,
} from '../scripts/lib/markdown-splitter.mjs';

const META = { slug: 'part-61', part: '61', title: 'Certification', effectiveDate: '2026-06' };

interface Chunk {
  document: string;
  subpart: string | null;
  section: string | null;
  paragraph: string | null;
  sub_paragraph: string | null;
  title: string;
  effective_date: string | null;
  text: string;
  anchor: string | null;
  url: string;
  dropped: boolean;
}

describe('isSectionHeading', () => {
  it('detects a clean <h3 id="sec-NN-NNN"> heading', () => {
    const h = isSectionHeading(
      { kind: 'h3', id: 'sec-61-107', text: '§ 61.107 Application.' },
      '61',
    );
    expect(h).toEqual({ section: '61.107', title: 'Application', anchor: 'sec-61-107' });
  });

  it('detects a section that appears only as a bare <p>', () => {
    const h = isSectionHeading({ kind: 'p', id: null, text: '§ 61.107 Application.' }, '61');
    expect(h).toMatchObject({ section: '61.107', title: 'Application' });
    expect(h.anchor).toBe('sec-61-107');
  });

  it('rejects running-header noise (id and text variants, spaced or not)', () => {
    expect(
      isRunningHeaderNoise({
        kind: 'h3',
        id: 'sec-gacar-part-61-x-72',
        text: 'GACAR PART 61 - CERTIFICATION',
      }),
    ).toBe(true);
    expect(
      isRunningHeaderNoise({
        kind: 'h3',
        id: 'sec-gacar-part105-parachute',
        text: 'GACAR PART105-PARACHUTE OPERATIONS',
      }),
    ).toBe(true);
    expect(
      isSectionHeading(
        { kind: 'h3', id: 'sec-gacar-part-61-x-72', text: 'GACAR PART 61 - X' },
        '61',
      ),
    ).toBeNull();
  });

  it('rejects an inline section cross-reference', () => {
    // "§ 61.5(b)" — number immediately followed by "(" — is a cross-ref, not a heading.
    expect(
      isSectionHeading({ kind: 'p', id: null, text: '§ 61.5(b) applies here' }, '61'),
    ).toBeNull();
  });

  it('rejects a TOC line (page-leader dots / trailing page number)', () => {
    expect(
      isSectionHeading(
        { kind: 'p', id: null, text: '§ 61.191 Applicability ·113 § 61.193 Eligibility' },
        '61',
      ),
    ).toBeNull();
  });

  it('treats a non-numbered <h3 id> (Definitions) as a heading with section: null', () => {
    const h = isSectionHeading(
      { kind: 'h3', id: 'sec-acas-broadcast', text: 'ACAS broadcast.' },
      '1',
    );
    expect(h).toEqual({ section: null, title: 'ACAS broadcast', anchor: 'sec-acas-broadcast' });
  });
});

describe('levelOf / buildAnchor', () => {
  it('maps marker classes to nesting levels', () => {
    expect(levelOf('a')).toBe(0);
    expect(levelOf('1')).toBe(1);
    expect(levelOf('ii')).toBe(2);
    expect(levelOf('A')).toBe(3);
  });
  it('disambiguates single roman (i) by context', () => {
    expect(levelOf('i', [])).toBe(0); // no numbered sub open → paragraph
    expect(levelOf('i', ['b', '1'])).toBe(2); // inside a numbered sub → roman
  });
  it('builds the corpus anchor', () => {
    expect(buildAnchor('61', '61.107')).toBe('sec-61-107');
  });
});

describe('parseMarkers', () => {
  it('returns no markers for body text', () => {
    expect(parseMarkers('This subpart prescribes the requirements.')).toEqual([
      { markers: [], text: 'This subpart prescribes the requirements.' },
    ]);
  });
  it('parses a nested leading chain (b)(1)', () => {
    expect(parseMarkers('(b)(1) foo')).toEqual([{ markers: ['b', '1'], text: 'foo' }]);
  });
  it('normalizes a leading OCR token (3e → b)', () => {
    expect(parseMarkers('3e Be at least 14 years of age')).toEqual([
      { markers: ['b'], text: 'Be at least 14 years of age' },
    ]);
  });
  it('splits semicolon-delimited interior siblings', () => {
    const items = parseMarkers('(1) carrying a passenger; (2) carrying property; or (3) for hire');
    expect(items.map((i) => i.markers)).toEqual([['1'], ['2'], ['3']]);
    expect(items[1].text).toBe('carrying property');
    expect(items[2].text).toBe('for hire');
    expect(items[1].dropped).toBe(true);
  });
});

describe('splitPartHtml — lineage inheritance', () => {
  it('inherits paragraph and sub_paragraph "1_i" across (b)→(1)→(i)', () => {
    const html = [
      '<h2 id="sub-e">SUBPART E - PRIVATE PILOTS</h2>',
      '<h3 id="sec-61-107">§ 61.107 Flight Proficiency.</h3>',
      '<p>(a) General. A person must receive training.</p>',
      '<p>(b) Required training. The training must include—</p>',
      '<p>(1) Preflight preparation;</p>',
      '<p>(i) airworthiness checks; and</p>',
    ].join('\n');
    const chunks = splitPartHtml(html, META);
    const deep = chunks.find((c: Chunk) => c.sub_paragraph === '1_i');
    expect(deep).toBeTruthy();
    expect(deep).toMatchObject({
      document: 'GACAR_Part_61',
      subpart: 'E',
      section: '61.107',
      paragraph: 'b',
      sub_paragraph: '1_i',
      title: 'Flight Proficiency',
      effective_date: '2026-06',
    });
    expect(deep.url).toBe('document.html?type=regulations&id=part-61#sec-61-107');
  });

  it('emits section-intro text with null paragraph', () => {
    const html =
      '<h3 id="sec-61-101">§ 61.101 Applicability.</h3>' +
      '<p>This subpart prescribes the requirements for student pilot certificates.</p>';
    const chunks = splitPartHtml(html, META);
    expect(chunks[0]).toMatchObject({ section: '61.101', paragraph: null, sub_paragraph: null });
    expect(chunks[0].text).toContain('prescribes the requirements');
  });

  it('ignores running-header noise without corrupting open lineage', () => {
    const html = [
      '<h3 id="sec-61-109">§ 61.109 Solo Flight.</h3>',
      '<p>(a) A student pilot may not operate unless—</p>',
      '<h3 id="sec-gacar-part-61-x-72">GACAR PART 61 - CERTIFICATION</h3>',
      '<p>(1) an endorsement is held; and</p>',
    ].join('\n');
    const chunks = splitPartHtml(html, META);
    // The (1) after the noise still belongs to section 61.109, paragraph (a).
    const sub = chunks.find((c: Chunk) => c.paragraph === 'a' && c.sub_paragraph === '1');
    expect(sub).toMatchObject({ section: '61.109', paragraph: 'a', sub_paragraph: '1' });
    expect(chunks.every((c: Chunk) => !/GACAR PART/i.test(c.title))).toBe(true);
  });

  it('keeps an inline § cross-reference inside its paragraph (no new section)', () => {
    const html =
      '<h3 id="sec-61-3">§ 61.3 Privilege.</h3>' +
      '<p>(b) A person may not operate under GACAR § 61.5(b) if expired.</p>';
    const chunks = splitPartHtml(html, META);
    expect(chunks.every((c: Chunk) => c.section === '61.3')).toBe(true);
  });

  it('emits both of a collapsed (i)/(i) OCR pair with an occurrence suffix', () => {
    const html =
      '<h3 id="sec-61-5">§ 61.5 Ratings.</h3>' +
      '<p>(a) Aircraft category ratings—</p>' +
      '<p>(1) Airplane;</p>' +
      '<p>(i) Single-engine;</p>' +
      '<p>(i) Multi-engine.</p>';
    const chunks = splitPartHtml(html, META);
    const subs = chunks
      .map((c: Chunk) => c.sub_paragraph)
      .filter((s: string) => s?.startsWith('1_'));
    expect(subs).toContain('1_i');
    expect(subs).toContain('1_i#2');
  });

  it('keeps each sub-unit a distinct chunk and never crosses a section', () => {
    const html = [
      '<h3 id="sec-61-7">§ 61.7 A.</h3>',
      '<p>(a) one;</p>',
      '<p>(1) two;</p>',
      '<p>(2) three.</p>',
      '<h3 id="sec-61-9">§ 61.9 B.</h3>',
      '<p>(a) four.</p>',
    ].join('\n');
    const chunks = splitPartHtml(html, META);
    const s7 = chunks.filter((c: Chunk) => c.section === '61.7');
    const s9 = chunks.filter((c: Chunk) => c.section === '61.9');
    // (a), (a)(1), (a)(2) each retain their own lineage — no boundary collapse.
    expect(s7.map((c: Chunk) => c.sub_paragraph)).toEqual([null, '1', '2']);
    expect(s7.every((c: Chunk) => c.paragraph === 'a')).toBe(true);
    expect(s9).toHaveLength(1);
    expect(s9[0]).toMatchObject({ section: '61.9', paragraph: 'a' });
  });

  it('coalesces consecutive same-lineage section-intro paragraphs', () => {
    const html =
      '<h3 id="sec-61-1">§ 61.1 Applicability.</h3>' +
      '<p>This part prescribes requirements.</p>' +
      '<p>It also prescribes the conditions.</p>';
    const chunks = splitPartHtml(html, META);
    const intro = chunks.filter((c: Chunk) => c.section === '61.1' && c.paragraph === null);
    expect(intro).toHaveLength(1);
    expect(intro[0].text).toContain('requirements');
    expect(intro[0].text).toContain('conditions');
  });
});
