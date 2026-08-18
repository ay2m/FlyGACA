import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { sunTimes } from '@/calc/sun';
import { pad2 } from '@/calc/zulu';
import styles from './DaylightStrip.module.css';

interface DaylightStripProps {
  lat: number;
  lon: number;
}

const fracOfDay = (d: Date | null): number | null =>
  d ? (d.getUTCHours() * 60 + d.getUTCMinutes()) / 1440 : null;
const pct = (n: number) => `${(Math.min(1, Math.max(0, n)) * 100).toFixed(1)}%`;
const hm = (d: Date | null) => (d ? `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}` : '');

/**
 * A day-length band for one aerodrome: night → civil twilight → daylight →
 * twilight → night across a 24-hour UTC axis, with a marker at the current
 * time. A quick "is it dark there now?" read for the airport's own latitude.
 * The axis is always LTR (a UTC timeline reads 00→24 left to right).
 */
export function DaylightStrip({ lat, lon }: DaylightStripProps) {
  const { t } = useTranslation();
  const now = new Date();
  const iso = now.toISOString().slice(0, 10);
  const times = sunTimes(new Date(`${iso}T12:00:00Z`), lat, lon);
  const rise = fracOfDay(times?.sunrise ?? null);
  const set = fracOfDay(times?.sunset ?? null);
  // Nothing sensible to draw without a sunrise and sunset (bad coords / polar).
  if (!times || rise == null || set == null) return null;
  const dawn = fracOfDay(times.civilDawn) ?? rise;
  const dusk = fracOfDay(times.civilDusk) ?? set;
  const nowFrac = (now.getUTCHours() * 60 + now.getUTCMinutes()) / 1440;

  return (
    <div className={styles.wrap}>
      <div
        className={styles.strip}
        role="img"
        aria-label={t('aerodromesTool.daylightAria', {
          rise: hm(times.sunrise),
          set: hm(times.sunset),
        })}
        style={
          {
            '--dawn': pct(dawn),
            '--rise': pct(rise),
            '--set': pct(set),
            '--dusk': pct(dusk),
          } as CSSProperties
        }
      >
        <span className={styles.now} style={{ '--now': pct(nowFrac) } as CSSProperties} />
      </div>
      <p className={styles.caption}>
        <bdi dir="ltr">↑ {hm(times.sunrise)}Z</bdi>
        <span className={styles.sep}>·</span>
        <bdi dir="ltr">↓ {hm(times.sunset)}Z</bdi>
      </p>
    </div>
  );
}
