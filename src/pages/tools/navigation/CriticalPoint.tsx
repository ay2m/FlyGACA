import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { equalTimePoint, pointOfNoReturn } from '@/calc/criticalPoint';
import { RouteCriticalPoints } from './RouteCriticalPoints';

/** "100 min" → "1h 40m" once past an hour. */
function mins(t: number): string {
  const m = Math.round(t);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m} min`;
}

export function CriticalPoint() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ dist: '', gso: '', gsh: '', end: '' });
  const etp = equalTimePoint(nums.dist, nums.gso, nums.gsh);
  const pnr = pointOfNoReturn(nums.end, nums.gso, nums.gsh);

  return (
    <CalcShell
      title={t('tools.items.critical-point.name')}
      intro={t('tools.items.critical-point.blurb')}
      category={t('tools.categories.navigation')}
      toolId="critical-point"
      formula={t('criticalPoint.formula')}
      onExample={() => {
        set('dist', '500');
        set('gso', '150');
        set('gsh', '100');
        set('end', '300');
      }}
      adelPrompt={() =>
        etp != null
          ? `For a ${inputs.dist} NM leg with ${inputs.gso} kt groundspeed out and ${inputs.gsh} kt returning, the equal time point is ${Math.round(etp.distNm)} NM out (${mins(etp.timeMin)})${pnr ? ` and, with ${inputs.end} min usable endurance, the point of no return is ${Math.round(pnr.distNm)} NM out` : ''}. Explain the critical point and PNR like a flight instructor.`
          : null
      }
      related={[
        { to: '/tools/great-circle', label: t('tools.items.great-circle.name') },
        { to: '/tools/fuel', label: t('tools.items.fuel.name') },
        { to: '/tools/tsd', label: t('tools.items.tsd.name') },
      ]}
    >
      <FieldGrid>
        <NumberField
          label={t('criticalPoint.distance')}
          value={inputs.dist}
          onChange={(v) => set('dist', v)}
          unit="NM"
          placeholder="500"
        />
        <NumberField
          label={t('criticalPoint.gsOut')}
          value={inputs.gso}
          onChange={(v) => set('gso', v)}
          unit="kt"
          placeholder="150"
        />
        <NumberField
          label={t('criticalPoint.gsHome')}
          value={inputs.gsh}
          onChange={(v) => set('gsh', v)}
          unit="kt"
          placeholder="100"
        />
        <NumberField
          label={t('criticalPoint.endurance')}
          value={inputs.end}
          onChange={(v) => set('end', v)}
          unit="min"
          placeholder="300"
        />
      </FieldGrid>
      <OutputGrid>
        <ResultStat
          label={t('criticalPoint.etpDist')}
          value={etp != null ? `${Math.round(etp.distNm)} NM` : '—'}
          tone="headline"
        />
        <ResultStat
          label={t('criticalPoint.etpTime')}
          value={etp != null ? mins(etp.timeMin) : '—'}
        />
        <ResultStat
          label={t('criticalPoint.pnrDist')}
          value={pnr != null ? `${Math.round(pnr.distNm)} NM` : '—'}
        />
        <ResultStat
          label={t('criticalPoint.pnrTime')}
          value={pnr != null ? mins(pnr.timeMin) : '—'}
        />
      </OutputGrid>
      {etp != null && (
        <RouteCriticalPoints
          totalNm={nums.dist}
          etpNm={etp.distNm}
          pnrNm={pnr != null ? pnr.distNm : NaN}
        />
      )}
    </CalcShell>
  );
}
