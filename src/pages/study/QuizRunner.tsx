import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { QuizBank, QuizQuestion } from '@/lib/content';
import { useStudyProgress, setQuizBest, toggleFlag } from '@/lib/studyProgress';
import { ProgressBar } from '@/components/ProgressBar';
import { isSynthetic } from './session';
import styles from './Study.module.css';
import { shuffle } from '@/calc/study/shuffle';

export function Shell({ children }: { children: React.ReactNode }) {
  return <section className={`container-narrow ${styles.page}`}>{children}</section>;
}

export function Runner({ bank, onBack }: { bank: QuizBank; onBack: () => void }) {
  const { t } = useTranslation();
  const { flagged } = useStudyProgress();
  const synthetic = isSynthetic(bank.id);
  const [queue, setQueue] = useState<QuizQuestion[]>(() => shuffle(bank.questions));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState<QuizQuestion[]>([]);
  const [done, setDone] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const q = queue[i];

  function choose(opt: number) {
    if (picked != null) return;
    setPicked(opt);
    setAnswers((a) => [...a, opt]);
    if (opt === q.answer) setCorrect((c) => c + 1);
    else setWrong((w) => [...w, q]);
  }

  function next() {
    if (i + 1 >= queue.length) {
      if (!synthetic) setQuizBest(bank.id, Math.round((correct / queue.length) * 100));
      setDone(true);
    } else {
      setI(i + 1);
      setPicked(null);
    }
  }

  function restart(questions: QuizQuestion[]) {
    setQueue(shuffle(questions));
    setI(0);
    setPicked(null);
    setAnswers([]);
    setCorrect(0);
    setWrong([]);
    setDone(false);
    setReviewing(false);
  }

  // Keyboard: 1–4 / A–D pick an option; Enter advances once answered.
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && picked != null) {
        e.preventDefault();
        next();
        return;
      }
      if (picked != null) return;
      const k = e.key.toLowerCase();
      const byNum = '1234'.indexOf(e.key);
      const byLetter = 'abcd'.indexOf(k);
      const idx = byNum >= 0 ? byNum : byLetter;
      if (idx >= 0 && idx < q.options.length) {
        e.preventDefault();
        choose(idx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked, i, done, q]);

  if (reviewing) {
    return (
      <ReviewWalkthrough
        bank={bank}
        queue={queue}
        answers={answers}
        onBack={() => setReviewing(false)}
      />
    );
  }

  if (done) {
    const pct = Math.round((correct / queue.length) * 100);
    return (
      <Shell>
        <button type="button" className={styles.back} onClick={onBack}>
          ← {t('study.back')}
        </button>
        <div className={styles.result} role="status">
          <p className={styles.resultPct}>{pct}%</p>
          <p>{t('study.scoreLine', { correct, total: queue.length })}</p>
          <div className={styles.resultActions}>
            <button
              type="button"
              className={styles.primary}
              onClick={() => restart(bank.questions)}
            >
              {t('study.restart')}
            </button>
            <button type="button" className={styles.secondary} onClick={() => setReviewing(true)}>
              {t('study.reviewAnswers')}
            </button>
            {wrong.length > 0 && (
              <button type="button" className={styles.secondary} onClick={() => restart(wrong)}>
                {t('study.retryWrong', { n: wrong.length })}
              </button>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <button type="button" className={styles.back} onClick={onBack}>
        ← {t('study.back')}
      </button>
      <div className={styles.qHead}>
        <p className={styles.qProgress} role="status" aria-live="polite">
          {t('study.question', { n: i + 1, total: queue.length })}
        </p>
        {!synthetic &&
          (() => {
            const qIdx = bank.questions.indexOf(q);
            const isFlagged = (flagged[bank.id] ?? []).includes(qIdx);
            return (
              <button
                type="button"
                className={`${styles.flagBtn} ${isFlagged ? styles.flagOn : ''}`}
                aria-pressed={isFlagged}
                onClick={() => toggleFlag(bank.id, qIdx)}
              >
                {isFlagged ? '★' : '☆'} {t(isFlagged ? 'study.flagged' : 'study.flag')}
              </button>
            );
          })()}
      </div>
      <ProgressBar percent={Math.round((i / queue.length) * 100)} />
      <h2 className={styles.qText}>{q.q}</h2>
      <ul className={styles.options}>
        {q.options.map((opt, idx) => {
          const state =
            picked == null
              ? ''
              : idx === q.answer
                ? styles.correct
                : idx === picked
                  ? styles.incorrect
                  : '';
          return (
            <li key={idx}>
              <button
                type="button"
                className={`${styles.option} ${state}`}
                onClick={() => choose(idx)}
                disabled={picked != null}
              >
                <span className={styles.optionKey} aria-hidden="true">
                  {'ABCD'[idx]}
                </span>
                {opt}
              </button>
            </li>
          );
        })}
      </ul>
      {picked != null && (
        <div className={styles.explain}>
          <p>
            <strong>{t('study.explanation')}:</strong> {q.explain}
          </p>
          <p className={styles.src}>
            {t('study.source')}: {bank.source}
          </p>
          <button type="button" className={styles.primary} onClick={next}>
            {i + 1 >= queue.length ? t('study.finish') : t('study.next')}
          </button>
        </div>
      )}
    </Shell>
  );
}

/** Page back through every answered question with the user's pick + explanation. */
function ReviewWalkthrough({
  bank,
  queue,
  answers,
  onBack,
}: {
  bank: QuizBank;
  queue: QuizQuestion[];
  answers: number[];
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [i, setI] = useState(0);
  const q = queue[i];
  const picked = answers[i];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, queue.length - 1));
      else if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [queue.length]);

  return (
    <Shell>
      <button type="button" className={styles.back} onClick={onBack}>
        ← {t('study.back')}
      </button>
      <p className={styles.qProgress} role="status" aria-live="polite">
        {t('study.question', { n: i + 1, total: queue.length })}
      </p>
      <h2 className={styles.qText}>{q.q}</h2>
      <ul className={styles.options}>
        {q.options.map((opt, idx) => {
          const state = idx === q.answer ? styles.correct : idx === picked ? styles.incorrect : '';
          return (
            <li key={idx}>
              <span className={`${styles.option} ${state}`}>
                <span className={styles.optionKey} aria-hidden="true">
                  {'ABCD'[idx]}
                </span>
                {opt}
              </span>
            </li>
          );
        })}
      </ul>
      <div className={styles.explain}>
        <p>
          <strong>{t('study.explanation')}:</strong> {q.explain}
        </p>
        <p className={styles.src}>
          {t('study.source')}: {bank.source}
        </p>
      </div>
      <div className={styles.resultActions}>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => setI((n) => Math.max(n - 1, 0))}
          disabled={i === 0}
        >
          ← {t('study.prev')}
        </button>
        <button
          type="button"
          className={styles.primary}
          onClick={() => setI((n) => Math.min(n + 1, queue.length - 1))}
          disabled={i + 1 >= queue.length}
        >
          {t('study.next')} →
        </button>
      </div>
    </Shell>
  );
}
