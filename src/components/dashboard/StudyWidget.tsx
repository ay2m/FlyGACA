import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { BarSparkline } from './BarSparkline';
import { dayStr, useStudyProgress } from '@/lib/studyProgress';
import { isDue } from '@/calc/study/srs';
import styles from './dashboard-widgets.module.css';

/**
 * Ground-school progress at a glance: daily streak (dimmed when today hasn't
 * been studied yet), cards due for review, the last practice-exam score and a
 * sparkline of recent exam results.
 *
 * Due cards are counted over *seen* SRS entries only — computing the true
 * total would require loading the question banks, which must never enter the
 * dashboard chunk (bundle budget).
 */
export function StudyWidget() {
  const { t } = useTranslation();
  const study = useStudyProgress();
  const now = new Date();
  const streakToday = study.streak.day === dayStr(now);
  const due = Object.values(study.fcSrs).reduce(
    (sum, bank) => sum + Object.values(bank).filter((e) => isDue(e, now)).length,
    0,
  );
  const hasActivity = study.streak.count > 0 || study.exam !== null || due > 0;

  return (
    <>
      <div className={styles.head}>
        <h2>{t('dashboard.widgets.study.title')}</h2>
        <Link to="/study" className={styles.headLink}>
          {t('dashboard.widgets.study.open')}
        </Link>
      </div>
      {hasActivity ? (
        <>
          <div className={styles.statRow}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>{t('dashboard.widgets.study.streak')}</span>
              <span className={styles.statValue} data-dim={streakToday ? undefined : 'true'}>
                <bdi dir="ltr">{study.streak.count}</bdi>
              </span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>{t('dashboard.widgets.study.due')}</span>
              <span className={`${styles.statValue} ${due > 0 ? styles.statWarn : ''}`}>
                <bdi dir="ltr">{due}</bdi>
              </span>
            </div>
            {study.exam && (
              <div className={styles.stat}>
                <span className={styles.statLabel}>{t('dashboard.widgets.study.lastExam')}</span>
                <span
                  className={`${styles.statValue} ${study.exam.passed ? styles.statGood : styles.statWarn}`}
                >
                  <bdi dir="ltr">{study.exam.pct}%</bdi>
                </span>
              </div>
            )}
          </div>
          {study.examHistory.length > 1 && (
            <BarSparkline
              bars={study.examHistory.map((r, i) => ({ label: `#${i + 1}`, value: r.pct }))}
              title={t('dashboard.widgets.study.lastExam')}
            />
          )}
          {study.lastBank && (
            <Link to={`/study/quiz?bank=${study.lastBank}`} className={styles.emptyCta}>
              {t('dashboard.widgets.study.resume')}
            </Link>
          )}
        </>
      ) : (
        <p className={styles.empty}>
          {t('dashboard.widgets.study.empty')}{' '}
          <Link to="/study/quiz" className={styles.emptyCta}>
            {t('dashboard.widgets.study.open')}
          </Link>
        </p>
      )}
    </>
  );
}
