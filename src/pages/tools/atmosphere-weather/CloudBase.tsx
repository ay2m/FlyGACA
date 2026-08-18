import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { fmtInt } from '@/components/calc/format';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { cloudBase } from '@/calc/cloud';

export function CloudBase() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ temp: '', dew: '' });
  const r = cloudBase(nums.temp, nums.dew);

  return (
    <CalcShell
      title={t('tools.items.cloud-base.name')}
      intro={t('tools.items.cloud-base.blurb')}
      category={t('tools.categories.atmosphere-weather')}
      formula={t('cloudBase.formula')}
      onExample={() => {
        set('temp', '34');
        set('dew', '12');
      }}
      adelPrompt={() =>
        r != null
          ? `With temperature ${inputs.temp}°C and dew point ${inputs.dew}°C the convective cloud base is about ${fmtInt(r.baseAglFt)} ft AGL. How reliable is this estimate and what raises or lowers it?`
          : null
      }
      related={[
        { to: '/tools/isa', label: t('tools.items.isa.name') },
        { to: '/tools/density-altitude', label: t('tools.items.density-altitude.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('cloudBase.temp')}
          value={inputs.temp}
          onChange={(v) => set('temp', v)}
          unit="°C"
          placeholder="34"
        />
        <NumberField
          label={t('cloudBase.dew')}
          value={inputs.dew}
          onChange={(v) => set('dew', v)}
          unit="°C"
          placeholder="12"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('cloudBase.base')}
          value={r != null ? `${fmtInt(r.baseAglFt)} ft` : '—'}
          sub={r != null ? t('cloudBase.spread', { spread: r.spread.toFixed(0) }) : undefined}
          tone="headline"
        />
      </OutputGrid>
    </CalcShell>
  );
}
