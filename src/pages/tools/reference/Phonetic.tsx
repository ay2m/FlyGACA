import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import { TextField } from '@/components/calc/TextField';
import { PHONETIC } from '@/data/phonetic';
import styles from './Phonetic.module.css';

export function Phonetic() {
  const { t } = useTranslation();
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const filtered = PHONETIC.filter(
    (e) => !query || e.symbol.toLowerCase() === query || e.word.toLowerCase().includes(query),
  );

  return (
    <CalcShell
      title={t('tools.items.phonetic.name')}
      intro={t('tools.items.phonetic.blurb')}
      category={t('tools.categories.reference')}
      formula={t('phonetic.formula')}
    >
      <TextField label={t('phonetic.filter')} value={q} onChange={setQ} placeholder="R" />
      <ul className={`${styles.grid} stagger-grid`}>
        {filtered.map((e) => (
          <li key={e.symbol} className={styles.card}>
            <span className={styles.symbol}>{e.symbol}</span>
            <span className={styles.word}>{e.word}</span>
            <span className={styles.morse}>{e.morse}</span>
          </li>
        ))}
      </ul>
    </CalcShell>
  );
}
