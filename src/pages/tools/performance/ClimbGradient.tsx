import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { climbFromFtPerNm } from '@/calc/climb';
import { ProfileRamp } from './ProfileRamp';

export function ClimbGradient() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ grad: '', gs: '' });
  const r = climbFromFtPerNm(nums.grad, Number.isFinite(nums.gs) ? nums.gs : undefined);

  return (
    <CalcShell
      title={t('tools.items.climb-gradient.name')}
      intro={t('tools.items.climb-gradient.blurb')}
      category={t('tools.categories.performance')}
      formula={t('climb.formula')}
      onExample={() => {
        set('grad', '318');
        set('gs', '120');
      }}
      adelPrompt={() =>
        r != null
          ? `A ${inputs.grad} ft/NM climb gradient is ${r.percent.toFixed(1)}% (${r.degrees.toFixed(1)}°)${r.fpm != null ? `, needing ${Math.round(r.fpm)} ft/min at ${inputs.gs} kt` : ''}. How do SID minimum climb gradients work and what if I can't meet one?`
          : null
      }
      related={[{ to: '/tools/tas', label: t('tools.items.tas.name') }]}
    >
      <FieldGrid>
        <NumberField
          label={t('climb.gradient')}
          value={inputs.grad}
          onChange={(v) => set('grad', v)}
          unit="ft/NM"
          placeholder="318"
        />
        <NumberField
          label={t('climb.gs')}
          value={inputs.gs}
          onChange={(v) => set('gs', v)}
          unit="kt"
          placeholder="120"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('climb.percent')}
          value={r != null ? `${r.percent.toFixed(1)} %` : '—'}
          tone="headline"
        />
        <ResultStat label={t('climb.angle')} value={r != null ? `${r.degrees.toFixed(1)}°` : '—'} />
        <ResultStat
          label={t('climb.fpm')}
          value={r?.fpm != null ? `${Math.round(r.fpm)} ft/min` : '—'}
        />
      </OutputGrid>
      {r != null && (
        <ProfileRamp mode="climb" angleDeg={r.degrees} distLabel={`${r.percent.toFixed(1)} %`} />
      )}
    </CalcShell>
  );
}
