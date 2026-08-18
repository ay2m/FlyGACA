import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { greatCircle } from '@/calc/navigation';

export function GreatCircle() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ lat1: '', lon1: '', lat2: '', lon2: '' });
  const r = greatCircle(nums.lat1, nums.lon1, nums.lat2, nums.lon2);

  return (
    <CalcShell
      title={t('tools.items.great-circle.name')}
      intro={t('tools.items.great-circle.blurb')}
      category={t('tools.categories.navigation')}
      formula={t('greatCircle.formula')}
      onExample={() => {
        set('lat1', '24.96');
        set('lon1', '46.70');
        set('lat2', '21.68');
        set('lon2', '39.16');
      }}
      adelPrompt={() =>
        r != null
          ? `The great-circle distance is ${Math.round(r.distanceNm)} NM on an initial bearing of ${Math.round(r.bearingDeg)}°. Why does the great-circle track curve on a chart and how does the bearing change en route?`
          : null
      }
      related={[{ to: '/tools/wind-triangle', label: t('tools.items.wind-triangle.name') }]}
    >
      <FieldGrid>
        <NumberField
          label={t('greatCircle.lat1')}
          value={inputs.lat1}
          onChange={(v) => set('lat1', v)}
          unit="°"
          placeholder="24.96"
        />
        <NumberField
          label={t('greatCircle.lon1')}
          value={inputs.lon1}
          onChange={(v) => set('lon1', v)}
          unit="°"
          placeholder="46.70"
        />
        <NumberField
          label={t('greatCircle.lat2')}
          value={inputs.lat2}
          onChange={(v) => set('lat2', v)}
          unit="°"
          placeholder="21.68"
        />
        <NumberField
          label={t('greatCircle.lon2')}
          value={inputs.lon2}
          onChange={(v) => set('lon2', v)}
          unit="°"
          placeholder="39.16"
        />
      </FieldGrid>
      <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-xs)', margin: 0 }}>
        {t('greatCircle.hint')}
      </p>
      <OutputGrid>
        <ResultStat
          label={t('greatCircle.distance')}
          value={r != null ? `${Math.round(r.distanceNm)} NM` : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('greatCircle.bearing')}
          value={r != null ? `${Math.round(r.bearingDeg)}°` : '—'}
        />
      </OutputGrid>
    </CalcShell>
  );
}
