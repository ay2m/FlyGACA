import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { fmtInt } from '@/components/calc/format';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { pressureAltitude } from '@/calc/isa';
import { flightLevel } from '@/calc/altimetry';

export function PressureAltitude() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ elev: '', qnh: '' });
  const pa = pressureAltitude(nums.elev, nums.qnh);
  const fl = pa != null ? flightLevel(pa) : null;

  return (
    <CalcShell
      title={t('tools.items.pressure-altitude.name')}
      intro={t('tools.items.pressure-altitude.blurb')}
      category={t('tools.categories.atmosphere-weather')}
      formula={t('pressureAltitude.formula')}
      onExample={() => {
        set('elev', '650');
        set('qnh', '1009');
      }}
      adelPrompt={() =>
        pa != null
          ? `Explain pressure altitude and flight level for field elevation ${inputs.elev} ft at QNH ${inputs.qnh} hPa (pressure altitude ${fmtInt(pa)} ft). When do I set 1013 and fly flight levels?`
          : null
      }
      related={[
        { to: '/tools/density-altitude', label: t('tools.items.density-altitude.name') },
        { to: '/tools/altimeter', label: t('tools.items.altimeter.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('pressureAltitude.elevation')}
          value={inputs.elev}
          onChange={(v) => set('elev', v)}
          unit="ft"
          placeholder="650"
        />
        <NumberField
          label={t('pressureAltitude.qnh')}
          value={inputs.qnh}
          onChange={(v) => set('qnh', v)}
          unit="hPa"
          placeholder="1009"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('pressureAltitude.pa')}
          value={pa != null ? `${fmtInt(pa)} ft` : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('pressureAltitude.fl')}
          value={fl != null ? `FL${String(fl).padStart(3, '0')}` : '—'}
        />
      </OutputGrid>
    </CalcShell>
  );
}
