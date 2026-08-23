import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import type { QuizBank, QuizData, QuizQuestion } from '@/lib/content';
import { useStudyProgress, gradeCard } from '@/lib/studyProgress';
import { dueKeys, masteredCount } from '@/calc/study/srs';
import { glidePathBins } from '@/calc/study/glidePath';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { GlidePathStrip } from '@/components/study/GlidePathStrip';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { usePageMeta } from '@/hooks/usePageMeta';
import { courseLd } from '@/lib/seo/jsonld';
import { ProgressBar } from '@/components/ProgressBar';
import { Disclaimer } from '@/components/Disclaimer';
import { HubBackLink } from '@/components/HubBackLink';
import styles from './Study.module.css';
import { shuffle } from '@/calc/study/shuffle';

export function Flashcards() {
  const { t, i18n } = useTranslation();
  usePageMeta(
    t('meta.flashcards'),
    t('metaDesc.flashcards'),
    courseLd({
      title: t('meta.flashcards'),
      description: t('metaDesc.flashcards'),
      path: '/study/flashcards',
      lang: i18n.language,
    }),
  );
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useFetchJson<QuizData>('/data/quiz.json', reload);
  const { fcSrs } = useStudyProgress();
  const [bank, setBank] = useState<QuizBank | null>(null);
  const [params, setParams] = useSearchParams();

  // Deep-link straight into one bank's deck via ?bank=<id> (e.g. from a pack or
  // the hub's weak-topics list). Decks stay per-bank so SRS attribution is exact.
  useEffect(() => {
    if (!data || bank) return;
    const id = params.get('bank');
    const found = id ? data.banks.find((b) => b.id === id) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (found) setBank(found);
  }, [data, params, bank]);

  const backToBanks = () => {
    setBank(null);
    if ([...params.keys()].length) setParams({}, { replace: true });
  };

  if (loading)
    return <section className={`container-narrow ${styles.page}`}>{t('common.loading')}</section>;
  if (error || !data)
    return (
      <section className={`container-narrow ${styles.page}`}>
        <div className={styles.errorBox} role="alert">
          <p>{t('common.loadError')}</p>
          <button type="button" className={styles.primary} onClick={() => setReload((r) => r + 1)}>
            {t('library.retry')}
          </button>
        </div>
      </section>
    );

  if (!bank) {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <HubBackLink to="/learn?tab=practice" label={t('nav.learn')} />
        <h1>{t('study.flashcards')}</h1>
        <p className={styles.subtitle}>{t('study.pickBank')}</p>
        <ul className={styles.banks}>
          {data.banks.map((b) => {
            const srs = fcSrs[b.id] ?? {};
            const keys = b.questions.map((_, i) => String(i));
            const due = dueKeys(srs, keys, new Date()).length;
            const mastered = masteredCount(srs);
            return (
              <li key={b.id}>
                <button type="button" className={styles.bank} onClick={() => setBank(b)}>
                  <span className={styles.bankTitle}>{b.title}</span>
                  <span className={styles.bankMeta}>
                    {t('study.questions', { n: b.questions.length })}
                    {due > 0 ? ` · ${t('study.dueCount', { n: due })}` : ''}
                    {mastered > 0 ? ` · ${t('study.masteredCount', { n: mastered })}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Disclaimer compact />
      </section>
    );
  }

  return <Deck bank={bank} onBack={backToBanks} />;
}

type Card = QuizQuestion & { key: string };

function Deck({ bank, onBack }: { bank: QuizBank; onBack: () => void }) {
  const { t } = useTranslation();
  const { fcSrs } = useStudyProgress();
  const reduce = usePrefersReducedMotion();

  const allCards: Card[] = useMemo(
    () => bank.questions.map((c, idx) => ({ ...c, key: String(idx) })),
    [bank],
  );

  // Build the session from the cards due now (fall back to the whole deck).
  const initial = useMemo(() => {
    const srs = fcSrs[bank.id] ?? {};
    const keys = dueKeys(
      srs,
      allCards.map((c) => c.key),
      new Date(),
    );
    const due = allCards.filter((c) => keys.includes(c.key));
    return shuffle(due.length ? due : allCards);
    // Snapshot once on mount — grading mutates the store but shouldn't reshuffle mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bank]);

  // One runner serves the initial due-based session and every follow-up
  // (reset / review-missed) session — restart() swaps the queue in place.
  const [queue, setQueue] = useState<Card[]>(initial);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [got, setGot] = useState(0);
  const [again, setAgain] = useState<Card[]>([]);
  // The graded card's fly-out stage; advance() runs when its animation lands.
  const [leaving, setLeaving] = useState<'known' | 'again' | null>(null);
  const card = queue[i];
  const done = i >= queue.length;

  // Persist the grade immediately — the fly-out is purely cosmetic, so under
  // reduced motion the same step just runs without the leaving stage.
  function grade(correct: boolean) {
    if (leaving) return;
    gradeCard(bank.id, card.key, correct);
    if (correct) setGot((n) => n + 1);
    else setAgain((r) => [...r, card]);
    if (reduce) advance();
    else setLeaving(correct ? 'known' : 'again');
  }

  function advance() {
    setLeaving(null);
    setFlipped(false);
    setI((n) => n + 1);
  }

  // Keyboard: Space/Enter flips; once flipped ←/→ grade again/got-it.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (leaving) return;
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && (e.key === 'ArrowRight' || e.key === '1')) {
        e.preventDefault();
        grade(true);
      } else if (flipped && (e.key === 'ArrowLeft' || e.key === '2')) {
        e.preventDefault();
        grade(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, done, i, leaving]);

  function restart(cards: Card[]) {
    setQueue(shuffle(cards));
    setI(0);
    setFlipped(false);
    setGot(0);
    setAgain([]);
    setLeaving(null);
  }

  return (
    <section className={`container-narrow ${styles.page}`}>
      <button type="button" className={styles.back} onClick={onBack}>
        ← {t('study.back')}
      </button>
      {done ? (
        <div className={styles.result} role="status">
          <p>{t('study.deckDone', { known: got, review: again.length })}</p>
          <div className={styles.resultActions}>
            <button type="button" className={styles.primary} onClick={() => restart(allCards)}>
              {t('study.reset')}
            </button>
            {again.length > 0 && (
              <button type="button" className={styles.secondary} onClick={() => restart(again)}>
                {t('study.reviewUnknowns', { n: again.length })}
              </button>
            )}
          </div>
        </div>
      ) : (
        <CardView
          key={card.key}
          card={card}
          flipped={flipped}
          leaving={leaving}
          onFlip={() => {
            if (!leaving) setFlipped((f) => !f);
          }}
          onGrade={grade}
          onLeaveEnd={advance}
          progress={{ done: i + 1, total: queue.length }}
        />
      )}
      <GlidePathStrip
        bins={glidePathBins(
          fcSrs[bank.id] ?? {},
          allCards.map((c) => c.key),
        )}
      />
    </section>
  );
}

function CardView({
  card,
  flipped,
  leaving,
  onFlip,
  onGrade,
  onLeaveEnd,
  progress,
}: {
  card: Card;
  flipped: boolean;
  leaving: 'known' | 'again' | null;
  onFlip: () => void;
  onGrade: (correct: boolean) => void;
  onLeaveEnd: () => void;
  progress: { done: number; total: number };
}) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  // Native listener rather than React's onAnimationEnd: React only registers
  // the unprefixed event when the environment advertises CSS animation
  // support, which jsdom doesn't — the DOM event itself is dependable.
  // Attached only during the fly-out, so the enter animation never advances.
  useEffect(() => {
    if (!leaving) return;
    const el = wrapRef.current;
    if (!el) return;
    const end = () => onLeaveEnd();
    el.addEventListener('animationend', end);
    return () => el.removeEventListener('animationend', end);
  }, [leaving, onLeaveEnd]);
  const wrapperClass = [
    styles.cardWrapper,
    styles.cardEnter,
    leaving === 'known' ? styles.cardLeaveKnown : '',
    leaving === 'again' ? styles.cardLeaveAgain : '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <>
      <p className={styles.qProgress} role="status" aria-live="polite">
        {t('study.progress', { done: progress.done, total: progress.total })}
      </p>
      <ProgressBar percent={Math.round(((progress.done - 1) / progress.total) * 100)} />
      <div
        ref={wrapRef}
        className={wrapperClass}
        role="button"
        tabIndex={0}
        aria-pressed={flipped}
        aria-label={t('study.flipHint')}
        onClick={onFlip}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onFlip();
          }
        }}
      >
        <div className={`${styles.cardInner} ${flipped ? styles.flippedCard : ''}`}>
          <div className={styles.cardFront}>
            <span className={styles.cardQ}>{card.q}</span>
            <span className={styles.cardFlipHint}>{t('study.flipHint')}</span>
          </div>
          <div className={styles.cardBack}>
            <div className={styles.cardBackContent}>
              <span className={styles.cardA}>
                <strong>{card.options[card.answer]}</strong>
                <span className={styles.cardExplain}>{card.explain}</span>
              </span>
            </div>
            <CaptainAvatar size="sm" pose="hold" decorative className={styles.cardAvatar} />
          </div>
        </div>
      </div>
      {!flipped ? (
        <button type="button" className={styles.primary} onClick={onFlip}>
          {t('study.flip')}
        </button>
      ) : (
        <div className={styles.markRow}>
          <button
            type="button"
            className={`${styles.mark} ${styles.markReview}`}
            onClick={() => onGrade(false)}
            disabled={leaving != null}
          >
            {t('study.again')}
          </button>
          <button
            type="button"
            className={`${styles.mark} ${styles.markKnown}`}
            onClick={() => onGrade(true)}
            disabled={leaving != null}
          >
            {t('study.gotIt')}
          </button>
        </div>
      )}
    </>
  );
}
