import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { longitudinalSeparation } from '@/calc/separation';

export function ProceduralSeparation() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ lead: '', follow: '', spacing: '' });
  const r = longitudinalSeparation(nums.lead, nums.follow, nums.spacing);

  return (
    <CalcShell
      title={t('tools.items.procedural-separation.name')}
      intro={t('tools.items.procedural-separation.blurb')}
      category={t('tools.categories.procedures')}
      formula={t('separation.formula')}
      onExample={() => {
        set('lead', '120');
        set('follow', '150');
        set('spacing', '10');
      }}
      related={[{ to: '/tools/tsd', label: t('tools.items.tsd.name') }]}
    >
      <FieldGrid>
        <NumberField
          label={t('separation.gsLead')}
          value={inputs.lead}
          onChange={(v) => set('lead', v)}
          unit="kt"
          placeholder="120"
        />
        <NumberField
          label={t('separation.gsFollow')}
          value={inputs.follow}
          onChange={(v) => set('follow', v)}
          unit="kt"
          placeholder="150"
        />
        <NumberField
          label={t('separation.spacing')}
          value={inputs.spacing}
          onChange={(v) => set('spacing', v)}
          unit="NM"
          placeholder="10"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('separation.closure')}
          value={r != null ? `${Math.abs(r.closureKt).toFixed(0)} kt` : '—'}
          sub={
            r != null ? (r.closing ? t('separation.closing') : t('separation.opening')) : undefined
          }
          tone={r != null ? (r.closing ? 'bad' : 'good') : undefined}
        />
        <ResultStat
          label={t('separation.timeToZero')}
          value={r?.timeToZeroMin != null ? `${r.timeToZeroMin.toFixed(1)} min` : '—'}
        />
      </OutputGrid>
    </CalcShell>
  );
}
