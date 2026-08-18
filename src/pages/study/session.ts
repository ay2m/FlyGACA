/**
 * Builds an ad-hoc quiz/flashcard "bank" from a URL session spec so the existing
 * Quiz Runner and Flashcards Deck can be launched focused on a pack, a single
 * bank, or the user's flagged review deck — without any new runner.
 */
import type { QuizBank, QuizData } from '@/lib/content';
import { PACKS } from '@/lib/prepCatalog';

export interface SessionOpts {
  pack?: string | null;
  bank?: string | null;
  review?: string | null;
}

/** Synthetic banks are not real and must never be written to quizBest/lastBank. */
export function isSynthetic(bankId: string): boolean {
  return bankId.startsWith('pack-') || bankId.startsWith('review-');
}

type Tr = (key: string, opts?: Record<string, unknown>) => string;

/**
 * Resolve a session spec to a bank. Returns the real bank for `?bank=`, a merged
 * synthetic bank for `?pack=`, the flagged-question deck for `?review=flagged`,
 * or null when nothing matches (caller then shows the normal bank list).
 */
export function buildSession(
  data: QuizData,
  opts: SessionOpts,
  flagged: Record<string, number[]>,
  t: Tr,
): QuizBank | null {
  if (opts.bank) {
    return data.banks.find((b) => b.id === opts.bank) ?? null;
  }
  if (opts.pack) {
    const pack = PACKS.find((p) => p.id === opts.pack);
    if (!pack) return null;
    const questions = pack.bankIds.flatMap(
      (id) => data.banks.find((b) => b.id === id)?.questions ?? [],
    );
    if (!questions.length) return null;
    return {
      id: `pack-${pack.id}`,
      title: t(`study.packCatalog.${pack.id}.name`),
      desc: '',
      source: t('study.packMixed'),
      questions,
    };
  }
  if (opts.review === 'flagged') {
    const questions = Object.entries(flagged).flatMap(([bankId, idxs]) => {
      const bank = data.banks.find((b) => b.id === bankId);
      if (!bank) return [];
      return idxs.map((i) => bank.questions[i]).filter(Boolean);
    });
    if (!questions.length) return null;
    return {
      id: 'review-flagged',
      title: t('study.reviewFlaggedTitle'),
      desc: '',
      source: t('study.packMixed'),
      questions,
    };
  }
  return null;
}
