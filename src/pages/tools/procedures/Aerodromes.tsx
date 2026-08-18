import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import { useFetchJson } from '@/hooks/useFetchJson';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useUrlState } from '@/hooks/useUrlState';
import { fetchJson, type Airport, type AirportsIndex } from '@/lib/content';
import {
  REGION_FILTERS,
  inRegion,
  regionBadge,
  compareAirports,
  type RegionFilter,
} from '@/lib/aerodromes';
import { AerodromesHero } from '@/components/aerodrome/AerodromesHero';
import { AirportTypeIcon } from '@/components/aerodrome/AirportTypeIcon';
import styles from './Aerodromes.module.css';

const PAGE = 60;

export function Aerodromes() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const { data, error, loading } = useFetchJson<AirportsIndex>('/data/airports.json');
  // Search and region live in the URL so a filtered view is shareable; an empty
  // region means "all" (kept out of the query string to keep links clean).
  const [urlState, setUrl] = useUrlState({ q: '', region: '' });
  const region = (urlState.region || 'all') as RegionFilter;
  const [visible, setVisible] = useState(PAGE);
  const query = useDebouncedValue(urlState.q.trim(), 200);

  // The long tail (small strips, heliports — ~66k airfields) ships in a separate
  // file fetched lazily the first time a search or a region filter is active, so
  // the default "All" view only pays for the ~6k rich core. Mirrors the Library's
  // lazy search-index pattern.
  const needExtra = region !== 'all' || query.length > 0;
  const [extra, setExtra] = useState<Airport[] | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  useEffect(() => {
    if (!needExtra || extra || extraLoading) return;
    setExtraLoading(true);
    fetchJson<AirportsIndex>('/data/airports-extra.json')
      .then((d) => setExtra(d.airports))
      .catch(() => setExtra([]))
      .finally(() => setExtraLoading(false));
  }, [needExtra, extra, extraLoading]);

  const pool = useMemo(() => {
    const base = data?.airports ?? [];
    return extra ? base.concat(extra) : base;
  }, [data, extra]);

  const matches = useMemo(() => {
    if (!data) return [];
    const needle = query.toLowerCase();
    return pool
      .filter((a) => inRegion(a, region))
      .filter(
        (a) =>
          !needle ||
          a.icao.toLowerCase().includes(needle) ||
          a.iata.toLowerCase().includes(needle) ||
          a.name_en.toLowerCase().includes(needle) ||
          a.name_ar.includes(query) ||
          a.city_en.toLowerCase().includes(needle) ||
          (a.country_en?.toLowerCase().includes(needle) ?? false),
      )
      .sort(compareAirports);
  }, [data, pool, query, region]);

  const list = useMemo(() => matches.slice(0, visible), [matches, visible]);

  function pickRegion(next: RegionFilter) {
    setUrl('region', next === 'all' ? '' : next);
    setVisible(PAGE);
  }
  function onSearch(next: string) {
    setUrl('q', next);
    setVisible(PAGE);
  }

  const adelPrompt = () => {
    const term = urlState.q.trim();
    if (!term) return null;
    return ar
      ? `ما هي مدارج وترددات وخدمات مطار "${term}"؟`
      : `What are the runways, frequencies and services for the aerodrome "${term}"?`;
  };

  return (
    <CalcShell
      title={t('tools.items.aerodromes.name')}
      intro={t('tools.items.aerodromes.blurb')}
      category={t('tools.categories.procedures')}
      formula={t('aerodromesTool.formula')}
      adelPrompt={adelPrompt}
    >
      <AerodromesHero />
      <div className={styles.regions} role="group" aria-label={t('aerodromesTool.regionLabel')}>
        {REGION_FILTERS.map((r) => (
          <button
            key={r}
            type="button"
            className={`${styles.region} ${region === r ? styles.regionActive : ''}`}
            aria-pressed={region === r}
            onClick={() => pickRegion(r)}
          >
            {t(`aerodromesTool.regions.${r}`)}
          </button>
        ))}
      </div>

      <TextField
        label={t('aerodromesTool.search')}
        value={urlState.q}
        onChange={onSearch}
        placeholder="OERK"
      />

      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}
      {data && (
        <>
          <p className={styles.count}>
            {extraLoading
              ? t('aerodromesTool.searchingWorldwide')
              : region === 'all' && !query
                ? t('aerodromesTool.count', { n: matches.length })
                : matches.length > list.length
                  ? t('aerodromesTool.showing', { n: list.length, total: matches.length })
                  : t('aerodromesTool.matched', { n: matches.length })}
          </p>
          {list.length === 0 ? (
            <p className={styles.count}>{t('aerodromesTool.empty')}</p>
          ) : (
            <>
              <ul className={`${styles.list} stagger-grid`}>
                {list.map((a) => {
                  const badge = regionBadge(a);
                  return (
                    <li key={a.icao} className={styles.card}>
                      <Link
                        to={`/tools/aerodromes/${encodeURIComponent(a.icao)}`}
                        className={styles.cardLink}
                      >
                        <span className={styles.head}>
                          <AirportTypeIcon type={a.type} className={styles.cardTypeIcon} />
                          <span className={styles.icao}>{a.icao}</span>
                          {a.iata && <span className={styles.iata}>{a.iata}</span>}
                          <span
                            className={`${styles.badge} ${styles[`badge_${badge}`]}`}
                            title={t(`aerodromesTool.regions.${badge}`)}
                          >
                            {t(`aerodromesTool.regions.${badge}`)}
                          </span>
                        </span>
                        <span className={styles.name}>{ar ? a.name_ar : a.name_en}</span>
                        <span className={styles.meta}>
                          {a.country_en && (
                            <span>{ar ? a.country_ar || a.country_en : a.country_en}</span>
                          )}
                          <span>
                            {t('aerodromesTool.elevation')}: {a.elev_ft.toLocaleString()} ft
                          </span>
                          <span className={styles.coords}>
                            {a.lat.toFixed(3)}, {a.lon.toFixed(3)}
                          </span>
                        </span>
                        {a.rwys.length > 0 && (
                          <span className={styles.rowSection}>
                            <span className={styles.rowLabel}>{t('aerodromesTool.runways')}</span>
                            <span className={styles.pills}>
                              {a.rwys.map((r, i) => (
                                <span
                                  key={i}
                                  className={styles.rwy}
                                  title={
                                    r.len
                                      ? `${r.len.toLocaleString()} ft${r.surf ? ` · ${r.surf}` : ''}`
                                      : r.surf || undefined
                                  }
                                >
                                  {r.id}
                                </span>
                              ))}
                            </span>
                          </span>
                        )}
                        {a.freqs.length > 0 && (
                          <span className={styles.rowSection}>
                            <span className={styles.rowLabel}>{t('aerodromesTool.freqs')}</span>
                            <span className={styles.pills}>
                              {a.freqs.map((f, i) => (
                                <span key={i} className={styles.freq}>
                                  {f.l} {f.v}
                                </span>
                              ))}
                            </span>
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {matches.length > list.length && (
                <button
                  type="button"
                  className={styles.loadMore}
                  onClick={() => setVisible((v) => v + PAGE)}
                >
                  {t('aerodromesTool.loadMore')}
                </button>
              )}
            </>
          )}
        </>
      )}
    </CalcShell>
  );
}
