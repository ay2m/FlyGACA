import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { isaDeviation, isaTemperature } from '@/calc/isa';
import { IsaThermometer } from './IsaThermometer';

export function Isa() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ pa: '', oat: '' });
  const isaTemp = isaTemperature(nums.pa);
  const dev = isaDeviation(nums.oat, nums.pa);

  return (
    <CalcShell
      title={t('tools.items.isa.name')}
      intro={t('tools.items.isa.blurb')}
      category={t('tools.categories.atmosphere-weather')}
      formula={t('isaTool.formula')}
      onExample={() => {
        set('pa', '10000');
        set('oat', '5');
      }}
      adelPrompt={() =>
        dev != null
          ? `At pressure altitude ${inputs.pa} ft the ISA temperature is ${isaTemp?.toFixed(1)}°C and the OAT is ${inputs.oat}°C, so ISA ${dev >= 0 ? '+' : ''}${Math.round(dev)}. Why does ISA deviation matter for performance and true airspeed?`
          : null
      }
      related={[
        { to: '/tools/density-altitude', label: t('tools.items.density-altitude.name') },
        { to: '/tools/tas', label: t('tools.items.tas.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('isaTool.pa')}
          value={inputs.pa}
          onChange={(v) => set('pa', v)}
          unit="ft"
          placeholder="10000"
        />
        <NumberField
          label={t('isaTool.oat')}
          value={inputs.oat}
          onChange={(v) => set('oat', v)}
          unit="°C"
          placeholder="5"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('isaTool.temp')}
          value={isaTemp != null ? `${isaTemp.toFixed(1)} °C` : '—'}
        />
        <ResultStat
          label={t('isaTool.dev')}
          value={dev != null ? `${dev >= 0 ? 'ISA+' : 'ISA'}${Math.round(dev)} °C` : '—'}
          tone="headline"
        />
      </OutputGrid>
      {isaTemp != null && dev != null && (
        <IsaThermometer oat={nums.oat} isaTemp={isaTemp} dev={dev} />
      )}
    </CalcShell>
  );
}
