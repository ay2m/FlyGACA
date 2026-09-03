import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BentoCard } from '@/components/bento/BentoCard';
import { CardCta } from './CardCta';
import shared from './widgets.module.css';
import styles from './StudyStatsCard.module.css';

interface SRSStats {
  currentBox: number; // 0-5
  streak: number; // consecutive days
  masteredCount: number; // topics at box ≥3
  totalCount: number; // total topics
}

/**
 * Personal study stats dashboard tile — SRS box progress, streak counter,
 * and mastery % animated gauge. Displays cross-platform study state bound
 * to the same SRS semantics as the web app.
 */
export function StudyStatsCard() {
  const { t } = useTranslation();

  // TODO: Replace with actual hook/data binding (useStudyStats or similar)
  // For now, mock data demonstrates the component structure
  const stats: SRSStats = {
    currentBox: 2,
    streak: 7,
    masteredCount: 24,
    totalCount: 48,
  };

  const masteryPercent = Math.round((stats.masteredCount / stats.totalCount) * 100);

  return (
    <BentoCard span="wide" tone="cyan" to="/dashboard">
      <p className={shared.eyebrow}>{t('home.dashboard.progress.eyebrow')}</p>
      <h3 className={shared.heading}>{t('home.dashboard.progress.title')}</h3>

      <div className={styles.container}>
        {/* Section 1: SRS Box Progress (0-5) */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>{t('home.dashboard.progress.srsBoxes')}</p>
          <div
            className={styles.boxGrid}
            role="img"
            aria-label={t('home.dashboard.progress.srsProgress', { box: stats.currentBox })}
          >
            {[0, 1, 2, 3, 4, 5].map((box) => (
              <div
                key={box}
                className={`${styles.box} ${box <= stats.currentBox ? styles.boxFilled : styles.boxEmpty}`}
                aria-hidden="true"
              />
            ))}
          </div>
          <p className={styles.boxCaption}>
            {t('home.dashboard.progress.boxCaption', { current: stats.currentBox + 1, max: 6 })}
          </p>
        </div>

        {/* Section 2: Streak Counter */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>{t('home.dashboard.progress.streak')}</p>
          <div className={styles.streakBox}>
            <span
              className={styles.streakNumber}
              aria-label={t('home.dashboard.progress.streakAria', { days: stats.streak })}
            >
              {stats.streak}
            </span>
            <span className={styles.streakLabel}>{t('home.dashboard.progress.streakDays')}</span>
          </div>
        </div>

        {/* Section 3: Mastery % Gauge (animated) */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>{t('home.dashboard.progress.mastery')}</p>
          <div className={styles.gaugeContainer}>
            <div className={styles.gaugeTrack}>
              <motion.div
                className={styles.gaugeFill}
                initial={{ width: '0%' }}
                animate={{ width: `${masteryPercent}%` }}
                transition={{ type: 'spring', stiffness: 60, damping: 15, mass: 0.8 }}
                role="progressbar"
                aria-valuenow={masteryPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={t('home.dashboard.progress.masteryAria', { percent: masteryPercent })}
              />
            </div>
            <p className={styles.masteryPercent}>
              {masteryPercent}
              <span className={styles.percentSymbol}>%</span>
            </p>
          </div>
        </div>
      </div>

      <CardCta label={t('home.dashboard.progress.cta')} />
    </BentoCard>
  );
}
