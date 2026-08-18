import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { fmtInt } from '@/components/calc/format';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { trueAltitude } from '@/calc/altimetry';

export function TrueAltitude() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ ind: '', src: '', oat: '' });
  const r = trueAltitude(nums.ind, nums.src, nums.oat);

  return (
    <CalcShell
      title={t('tools.items.true-altitude.name')}
      intro={t('tools.items.true-altitude.blurb')}
      category={t('tools.categories.atmosphere-weather')}
      formula={t('trueAlt.formula')}
      onExample={() => {
        set('ind', '10000');
        set('src', '0');
        set('oat', '-15');
      }}
      adelPrompt={() =>
        r != null
          ? `Indicated ${inputs.ind} ft above a source at ${inputs.src} ft with OAT ${inputs.oat}°C (ISA ${r.isaDevC >= 0 ? '+' : ''}${Math.round(r.isaDevC)}) gives a true altitude of about ${Math.round(r.trueAltFt)} ft (${r.correctionFt >= 0 ? '+' : ''}${Math.round(r.correctionFt)} ft). Explain temperature error and when cold-temperature corrections are mandatory.`
          : null
      }
      related={[
        { to: '/tools/density-altitude', label: t('tools.items.density-altitude.name') },
        { to: '/tools/isa', label: t('tools.items.isa.name') },
        { to: '/tools/altimeter', label: t('tools.items.altimeter.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('trueAlt.indicated')}
          value={inputs.ind}
          onChange={(v) => set('ind', v)}
          unit="ft"
          placeholder="10000"
        />
        <NumberField
          label={t('trueAlt.source')}
          value={inputs.src}
          onChange={(v) => set('src', v)}
          unit="ft"
          placeholder="0"
        />
        <NumberField
          label={t('trueAlt.oat')}
          value={inputs.oat}
          onChange={(v) => set('oat', v)}
          unit="°C"
          placeholder="-15"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('trueAlt.trueAlt')}
          value={r != null ? `${fmtInt(r.trueAltFt)} ft` : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('trueAlt.correction')}
          value={r != null ? `${r.correctionFt >= 0 ? '+' : ''}${fmtInt(r.correctionFt)} ft` : '—'}
        />
        <ResultStat
          label={t('trueAlt.isaDev')}
          value={r != null ? `${r.isaDevC >= 0 ? 'ISA+' : 'ISA'}${Math.round(r.isaDevC)} °C` : '—'}
        />
      </OutputGrid>
    </CalcShell>
  );
}
