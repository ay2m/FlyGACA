import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { visualDescentPoint } from '@/calc/descent';
import { ProfileRamp } from './ProfileRamp';

export function DescentVdp() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ hat: '', angle: '3', gs: '' });
  const r = visualDescentPoint(nums.hat, nums.angle, nums.gs);

  return (
    <CalcShell
      title={t('tools.items.descent-vdp.name')}
      intro={t('tools.items.descent-vdp.blurb')}
      category={t('tools.categories.performance')}
      toolId="descent-vdp"
      formula={t('vdp.formula')}
      onExample={() => {
        set('hat', '540');
        set('angle', '3');
        set('gs', '90');
      }}
      adelPrompt={() =>
        r != null
          ? `For ${inputs.hat} ft above touchdown on a ${inputs.angle}° path at ${inputs.gs} kt, the VDP is ${r.distanceNm.toFixed(1)} NM before the threshold at ${Math.round(r.rodFpm)} ft/min. How do I use a VDP on a non-precision approach?`
          : null
      }
      related={[{ to: '/tools/top-of-descent', label: t('tools.items.top-of-descent.name') }]}
    >
      <FieldGrid>
        <NumberField
          label={t('vdp.hat')}
          value={inputs.hat}
          onChange={(v) => set('hat', v)}
          unit="ft"
          placeholder="540"
        />
        <NumberField
          label={t('vdp.angle')}
          value={inputs.angle}
          onChange={(v) => set('angle', v)}
          unit="°"
          placeholder="3"
        />
        <NumberField
          label={t('vdp.gs')}
          value={inputs.gs}
          onChange={(v) => set('gs', v)}
          unit="kt"
          placeholder="90"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('vdp.distance')}
          value={r != null ? `${r.distanceNm.toFixed(1)} NM` : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('vdp.rod')}
          value={r != null ? `${Math.round(r.rodFpm)} ft/min` : '—'}
        />
      </OutputGrid>
      {r != null && (
        <ProfileRamp
          mode="descent"
          angleDeg={nums.angle}
          altLabel={`${Math.round(nums.hat)} ft`}
          distLabel={`${r.distanceNm.toFixed(1)} NM`}
        />
      )}
    </CalcShell>
  );
}
