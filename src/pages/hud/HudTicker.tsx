import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { parseMetar } from '@/calc/metar';
import { TICKER_STATIONS, composeSimMetar } from '@/calc/hud/simMetar';
import { describeWind } from '@/lib/wxText';
import styles from './HudTicker.module.css';

interface HudTickerProps {
  /** Wall-clock instant from the page's 1 Hz snapshot. */
  now: Date;
  seed: number;
}

/**
 * The station-weather marquee. Every report is composed by the simulation
 * (deterministic per station and hour) and each item carries a SIM chip — this
 * band never shows real weather. Track duplication + the mirrored RTL keyframe
 * follow the Home marquee; reduced motion wraps the items into a static row.
 */
export function HudTicker({ now, seed }: HudTickerProps) {
  const { t } = useTranslation();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const hour = now.getUTCHours();

  // Re-rolls once per UTC hour (and on language switch, for the decoded text).
  const items = useMemo(
    () =>
      TICKER_STATIONS.map((icao) => {
        const raw = composeSimMetar(icao, { month, day, hour }, seed);
        const report = parseMetar(raw);
        return { icao, raw, wind: describeWind(report.wind, t) };
      }),
    [month, day, hour, seed, t],
  );

  const row = (keyPrefix: string, hidden: boolean) => (
    <ul className={styles.group} aria-hidden={hidden || undefined}>
      {items.map((it) => (
        <li key={`${keyPrefix}-${it.icao}`} className={styles.item}>
          <span className={styles.sim}>{t('hud.ticker.sim')}</span>
          <b className={styles.station}>
            {t(`hud.airports.${it.icao}`, { defaultValue: it.icao })}
          </b>
          <bdi dir="ltr" className={styles.raw}>
            {it.raw}
          </bdi>
          <span className={styles.decoded}>{it.wind}</span>
          <span className={styles.sep} aria-hidden="true" />
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.ticker} role="marquee" aria-label={t('hud.ticker.label')}>
      <div className={styles.track}>
        {row('a', false)}
        {/* Duplicate copy makes the loop seamless; hidden from AT to avoid echo. */}
        {row('b', true)}
      </div>
    </div>
  );
}
