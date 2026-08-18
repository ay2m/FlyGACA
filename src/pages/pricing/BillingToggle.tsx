import { useTranslation } from 'react-i18next';
import styles from './Pricing.module.css';

/** Monthly ↔ annual billing-cycle toggle, shown inside the pricing hero. */
export function BillingToggle({
  annual,
  onChange,
  savePct,
}: {
  annual: boolean;
  onChange: (annual: boolean) => void;
  /** The annual saving percentage, shown on the annual button's badge. */
  savePct: number;
}) {
  const { t } = useTranslation();
  return (
    <div className={styles.toggle} role="group" aria-label={t('pricing.billingCycle')}>
      <button
        type="button"
        className={!annual ? styles.active : ''}
        aria-pressed={!annual}
        onClick={() => onChange(false)}
      >
        {t('pricing.monthly')}
      </button>
      <button
        type="button"
        className={annual ? styles.active : ''}
        aria-pressed={annual}
        onClick={() => onChange(true)}
      >
        {t('pricing.annual')}{' '}
        <span className={styles.save}>{t('pricing.saveBadge', { pct: savePct })}</span>
      </button>
    </div>
  );
}
