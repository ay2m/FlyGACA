import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { specificRange } from '@/calc/fuel';

export function SpecificRange() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ gs: '', burn: '' });
  const sr = specificRange(nums.gs, nums.burn);

  return (
    <CalcShell
      title={t('tools.items.specific-range.name')}
      intro={t('tools.items.specific-range.blurb')}
      category={t('tools.categories.weight-fuel')}
      formula={t('specificRange.formula')}
      onExample={() => {
        set('gs', '120');
        set('burn', '40');
      }}
      adelPrompt={() =>
        sr != null
          ? `At ${inputs.gs} kt burning ${inputs.burn}/hr the specific range is ${sr.toFixed(2)} NM per unit. How do I find the most fuel-efficient cruise?`
          : null
      }
      related={[{ to: '/tools/fuel', label: t('tools.items.fuel.name') }]}
    >
      <FieldGrid>
        <NumberField
          label={t('specificRange.gs')}
          value={inputs.gs}
          onChange={(v) => set('gs', v)}
          unit="kt"
          placeholder="120"
        />
        <NumberField
          label={t('specificRange.burn')}
          value={inputs.burn}
          onChange={(v) => set('burn', v)}
          placeholder="40"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('specificRange.sr')}
          value={sr != null ? `${sr.toFixed(2)} NM` : '—'}
          tone="headline"
        />
      </OutputGrid>
    </CalcShell>
  );
}
