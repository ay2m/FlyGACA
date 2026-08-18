import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '@/components/Disclaimer';
import { useFetchJson } from '@/hooks/useFetchJson';
import { usePageMeta } from '@/hooks/usePageMeta';
import { breadcrumbLd } from '@/lib/seo/jsonld';
import type { AirspacesIndex } from '@/lib/content';
import { pad2 } from '@/calc/zulu';
import { stateAll, trendPct } from '@/calc/hud/kinematics';
import { DEFAULT_SEED, buildScenario, simTimeAt } from '@/calc/hud/scenario';
import { sectorReport } from '@/calc/hud/sectors';
import type { FlightState, Scenario } from '@/calc/hud/types';
import { FlightDetail } from './FlightDetail';
import { FlightList } from './FlightList';
import { GlobeCanvas, type FleetFilter, type HudMode } from './GlobeCanvas';
import { HudTicker } from './HudTicker';
import { PermitCta } from './PermitCta';
import { StatPanel } from './StatPanel';
import shared from './hud.module.css';
import styles from './Hud.module.css';

/** One 1 Hz snapshot of the world — everything the DOM widgets render from. */
interface Snap {
  date: Date;
  states: FlightState[];
  active: number;
  trend: number;
  density: number;
  status: 'safe' | 'busy';
  occupancy: Record<string, number>;
}

function makeSnap(scenario: Scenario): Snap {
  const date = new Date();
  const simMs = simTimeAt(date.getTime());
  const states = stateAll(scenario, simMs);
  const report = sectorReport(scenario, states);
  return {
    date,
    states,
    active: states.length,
    trend: trendPct(scenario, simMs),
    density: report.densityPct,
    status: report.status,
    occupancy: report.occupancy,
  };
}

const FILTERS: FleetFilter[] = ['all', 'commercial', 'drone'];

/**
 * The Interactive Kingdom Airspace HUD — a fully client-side, deterministic
 * **training scenario** over real Saudi geography (aerodrome coordinates and
 * AIP CTR/TMA zones), never real traffic and never attributed to a real
 * operator. The canvas animates at frame rate from closed-form flight states;
 * this page owns a 1 Hz snapshot (paused while the tab is hidden) that feeds
 * the ticker, stats, vector list and flight card.
 */
