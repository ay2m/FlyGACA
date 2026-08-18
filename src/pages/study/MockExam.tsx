import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import type { QuizData, QuizQuestion } from '@/lib/content';
import { setExamResult, useStudyProgress } from '@/lib/studyProgress';
import { usePageMeta } from '@/hooks/usePageMeta';
import { courseLd } from '@/lib/seo/jsonld';
import { useFeature } from '@/lib/services/features';
import { findPack, type Pack } from '@/lib/prepCatalog';
import { hasPackAccess } from '@/lib/services/packEntitlements';
import { useAccount } from '@/lib/services/account';
import { Disclaimer } from '@/components/Disclaimer';
import { UpsellCard } from '@/components/UpsellCard';
import { HubBackLink } from '@/components/HubBackLink';
import styles from './Study.module.css';

type ExamQuestion = QuizQuestion & { bank: string };

/** The exam config in force: quiz.json's defaults, overlaid with any per-pack override. */
function examConfig(data: QuizData, pack?: Pack) {
  return { ...data.exam, ...(pack?.exam ?? {}) };
}

/**
 * The exam question pool. In pack mode it draws only from the pack's banks (a focused,
 * per-certificate exam); otherwise from every bank (the all-topics mock).
 */
function pickQuestions(data: QuizData, pack?: Pack): ExamQuestion[] {
  const banks = pack ? data.banks.filter((b) => pack.bankIds.includes(b.id)) : data.banks;
  const all: ExamQuestion[] = banks.flatMap((b) =>
    b.questions.map((q) => ({ ...q, bank: b.title })),
  );
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(examConfig(data, pack).questions, all.length));
}

/** Per-bank correct/total tally for the post-exam breakdown. */
function byBank(questions: ExamQuestion[], answers: (number | null)[]) {
  const map = new Map<string, { correct: number; total: number }>();
  questions.forEach((q, idx) => {
    const row = map.get(q.bank) ?? { correct: 0, total: 0 };
    row.total += 1;
    if (answers[idx] === q.answer) row.correct += 1;
    map.set(q.bank, row);
  });
  return [...map.entries()].sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
}

export function MockExam() {
  const { t, i18n } = useTranslation();
  usePageMeta(
    t('meta.exam'),
    t('metaDesc.exam'),
    courseLd({
      title: t('meta.exam'),
      description: t('metaDesc.exam'),
      path: '/study/exam',
      lang: i18n.language,
    }),
  );
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useFetchJson<QuizData>('/data/quiz.json', reload);
  const { exam } = useStudyProgress();
  const { entitlement, ownedPacks } = useAccount();
  const [params] = useSearchParams();
  const [started, setStarted] = useState(false);

  // Pack mode (`?pack=`) draws a focused, per-certificate exam from that pack's banks
  // and gates on OWNING the pack (or a plan). The generic all-topics exam keeps the
  // existing `mock-exam` Pro feature gate.
  const pack = findPack(params.get('pack') ?? undefined);
  const packMode = !!pack && pack.status === 'live' && pack.bankIds.length > 0;
  const featurePro = useFeature('mock-exam');
  const canStart = packMode ? hasPackAccess(pack, entitlement, ownedPacks) : featurePro;

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

  const cfg = examConfig(data, packMode ? pack : undefined);
  const title = packMode ? t(`study.packCatalog.${pack.id}.name`) : t('study.exam');

  if (!started) {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <HubBackLink to="/learn?tab=practice" label={t('nav.learn')} />
        <h1>{title}</h1>
        <p className={styles.subtitle}>{t('study.examDesc')}</p>
        <p className={styles.qProgress}>{t('study.examPassMark', { n: cfg.passMark })}</p>
        {exam && (
          <p className={styles.lastResult}>
            {t('study.lastResult', { pct: exam.pct })}{' '}
            <span className={exam.passed ? styles.passed : styles.failed}>
              {exam.passed ? t('study.examPassed') : t('study.examFailed')}
            </span>
          </p>
        )}
        {canStart ? (
          <button type="button" className={styles.primary} onClick={() => setStarted(true)}>
            {t('study.examStart')}
          </button>
        ) : packMode ? (
          <div className={styles.examGate}>
            <p className={styles.examGateNote}>{t('study.packLockedNote')}</p>
            <Link
              to={`/study/packs/${pack.id}`}
              className={styles.primary}
              style={{ textDecoration: 'none' }}
            >
              {t('study.packView')}
            </Link>
          </div>
        ) : (
          <div className={styles.examGate}>
            <p className={styles.examGateNote}>{t('study.examProGate')}</p>
            <UpsellCard variant="inline" />
          </div>
        )}
        <Disclaimer compact />
      </section>
    );
  }

  return <Runner data={data} pack={packMode ? pack : undefined} />;
}

