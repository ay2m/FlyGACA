import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { hydroplaningSpeed } from '@/calc/hydroplaning';

export function Hydroplaning() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ psi: '' });
  const vKt = hydroplaningSpeed(nums.psi);

  return (
    <CalcShell
      title={t('tools.items.hydroplaning.name')}
      intro={t('tools.items.hydroplaning.blurb')}
      category={t('tools.categories.performance')}
      formula={t('hydroplaning.formula')}
      onExample={() => set('psi', '120')}
      adelPrompt={() =>
        vKt != null
          ? `With ${inputs.psi} psi tyre pressure the dynamic hydroplaning speed is about ${Math.round(vKt)} kt. How do I avoid hydroplaning on a wet runway in the landing roll?`
          : null
      }
      related={[{ to: '/tools/crosswind', label: t('tools.items.crosswind.name') }]}
    >
      <FieldGrid>
        <NumberField
          label={t('hydroplaning.pressure')}
          value={inputs.psi}
          onChange={(v) => set('psi', v)}
          unit="psi"
          placeholder="120"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('hydroplaning.speed')}
          value={vKt != null ? `${Math.round(vKt)} kt` : '—'}
          sub={vKt != null ? t('hydroplaning.kmh', { kmh: Math.round(vKt * 1.852) }) : undefined}
          tone="headline"
        />
      </OutputGrid>
    </CalcShell>
  );
}
