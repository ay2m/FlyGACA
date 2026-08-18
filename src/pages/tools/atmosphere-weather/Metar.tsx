import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import { ResultStat } from '@/components/calc/ResultStat';
import { OutputGrid } from '@/components/calc/Grids';
import { useUrlState } from '@/hooks/useUrlState';
import { parseMetar } from '@/calc/metar';
import { describeClouds, describeVisibility, describeWeather, describeWind } from '@/lib/wxText';
import { pad2 as pad } from '@/calc/zulu';

export function Metar() {
  const { t } = useTranslation();
  const [inputs, set] = useUrlState({ raw: '' });
  const has = inputs.raw.trim().length > 0;
  const r = parseMetar(inputs.raw);

  return (
    <CalcShell
      title={t('tools.items.metar.name')}
      intro={t('tools.items.metar.blurb')}
      category={t('tools.categories.atmosphere-weather')}
      formula={t('wx.cavok')}
      onExample={() => set('raw', 'OERK 121200Z 33015G25KT 9999 FEW040 SCT100 38/12 Q1009')}
      related={[
        { to: '/tools/taf', label: t('tools.items.taf.name') },
        { to: '/tools/cloud-base', label: t('tools.items.cloud-base.name') },
      ]}
    >
      <TextField
        label={t('wx.paste')}
        value={inputs.raw}
        onChange={(v) => set('raw', v)}
        placeholder="OERK 121200Z 33015G25KT 9999 FEW040 38/12 Q1009"
      />
      {has && (
        <OutputGrid>
          <ResultStat label={t('wx.station')} value={r.station ?? '—'} tone="headline" />
          <ResultStat
            label={t('wx.time')}
            value={r.day != null ? `${pad(r.day)} ${pad(r.hour ?? 0)}:${pad(r.minute ?? 0)}Z` : '—'}
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
      )}
    </CalcShell>
  );
}
