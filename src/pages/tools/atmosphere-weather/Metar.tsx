import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import { ResultStat } from '@/components/calc/ResultStat';
import { OutputGrid } from '@/components/calc/Grids';
import { useUrlState } from '@/hooks/useUrlState';
import { parseMetar, computeFlightCategory } from '@/calc/metar';
import { describeClouds, describeVisibility, describeWeather, describeWind } from '@/lib/wxText';
import { pad2 as pad } from '@/calc/zulu';
import { fetchLiveMetar, SAUDI_PRIMARY_AERODROMES } from '@/lib/services/weather';

export function Metar() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [inputs, set] = useUrlState({ raw: '' });
  const [loadingStation, setLoadingStation] = useState<string | null>(null);
  const has = inputs.raw.trim().length > 0;
  const r = parseMetar(inputs.raw);
  const category = has ? computeFlightCategory(r) : null;

  const handleQuickStation = async (icao: string) => {
    setLoadingStation(icao);
    const live = await fetchLiveMetar(icao);
    if (live) {
      set('raw', live.raw);
    } else {
      set('raw', `${icao} 121200Z 33015KT CAVOK 38/12 Q1009`);
    }
    setLoadingStation(null);
  };

  return (
    <CalcShell
      title={t('tools.items.metar.name')}
      intro={t('tools.items.metar.blurb')}
      category={t('tools.categories.atmosphere-weather')}
      toolId="metar"
      formula={t('wx.cavok')}
      onExample={() => set('raw', 'OERK 121200Z 33015G25KT 9999 FEW040 SCT100 38/12 Q1009')}
      related={[
        { to: '/tools/taf', label: t('tools.items.taf.name') },
        { to: '/tools/cloud-base', label: t('tools.items.cloud-base.name') },
      ]}
    >
      <div style={{ marginBlockEnd: 'var(--space-3)' }}>
        <p
          style={{
            fontSize: 'var(--fs-xs)',
            textTransform: 'uppercase',
            color: 'var(--text-dim)',
            marginBlockEnd: 'var(--space-2)',
          }}
        >
          {t('aerodromesTool.quickSelect', 'Quick Saudi Aerodromes (Live NOAA Feed):')}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
          {SAUDI_PRIMARY_AERODROMES.slice(0, 8).map((st) => (
            <button
              key={st.icao}
              type="button"
              onClick={() => handleQuickStation(st.icao)}
              disabled={loadingStation === st.icao}
              style={{
                padding: 'var(--space-1) var(--space-3)',
                borderRadius: 'var(--radius-pill)',
                border: '1px solid color-mix(in srgb, var(--border-bright) 40%, transparent)',
                background: 'color-mix(in srgb, var(--surface-raised) 70%, transparent)',
                color: 'var(--text)',
                font: 'inherit',
                fontSize: 'var(--fs-xs)',
                fontWeight: 'var(--fw-semibold)',
                cursor: 'pointer',
                transition: 'all var(--dur) var(--ease)',
              }}
            >
              {loadingStation === st.icao ? '...' : `${st.icao} (${ar ? st.nameAr : st.iata})`}
            </button>
          ))}
        </div>
      </div>

      <TextField
        label={t('wx.paste')}
        value={inputs.raw}
        onChange={(v) => set('raw', v)}
        placeholder="OERK 121200Z 33015G25KT 9999 FEW040 38/12 Q1009"
      />
      {has && (
        <>
          {category && (
            <div
              style={{
                marginBlock: 'var(--space-3)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 'var(--fw-bold)' }}>
                {t('wx.flightCategory', 'Flight Category:')}
              </span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontWeight: 'bold',
                  fontSize: 'var(--fs-xs)',
                  background:
                    category === 'VFR'
                      ? 'rgba(34, 197, 94, 0.15)'
                      : category === 'MVFR'
                        ? 'rgba(59, 130, 246, 0.15)'
                        : category === 'IFR'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(236, 72, 153, 0.15)',
                  color:
                    category === 'VFR'
                      ? '#22c55e'
                      : category === 'MVFR'
                        ? '#3b82f6'
                        : category === 'IFR'
                          ? '#ef4444'
                          : '#ec4899',
                  border: `1px solid ${category === 'VFR' ? '#22c55e' : category === 'MVFR' ? '#3b82f6' : category === 'IFR' ? '#ef4444' : '#ec4899'}`,
                }}
              >
                {category}
              </span>
            </div>
          )}
          <OutputGrid>
            <ResultStat label={t('wx.station')} value={r.station ?? '—'} tone="headline" />
            <ResultStat
              label={t('wx.time')}
              value={
                r.day != null ? `${pad(r.day)} ${pad(r.hour ?? 0)}:${pad(r.minute ?? 0)}Z` : '—'
              }
            />
            <ResultStat label={t('wx.wind')} value={describeWind(r.wind, t)} />
            <ResultStat
              label={t('wx.visibility')}
              value={r.cavok ? t('wx.cavok') : describeVisibility(r.visibilityM, t)}
            />
            <ResultStat label={t('wx.weather')} value={describeWeather(r.weather, t)} />
            <ResultStat
              label={t('wx.clouds')}
              value={r.cavok ? t('wx.cavok') : describeClouds(r.clouds, t)}
            />
            <ResultStat label={t('wx.temp')} value={r.tempC != null ? `${r.tempC} °C` : '—'} />
            <ResultStat label={t('wx.dew')} value={r.dewC != null ? `${r.dewC} °C` : '—'} />
            <ResultStat
              label={t('wx.qnh')}
              value={
                r.qnhHpa != null
                  ? `${r.qnhHpa} hPa`
                  : r.altimInHg != null
                    ? `${r.altimInHg.toFixed(2)} inHg`
                    : '—'
              }
            />
          </OutputGrid>
        </>
      )}
    </CalcShell>
  );
}
