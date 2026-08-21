import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { standardRateTurn } from '@/calc/turn';
import { TurnCircle } from './TurnCircle';

export function StandardRateTurn() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ tas: '' });
  const r = standardRateTurn(nums.tas);

  return (
    <CalcShell
      title={t('tools.items.standard-rate-turn.name')}
      intro={t('tools.items.standard-rate-turn.blurb')}
      category={t('tools.categories.performance')}
      toolId="standard-rate-turn"
      formula={t('turn.formula')}
      onExample={() => set('tas', '120')}
      adelPrompt={() =>
        r != null
          ? `At ${inputs.tas} kt TAS a rate-one turn needs about ${r.bankDeg.toFixed(0)}° of bank and has a ${r.radiusNm.toFixed(2)} NM radius. When do I cap bank at 25–30° instead of holding rate one?`
          : null
      }
      related={[{ to: '/tools/tas', label: t('tools.items.tas.name') }]}
    >
      <FieldGrid>
        <NumberField
          label={t('turn.tas')}
          value={inputs.tas}
          onChange={(v) => set('tas', v)}
          unit="kt"
          placeholder="120"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('turn.bank')}
          value={r != null ? `${r.bankDeg.toFixed(1)}°` : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('turn.radius')}
          value={r != null ? `${r.radiusNm.toFixed(2)} NM` : '—'}
        />
        <ResultStat
          label={t('turn.rule')}
          value={r != null ? `${r.ruleOfThumbDeg.toFixed(0)}°` : '—'}
        />
      </OutputGrid>
      {r != null && (
        <TurnCircle
          bankDeg={r.bankDeg}
          label={t('turnCircle.label', {
            bank: r.bankDeg.toFixed(0),
            radius: r.radiusNm.toFixed(2),
          })}
        />
      )}
    </CalcShell>
  );
}
