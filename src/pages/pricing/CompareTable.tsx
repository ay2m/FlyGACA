import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from '@phosphor-icons/react';
import { SectionHeader } from '@/components/SectionHeader';
import { classifyCompareCell } from '@/calc/app/pricingView';
import styles from './Pricing.module.css';

interface CompareRow {
  feature: string;
  free: string;
  pro: string;
  school: string;
}

/** The Free / Pro / School feature-comparison table. Presentational. */
export function CompareTable() {
  const { t } = useTranslation();
  const compare = t('pricing.compare', { returnObjects: true }) as unknown as CompareRow[];

  // Render the boolean comparison cells as a tinted check / muted cross with an
  // sr-only label; value cells (e.g. "5 / day", "Unlimited") pass through as text.
  const cmpCell = (v: string): ReactNode => {
    const kind = classifyCompareCell(v);
    if (kind === 'yes')
      return (
        <span className={styles.cmpYes}>
          <Check size={18} weight="bold" aria-hidden="true" />
          <span className="sr-only">{t('pricing.cmpYes')}</span>
        </span>
      );
    if (kind === 'no')
      return (
        <span className={styles.cmpNo}>
          <X size={16} weight="bold" aria-hidden="true" />
          <span className="sr-only">{t('pricing.cmpNo')}</span>
        </span>
      );
    return v;
  };

  return (
    <section className={styles.compareSection} aria-labelledby="compare-head">
      <SectionHeader id="compare-head" title={t('pricing.compareHead')} tone="var(--cat-1)" />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className="sr-only">{t('pricing.compareHead')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('pricing.feature')}</th>
              <th scope="col">{t('pricing.plans.free.name')}</th>
              <th scope="col">{t('pricing.plans.pro.name')}</th>
              <th scope="col">{t('pricing.plans.school.name')}</th>
            </tr>
          </thead>
          <tbody>
            {compare.map((row) => (
              <tr key={row.feature}>
                <th scope="row">{row.feature}</th>
                <td>{cmpCell(row.free)}</td>
                <td>{cmpCell(row.pro)}</td>
                <td>{cmpCell(row.school)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
