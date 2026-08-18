import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { useFetchJson } from '@/hooks/useFetchJson';
import type { AirspacesIndex, AtsAirspace } from '@/lib/content';
import table from '@/pages/tools/performance/WindTable.module.css';
import dir from './Aerodromes.module.css';

interface Row {
  cls: string;
  rules: string;
}

/** Order the directory by airspace type, control zones first. */
const TYPE_ORDER = ['CTR', 'TMA'];

export function Airspace() {
  const { t, i18n } = useTranslation();
  const ar = i18n.language === 'ar';
  const rows = t('airspace.rows', { returnObjects: true }) as unknown as Row[];
  const { data } = useFetchJson<AirspacesIndex>('/data/airspaces-index.json');

  const colorByType = useMemo(
    () => Object.fromEntries((data?.classes ?? []).map((c) => [c.id, c.color])),
    [data],
  );

  const groups = useMemo(() => {
    const byType = new Map<string, AtsAirspace[]>();
    for (const a of data?.airspaces ?? []) {
      const list = byType.get(a.type) ?? [];
      list.push(a);
      byType.set(a.type, list);
    }
    return TYPE_ORDER.filter((type) => byType.has(type)).map(
      (type) =>
        [
          type,
          byType
            .get(type)!
            .sort((x, y) =>
              ar ? x.name_ar.localeCompare(y.name_ar) : x.name.localeCompare(y.name),
            ),
        ] as const,
    );
  }, [data, ar]);

  return (
    <CalcShell
      title={t('tools.items.airspace.name')}
      intro={t('tools.items.airspace.blurb')}
      category={t('tools.categories.procedures')}
      formula={t('airspace.formula')}
      related={[{ to: '/tools/vfr-minima', label: t('tools.items.vfr-minima.name') }]}
    >
      <div className={table.tableWrap}>
        <table className={table.table}>
          <thead>
            <tr>
              <th>{t('airspace.classCol')}</th>
              <th>{t('airspace.rulesCol')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.cls}>
                <td style={{ fontWeight: 700, color: 'var(--accent-bright)' }}>{r.cls}</td>
                <td>{r.rules}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.airspaces.length > 0 && (
        <section aria-labelledby="airspace-zones">
          <h2 id="airspace-zones">{t('airspace.zonesTitle')}</h2>
          <p>{t('airspace.zonesLead')}</p>
          <p className={dir.count}>{t('airspace.zonesCount', { n: data.count })}</p>
          {groups.map(([type, list]) => (
            <div key={type}>
              <h3>{t(`airspace.type${type}`, type)}</h3>
              <ul className={dir.list}>
                {list.map((a) => (
                  <li key={a.id} className={dir.card}>
                    <div className={dir.head}>
                      <span className={dir.icao} style={{ color: colorByType[a.type] }}>
                        {a.type}
                      </span>
                      <span className={dir.iata}>{t('airspace.classChip', { c: a.class })}</span>
                      <span className={dir.name}>{ar ? a.name_ar : a.name}</span>
                    </div>
                    <div className={dir.meta}>
                      <span>
                        {a.polygon
                          ? t('airspace.boundary')
                          : t('airspace.radiusNm', { n: a.radius_nm })}
                      </span>
                      {a.unit && <span>{a.unit}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </CalcShell>
  );
}
