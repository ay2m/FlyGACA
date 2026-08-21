import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { fmtInt } from '@/components/calc/format';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { factoredRunway } from '@/calc/runwayPerf';
import { RunwayMarginBar } from './RunwayMarginBar';

export function TakeoffLanding() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({
    book: '',
    da: '',
    slope: '',
    safety: '',
    avail: '',
  });
  const r = factoredRunway({
    bookM: nums.book,
    daFt: nums.da,
    slopePct: nums.slope,
    safetyPct: nums.safety,
    availableM: nums.avail,
  });

  return (
    <CalcShell
      title={t('tools.items.takeoff-landing.name')}
      intro={t('tools.items.takeoff-landing.blurb')}
      category={t('tools.categories.performance')}
      toolId="takeoff-landing"
      formula={t('runwayPerf.formula')}
      onExample={() => {
        set('book', '600');
        set('da', '3000');
        set('slope', '1');
        set('safety', '43');
        set('avail', '1400');
      }}
      adelPrompt={() =>
        r != null
          ? `A book distance of ${inputs.book} m factored for ${inputs.da || 0} ft DA, ${inputs.slope || 0}% slope and a ${inputs.safety || 0}% safety factor needs ${fmtInt(r.required)} m. How should I apply factored runway distances and what regulatory factor applies under GACAR?`
          : null
      }
      related={[
        { to: '/tools/density-altitude', label: t('tools.items.density-altitude.name') },
        { to: '/tools/crosswind', label: t('tools.items.crosswind.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('runwayPerf.book')}
          value={inputs.book}
          onChange={(v) => set('book', v)}
          unit="m"
          placeholder="600"
        />
        <NumberField
          label={t('runwayPerf.da')}
          value={inputs.da}
          onChange={(v) => set('da', v)}
          unit="ft"
          placeholder="3000"
        />
        <NumberField
          label={t('runwayPerf.slope')}
          value={inputs.slope}
          onChange={(v) => set('slope', v)}
          unit="%"
          placeholder="1"
        />
        <NumberField
          label={t('runwayPerf.safety')}
          value={inputs.safety}
          onChange={(v) => set('safety', v)}
          unit="%"
          placeholder="43"
        />
        <NumberField
          label={t('runwayPerf.available')}
          value={inputs.avail}
          onChange={(v) => set('avail', v)}
          unit="m"
          placeholder="1400"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('runwayPerf.required')}
          value={r != null ? `${fmtInt(r.required)} m` : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('runwayPerf.factor')}
          value={r != null ? `× ${r.factor.toFixed(2)}` : '—'}
        />
        <ResultStat
          label={t('runwayPerf.margin')}
          value={r?.margin != null ? `${fmtInt(r.margin)} m` : '—'}
          sub={
            r?.margin != null
              ? r.ok
                ? t('runwayPerf.adequate')
                : t('runwayPerf.short')
              : undefined
          }
          tone={r?.margin != null ? (r.ok ? 'good' : 'bad') : undefined}
        />
      </OutputGrid>
      {r?.margin != null && (
        <RunwayMarginBar requiredM={r.required} availableM={nums.avail} ok={r.ok} />
      )}
    </CalcShell>
  );
}
