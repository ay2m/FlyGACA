import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { StatusPill } from './StatusPill';
import { ProgressBar } from './ProgressBar';
import { CurrencyRing } from './CurrencyRing';
import type { CurrencyItem } from '@/calc/pilot/currency';
import { formatDate } from '@/calc/recency';
import { VALIDITY_LABEL, VALIDITY_TONE } from './validityStatus';
import styles from './CurrencyBoard.module.css';

interface Props {
  items: CurrencyItem[];
  /** Show the per-row "how to renew" link (default true). */
  showFix?: boolean;
}

/**
 * The currency sheet: one row per recency requirement with a colour-coded pill,
 * days remaining, renewal date and a link to the tool that explains the renewal.
 * Shared by the dashboard board and the dedicated /currency page.
 */
export function CurrencyBoard({ items, showFix = true }: Props) {
  const { t } = useTranslation();
  return (
    <ul className={styles.board}>
      {items.map((item) => (
        <li key={item.id} className={styles.row} data-status={item.status}>
          <CurrencyRing item={item} />
          <div className={styles.main}>
            <span className={styles.label}>{item.label ?? t(item.labelKey)}</span>
            <span className={styles.detail}>{t(item.detailKey, item.detailVars)}</span>
            {item.count && (
              <div className={styles.count}>
                <ProgressBar percent={Math.round((item.count.have / item.count.need) * 100)} />
                {item.count.have < item.count.need && (
                  <span className={styles.moreNeeded}>
                    {t('currency.moreNeeded', { n: item.count.need - item.count.have })}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className={styles.meta}>
            <StatusPill tone={VALIDITY_TONE[item.status]}>
              {t(VALIDITY_LABEL[item.status])}
            </StatusPill>
            {item.daysLeft != null && (
              <span className={styles.days}>
                <bdi dir="ltr">
                  {item.daysLeft >= 0
                    ? t('currency.daysLeft', { n: item.daysLeft })
                    : t('currency.daysOver', { n: Math.abs(item.daysLeft) })}
                </bdi>
              </span>
            )}
            {item.expiry && (
              <span className={styles.date}>
                <bdi dir="ltr">{formatDate(item.expiry)}</bdi>
              </span>
            )}
          </div>
          {showFix && (
            <Link to={item.fixTo} className={styles.fix}>
              {t('currency.fixNow')}
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}
