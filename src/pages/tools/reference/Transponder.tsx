import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import styles from '@/pages/tools/performance/WindTable.module.css';

interface Code {
  code: string;
  meaning: string;
}

export function Transponder() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const codes = t('transponder.codes', { returnObjects: true }) as unknown as Code[];
  const filtered = codes.filter(
    (c) => c.code.includes(q.trim()) || c.meaning.toLowerCase().includes(q.trim().toLowerCase()),
  );

  return (
    <CalcShell
      title={t('tools.items.transponder.name')}
      intro={t('tools.items.transponder.blurb')}
      category={t('tools.categories.reference')}
      formula={t('transponder.formula')}
    >
      <TextField label={t('transponder.filter')} value={q} onChange={setQ} placeholder="7700" />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t('transponder.codeCol')}</th>
              <th>{t('transponder.meaningCol')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.code}>
                <td style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{c.code}</td>
                <td>{c.meaning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CalcShell>
  );
}
