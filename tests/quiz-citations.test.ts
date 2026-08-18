import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Mechanical quality gate for the question corpus (public/data/quiz.json). Every
 * study surface (quiz, flashcards, mock exam, packs) and every native app slice
 * (scripts/build-ios-content.mjs) reads these banks, so a malformed question or a
 * dangling citation is a shipping defect, not a cosmetic one.
 *
 * Invariants asserted for EVERY question in EVERY bank:
 *  - well-formed: non-empty prompt, 3–5 options, an in-range 0-based answer, a
 *    non-empty explanation, and a human `cite` (mirrors the runtime validation in
 *    scripts/build-ios-content.mjs and the QuizQuestion contract in content.ts).
 *  - resolvable structured citation: when a question carries a `citeRef` of kind
 *    `regulations`, its `id` MUST resolve to a real GACAR Part in gacar-index.json —
 *    that ref is what deep-links the answer to the regulation, so a typo (e.g.
 *    `part-999`) would render a dead link. `reference`/`handbook` refs point at the
 *    library corpus and are checked by data-shape/link tests, not here.
 *
 * This is what lets CPL/IR/ATPL draft banks be authored against the GACAR corpus
 * with confidence: a wrong Part id fails the build here rather than in a user's exam.
 */

const DATA = join(process.cwd(), 'public/data');
const readJson = (name: string) => JSON.parse(readFileSync(join(DATA, name), 'utf8'));

interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain: string;
  cite?: string;
  citeRef?: { kind: string; id: string; anchor?: string };
}
interface QuizBank {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

const quiz = readJson('quiz.json') as { banks: QuizBank[] };
const gacar = readJson('gacar-index.json') as { documents: { slug: string }[] };
const partSlugs = new Set(gacar.documents.map((d) => d.slug));

// Flatten to (bankId, index, question) tuples so failures name the exact question.
const rows = quiz.banks.flatMap((b) =>
  b.questions.map((question, i) => ({ at: `${b.id}[${i}]`, question })),
);

describe('quiz corpus integrity', () => {
  it('has banks and questions to check', () => {
    expect(quiz.banks.length).toBeGreaterThan(0);
    expect(rows.length).toBeGreaterThan(0);
  });

  it('every question is well-formed (prompt, options, answer, explanation, cite)', () => {
    const bad: string[] = [];
    for (const { at, question: q } of rows) {
      if (!q.q?.trim()) bad.push(`${at}: empty prompt`);
      if (!Array.isArray(q.options) || q.options.length < 3 || q.options.length > 5)
        bad.push(`${at}: needs 3–5 options (has ${q.options?.length})`);
      else if (q.options.some((o) => !o?.trim())) bad.push(`${at}: blank option`);
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= (q.options?.length ?? 0))
        bad.push(`${at}: answer index ${q.answer} out of range`);
      if (!q.explain?.trim()) bad.push(`${at}: empty explanation`);
      if (!q.cite?.trim()) bad.push(`${at}: missing cite`);
    }
    expect(bad, `malformed questions:\n${bad.join('\n')}`).toEqual([]);
  });

  it('every regulations citeRef resolves to a real GACAR Part', () => {
    const dangling: string[] = [];
    for (const { at, question: q } of rows) {
      const ref = q.citeRef;
      if (ref?.kind === 'regulations' && !partSlugs.has(ref.id))
        dangling.push(`${at}: citeRef.id '${ref.id}' is not a GACAR Part in gacar-index.json`);
    }
    expect(dangling, `dangling regulation citations:\n${dangling.join('\n')}`).toEqual([]);
  });

  it('question prompts are unique within each bank', () => {
    const dupes: string[] = [];
    for (const b of quiz.banks) {
      const seen = new Map<string, number>();
      b.questions.forEach((q, i) => {
        const key = q.q.trim().toLowerCase();
        if (seen.has(key)) dupes.push(`${b.id}: duplicate prompt at [${i}] and [${seen.get(key)}]`);
        else seen.set(key, i);
      });
    }
    expect(dupes, `duplicate prompts:\n${dupes.join('\n')}`).toEqual([]);
  });
});
