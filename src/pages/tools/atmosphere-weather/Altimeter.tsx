import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { fmtInt } from '@/components/calc/format';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { altimeter } from '@/calc/altimetry';
import { AltimeterDial } from './AltimeterDial';

export function Altimeter() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ qnh: '', elev: '' });
  const r = altimeter(nums.qnh, nums.elev);

  return (
    <CalcShell
      title={t('tools.items.altimeter.name')}
      intro={t('tools.items.altimeter.blurb')}
      category={t('tools.categories.atmosphere-weather')}
      toolId="altimeter"
      formula={t('altimeter.formula')}
      onExample={() => {
        set('qnh', '1011');
        set('elev', '1700');
      }}
      adelPrompt={() =>
        r != null
          ? `At field elevation ${inputs.elev} ft with QNH ${inputs.qnh} hPa, QFE is ${r.qfe.toFixed(0)} hPa. Explain when I'd use QNH vs QFE and how the altimeter reads with each.`
          : null
      }
      related={[
        { to: '/tools/pressure-altitude', label: t('tools.items.pressure-altitude.name') },
        { to: '/tools/density-altitude', label: t('tools.items.density-altitude.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('altimeter.qnh')}
          value={inputs.qnh}
          onChange={(v) => set('qnh', v)}
          unit="hPa"
          placeholder="1011"
        />
        <NumberField
          label={t('altimeter.elevation')}
          value={inputs.elev}
          onChange={(v) => set('elev', v)}
          unit="ft"
          placeholder="1700"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('altimeter.qfe')}
          value={r != null ? `${r.qfe.toFixed(0)} hPa` : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('altimeter.pa')}
          value={r != null ? `${fmtInt(r.pressureAltitude)} ft` : '—'}
        />
      </OutputGrid>
      {r != null && <AltimeterDial pressureAltitude={r.pressureAltitude} />}
    </CalcShell>
  );
}
