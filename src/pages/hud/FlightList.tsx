import { useTranslation } from 'react-i18next';
import { fmtInt } from '@/components/calc/format';
import type { FlightState } from '@/calc/hud/types';
import { waypointName } from './waypointName';
import styles from './hud.module.css';

interface FlightListProps {
  states: FlightState[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

/**
 * The "airspace vector list" — the accessible face of the simulation. Rows are
 * real buttons in a fixed scenario order (values change in place, entries never
 * reshuffle), so keyboard and screen-reader users get everything the canvas
 * shows and selection works without touching the globe at all.
 */
export function FlightList({ states, selectedId, onSelect }: FlightListProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.listSection} aria-labelledby="hud-list-head">
      <div className={styles.listHead}>
        <h2 id="hud-list-head" className={styles.panelTitle}>
          {t('hud.list.title')}
        </h2>
        <span className={styles.listNote}>{t('hud.list.note')}</span>
      </div>
      {states.length === 0 ? (
        <p className={styles.listEmpty}>{t('hud.list.empty')}</p>
      ) : (
        <ul className={`${styles.list} stagger-grid`}>
          {states.map((s) => {
            const from = waypointName(s.fromCode, t);
            const to = waypointName(s.toCode, t);
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className={styles.row}
                  aria-pressed={s.id === selectedId}
                  aria-label={t('hud.list.select', { callsign: s.callsign, from, to })}
                  onClick={() => onSelect(s.id)}
                >
                  <span className={styles.rowMain}>
                    <span className={styles.rowTop}>
                      <bdi dir="ltr" className={styles.callsign}>
                        {s.callsign}
                      </bdi>
                      <span className={styles.kindChip}>{t(`hud.fleet.${s.kind}`)}</span>
                    </span>
                    <span className={styles.route}>{t('hud.list.route', { from, to })}</span>
                  </span>
                  <span className={styles.rowStats}>
                    <bdi dir="ltr" className={styles.rowAlt}>
                      {fmtInt(s.altFt)} {t('hud.units.ft')}
                    </bdi>
                    <bdi dir="ltr" className={styles.rowGs}>
                      {Math.round(s.gsKt)} {t('hud.units.kts')}
                    </bdi>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
