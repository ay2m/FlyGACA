import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { clockAngles, formatHm, utcToKsa } from '@/calc/zulu';
import styles from './ZuluDial.module.css';

/** Twelve hour positions, every 30°. */
const TICKS = Array.from({ length: 12 }, (_, i) => i * 30);
const rot = (deg: number): CSSProperties => ({ transform: `rotate(${deg}deg)` });

/**
 * A live analog Zulu (UTC) clock with digital Zulu + KSA-local readouts.
 * Aviation runs on Zulu, so this is the ambient "what time is it really" dial;
 * the hands step once a second like a quartz movement (a live content update,
 * not a looping animation, so it's calm under reduced-motion too).
 */
export function ZuluDial() {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const hh = now.getUTCHours();
  const mm = now.getUTCMinutes();
  const ss = now.getUTCSeconds();
  const { hourDeg, minDeg, secDeg } = clockAngles(hh, mm, ss);
  const ksa = utcToKsa(hh, mm);

  return (
    <div className={styles.panel}>
      <svg viewBox="0 0 120 120" className={styles.face} role="img" aria-label={t('zulu.dialAria')}>
        <circle cx={60} cy={60} r={57} className={styles.bezel} />
        {TICKS.map((deg) => (
          <line
            key={deg}
            x1={60}
            y1={7}
            x2={60}
            y2={deg % 90 === 0 ? 15 : 12}
            className={deg % 90 === 0 ? styles.tickMajor : styles.tick}
            style={rot(deg)}
          />
        ))}
        <line x1={60} y1={62} x2={60} y2={32} className={styles.hour} style={rot(hourDeg)} />
        <line x1={60} y1={64} x2={60} y2={20} className={styles.min} style={rot(minDeg)} />
        <line x1={60} y1={68} x2={60} y2={16} className={styles.sec} style={rot(secDeg)} />
        <circle cx={60} cy={60} r={3.5} className={styles.cap} />
      </svg>
      <div className={styles.readout}>
        <span className={styles.zulu}>
          <bdi dir="ltr">{`${formatHm(hh, mm)}:${String(ss).padStart(2, '0')}Z`}</bdi>
        </span>
        <span className={styles.ksa}>
          <bdi dir="ltr">{ksa ? formatHm(ksa.hh, ksa.mm) : '—'}</bdi> {t('zulu.ksaLabel')}
        </span>
      </div>
    </div>
  );
}
