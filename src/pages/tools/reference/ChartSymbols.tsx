import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import styles from '@/pages/tools/performance/WindTable.module.css';

interface Item {
  symbol: string;
  meaning: string;
}

export function ChartSymbols() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const items = t('chartSymbols.items', { returnObjects: true }) as unknown as Item[];
  const query = q.trim().toLowerCase();
  const filtered = items.filter(
    (i) =>
      !query || i.symbol.toLowerCase().includes(query) || i.meaning.toLowerCase().includes(query),
  );

  return (
    <CalcShell
      title={t('tools.items.chart-symbols.name')}
      intro={t('tools.items.chart-symbols.blurb')}
      category={t('tools.categories.reference')}
      formula={t('chartSymbols.formula')}
    >
      <TextField label={t('chartSymbols.filter')} value={q} onChange={setQ} placeholder="CTR" />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('chartSymbols.symbolCol')}</th>
              <th>{t('chartSymbols.meaningCol')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.symbol}>
                <td style={{ fontWeight: 700, color: 'var(--accent-bright)' }}>{i.symbol}</td>
                <td>{i.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CalcShell>
  );
}
