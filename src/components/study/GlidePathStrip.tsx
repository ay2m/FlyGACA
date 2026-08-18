import { useTranslation } from 'react-i18next';
import { MASTERY_BOX, glideProgress, type GlidePathBins } from '@/calc/study/glidePath';
import styles from './GlidePathStrip.module.css';

interface GlidePathStripProps {
  bins: GlidePathBins;
}

/**
 * The SRS "glide path": each Leitner stage is a stop along a descending
 * approach to the runway (mastery), and the aircraft marker rides the slope
 * at the deck's mean progress. Purely a read-model view — the figcaption
 * carries the accessible summary, the slope/marker/stage row is decorative.
 */
export function GlidePathStrip({ bins }: GlidePathStripProps) {
  const { t } = useTranslation();
  if (bins.total <= 0) return null;
  const progress = glideProgress(bins);
  const stages = [bins.fresh, ...bins.boxes];
  return (
    <figure className={styles.strip}>
      <figcaption className={styles.head}>
        <span className={styles.title}>{t('study.glidePath.title')}</span>
        <span className={styles.summary}>
          {t('study.glidePath.summary', {
            total: bins.total,
            fresh: bins.fresh,
            mastered: bins.mastered,
          })}
        </span>
      </figcaption>
      <div className={styles.track} aria-hidden="true">
        <svg className={styles.slope} viewBox="0 0 100 28" preserveAspectRatio="none">
          <line x1="1" y1="4" x2="92" y2="22" className={styles.slopeLine} />
          <line x1="92" y1="22" x2="99" y2="22" className={styles.runway} />
        </svg>
        <span
          className={styles.plane}
          style={{
            insetInlineStart: `${(progress * 100).toFixed(2)}%`,
            insetBlockStart: `${(14 + progress * 64).toFixed(2)}%`,
          }}
        >
          <svg viewBox="0 0 16 16" className={styles.planeGlyph}>
            <path d="M1 9.5 15 8 1 6.5l3 1.5-3 1.5Zm5.2-.9L15 8 6.2 7.4l1.6.6-1.6.6Z" />
            <path d="M15 8 3.5 3.8l2.9 3.4L3.5 12.2 15 8Z" />
          </svg>
        </span>
      </div>
      <ol className={styles.stages} aria-hidden="true">
        {stages.map((n, idx) => (
          <li
            key={idx}
            className={
              idx - 1 >= MASTERY_BOX ? `${styles.stage} ${styles.stageMastered}` : styles.stage
            }
          >
            <span className={styles.count}>{n}</span>
            <span className={styles.stageLabel}>
              {idx === 0 ? t('study.glidePath.newLabel') : String(idx)}
            </span>
          </li>
        ))}
      </ol>
      <p className={styles.destination} aria-hidden="true">
        {t('study.glidePath.masteredLabel')}
      </p>
    </figure>
  );
}
