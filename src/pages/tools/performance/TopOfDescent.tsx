import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { topOfDescent } from '@/calc/descent';
import { ProfileRamp } from './ProfileRamp';

export function TopOfDescent() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ alt: '', angle: '3', gs: '' });
  const r = topOfDescent(nums.alt, nums.angle, nums.gs);

  return (
    <CalcShell
      title={t('tools.items.top-of-descent.name')}
      intro={t('tools.items.top-of-descent.blurb')}
      category={t('tools.categories.performance')}
      toolId="top-of-descent"
      formula={t('tod.formula')}
      onExample={() => {
        set('alt', '3000');
        set('angle', '3');
        set('gs', '120');
      }}
      adelPrompt={() =>
        r != null
          ? `To lose ${inputs.alt} ft at ${inputs.angle}° and ${inputs.gs} kt groundspeed I start down ${r.distanceNm.toFixed(1)} NM out at ${Math.round(r.rodFpm)} ft/min. How do I plan and fly a stable descent?`
          : null
      }
      related={[
        { to: '/tools/climb-gradient', label: t('tools.items.climb-gradient.name') },
        { to: '/tools/descent-vdp', label: t('tools.items.descent-vdp.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('tod.alt')}
          value={inputs.alt}
          onChange={(v) => set('alt', v)}
          unit="ft"
          placeholder="3000"
        />
        <NumberField
          label={t('tod.angle')}
          value={inputs.angle}
          onChange={(v) => set('angle', v)}
          unit="°"
          placeholder="3"
        />
        <NumberField
          label={t('tod.gs')}
          value={inputs.gs}
          onChange={(v) => set('gs', v)}
          unit="kt"
          placeholder="120"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('tod.distance')}
          value={r != null ? `${r.distanceNm.toFixed(1)} NM` : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('tod.rod')}
          value={r != null ? `${Math.round(r.rodFpm)} ft/min` : '—'}
        />
      </OutputGrid>
      {r != null && (
        <ProfileRamp
          mode="descent"
          angleDeg={nums.angle}
          altLabel={`${Math.round(nums.alt)} ft`}
          distLabel={`${r.distanceNm.toFixed(1)} NM`}
        />
      )}
    </CalcShell>
  );
}
