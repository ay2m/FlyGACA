import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { formatHours, fuelPlan, specificRange } from '@/calc/fuel';

export function Fuel() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ fob: '', burn: '', gs: '' });
  const r = fuelPlan(nums.fob, nums.burn, nums.gs);
  const sr = specificRange(nums.gs, nums.burn);

  return (
    <CalcShell
      title={t('tools.items.fuel.name')}
      intro={t('tools.items.fuel.blurb')}
      category={t('tools.categories.weight-fuel')}
      formula={t('fuel.formula')}
      onExample={() => {
        set('fob', '120');
        set('burn', '30');
        set('gs', '110');
      }}
      adelPrompt={() =>
        r != null
          ? `With ${inputs.fob} of fuel burning ${inputs.burn}/hr at ${inputs.gs} kt I have ${formatHours(r.enduranceHr)} endurance and ${Math.round(r.rangeNm)} NM range. How should I apply GACAR fuel-reserve requirements to this?`
          : null
      }
      related={[
        { to: '/tools/tsd', label: t('tools.items.tsd.name') },
        { to: '/tools/wind-triangle', label: t('tools.items.wind-triangle.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('fuel.fob')}
          value={inputs.fob}
          onChange={(v) => set('fob', v)}
          placeholder="120"
        />
        <NumberField
          label={t('fuel.burn')}
          value={inputs.burn}
          onChange={(v) => set('burn', v)}
          placeholder="30"
        />
        <NumberField
          label={t('fuel.gs')}
          value={inputs.gs}
          onChange={(v) => set('gs', v)}
          unit="kt"
          placeholder="110"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('fuel.endurance')}
          value={r != null ? formatHours(r.enduranceHr) : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('fuel.range')}
          value={r != null && r.rangeNm > 0 ? `${Math.round(r.rangeNm)} NM` : '—'}
        />
        <ResultStat label={t('fuel.sr')} value={sr != null ? `${sr.toFixed(2)} NM` : '—'} />
      </OutputGrid>
    </CalcShell>
  );
}
