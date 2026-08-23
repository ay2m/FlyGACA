import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import type { GroundSchoolData, QuizData } from '@/lib/content';
import { useStudyProgress } from '@/lib/studyProgress';
import { masteredCount, dueCount } from '@/calc/study/srs';
import { glidePathBins, mergeBins } from '@/calc/study/glidePath';
import { GlidePathStrip } from '@/components/study/GlidePathStrip';
import { ResultStat } from '@/components/calc/ResultStat';
import { OutputGrid } from '@/components/calc/Grids';
import { ProgressBar } from '@/components/ProgressBar';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import styles from './Study.module.css';

// eslint-disable-next-line react-refresh/only-export-components
export const STUDY_MODES = [
  { to: '/study/quiz', key: 'quiz', icon: '◉' },
  { to: '/study/flashcards', key: 'flashcards', icon: '⇄' },
  { to: '/study/groundschool', key: 'groundschool', icon: '◈' },
  { to: '/study/exam', key: 'exam', icon: '◎' },
  { to: '/study/paths', key: 'paths', icon: '▷' },
  { to: '/study/packs', key: 'packs', icon: '⊞' },
  { to: '/study/sheets', key: 'sheets', icon: '▤' },
] as const;

/**
 * The study dashboard: progress stats, weakest/by-topic/exam-history analytics,
 * quick-resume actions and the study-mode cards. Extracted from the former Study
 * hub so the Learn hub can render it under the shared SearchHero (Practice tab).
 */