export function Hud() {
  const { t } = useTranslation();
  const scenario = useMemo(() => buildScenario(DEFAULT_SEED), []);
  const { data: airspaces } = useFetchJson<AirspacesIndex>('/data/airspaces-index.json');

  const [mode, setMode] = useState<HudMode>('globe');
  const [filter, setFilter] = useState<FleetFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [recenterToken, setRecenterToken] = useState(0);
  const [snap, setSnap] = useState<Snap>(() => makeSnap(scenario));

  usePageMeta(t('meta.hud'), t('metaDesc.hud'), [
    breadcrumbLd([
      { name: t('nav.breadcrumbHome'), path: '/' },
      { name: t('hud.title'), path: '/hud' },
    ]),
  ]);

  // The 1 Hz world clock — wall-anchored sim time means pausing while hidden
  // costs nothing: the next snapshot simply catches up.
  useEffect(() => {
    let id = window.setInterval(() => setSnap(makeSnap(scenario)), 1000);
    const onVisibility = () => {
      window.clearInterval(id);
      if (!document.hidden) {
        setSnap(makeSnap(scenario));
        id = window.setInterval(() => setSnap(makeSnap(scenario)), 1000);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [scenario]);

  const filtered = useMemo(
    () =>
      snap.states.filter((s) =>
        filter === 'all' ? true : filter === 'commercial' ? s.kind === 'jet' : s.kind === 'drone',
      ),
    [snap.states, filter],
  );

  const selected = snap.states.find((s) => s.id === selectedId) ?? null;

  // The overlay chip tracks the busiest sector right now.
  const peakSector = useMemo(() => {
    let best = scenario.sectors[0];
    let bestLoad = -1;
    for (const sector of scenario.sectors) {
      const load = (snap.occupancy[sector.id] ?? 0) / sector.capacity;
      if (load > bestLoad) {
        bestLoad = load;
        best = sector;
      }
    }
    return best;
  }, [scenario, snap.occupancy]);

  const utc = `${pad2(snap.date.getUTCHours())}:${pad2(snap.date.getUTCMinutes())}:${pad2(snap.date.getUTCSeconds())}`;

  const selectFromList = (id: string) => {
    setSelectedId(id);
    setRecenterToken((n) => n + 1);
  };

  return (
    <div className={styles.page}>
      <div className="container">
        <header className={styles.hero}>
          <div className={styles.heroTop}>
            <span className={styles.badge}>
              <span className={styles.badgeDot} aria-hidden="true" />
              {t('hud.badge')}
            </span>
            <span className={styles.clock}>
              <span className={styles.clockLabel}>{t('hud.utcLabel')}</span>
              <bdi dir="ltr" className={styles.clockValue}>
                {utc}
              </bdi>
            </span>
          </div>
          <p className={styles.eyebrow}>{t('hud.eyebrow')}</p>
          <h1 className={styles.title}>{t('hud.title')}</h1>
          <p className={styles.subtitle}>{t('hud.subtitle')}</p>
          <p className={styles.simNote} role="note">
            {t('hud.simNote')}
          </p>
          <div className={styles.controls}>
            <div className={styles.chipRow} role="group" aria-label={t('hud.filters.label')}>
              {FILTERS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={styles.filterChip}
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all'
                    ? t('hud.filters.all', { count: snap.active })
                    : t(`hud.filters.${f}`)}
                </button>
              ))}
            </div>
            <div className={styles.chipRow} role="group" aria-label={t('hud.mode.label')}>
              {(['globe', 'radar'] as HudMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.filterChip} ${styles.modeChip}`}
                  aria-pressed={mode === m}
                  onClick={() => setMode(m)}
                >
                  {t(`hud.mode.${m}`)}
                </button>
              ))}
            </div>
          </div>
        </header>
      </div>

      <HudTicker now={snap.date} seed={scenario.seed} />

      <div className={`container ${styles.board}`}>
        {/* Keyed by mode: remounting restarts the viewport's entry crossfade and
            gives the new projection a clean camera. */}
        <div className={styles.viewportCell} key={mode}>
          <GlobeCanvas
            scenario={scenario}
            zones={airspaces?.airspaces ?? []}
            mode={mode}
            filter={filter}
            selectedId={selectedId}
            onSelect={setSelectedId}
            recenterToken={recenterToken}
            sectorLabel={t(`hud.sectors.${peakSector.id}`)}
            bandLabel={`FL${peakSector.flBandLo}–FL${peakSector.flBandHi}`}
            statusLabel={t(`hud.sectors.${snap.status}`)}
            status={snap.status}
            activeFlights={snap.active}
          />
          <p className={styles.legend}>
            <span className={styles.legendCtr}>{t('hud.legend.ctr')}</span>
            <span className={styles.legendTma}>{t('hud.legend.tma')}</span>
            <span className={styles.legendCorridor}>{t('hud.legend.corridor')}</span>
          </p>
        </div>
        <aside className={styles.rail}>
          <StatPanel
            active={snap.active}
            trendPct={snap.trend}
            densityPct={snap.density}
            fleetSize={scenario.flights.length}
          />
          <FlightDetail flight={selected} onRecenter={() => setRecenterToken((n) => n + 1)} />
        </aside>
      </div>

      <div className={`container ${styles.below}`}>
        <FlightList states={filtered} selectedId={selectedId} onSelect={selectFromList} />
        <PermitCta />
        <div className={shared.disclaimerSlot}>
          <Disclaimer />
        </div>
      </div>
    </div>
  );
}
