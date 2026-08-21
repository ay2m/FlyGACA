import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { ResultStat } from '@/components/calc/ResultStat';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { trueAirspeed } from '@/calc/tas';
import { NumberField } from '@/components/calc/NumberField';
import { GaugeDial } from '@/components/calc/GaugeDial';

const EXAMPLE = { cas: '110', pa: '8000', oat: '10' };

export function Tas() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ cas: '', pa: '', oat: '' });

  const r = trueAirspeed({
    cas: nums.cas,
    pa: nums.pa,
    oat: nums.oat,
  });

  const adelPrompt = () => {
    if (!r) return null;
    return (
      `Explain this true-airspeed computation like a flight instructor. ` +
      `CAS ${inputs.cas} kt at pressure altitude ${inputs.pa} ft, OAT ${inputs.oat}°C → ` +
      `TAS ${Math.round(r.tas)} kt (M ${r.mach.toFixed(3)}, ISA ${r.isaDev >= 0 ? '+' : ''}${Math.round(r.isaDev)}°C). ` +
      `Why does TAS grow with altitude, and when do I use TAS vs CAS vs groundspeed in planning?`
    );
  };

  return (
    <CalcShell
      title={t('tas.title')}
      intro={t('tas.intro')}
      category={t('tools.categories.performance')}
      toolId="tas"
      formula={t('tas.formula')}
      onExample={() => {
        set('cas', EXAMPLE.cas);
        set('pa', EXAMPLE.pa);
        set('oat', EXAMPLE.oat);
      }}
      adelPrompt={adelPrompt}
      related={[
        { to: '/tools/mach', label: t('tools.items.mach.name') },
        { to: '/tools/isa', label: t('tools.items.isa.name') },
        { to: '/tools/wind-triangle', label: t('tools.items.wind-triangle.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('tas.cas')}
          value={inputs.cas}
          onChange={(v) => set('cas', v)}
          placeholder="110"
        />
        <NumberField
          label={t('tas.pa')}
          value={inputs.pa}
          onChange={(v) => set('pa', v)}
          placeholder="8000"
        />
        <NumberField
          label={t('tas.oat')}
          value={inputs.oat}
          onChange={(v) => set('oat', v)}
          placeholder="10"
        />
      </FieldGrid>

      <OutputGrid>
        <ResultStat
          label={t('tas.trueAirspeed')}
          value={r ? `${Math.round(r.tas)} kt` : '—'}
          tone="headline"
        />
        <ResultStat label={t('tas.mach')} value={r ? `M ${r.mach.toFixed(3)}` : '—'} />
        <ResultStat
          label={t('tas.isaDev')}
          value={r ? `${r.isaDev >= 0 ? 'ISA+' : 'ISA'}${Math.round(r.isaDev)}°C` : '—'}
        />
      </OutputGrid>
      {r != null && (
        <GaugeDial label={t('tas.trueAirspeed')} value={r.tas} min={0} max={400} unit="KT" />
      )}
    </CalcShell>
  );
}