export function StudyDashboard() {
  const { t } = useTranslation();
  const quiz = useFetchJson<QuizData>('/data/quiz.json');
  const gs = useFetchJson<GroundSchoolData>('/data/groundschool.json');
  const { quizBest, gsDone, fcSrs, streak, examHistory, flagged, lastBank } = useStudyProgress();

  const now = new Date();
  const banks = quiz.data?.banks ?? [];
  const keysFor = (n: number) => Array.from({ length: n }, (_, i) => String(i));
  const attempted = banks.filter((b) => quizBest[b.id] != null).length;
  const bestValues = banks.map((b) => quizBest[b.id]).filter((v): v is number => v != null);
  const avgBest = bestValues.length
    ? Math.round(bestValues.reduce((s, v) => s + v, 0) / bestValues.length)
    : 0;
  const totalCards = banks.reduce((s, b) => s + b.questions.length, 0);
  const knownCards = Object.values(fcSrs).reduce((s, m) => s + masteredCount(m), 0);
  const dueTotal = banks.reduce(
    (s, b) => s + dueCount(fcSrs[b.id] ?? {}, keysFor(b.questions.length), now),
    0,
  );
  const flaggedTotal = Object.values(flagged).reduce((s, a) => s + a.length, 0);

  const lessons = gs.data?.modules.flatMap((m) => m.lessons) ?? [];
  const doneLessons = lessons.filter((l) => gsDone[l.id]).length;

  // Lowest scores first (unattempted sorts first as "start here") — top 3 focus areas.
  const weakest = banks
    .map((b) => ({ b, best: quizBest[b.id] ?? -1 }))
    .sort((a, z) => a.best - z.best)
    .slice(0, 3);
  const resumeBank = banks.find((b) => b.id === lastBank);

  // The highest streak milestone reached, for a small celebratory nudge.
  const milestone = [365, 100, 30, 7].find((m) => streak.count >= m);

  const progressFor = (key: string): string | null => {
    if (key === 'quiz' && banks.length)
      return t('study.banksProgress', { done: attempted, total: banks.length });
    if (key === 'groundschool' && lessons.length)
      return t('study.lessonsProgress', { done: doneLessons, total: lessons.length });
    if (key === 'flashcards' && totalCards)
      return t('study.cardsProgress', { done: knownCards, total: totalCards });
    return null;
  };

  return (
    <>
      <OutputGrid>
        <ResultStat
          label={t('study.streak')}
          value={streak.count}
          sub={t('study.streakUnit')}
          tone={streak.count > 0 ? 'good' : undefined}
        />
        <ResultStat label={t('study.avgBest')} value={`${avgBest}%`} />
        <ResultStat
          label={t('study.dueToday')}
          value={dueTotal}
          tone={dueTotal > 0 ? 'headline' : undefined}
        />
        <ResultStat label={t('study.lessonsDone')} value={`${doneLessons}/${lessons.length}`} />
      </OutputGrid>

      {banks.length > 0 && (
        <GlidePathStrip
          bins={mergeBins(
            banks.map((b) => glidePathBins(fcSrs[b.id] ?? {}, keysFor(b.questions.length))),
          )}
        />
      )}

      {milestone && (
        <div className={styles.milestoneWrap} role="status">
          <CaptainAvatar size="md" pose="smile" decorative />
          <p className={styles.milestone}>{t('study.streakMilestone', { n: milestone })}</p>
        </div>
      )}

      {/* Quick actions: resume the last bank, drill the flagged review deck, clear due cards. */}
      {(resumeBank || flaggedTotal > 0 || dueTotal > 0) && (
        <div className={styles.quickRow}>
          {resumeBank && (
            <Link to={`/study/quiz?bank=${resumeBank.id}`} className={styles.quickChip}>
              {t('study.resume')}: {resumeBank.title}
            </Link>
          )}
          {dueTotal > 0 && (
            <Link to="/study/flashcards" className={styles.quickChip}>
              {t('study.dueToday')} · {dueTotal}
            </Link>
          )}
          {flaggedTotal > 0 && (
            <Link to="/study/quiz?review=flagged" className={styles.quickChip}>
              {t('study.reviewFlagged', { n: flaggedTotal })}
            </Link>
          )}
        </div>
      )}

      {attempted < banks.length && weakest.length > 0 && (
        <section className={styles.analytics}>
          <h2 className={styles.analyticsHead}>{t('study.weakest')}</h2>
          <ul className={styles.weakList}>
            {weakest.map(({ b, best }) => (
              <li key={b.id}>
                <Link to={`/study/quiz?bank=${b.id}`} className={styles.weakChip}>
                  {b.title}
                  <span className={styles.weakPct}>{best < 0 ? '—' : `${best}%`}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {bestValues.length > 0 && (
        <section className={styles.analytics}>
          <h2 className={styles.analyticsHead}>{t('study.byTopic')}</h2>
          <ul className={styles.topicList}>
            {banks
              .filter((b) => quizBest[b.id] != null)
              .map((b) => {
                const learned = masteredCount(fcSrs[b.id] ?? {});
                return (
                  <li key={b.id} className={styles.topicRow}>
                    <span className={styles.topicName}>{b.title}</span>
                    <ProgressBar percent={quizBest[b.id]} label={b.title} />
                    <span className={styles.topicMeta}>
                      {quizBest[b.id]}% · {t('study.masteredCount', { n: learned })}
                    </span>
                  </li>
                );
              })}
          </ul>
        </section>
      )}

      {examHistory.length > 0 && (
        <section className={styles.analytics}>
          <h2 className={styles.analyticsHead}>{t('study.examHistory')}</h2>
          <div className={styles.examBars} role="img" aria-label={t('study.examHistory')}>
            {examHistory.map((r, i) => (
              <span
                key={i}
                className={`${styles.examBar} ${r.passed ? styles.examBarPass : styles.examBarFail}`}
                style={{ blockSize: `${Math.max(8, r.pct)}%` }}
                title={`${r.pct}% · ${r.date}`}
              />
            ))}
          </div>
        </section>
      )}

      <ul className={`${styles.modes} stagger-grid`}>
        {STUDY_MODES.map((m) => {
          const prog = progressFor(m.key);
          return (
            <li key={m.key}>
              <Link to={m.to} className={styles.mode}>
                <span className={styles.modeIcon} aria-hidden="true">
                  {m.icon}
                </span>
                <h2>{t(`study.${m.key}`)}</h2>
                <p>{t(`study.${m.key}Desc`)}</p>
                {prog && <span className={styles.modeProgress}>{prog}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
