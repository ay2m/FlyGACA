import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import { FieldGrid } from '@/components/calc/Grids';
import { useUrlState } from '@/hooks/useUrlState';
import { useFetchJson } from '@/hooks/useFetchJson';
import type { AirportsIndex } from '@/lib/content';
import styles from './MetBrief.module.css';

/**
 * A route weather *briefing builder* — not a weather provider. We never
 * fabricate METAR/TAF figures; instead, for each aerodrome on the route we
 * deep-link to the official source (aviationweather.gov) and prefill our own
 * decoders. Honest, dependency-free, and needs no new CSP connect-src origin.
 */
export function MetBrief() {
  const { t } = useTranslation();
  const { data, loading, error } = useFetchJson<AirportsIndex>('/data/airports.json');
  const [inputs, set] = useUrlState({ route: '' });

  const byIcao = useMemo(() => {
    const m = new Map<string, AirportsIndex['airports'][number]>();
    data?.airports.forEach((a) => m.set(a.icao, a));
    return m;
  }, [data]);

  const codes = inputs.route.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const icaos = codes.filter((c) => /^[A-Z]{4}$/.test(c));
  const unknown = icaos.filter((c) => byIcao.size > 0 && !byIcao.has(c));

  const metarUrl = (icao: string) =>
    `https://aviationweather.gov/api/data/metar?ids=${icao}&format=raw`;
  const tafUrl = (icao: string) =>
    `https://aviationweather.gov/api/data/taf?ids=${icao}&format=raw`;

  return (
    <CalcShell
      title={t('tools.items.met-brief.name')}
      intro={t('tools.items.met-brief.blurb')}
      category={t('tools.categories.atmosphere-weather')}
      formula={t('metBrief.note')}
      onExample={() => set('route', 'OERK OEJN OEDF')}
      adelPrompt={() => (icaos.length ? t('metBrief.adel', { route: icaos.join(' ') }) : null)}
      related={[
        { to: '/tools/metar', label: t('tools.items.metar.name') },
        { to: '/tools/taf', label: t('tools.items.taf.name') },
        { to: '/tools/notam', label: t('tools.items.notam.name') },
      ]}
    >
      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}
      <FieldGrid>
        <TextField
          label={t('metBrief.routeLabel')}
          value={inputs.route}
          onChange={(v) => set('route', v.toUpperCase())}
          placeholder="OERK OEJN OEDF"
          hint={t('metBrief.routeHint')}
        />
      </FieldGrid>

      {unknown.length > 0 && (
        <p className={styles.warn}>
          {t('metBrief.unknown')} {unknown.join(', ')}
        </p>
      )}

      {icaos.length === 0 ? (
        <p className={styles.empty}>{t('metBrief.empty')}</p>
      ) : (
        <ul className={styles.stops}>
          {icaos.map((icao) => {
            const ap = byIcao.get(icao);
            return (
              <li key={icao} className={styles.stop}>
                <div className={styles.stopHead}>
                  <span className={styles.icao}>{icao}</span>
                  {ap && <span className={styles.name}>{ap.name_en}</span>}
                </div>
                <div className={styles.links}>
                  <a href={metarUrl(icao)} target="_blank" rel="noopener">
                    {t('metBrief.metar')}
                  </a>
                  <a href={tafUrl(icao)} target="_blank" rel="noopener">
                    {t('metBrief.taf')}
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className={styles.source}>{t('metBrief.sourceNote')}</p>
    </CalcShell>
  );
}
