import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalcShell } from '@/components/CalcShell';
import styles from './VfrBrief.module.css';

export function VfrBrief() {
  const { t } = useTranslation();
  const items = t('vfrBrief.items', { returnObjects: true }) as unknown as string[];
  const [checked, setChecked] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <CalcShell
      title={t('tools.items.vfr-brief.name')}
      intro={t('tools.items.vfr-brief.blurb')}
      category={t('tools.categories.procedures')}
      formula={t('vfrBrief.formula')}
    >
      <p className={styles.progress}>
        {t('vfrBrief.progress', { done: checked.size, total: items.length })}
      </p>
      <ul className={styles.list}>
        {items.map((item, i) => (
          <li key={i}>
            <label className={`${styles.item} ${checked.has(i) ? styles.done : ''}`}>
              <input type="checkbox" checked={checked.has(i)} onChange={() => toggle(i)} />
              <span>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </CalcShell>
  );
}
