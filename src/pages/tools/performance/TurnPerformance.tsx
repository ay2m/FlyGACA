import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { turnPerformance } from '@/calc/turn';
import { TurnCircle } from './TurnCircle';

export function TurnPerformance() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ tas: '', bank: '' });
  const r = turnPerformance(nums.tas, nums.bank);

  return (
    <CalcShell
      title={t('tools.items.turn-performance.name')}
      intro={t('tools.items.turn-performance.blurb')}
      category={t('tools.categories.performance')}
      formula={t('turnPerf.formula')}
      onExample={() => {
        set('tas', '120');
        set('bank', '30');
      }}
      adelPrompt={() =>
        r != null
          ? `At ${inputs.tas} kt TAS and ${inputs.bank}° of bank the rate of turn is ${r.rateDegSec.toFixed(1)}°/s and the radius is ${r.radiusNm.toFixed(2)} NM. Explain how bank angle and speed change turn rate and radius.`
          : null
      }
      related={[
        { to: '/tools/standard-rate-turn', label: t('tools.items.standard-rate-turn.name') },
        { to: '/tools/holding', label: t('tools.items.holding.name') },
        { to: '/tools/tas', label: t('tools.items.tas.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('turnPerf.tas')}
          value={inputs.tas}
          onChange={(v) => set('tas', v)}
          unit="kt"
          placeholder="120"
        />
        <NumberField
          label={t('turnPerf.bank')}
          value={inputs.bank}
          onChange={(v) => set('bank', v)}
          unit="°"
          placeholder="30"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('turnPerf.rate')}
          value={r != null ? `${r.rateDegSec.toFixed(1)} °/s` : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('turnPerf.radius')}
          value={r != null ? `${r.radiusNm.toFixed(2)} NM` : '—'}
        />
      </OutputGrid>
      {r != null && (
        <TurnCircle
          bankDeg={nums.bank}
          label={t('turnCircle.label', {
            bank: nums.bank.toFixed(0),
            radius: r.radiusNm.toFixed(2),
          })}
        />
      )}
    </CalcShell>
  );
}
