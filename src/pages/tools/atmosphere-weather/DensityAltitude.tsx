import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { ResultStat } from '@/components/calc/ResultStat';
import { fmtInt } from '@/components/calc/format';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { densityAltitude } from '@/calc/isa';
import { NumberField } from '@/components/calc/NumberField';
import { GaugeDial } from '@/components/calc/GaugeDial';

const EXAMPLE = { elev: '5000', qnh: '1013', oat: '30' };

export function DensityAltitude() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ elev: '', qnh: '', oat: '' });

  const r = densityAltitude(nums.elev, nums.qnh, nums.oat);

  const adelPrompt = () => {
    if (!r) return null;
    return (
      `Explain this density-altitude computation like a flight instructor. ` +
      `Field elevation ${inputs.elev} ft, QNH ${inputs.qnh} hPa, OAT ${inputs.oat}°C → ` +
      `pressure altitude ${Math.round(r.pa)} ft, ISA ${r.isaDev >= 0 ? '+' : ''}${Math.round(r.isaDev)}°C, ` +
      `density altitude ${Math.round(r.da)} ft. How does density altitude affect take-off and climb ` +
      `performance, and how should I use it with the POH/AFM? Cite the relevant GACAR guidance if any applies.`
    );
  };

  return (
    <CalcShell
      title={t('densityAltitude.title')}
      intro={t('densityAltitude.intro')}
      category={t('tools.categories.atmosphere-weather')}
      toolId="density-altitude"
      formula={t('densityAltitude.formula')}
      onExample={() => {
        set('elev', EXAMPLE.elev);
        set('qnh', EXAMPLE.qnh);
        set('oat', EXAMPLE.oat);
      }}
      adelPrompt={adelPrompt}
      related={[
        { to: '/tools/isa', label: t('tools.items.isa.name') },
        { to: '/tools/true-altitude', label: t('tools.items.true-altitude.name') },
        { to: '/tools/takeoff-landing', label: t('tools.items.takeoff-landing.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('densityAltitude.elevation')}
          value={inputs.elev}
          onChange={(v) => set('elev', v)}
          placeholder="5000"
        />
        <NumberField
          label={t('densityAltitude.qnh')}
          value={inputs.qnh}
          onChange={(v) => set('qnh', v)}
          placeholder="1013"
        />
        <NumberField
          label={t('densityAltitude.oat')}
          value={inputs.oat}
          onChange={(v) => set('oat', v)}
          placeholder="30"
        />
      </FieldGrid>

      <OutputGrid>
        <ResultStat
          label={t('densityAltitude.pressureAltitude')}
          value={r ? `${fmtInt(r.pa)} ft` : '—'}
        />
        <ResultStat
          label={t('densityAltitude.isaDev')}
          value={r ? `${r.isaDev >= 0 ? 'ISA+' : 'ISA'}${Math.round(r.isaDev)}°C` : '—'}
        />
        <ResultStat
          label={t('densityAltitude.densityAltitude')}
          value={r ? `${fmtInt(r.da)} ft` : '—'}
          tone="headline"
        />
      </OutputGrid>
      {r != null && (
        <GaugeDial
          label={t('densityAltitude.densityAltitude')}
          value={r.da}
          min={-2000}
          max={16000}
          unit="FT"
        />
      )}
    </CalcShell>
  );
}
