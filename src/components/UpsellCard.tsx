import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import styles from './UpsellCard.module.css';

const FEATURES = ['reminders', 'export', 'unlimited', 'adel'] as const;

interface Props {
  /** `card` is the full dashboard block; `inline` is a tighter variant for pages. */
  variant?: 'card' | 'inline';
}

/**
 * Pro upsell. Entitlement is UI-gate only — this never grants access; the CTA
 * routes to /pricing where the existing billing flow lives, so the upgrade
 * logic stays in one place.
 */
export function UpsellCard({ variant = 'card' }: Props) {
  const { t } = useTranslation();
  return (
    <div className={`${styles.card} ${variant === 'inline' ? styles.inline : ''}`}>
      <div className={styles.body}>
        <span className={styles.badge}>{t('upsell.proOnly')}</span>
        <h3 className={styles.title}>{t('upsell.title')}</h3>
        <p className={styles.subtitle}>{t('upsell.subtitle')}</p>
        <ul className={styles.features}>
          {FEATURES.map((f) => (
            <li key={f}>{t(`upsell.features.${f}`)}</li>
          ))}
        </ul>
      </div>
      <Link to="/pricing" className={styles.cta}>
        {t('upsell.cta')}
      </Link>
    </div>
  );
}
