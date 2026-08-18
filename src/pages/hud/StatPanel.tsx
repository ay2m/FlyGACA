import { useTranslation } from 'react-i18next';
import { CountUp } from '@/components/CountUp';
import { fmtInt } from '@/components/calc/format';
import styles from './hud.module.css';

interface StatPanelProps {
  active: number;
  trendPct: number;
  densityPct: number;
  fleetSize: number;
}

/** The ACTIVE FLIGHTS stat card: animated count, trend and sector density bar. */
export function StatPanel({ active, trendPct, densityPct, fleetSize }: StatPanelProps) {
  const { t } = useTranslation();
  const trend = Math.round(trendPct * 10) / 10;
  const up = trend >= 0;
  return (
    <section className={styles.panel} aria-labelledby="hud-stats-head">
      <div className={styles.panelHead}>
        <h2 id="hud-stats-head" className={styles.panelTitle}>
          {t('hud.stats.active')}
        </h2>
        <span className={styles.simChip}>{t('hud.ticker.sim')}</span>
      </div>
      <p className={styles.statRow}>
        <span className={styles.statBig}>
          <CountUp to={active} />
        </span>
        <span className={`${styles.trend} ${up ? styles.trendUp : styles.trendDown}`}>
          <bdi dir="ltr">
            {up ? '▲' : '▼'} {up ? '+' : ''}
            {trend}%
          </bdi>
        </span>
      </p>
      <p className={styles.trendNote}>{t('hud.stats.trend', { min: 10 })}</p>
      <div className={styles.capacityBar} aria-hidden="true">
        <div className={styles.capacityFill} style={{ inlineSize: `${densityPct}%` }} />
      </div>
      <p className={styles.capacityMeta}>
        <span>{t('hud.stats.capacity', { n: fmtInt(fleetSize) })}</span>
        <span className={styles.density}>{t('hud.stats.density', { pct: densityPct })}</span>
      </p>
    </section>
  );
}
