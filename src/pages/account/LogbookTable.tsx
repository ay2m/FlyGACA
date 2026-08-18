import { useTranslation } from 'react-i18next';
import type { FlightDraft } from '@/components/account/flight';
import { sumHours, type Flight } from '@/lib/services/account';
import type { SortDir } from '@/calc/pilot/logbook';
import styles from './account.module.css';

const COLS: (keyof FlightDraft)[] = [
  'date',
  'type',
  'reg',
  'from',
  'to',
  'total',
  'pic',
  'night',
  'ifr',
  'ldg',
  'nightLdg',
  'appr',
];

/** The sortable flights table with its totals row. */
export function LogbookTable({
  view,
  sort,
  onToggleSort,
  onEdit,
  onDelete,
}: {
  view: Flight[];
  sort: { key: keyof Flight; dir: SortDir };
  onToggleSort: (key: keyof Flight) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  const sortMark = (key: keyof Flight) =>
    sort.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '';
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c}>
                <button
                  type="button"
                  className={styles.sortBtn}
                  onClick={() => onToggleSort(c as keyof Flight)}
                  aria-label={t('account.sortBy', { col: t(`account.${c}`) })}
                >
                  {t(`account.${c}`)}
                  {sortMark(c as keyof Flight)}
                </button>
              </th>
            ))}
            <th />
          </tr>
        </thead>
        <tbody>
          {view.map((f) => (
            <tr key={f.id}>
              {COLS.map((c) => (
                <td key={c}>{f[c] || '—'}</td>
              ))}
              <td className={styles.rowActions}>
                <button
                  type="button"
                  className={styles.rowBtn}
                  onClick={() => onEdit(f.id)}
                  aria-label={t('account.edit')}
                >
                  ✎
                </button>
                <button
                  type="button"
                  className={styles.del}
                  onClick={() => onDelete(f.id)}
                  aria-label={t('account.delete')}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
          <tr className={styles.totals}>
            <td colSpan={5}>{t('account.totals')}</td>
            <td>{sumHours(view, 'total').toFixed(1)}</td>
            <td>{sumHours(view, 'pic').toFixed(1)}</td>
            <td>{sumHours(view, 'night').toFixed(1)}</td>
            <td>{sumHours(view, 'ifr').toFixed(1)}</td>
            <td>{sumHours(view, 'ldg').toFixed(0)}</td>
            <td>{sumHours(view, 'nightLdg').toFixed(0)}</td>
            <td>{sumHours(view, 'appr').toFixed(0)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
