import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { useFetchJson } from '@/hooks/useFetchJson';
import { airportLd } from '@/lib/seo/jsonld';
import { regionBadge } from '@/lib/aerodromes';
import { type Airport, type AirportsIndex, type AirspacesIndex } from '@/lib/content';
import { loadShardedData, reassembleAirports } from '@/lib/sharded-loader';
import { AerodromeScope } from '@/components/aerodrome/AerodromeScope';
import { AirportTypeIcon } from '@/components/aerodrome/AirportTypeIcon';
import { RunwayDiagram } from '@/components/aerodrome/RunwayDiagram';
import { PositionMarker } from '@/components/aerodrome/PositionMarker';
import { DaylightStrip } from '@/components/aerodrome/DaylightStrip';
import {
  fetchLiveMetar,
  fetchLiveTaf,
  type LiveMetarResult,
  type LiveTafResult,
} from '@/lib/services/weather';
import { computeRunwayWind } from '@/calc/metar';
import { describeWind, describeVisibility, describeWeather, describeClouds } from '@/lib/wxText';
import styles from './Aerodromes.module.css';

export function AerodromeDetail() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const { icao = '' } = useParams();
  const code = icao.toUpperCase();
  const { data, error, loading } = useFetchJson<AirportsIndex>('/data/airports.json');
  const { data: airspaces } = useFetchJson<AirspacesIndex>('/data/airspaces-index.json');

  const inCore = useMemo(() => data?.airports.find((a) => a.icao === code), [data, code]);
  // Long-tail airfields aren't in the eager core file; fetch the lazy tier and
  // look there only when the core misses (so most lookups stay on the core file).
  const [extra, setExtra] = useState<Airport[] | null>(null);
  const [extraLoading, setExtraLoading] = useState(false);
  const [liveMetar, setLiveMetar] = useState<LiveMetarResult | null>(null);
  const [liveTaf, setLiveTaf] = useState<LiveTafResult | null>(null);
  const [wxLoading, setWxLoading] = useState(false);

  useEffect(() => {
    if (!data || inCore || extra || extraLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExtraLoading(true);
    loadShardedData<AirportsIndex>(
      '/data/airports-extra.json',
      '/data/airports-shards',
      reassembleAirports,
    )
      .then((d) => setExtra(d.airports))
      .catch(() => setExtra([]))
      .finally(() => setExtraLoading(false));
  }, [data, inCore, extra, extraLoading]);

  useEffect(() => {
    if (!code) return;
    let live = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWxLoading(true);
    Promise.all([fetchLiveMetar(code), fetchLiveTaf(code)]).then(([m, taf]) => {
      if (live) {
        setLiveMetar(m);
        setLiveTaf(taf);
        setWxLoading(false);
      }
    });
    return () => {
      live = false;
    };
  }, [code]);

  const airport = inCore ?? extra?.find((a) => a.icao === code);

  if (loading || (!inCore && (extraLoading || (data && !extra)))) {
    return (
      <CalcShell title={code} category={t('tools.categories.procedures')}>
        <p>{t('common.loading')}</p>
      </CalcShell>
    );
  }
  if (error || !airport) {
    return (
      // Unknown ICAO (or a failed load) has no content to index — noindex the soft-404.
      <CalcShell title={code} category={t('tools.categories.procedures')} noindex>
        <p role="alert">{error ? t('common.loadError') : t('aerodromesTool.notFound')}</p>
        <Link className={styles.back} to="/tools/aerodromes">
          ← {t('aerodromesTool.backToList')}
        </Link>
      </CalcShell>
    );
  }

  const a = airport;
  const name = ar ? a.name_ar : a.name_en;
  const country = ar ? a.country_ar || a.country_en : a.country_en;
  const city = ar ? a.city_ar || a.city_en : a.city_en;
  const badge = regionBadge(a);

  const adelPrompt = () =>
    ar
      ? `أخبرني عن مطار ${name} (${a.icao}): المدارج والترددات والخدمات والطقس.`
      : `Tell me about ${name} (${a.icao}): runways, frequencies, services and weather.`;

  return (
    <CalcShell
      title={`${a.icao} — ${name}`}
      intro={[city, country].filter(Boolean).join(', ')}
      category={t('tools.categories.procedures')}
      formula={t('aerodromesTool.formula')}
      adelPrompt={adelPrompt}
      related={[{ to: '/tools/aerodromes', label: t('aerodromesTool.backToList') }]}
      primaryLd={airportLd({
        name,
        icao: a.icao,
        iata: a.iata,
        path: `/tools/aerodromes/${a.icao}`,
        lang: i18n.language,
        lat: a.lat,
        lon: a.lon,
        elevationFt: a.elev_ft,
        country,
      })}
    >
      <div className={styles.detailHead}>
        <AirportTypeIcon type={a.type} className={styles.detailTypeIcon} />
        <span className={styles.detailIcao}>{a.icao}</span>
        {a.iata && <span className={styles.iata}>{a.iata}</span>}
        <span className={`${styles.badge} ${styles[`badge_${badge}`]}`}>
          {t(`aerodromesTool.regions.${badge}`)}
        </span>
      </div>

      <div className={styles.overview}>
        <dl className={styles.facts}>
          {country && (
            <div className={styles.fact}>
              <dt>{t('aerodromesTool.country')}</dt>
              <dd>{country}</dd>
            </div>
          )}
          <div className={styles.fact}>
            <dt>{t('aerodromesTool.elevation')}</dt>
            <dd>{a.elev_ft.toLocaleString()} ft</dd>
          </div>
          <div className={styles.fact}>
            <dt>{t('aerodromesTool.coordinates')}</dt>
            <dd className={styles.coords}>
              {a.lat.toFixed(4)}, {a.lon.toFixed(4)}
            </dd>
          </div>
          {a.mag && (
            <div className={styles.fact}>
              <dt>{t('aerodromesTool.magVar')}</dt>
              <dd>{a.mag}</dd>
            </div>
          )}
        </dl>
        <PositionMarker lat={a.lat} lon={a.lon} />
      </div>

      <section className={styles.detailSection}>
        <h2 className={styles.detailH2}>{t('aerodromesTool.daylight')}</h2>
        <DaylightStrip lat={a.lat} lon={a.lon} />
      </section>

      {a.rwys.length > 0 && (
        <section className={styles.detailSection}>
          <h2 className={styles.detailH2}>{t('aerodromesTool.runways')}</h2>
          <div className={styles.rwyLayout}>
            <RunwayDiagram rwys={a.rwys} />
            <ul className={styles.rwyList}>
              {a.rwys.map((r, i) => (
                <li key={i} className={styles.rwyRow}>
                  <span className={styles.rwyId}>{r.id}</span>
                  {r.len && <span className={styles.rwyMeta}>{r.len.toLocaleString()} ft</span>}
                  {r.surf && <span className={styles.rwyMeta}>{r.surf}</span>}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {a.freqs.length > 0 && (
        <section className={styles.detailSection}>
          <h2 className={styles.detailH2}>{t('aerodromesTool.freqs')}</h2>
          <div className={styles.pills}>
            {a.freqs.map((f, i) => (
              <span key={i} className={styles.freq}>
                {f.l} {f.v}
              </span>
            ))}
          </div>
        </section>
      )}

      {a.services && a.services.length > 0 && (
        <section className={styles.detailSection}>
          <h2 className={styles.detailH2}>{t('aerodromesTool.services')}</h2>
          <dl className={styles.facts}>
            {a.services.map((s, i) => (
              <div key={i} className={styles.fact}>
                <dt>{s.l}</dt>
                <dd>{s.v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Live Aviation Weather (METAR / TAF) */}
      <section className={styles.detailSection}>
        <div className={styles.wxHeader}>
          <h2 className={styles.detailH2} style={{ border: 'none', margin: 0, padding: 0 }}>
            {t('aerodromesTool.weather')}
          </h2>
          {liveMetar && (
            <span className={`${styles.wxCategory} ${styles[`cat${liveMetar.category}`]}`}>
              {liveMetar.category}
            </span>
          )}
        </div>

        {wxLoading && <p className={styles.meta}>{t('common.loading')}</p>}

        {liveMetar ? (
          <div className={styles.wxCard}>
            <pre className={styles.wxRaw}>{liveMetar.raw}</pre>
            <dl className={styles.facts}>
              <div className={styles.fact}>
                <dt>{t('wx.wind')}</dt>
                <dd>{describeWind(liveMetar.report.wind, t)}</dd>
              </div>
              <div className={styles.fact}>
                <dt>{t('wx.visibility')}</dt>
                <dd>
                  {liveMetar.report.cavok
                    ? t('wx.cavok')
                    : describeVisibility(liveMetar.report.visibilityM, t)}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt>{t('wx.temp')}</dt>
                <dd>{liveMetar.report.tempC != null ? `${liveMetar.report.tempC} °C` : '—'}</dd>
              </div>
              <div className={styles.fact}>
                <dt>{t('wx.qnh')}</dt>
                <dd>
                  {liveMetar.report.qnhHpa != null
                    ? `${liveMetar.report.qnhHpa} hPa`
                    : liveMetar.report.altimInHg != null
                      ? `${liveMetar.report.altimInHg.toFixed(2)} inHg`
                      : '—'}
                </dd>
              </div>
              {liveMetar.report.weather.length > 0 && (
                <div className={styles.fact}>
                  <dt>{t('wx.weather')}</dt>
                  <dd>{describeWeather(liveMetar.report.weather, t)}</dd>
                </div>
              )}
              {liveMetar.report.clouds.length > 0 && (
                <div className={styles.fact}>
                  <dt>{t('wx.clouds')}</dt>
                  <dd>{describeClouds(liveMetar.report.clouds, t)}</dd>
                </div>
              )}
            </dl>

            {/* Runway Crosswind Breakdown */}
            {a.rwys.length > 0 &&
              liveMetar.report.wind &&
              typeof liveMetar.report.wind.dir === 'number' && (
                <div className={styles.rowSection}>
                  <span className={styles.rowLabel}>{t('aerodromesTool.rwyWindAnalysis')}</span>
                  <ul className={styles.rwyList}>
                    {a.rwys.map((r, i) => {
                      const comp = computeRunwayWind(r.id, liveMetar.report.wind);
                      if (!comp) return null;
                      const isFavorable = comp.headwindKt >= 0;
                      return (
                        <li key={i} className={styles.rwyRow}>
                          <span className={styles.rwyId}>{r.id}</span>
                          <span className={isFavorable ? styles.rwyWindBest : styles.rwyMeta}>
                            {comp.headwindKt >= 0
                              ? `Headwind: ${comp.headwindKt} kt`
                              : `Tailwind: ${Math.abs(comp.headwindKt)} kt`}
                          </span>
                          <span className={styles.rwyMeta}>
                            {comp.crosswindKt > 0
                              ? `Crosswind: ${comp.crosswindKt} kt (${comp.crosswindSide})`
                              : 'Direct wind'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

            {liveTaf && (
              <div className={styles.rowSection} style={{ marginBlockStart: 'var(--space-2)' }}>
                <span className={styles.rowLabel}>{t('tools.items.taf.name')}</span>
                <pre className={styles.wxRaw}>{liveTaf.raw}</pre>
              </div>
            )}
          </div>
        ) : (
          !wxLoading && <p className={styles.meta}>{t('aerodromesTool.noLiveWx')}</p>
        )}
      </section>

      <AerodromeScope
        center={{ lat: a.lat, lon: a.lon }}
        icao={a.icao}
        zones={airspaces?.airspaces ?? []}
      />

      <a
        className={styles.map}
        href={`https://www.google.com/maps?q=${a.lat},${a.lon}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {t('aerodromesTool.viewMap')}
      </a>
    </CalcShell>
  );
}
