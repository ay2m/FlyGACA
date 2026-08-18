import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { trueAirspeed } from '@/calc/tas';
import { windTriangle } from '@/calc/navigation';
import { solveTsd } from '@/calc/tsd';
import { WindTriangleDiagram } from './WindTriangleDiagram';
import seg from '@/components/calc/calc.module.css';

const TABS = ['tas', 'wind', 'tsd'] as const;
type Tab = (typeof TABS)[number];

const isTab = (v: string): v is Tab => (TABS as readonly string[]).includes(v);

export function E6b() {
  const { t } = useTranslation();
  // Inputs live in the URL like every other tool, so CalcShell's copy-link hands
  // out a working setup. `tab` rides along as a plain string (nums.tab is NaN and
  // unused) and is validated on read, so ?tab=nonsense falls back to the first tab.
  const { inputs, set, nums } = useNumericInputs({
    tab: 'tas',
    cas: '',
    pa: '',
    oat: '',
    crs: '',
    wtas: '',
    wdir: '',
    wspd: '',
    gs: '',
    dist: '',
    time: '',
  });
  const tab: Tab = isTab(inputs.tab) ? inputs.tab : 'tas';

  const tas = trueAirspeed({ cas: nums.cas, pa: nums.pa, oat: nums.oat });
  const wind = windTriangle(nums.crs, nums.wtas, nums.wdir, nums.wspd);
  const tsd = solveTsd(nums.gs, nums.dist, nums.time);

  return (
    <CalcShell
      title={t('tools.items.e6b.name')}
      intro={t('tools.items.e6b.blurb')}
      category={t('tools.categories.navigation')}
      formula={t('e6b.formula')}
      related={[
        { to: '/tools/tas', label: t('tools.items.tas.name') },
        { to: '/tools/wind-triangle', label: t('tools.items.wind-triangle.name') },
        { to: '/tools/tsd', label: t('tools.items.tsd.name') },
      ]}
    >
      <div className={seg.seg} role="tablist" aria-label="E6B">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`${seg.segBtn} ${tab === id ? seg.segActive : ''}`}
            onClick={() => set('tab', id)}
          >
            {t(id === 'tas' ? 'e6b.tabsTas' : id === 'wind' ? 'e6b.tabsWind' : 'e6b.tabsTsd')}
          </button>
        ))}
      </div>

      {tab === 'tas' && (
        <>
          <FieldGrid>
            <NumberField
              label={t('tas.cas')}
              value={inputs.cas}
              onChange={(v) => set('cas', v)}
              unit="kt"
              placeholder="110"
            />
            <NumberField
              label={t('tas.pa')}
              value={inputs.pa}
              onChange={(v) => set('pa', v)}
              unit="ft"
              placeholder="8000"
            />
            <NumberField
              label={t('tas.oat')}
              value={inputs.oat}
              onChange={(v) => set('oat', v)}
              unit="°C"
              placeholder="10"
            />
          </FieldGrid>
          <OutputGrid>
            <ResultStat
              label={t('tas.trueAirspeed')}
              value={tas ? `${Math.round(tas.tas)} kt` : '—'}
              tone="headline"
            />
            <ResultStat label={t('tas.mach')} value={tas ? `M ${tas.mach.toFixed(3)}` : '—'} />
          </OutputGrid>
        </>
      )}

      {tab === 'wind' && (
        <>
          <FieldGrid>
            <NumberField
              label={t('windTriangle.course')}
              value={inputs.crs}
              onChange={(v) => set('crs', v)}
              unit="°"
              placeholder="270"
            />
            <NumberField
              label={t('windTriangle.tas')}
              value={inputs.wtas}
              onChange={(v) => set('wtas', v)}
              unit="kt"
              placeholder="110"
            />
            <NumberField
              label={t('windTriangle.windDir')}
              value={inputs.wdir}
              onChange={(v) => set('wdir', v)}
              unit="°"
              placeholder="320"
            />
            <NumberField
              label={t('windTriangle.windSpeed')}
              value={inputs.wspd}
              onChange={(v) => set('wspd', v)}
              unit="kt"
              placeholder="25"
            />
          </FieldGrid>
          <OutputGrid>
            <ResultStat
              label={t('windTriangle.heading')}
              value={wind ? `${Math.round(wind.heading)}°` : '—'}
              tone="headline"
            />
            <ResultStat
              label={t('windTriangle.wca')}
              value={wind ? `${wind.wca >= 0 ? '+' : ''}${wind.wca.toFixed(0)}°` : '—'}
            />
            <ResultStat
              label={t('windTriangle.gs')}
              value={wind ? `${Math.round(wind.groundSpeed)} kt` : '—'}
            />
          </OutputGrid>
          {wind != null && (
            <WindTriangleDiagram
              courseDeg={nums.crs}
              tasKt={nums.wtas}
              windDirDeg={nums.wdir}
              windSpeedKt={nums.wspd}
              headingDeg={wind.heading}
              groundSpeedKt={wind.groundSpeed}
            />
          )}
        </>
      )}

      {tab === 'tsd' && (
        <>
          <FieldGrid>
            <NumberField
              label={t('tsd.gs')}
              value={inputs.gs}
              onChange={(v) => set('gs', v)}
              unit="kt"
              placeholder="120"
            />
            <NumberField
              label={t('tsd.distance')}
              value={inputs.dist}
              onChange={(v) => set('dist', v)}
              unit="NM"
              placeholder="30"
            />
            <NumberField
              label={t('tsd.time')}
              value={inputs.time}
              onChange={(v) => set('time', v)}
              unit="min"
              placeholder="—"
            />
          </FieldGrid>
          <OutputGrid>
            <ResultStat
              label={t('tsd.gs')}
              value={tsd ? `${Math.round(tsd.groundSpeed)} kt` : '—'}
            />
            <ResultStat
              label={t('tsd.distance')}
              value={tsd ? `${tsd.distanceNm.toFixed(1)} NM` : '—'}
            />
            <ResultStat
              label={t('tsd.time')}
              value={tsd ? `${tsd.timeMin.toFixed(1)} min` : '—'}
              tone="headline"
            />
          </OutputGrid>
        </>
      )}
    </CalcShell>
  );
}
