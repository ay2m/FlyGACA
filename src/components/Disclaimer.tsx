import { useTranslation } from 'react-i18next';
import styles from './Disclaimer.module.css';

/**
 * The not-affiliated / verify-against-GACA notice. This is load-bearing product
 * copy — it must appear on every surface. Keep it as a single shared component
 * so the wording can never drift.
 *
 * LEGAL REVIEW PENDING: The `disclaimer.strong` and `disclaimer.body` keys in
 * src/i18n/en.json and ar.json currently mirror The Office's
 * Disclaimer-and-Educational-Use-Notice-DRAFT (2026-06-14), pending final review
 * by Saudi-licensed counsel. When the legal opinion is received:
 * 1. Update the i18n strings with the approved wording
 * 2. Run tests/disclaimer.test.tsx to validate both languages render correctly
 * 3. Verify the component displays on all surfaces (footer, tools, flavor modes)
 * Do not modify the component itself — only the i18n strings need to change.
 */
export function Disclaimer({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  return (
    <p className={`${styles.disclaimer} ${compact ? styles.compact : ''}`} role="note">
      <strong>{t('disclaimer.strong')}</strong> {t('disclaimer.body')}
    </p>
  );
}
