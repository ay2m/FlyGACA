import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { aircraftTotals, monthTotals } from '@/calc/pilot/logbook';
import type { Flight } from '@/lib/services/account';
import styles from './account.module.css';

/** The collapsible by-aircraft / by-month breakdown tables. */
export function LogbookBreakdown({ flights }: { flights: Flight[] }) {
  const { t } = useTranslation();
  const aircraft = useMemo(() => aircraftTotals(flights), [flights]);
  const months = useMemo(() => monthTotals(flights, 6), [flights]);
  return (
    <details className={styles.breakdown}>
      <summary>{t('account.breakdown')}</summary>
      <div className={styles.breakdownGrids}>
        <div>
          <h2 className={styles.breakdownHead}>{t('account.byAircraft')}</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('account.reg')}</th>
                  <th>{t('account.type')}</th>
                  <th>{t('account.flightsCol')}</th>
                  <th>{t('account.totalHours')}</th>
                  <th>{t('account.ldg')}</th>
                  <th>{t('account.last')}</th>
                </tr>
              </thead>
              <tbody>
                {aircraft.map((a) => (
                  <tr key={a.reg}>
                    <td>{a.reg}</td>
                    <td>{a.type || '—'}</td>
                    <td>{a.flights}</td>
                    <td>{a.hours.toFixed(1)}</td>
                    <td>{a.landings}</td>
                    <td>{a.last || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <h2 className={styles.breakdownHead}>{t('account.byMonth')}</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{t('account.month')}</th>
                  <th>{t('account.totalHours')}</th>
                  <th>{t('account.ldg')}</th>
                  <th>{t('account.flightsCol')}</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.key}>
                    <td>{m.label}</td>
                    <td>{m.hours.toFixed(1)}</td>
                    <td>{m.landings}</td>
                    <td>{m.flights}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </details>
  );
}
