import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { NumberField } from '@/components/calc/NumberField';
import { TextField } from '@/components/calc/TextField';
import { FieldGrid } from '@/components/calc/Grids';
import { useNumericInputs } from '@/hooks/useNumericInputs';
import { parseRunways, windTable } from '@/calc/windTable';
import { CompassRose } from './CompassRose';
import styles from './WindTable.module.css';

export function WindTable() {
  const { t } = useTranslation();
  const { inputs, set, nums } = useNumericInputs({ dir: '', spd: '', rwys: '' });
  const rows = windTable(parseRunways(inputs.rwys), nums.dir, nums.spd);

  return (
    <CalcShell
      title={t('tools.items.wind-table.name')}
      intro={t('tools.items.wind-table.blurb')}
      category={t('tools.categories.performance')}
      formula={t('windTable.formula')}
      onExample={() => {
        set('dir', '120');
        set('spd', '18');
        set('rwys', '16L/34R, 07/25');
      }}
      related={[{ to: '/tools/crosswind', label: t('tools.items.crosswind.name') }]}
    >
      <FieldGrid>
        <NumberField
          label={t('windTable.windDir')}
          value={inputs.dir}
          onChange={(v) => set('dir', v)}
          unit="°"
          placeholder="120"
        />
        <NumberField
          label={t('windTable.windSpeed')}
          value={inputs.spd}
          onChange={(v) => set('spd', v)}
          unit="kt"
          placeholder="18"
        />
        <TextField
          label={t('windTable.runways')}
          value={inputs.rwys}
          onChange={(v) => set('rwys', v)}
          placeholder="16L/34R, 07/25"
          hint={t('windTable.runwaysHint')}
        />
      </FieldGrid>

      {rows.length === 0 ? (
        <p className={styles.empty}>{t('windTable.empty')}</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>{t('windTable.runwayCol')}</th>
                <th>{t('windTable.headingCol')}</th>
                <th>{t('windTable.crosswindCol')}</th>
                <th>{t('windTable.headwindCol')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const xwBad = Math.abs(r.crosswind) >= 15;
                return (
                  <tr key={r.label}>
                    <td>{r.label}</td>
                    <td>{r.heading}°</td>
                    <td className={xwBad ? styles.bad : undefined}>
                      {Math.abs(r.crosswind).toFixed(0)} kt {r.crosswind >= 0 ? '→R' : '←L'}
                    </td>
                    <td className={r.headwind < 0 ? styles.bad : undefined}>
                      {Math.abs(r.headwind).toFixed(0)} kt {r.headwind >= 0 ? 'H' : 'T'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > 0 && <CompassRose windDir={nums.dir} windSpeed={nums.spd} rows={rows} />}
    </CalcShell>
  );
}