function Runner({ data, pack }: { data: QuizData; pack?: Pack }) {
  const { t } = useTranslation();
  const cfg = useMemo(() => examConfig(data, pack), [data, pack]);
  const questions = useMemo(() => pickQuestions(data, pack), [data, pack]);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  const [flags, setFlags] = useState<boolean[]>(() => questions.map(() => false));
  const [seconds, setSeconds] = useState(cfg.minutes * 60);
  const [summary, setSummary] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setSeconds((s) => (s <= 1 ? (setDone(true), 0) : s - 1)), 1000);
    return () => clearInterval(id);
  }, [done]);

  const correct = answers.filter((a, idx) => a === questions[idx].answer).length;
  const answered = answers.filter((a) => a != null).length;
  const pct = Math.round((correct / questions.length) * 100);
  const passed = pct >= cfg.passMark;

  useEffect(() => {
    if (done) setExamResult({ pct, passed, date: new Date().toISOString() });
  }, [done, pct, passed]);

  const q = questions[i];
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  if (done) {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <div className={styles.result} role="status">
          {/* Decorative — the pass/fail line below carries the announcement. */}
          <span
            className={passed ? styles.stamp : `${styles.stamp} ${styles.stampFail}`}
            aria-hidden="true"
          >
            {passed ? t('study.stampPass') : t('study.stampFail')}
          </span>
          <p className={styles.resultPct}>{pct}%</p>
          <p>{t('study.scoreLine', { correct, total: questions.length })}</p>
          <p className={passed ? styles.passed : styles.failed}>
            {passed ? t('study.examPassed') : t('study.examFailed')}
          </p>
        </div>
        <div className={styles.breakdown}>
          <h2 className={styles.reviewHead}>{t('study.byTopic')}</h2>
          <ul className={styles.breakdownList}>
            {byBank(questions, answers).map(([title, row]) => (
              <li key={title} className={styles.breakdownRow}>
                <span className={styles.breakdownName}>{title}</span>
                <span className={styles.breakdownScore}>
                  {row.correct}/{row.total}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className={styles.review}>
          <h2 className={styles.reviewHead}>{t('study.reviewAnswers')}</h2>
          <ul className={styles.reviewList}>
            {questions.map((item, idx) => {
              const a = answers[idx];
              const ok = a === item.answer;
              return (
                <li
                  key={idx}
                  className={`${styles.reviewItem} ${ok ? styles.reviewOk : styles.reviewBad}`}
                >
                  <p className={styles.reviewQ}>
                    {idx + 1}. {item.q}
                  </p>
                  <p className={styles.reviewA}>✓ {item.options[item.answer]}</p>
                  {!ok && (
                    <p className={styles.reviewYours}>
                      {a == null ? t('study.noAnswer') : `✗ ${item.options[a]}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    );
  }

  function answer(opt: number) {
    setAnswers((a) => a.map((v, idx) => (idx === i ? opt : v)));
  }

  // Pre-submit answer summary: jump to any question, see answered/flagged status.
  if (summary) {
    return (
      <section className={`container-narrow ${styles.page}`}>
        <h2 className={styles.qText}>{t('study.summaryTitle')}</h2>
        <p className={styles.qProgress}>
          {t('study.answered', { n: answered, total: questions.length })}
        </p>
        <div className={styles.summaryGrid} role="list">
          {questions.map((_, idx) => (
            <button
              key={idx}
              type="button"
              role="listitem"
              className={`${styles.summaryCell} ${answers[idx] != null ? styles.summaryDone : ''} ${
                flags[idx] ? styles.summaryFlag : ''
              }`}
              style={{ '--cell-i': idx } as CSSProperties}
              aria-label={`${idx + 1}${flags[idx] ? ' ⚑' : ''}`}
              onClick={() => {
                setI(idx);
                setSummary(false);
              }}
            >
              {idx + 1}
            </button>
          ))}
        </div>
        <div className={styles.examNav}>
          <button type="button" className={styles.secondary} onClick={() => setSummary(false)}>
            ← {t('study.back')}
          </button>
          <button type="button" className={styles.primary} onClick={() => setDone(true)}>
            {t('study.submitExam')}
          </button>
        </div>
      </section>
    );
  }

  const timerClass = seconds <= 60 ? styles.timerDanger : seconds <= 300 ? styles.timerWarn : '';

  return (
    <section className={`container-narrow ${styles.page}`}>
      <div className={styles.examBar}>
        <span>
          {t('study.question', { n: i + 1, total: questions.length })} ·{' '}
          {t('study.answered', { n: answered, total: questions.length })}
        </span>
        <span
          className={`${styles.timer} ${timerClass}`}
          role="timer"
          aria-label={t('study.examTimeLeft')}
        >
          {/* Depleting fuel bar; the mm:ss text stays the accessible value. */}
          <span className={styles.fuelTrack} aria-hidden="true">
            <span
              className={styles.fuelLevel}
              style={{
                inlineSize: `${((seconds / Math.max(1, cfg.minutes * 60)) * 100).toFixed(1)}%`,
              }}
            />
          </span>
          {t('study.examTimeLeft')}: {mm}:{ss}
        </span>
      </div>
      <div className={styles.examQHead}>
        <h2 className={styles.qText}>{q.q}</h2>
        <button
          type="button"
          className={`${styles.flagBtn} ${flags[i] ? styles.flagOn : ''}`}
          aria-pressed={flags[i]}
          onClick={() => setFlags((f) => f.map((v, idx) => (idx === i ? !v : v)))}
        >
          ⚑ {flags[i] ? t('study.flagged') : t('study.flag')}
        </button>
      </div>
      <ul className={styles.options}>
        {q.options.map((opt, idx) => (
          <li key={idx}>
            <button
              type="button"
              className={`${styles.option} ${answers[i] === idx ? styles.picked : ''}`}
              onClick={() => answer(idx)}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.examNav}>
        {i > 0 && (
          <button
            type="button"
            className={styles.option}
            onClick={() => setI(i - 1)}
            style={{ inlineSize: 'auto' }}
          >
            ←
          </button>
        )}
        {i + 1 < questions.length ? (
          <button type="button" className={styles.primary} onClick={() => setI(i + 1)}>
            {t('study.next')}
          </button>
        ) : (
          <button type="button" className={styles.primary} onClick={() => setSummary(true)}>
            {t('study.reviewSubmit')}
          </button>
        )}
      </div>
    </section>
  );
}
