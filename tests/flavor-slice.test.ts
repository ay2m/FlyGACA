import { describe, expect, it } from 'vitest';
import {
  collectCorpusRefs,
  linkToRef,
  parseSearchUrl,
  slicePack,
} from '../scripts/lib/flavor-slice.mjs';

// The slicer decides what a standalone prep app SHIPS — everything the pack's
// kept content can reach must be in the slice or the app 404s offline. These
// fixtures exercise each collection rule from src/lib/content.ts's link shapes.

const pack = {
  id: 'demo',
  kind: 'subject',
  status: 'live',
  access: 'paid',
  bankIds: ['alpha', 'beta'],
  moduleIds: ['m1'],
  pathIds: ['p1'],
  sheetSlugs: ['sheet-a'],
  librarySlugs: ['ref-doc'],
};

const indexes = {
  quiz: {
    exam: { title: 'Exam', questions: 10, minutes: 30, passMark: 75 },
    banks: [
      {
        id: 'alpha',
        title: 'Alpha',
        questions: [
          {
            q: 'q1',
            options: [],
            answer: 0,
            explain: '',
            citeRef: { kind: 'regulations', id: 'gacar-91' },
          },
          { q: 'q2', options: [], answer: 0, explain: '' },
        ],
      },
      { id: 'beta', title: 'Beta', questions: [] },
      { id: 'omitted', title: 'Omitted', questions: [] },
    ],
  },
  groundschool: {
    title: 'GS',
    intro: '',
    modules: [
      {
        id: 'm1',
        title: 'M1',
        lessons: [
          {
            id: 'l1',
            title: '',
            objective: '',
            adel: '',
            read: { kind: 'handbook', id: 'phak-ch1', label: '' },
          },
          // Legacy no-build URL shape, with the legacy `handbooks` type token.
          {
            id: 'l2',
            title: '',
            objective: '',
            adel: '',
            read: { url: 'document.html?type=handbooks&id=phak-ch2#sec', label: '' },
          },
        ],
      },
      {
        id: 'm2',
        title: 'M2',
        lessons: [
          {
            id: 'l3',
            title: '',
            objective: '',
            adel: '',
            read: { kind: 'reference', id: 'not-shipped', label: '' },
          },
        ],
      },
    ],
  },
  paths: {
    paths: [
      {
        id: 'p1',
        title: 'P1',
        desc: '',
        steps: [
          { kind: 'regulations', id: 'gacar-61', label: '', note: '' },
          { route: '/study/quiz?bank=alpha', label: '', note: '' },
          { kind: 'regulations', id: 'gacar-91', label: '', note: '' },
        ],
      },
      { id: 'p2', title: 'P2', desc: '', steps: [] },
    ],
  },
  pdfs: {
    generated: '',
    categories: [{ id: 'c', label: 'C' }],
    documents: [
      { title: 'Sheet A', slug: 'sheet-a', category: 'c', file: 'assets/study-sheets/sheet-a.pdf' },
      { title: 'Sheet B', slug: 'sheet-b', category: 'c', file: 'assets/study-sheets/sheet-b.pdf' },
    ],
  },
  regulations: {
    generated: '',
    count: 2,
    categories: [],
    documents: [
      { slug: 'gacar-61', title: 'Part 61', category: 'x' },
      { slug: 'gacar-91', title: 'Part 91', category: 'x' },
    ],
  },
  reference: {
    generated: '',
    count: 1,
    categories: [],
    documents: [{ slug: 'ref-doc', title: 'Ref', category: 'x' }],
  },
  handbook: {
    generated: '',
    count: 2,
    categories: [],
    documents: [
      { slug: 'phak-ch1', title: 'PHAK 1', category: 'x' },
      { slug: 'phak-ch2', title: 'PHAK 2', category: 'x' },
    ],
  },
};

describe('link parsing', () => {
  it('parses legacy corpus URLs including the handbooks type token', () => {
    expect(parseSearchUrl('document.html?type=handbooks&id=phak-ch2#s')).toEqual({
      kind: 'handbook',
      id: 'phak-ch2',
    });
    expect(parseSearchUrl('document.html?type=reference&id=ac-1')).toEqual({
      kind: 'reference',
      id: 'ac-1',
    });
    expect(parseSearchUrl('../tools/e6b.html')).toBeNull();
  });

  it('normalises semantic links, legacy urls, and rejects route/unknown links', () => {
    expect(linkToRef({ kind: 'regulations', id: 'gacar-91' })).toEqual({
      kind: 'regulations',
      id: 'gacar-91',
    });
    expect(linkToRef({ url: 'document.html?type=parts&id=x' })).toBeNull();
    expect(linkToRef({ route: '/study/quiz?bank=alpha' })).toBeNull();
    expect(linkToRef(undefined)).toBeNull();
  });
});

describe('slicePack', () => {
  const slice = slicePack(pack, indexes);

  it('filters each index to the pack, keeping the exam block', () => {
    expect(slice.quiz.banks.map((b: { id: string }) => b.id)).toEqual(['alpha', 'beta']);
    expect(slice.quiz.exam.passMark).toBe(75);
    expect(slice.groundschool.modules.map((m: { id: string }) => m.id)).toEqual(['m1']);
    expect(slice.paths.paths.map((p: { id: string }) => p.id)).toEqual(['p1']);
    expect(slice.pdfs.documents.map((d: { slug: string }) => d.slug)).toEqual(['sheet-a']);
  });

  it('collects every reachable corpus doc exactly once (slugs + reads + steps + citations)', () => {
    const files = slice.corpusFiles.map((f: { path: string }) => f.path).sort();
    expect(files).toEqual([
      'ebooks/phak-ch1.html',
      'ebooks/phak-ch2.html',
      'library/ref-doc.html',
      'parts/gacar-61.html',
      'parts/gacar-91.html',
    ]);
  });

  it('ships filtered-but-valid corpus indexes with updated counts', () => {
    expect(slice.corpusIndexes.regulations.count).toBe(2);
    expect(slice.corpusIndexes.reference.documents.map((d: { slug: string }) => d.slug)).toEqual([
      'ref-doc',
    ]);
    expect(slice.corpusIndexes.handbook.count).toBe(2);
  });

  it('maps sheet files off the legacy assets/ prefix', () => {
    expect(slice.sheetFiles).toEqual(['study-sheets/sheet-a.pdf']);
  });

  it('does not leak content from dropped modules, and reports nothing missing here', () => {
    // m2's `not-shipped` reference belongs to a module the pack does NOT include.
    const slugs = slice.corpusFiles.map((f: { slug: string }) => f.slug);
    expect(slugs).not.toContain('not-shipped');
    expect(slice.missingRefs).toEqual([]);
  });

  it('surfaces refs that name no corpus document', () => {
    const broken = slicePack({ ...pack, librarySlugs: ['ref-doc', 'ghost'] }, indexes);
    expect(broken.missingRefs).toEqual([{ kind: 'reference', id: 'ghost' }]);
  });
});

describe('collectCorpusRefs', () => {
  it('dedupes across sources', () => {
    const refs = collectCorpusRefs(pack, {
      quizBanks: indexes.quiz.banks.filter((b) => pack.bankIds.includes(b.id)),
      gsModules: indexes.groundschool.modules.filter((m) => pack.moduleIds.includes(m.id)),
      paths: indexes.paths.paths.filter((p) => pack.pathIds.includes(p.id)),
    });
    // gacar-91 is reachable via a path step AND a quiz citation — once only.
    expect(refs.filter((r) => r.id === 'gacar-91')).toHaveLength(1);
  });
});
