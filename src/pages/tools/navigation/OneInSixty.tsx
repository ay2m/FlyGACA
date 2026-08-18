import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { oneInSixty } from '@/calc/navigation';

export function OneInSixty() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ flown: '', off: '', toGo: '' });
  const r = oneInSixty(nums.flown, nums.off, nums.toGo);

  return (
    <CalcShell
      title={t('tools.items.one-in-sixty.name')}
      intro={t('tools.items.one-in-sixty.blurb')}
      category={t('tools.categories.navigation')}
      formula={t('oneInSixty.formula')}
      onExample={() => {
        set('flown', '30');
        set('off', '2');
        set('toGo', '30');
      }}
      adelPrompt={() =>
        r != null
          ? `${inputs.off} NM off track after ${inputs.flown} NM is a ${r.trackErrorDeg.toFixed(0)}° track error; with ${inputs.toGo} NM to go I turn ${r.correctionDeg.toFixed(0)}° to make the destination. Explain the 1-in-60 rule.`
          : null
      }
      related={[{ to: '/tools/wind-triangle', label: t('tools.items.wind-triangle.name') }]}
    >
      <FieldGrid>
        <NumberField
          label={t('oneInSixty.flown')}
          value={inputs.flown}
          onChange={(v) => set('flown', v)}
          unit="NM"
          placeholder="30"
        />
        <NumberField
          label={t('oneInSixty.off')}
          value={inputs.off}
          onChange={(v) => set('off', v)}
          unit="NM"
          placeholder="2"
        />
        <NumberField
          label={t('oneInSixty.toGo')}
          value={inputs.toGo}
          onChange={(v) => set('toGo', v)}
          unit="NM"
          placeholder="30"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('oneInSixty.error')}
          value={r != null ? `${r.trackErrorDeg.toFixed(1)}°` : '—'}
        />
        <ResultStat
          label={t('oneInSixty.correction')}
          value={r != null ? `${r.correctionDeg.toFixed(1)}°` : '—'}
          tone="headline"
        />
      </OutputGrid>
    </CalcShell>
  );
}
