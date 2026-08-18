import { useTranslation } from 'react-i18next';
import styles from './Disclaimer.module.css';

/**
 * The not-affiliated / verify-against-GACA notice. This is load-bearing product
 * copy — it must appear on every surface. Keep it as a single shared component
 * so the wording can never drift.
 *
 * TODO(legal): the `disclaimer.strong` / `disclaimer.body` copy mirrors The Office's
 * Disclaimer-and-Educational-Use-Notice-DRAFT (2026-06-14), which is still marked
 * DRAFT and pending review by Saudi-licensed counsel. Re-confirm the wording once
 * the legal opinion lands.
 */
export function Disclaimer({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <p className={`${styles.disclaimer} ${compact ? styles.compact : ''}`} role="note">
      <strong>{t('disclaimer.strong')}</strong> {t('disclaimer.body')}
    </p>
  );
}
