import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { windTriangle } from '@/calc/navigation';
import { WindTriangleDiagram } from './WindTriangleDiagram';

export function WindTriangle() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ crs: '', tas: '', wdir: '', wspd: '' });
  const r = windTriangle(nums.crs, nums.tas, nums.wdir, nums.wspd);

  return (
    <CalcShell
      title={t('tools.items.wind-triangle.name')}
      intro={t('tools.items.wind-triangle.blurb')}
      category={t('tools.categories.navigation')}
      formula={t('windTriangle.formula')}
      onExample={() => {
        set('crs', '270');
        set('tas', '110');
        set('wdir', '320');
        set('wspd', '25');
      }}
      adelPrompt={() =>
        r != null
          ? `On course ${inputs.crs}° at ${inputs.tas} kt TAS with wind ${inputs.wdir}°/${inputs.wspd} kt, I fly heading ${Math.round(r.heading)}° (WCA ${r.wca >= 0 ? '+' : ''}${r.wca.toFixed(0)}°) for ${Math.round(r.groundSpeed)} kt groundspeed. Explain the wind triangle.`
          : null
      }
      related={[
        { to: '/tools/tas', label: t('tools.items.tas.name') },
        { to: '/tools/crosswind', label: t('tools.items.crosswind.name') },
      ]}
    >
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
          value={inputs.tas}
          onChange={(v) => set('tas', v)}
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
          value={r != null ? `${Math.round(r.heading)}°` : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('windTriangle.wca')}
          value={r != null ? `${r.wca >= 0 ? '+' : ''}${r.wca.toFixed(0)}°` : '—'}
        />
        <ResultStat
          label={t('windTriangle.gs')}
          value={r != null ? `${Math.round(r.groundSpeed)} kt` : '—'}
        />
      </OutputGrid>
      {r != null && (
        <WindTriangleDiagram
          courseDeg={nums.crs}
          tasKt={nums.tas}
          windDirDeg={nums.wdir}
          windSpeedKt={nums.wspd}
          headingDeg={r.heading}
          groundSpeedKt={r.groundSpeed}
        />
      )}
    </CalcShell>
  );
}
