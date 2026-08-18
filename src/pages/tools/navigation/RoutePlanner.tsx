import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { TextField } from '@/components/calc/TextField';
import { ResultStat } from '@/components/calc/ResultStat';
import { FieldGrid, OutputGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { useFetchJson } from '@/hooks/useFetchJson';
import type { AirportsIndex } from '@/lib/content';
import { greatCircle } from '@/calc/navigation';
import { formatHours } from '@/calc/fuel';
import table from '@/pages/tools/performance/WindTable.module.css';

export function RoutePlanner() {
  const { t } = useTranslation();
  const { data, loading, error } = useFetchJson<AirportsIndex>('/data/airports.json');
  const { inputs, set, nums } = useNumericInputs({ route: '', gs: '', burn: '' });

  const byIcao = useMemo(() => {
    const m = new Map<string, AirportsIndex['airports'][number]>();
    data?.airports.forEach((a) => m.set(a.icao, a));
    return m;
  }, [data]);

  const codes = inputs.route.trim().toUpperCase().split(/\s+/).filter(Boolean);
  const unknown = codes.filter((c) => /^[A-Z]{4}$/.test(c) && !byIcao.has(c));

  const legs = useMemo(() => {
    const out: { from: string; to: string; distanceNm: number; bearingDeg: number }[] = [];
    for (let i = 0; i < codes.length - 1; i++) {
      const a = byIcao.get(codes[i]);
      const b = byIcao.get(codes[i + 1]);
      if (!a || !b) continue;
      const gc = greatCircle(a.lat, a.lon, b.lat, b.lon);
      if (gc)
        out.push({
          from: codes[i],
          to: codes[i + 1],
          distanceNm: gc.distanceNm,
          bearingDeg: gc.bearingDeg,
        });
    }
    return out;
  }, [codes, byIcao]);

  const total = legs.reduce((s, l) => s + l.distanceNm, 0);
  const gs = nums.gs;
  const burn = nums.burn;
  const timeHr = total > 0 && gs > 0 ? total / gs : null;
  const fuel = timeHr != null && burn > 0 ? burn * timeHr : null;

  return (
    <CalcShell
      title={t('tools.items.route-planner.name')}
      intro={t('tools.items.route-planner.blurb')}
      category={t('tools.categories.navigation')}
      formula={t('routePlanner.formula')}
      onExample={() => {
        set('route', 'OERK OEDF OEJN');
        set('gs', '420');
        set('burn', '1800');
      }}
      related={[
        { to: '/tools/great-circle', label: t('tools.items.great-circle.name') },
        { to: '/tools/aerodromes', label: t('tools.items.aerodromes.name') },
      ]}
    >
      {loading && <p>{t('common.loading')}</p>}
      {error && <p role="alert">{t('common.loadError')}</p>}
      <FieldGrid>
        <TextField
          label={t('routePlanner.route')}
          value={inputs.route}
          onChange={(v) => set('route', v)}
          placeholder="OERK OEDF OEJN"
          hint={t('routePlanner.routeHint')}
        />
        <NumberField
          label={t('routePlanner.gs')}
          value={inputs.gs}
          onChange={(v) => set('gs', v)}
          unit="kt"
          placeholder="420"
        />
        <NumberField
          label={t('routePlanner.burn')}
          value={inputs.burn}
          onChange={(v) => set('burn', v)}
          placeholder="1800"
        />
      </FieldGrid>

      {unknown.length > 0 && (
        <p style={{ color: 'var(--color-error)', fontSize: 'var(--fs-sm)', margin: 0 }}>
          {t('routePlanner.unknown', { codes: unknown.join(', ') })}
        </p>
      )}

      {legs.length > 0 && (
        <>
          <div className={table.tableWrap}>
            <table className={table.table}>
              <thead>
                <tr>
                  <th>{t('routePlanner.legCol')}</th>
                  <th>{t('routePlanner.distCol')}</th>
                  <th>{t('routePlanner.bearingCol')}</th>
                </tr>
              </thead>
              <tbody>
                {legs.map((l, i) => (
                  <tr key={i}>
                    <td>
                      {l.from} → {l.to}
                    </td>
                    <td>{Math.round(l.distanceNm)} NM</td>
                    <td>{Math.round(l.bearingDeg)}°</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <OutputGrid>
            <ResultStat
              label={t('routePlanner.total')}
              value={`${Math.round(total)} NM`}
              tone="headline"
            />
            <ResultStat
              label={t('routePlanner.time')}
              value={timeHr != null ? formatHours(timeHr) : '—'}
            />
            <ResultStat
              label={t('routePlanner.fuel')}
              value={fuel != null ? `${Math.round(fuel)}` : '—'}
            />
          </OutputGrid>
        </>
      )}
    </CalcShell>
  );
}
