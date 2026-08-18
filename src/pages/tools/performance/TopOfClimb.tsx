import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { timeToClimb } from '@/calc/climb';
import { ProfileRamp } from './ProfileRamp';

export function TopOfClimb() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ gain: '', roc: '', gs: '', ff: '' });
  const r = timeToClimb(nums.gain, nums.roc, nums.gs, inputs.ff ? nums.ff : undefined);

  return (
    <CalcShell
      title={t('tools.items.top-of-climb.name')}
      intro={t('tools.items.top-of-climb.blurb')}
      category={t('tools.categories.performance')}
      formula={t('topOfClimb.formula')}
      onExample={() => {
        set('gain', '10000');
        set('roc', '500');
        set('gs', '120');
        set('ff', '15');
      }}
      adelPrompt={() =>
        r != null
          ? `Climbing ${inputs.gain} ft at ${inputs.roc} fpm and ${inputs.gs} kt groundspeed takes ${Math.round(r.timeMin)} min over ${Math.round(r.distNm)} NM${r.fuel != null ? `, burning about ${r.fuel.toFixed(1)} units` : ''}. Explain how to plan the top of climb and why the AFM climb tables matter.`
          : null
      }
      related={[
        { to: '/tools/climb-gradient', label: t('tools.items.climb-gradient.name') },
        { to: '/tools/top-of-descent', label: t('tools.items.top-of-descent.name') },
        { to: '/tools/fuel', label: t('tools.items.fuel.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('topOfClimb.altGain')}
          value={inputs.gain}
          onChange={(v) => set('gain', v)}
          unit="ft"
          placeholder="10000"
        />
        <NumberField
          label={t('topOfClimb.roc')}
          value={inputs.roc}
          onChange={(v) => set('roc', v)}
          unit="fpm"
          placeholder="500"
        />
        <NumberField
          label={t('topOfClimb.gs')}
          value={inputs.gs}
          onChange={(v) => set('gs', v)}
          unit="kt"
          placeholder="120"
        />
        <NumberField
          label={t('topOfClimb.fuelFlow')}
          value={inputs.ff}
          onChange={(v) => set('ff', v)}
          unit="/hr"
          placeholder="15"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('topOfClimb.time')}
          value={r != null ? `${Math.round(r.timeMin)} min` : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('topOfClimb.dist')}
          value={r != null ? `${Math.round(r.distNm)} NM` : '—'}
        />
        <ResultStat
          label={t('topOfClimb.fuel')}
          value={r != null && r.fuel != null ? r.fuel.toFixed(1) : '—'}
        />
      </OutputGrid>
      {r != null && (
        <ProfileRamp
          mode="climb"
          angleDeg={(Math.atan2(nums.gain, r.distNm * 6076) * 180) / Math.PI}
          altLabel={`${Math.round(nums.gain)} ft`}
          distLabel={`${Math.round(r.distNm)} NM`}
        />
      )}
    </CalcShell>
  );
}
