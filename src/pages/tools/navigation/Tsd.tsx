import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { solveTsd } from '@/calc/tsd';

export function Tsd() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ gs: '', dist: '', time: '' });
  const r = solveTsd(nums.gs, nums.dist, nums.time);

  return (
    <CalcShell
      title={t('tools.items.tsd.name')}
      intro={t('tools.items.tsd.blurb')}
      category={t('tools.categories.navigation')}
      formula={t('tsd.formula')}
      onExample={() => {
        set('gs', '120');
        set('dist', '30');
        set('time', '');
      }}
      related={[{ to: '/tools/top-of-descent', label: t('tools.items.top-of-descent.name') }]}
    >
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
      <p style={{ color: 'var(--text-dim)', fontSize: 'var(--fs-xs)', margin: 0 }}>
        {t('tsd.hint')}
      </p>
      <OutputGrid>
        <ResultStat
          label={t('tsd.gs')}
          value={r != null ? `${Math.round(r.groundSpeed)} kt` : '—'}
        />
        <ResultStat
          label={t('tsd.distance')}
          value={r != null ? `${r.distanceNm.toFixed(1)} NM` : '—'}
        />
        <ResultStat
          label={t('tsd.time')}
          value={r != null ? `${r.timeMin.toFixed(1)} min` : '—'}
          tone="headline"
        />
      </OutputGrid>
    </CalcShell>
  );
}
