import { useTranslation } from 'react-i18next';
import { fmtInt } from '@/components/calc/format';
import type { FlightState } from '@/calc/hud/types';
import { AttitudeIndicator } from './AttitudeIndicator';
import { waypointName } from './waypointName';
import styles from './hud.module.css';

interface FlightDetailProps {
  flight: FlightState | null;
  onRecenter: () => void;
}

const signed = (n: number): string => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(1)}°`;

/**
 * The selected-flight card: phase badge, route, the four stat tiles and the
 * live attitude indicator. The card springs in per selection via a keyed CSS
 * animation (deliberately not framer-motion — keeping this page off framer
 * preserves the entry-chunk graph and the check:bundle budget); reduced motion
 * drops the entrance. An empty state points at the list/globe when nothing is
 * selected.
 */
export function FlightDetail({ flight, onRecenter }: FlightDetailProps) {
  const { t } = useTranslation();
  return (
    <section className={styles.panel} aria-labelledby="hud-flight-head">
      <div className={styles.panelHead}>
        <h2 id="hud-flight-head" className={styles.panelTitle}>
          {t('hud.flight.title')}
        </h2>
        {flight && <span className={styles.phaseBadge}>{t(`hud.phase.${flight.phase}`)}</span>}
      </div>
      {!flight ? (
        <p className={styles.flightEmpty}>{t('hud.flight.empty')}</p>
      ) : (
        // Keyed by flight id so a new selection re-runs the entrance animation.
        <div key={flight.id} className={styles.flightCard}>
          <p className={styles.flightIdent}>
            <bdi dir="ltr" className={styles.flightCallsign}>
              {flight.callsign}
            </bdi>
            <span className={styles.kindChip}>{t(`hud.fleet.${flight.kind}`)}</span>
          </p>
          <p className={styles.flightRoute}>
            {t('hud.list.route', {
              from: waypointName(flight.fromCode, t),
              to: waypointName(flight.toCode, t),
            })}
          </p>
          <dl className={styles.tiles}>
            <div className={styles.tile}>
              <dt>{t('hud.flight.altitude')}</dt>
              <dd>
                <bdi dir="ltr" className={styles.tileCyan}>
                  {fmtInt(flight.altFt)} <small>{t('hud.units.ft')}</small>
                </bdi>
              </dd>
            </div>
            <div className={styles.tile}>
              <dt>{t('hud.flight.groundSpeed')}</dt>
              <dd>
                <bdi dir="ltr">
                  {Math.round(flight.gsKt)} <small>{t('hud.units.kts')}</small>
                </bdi>
              </dd>
            </div>
            <div className={styles.tile}>
              <dt>{t('hud.flight.type')}</dt>
              <dd>
                <bdi dir="ltr">{flight.typeDesignator}</bdi>
              </dd>
            </div>
            <div className={styles.tile}>
              <dt>{t('hud.flight.squawk')}</dt>
              <dd>
                <bdi dir="ltr" className={styles.tileGold}>
                  {flight.squawk}
                </bdi>
              </dd>
            </div>
          </dl>
          <div className={styles.attitudeRow}>
            <div className={styles.attitudeText}>
              <p>
                {t('hud.flight.pitch')}: <bdi dir="ltr">{signed(flight.pitchDeg)}</bdi>
              </p>
              <p>
                {t('hud.flight.roll')}: <bdi dir="ltr">{signed(flight.bankDeg)}</bdi>
              </p>
            </div>
            <AttitudeIndicator pitchDeg={flight.pitchDeg} bankDeg={flight.bankDeg} />
            <p className={styles.srOnly}>
              {t('hud.flight.attitude', {
                pitch: flight.pitchDeg.toFixed(1),
                bank: flight.bankDeg.toFixed(1),
              })}
            </p>
          </div>
          <button type="button" className={styles.recenter} onClick={onRecenter}>
            {t('hud.flight.recenter')}
          </button>
        </div>
      )}
    </section>
  );
}
