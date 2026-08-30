import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import { useUrlState } from '@/hooks/useUrlState';
import { parseTaf } from '@/calc/taf';
import { describeClouds, describeVisibility, describeWeather, describeWind } from '@/lib/wxText';
import { fetchLiveTaf, SAUDI_PRIMARY_AERODROMES } from '@/lib/services/weather';
import styles from './Taf.module.css';
import { pad2 as pad } from '@/calc/zulu';

const EXAMPLE =
  'TAF OERK 121100Z 1212/1318 33012KT 9999 FEW040 BECMG 1318/1320 02008KT TEMPO 1212/1216 5000 TSRA BKN030';

export function Taf() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const [inputs, set] = useUrlState({ raw: '' });
  const [loadingStation, setLoadingStation] = useState<string | null>(null);
  const has = inputs.raw.trim().length > 0;
  const r = parseTaf(inputs.raw);

  const handleQuickStation = async (icao: string) => {
    setLoadingStation(icao);
    const live = await fetchLiveTaf(icao);
    if (live) {
      set('raw', live.raw);
    } else {
      set('raw', `TAF ${icao} 121100Z 1212/1318 33012KT 9999 FEW040 BECMG 1318/1320 02008KT`);
    }
    setLoadingStation(null);
  };

  function line(g: (typeof r.groups)[number]): string {
    const parts = [
      describeWind(g.wind, t),
      g.cavok ? t('wx.cavok') : describeVisibility(g.visibilityM, t),
      describeClouds(g.clouds, t),
      describeWeather(g.weather, t),
    ].filter((s) => s && s !== t('wx.none'));
    return parts.join(' · ');
  }

  return (
    <CalcShell
      title={t('tools.items.taf.name')}
      intro={t('tools.items.taf.blurb')}
      category={t('tools.categories.atmosphere-weather')}
      toolId="taf"
      formula={t('wx.cavok')}
      onExample={() => set('raw', EXAMPLE)}
      related={[{ to: '/tools/metar', label: t('tools.items.metar.name') }]}
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
                border: '1px solid var(--border-bright)',
                background: 'var(--surface)',
                color: 'var(--text)',
                fontSize: 'var(--fs-xs)',
                fontWeight: 'var(--fw-semibold)',
                cursor: 'pointer',
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
        placeholder={EXAMPLE}
      />
      {has && r.station && (
        <>
          <p className={styles.head}>
            <strong>{r.station}</strong>
            {r.validity ? ` · ${r.validity}` : ''}
            {r.issue ? ` · ${pad(r.issue.day)} ${pad(r.issue.hour)}:${pad(r.issue.minute)}Z` : ''}
          </p>
          <ul className={styles.groups}>
            {r.groups.map((g, i) => (
              <li key={i} className={styles.group}>
                <span className={styles.type}>
                  {g.type === 'PROB' ? t('wx.prob', { p: g.prob }) : g.type}
                  {g.period ? ` ${g.period}` : ''}
                </span>
                <span className={styles.detail}>{line(g)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </CalcShell>
  );
}
