import { useTranslation } from 'react-i18next';
import styles from './RouteFallback.module.css';

/**
 * Suspense fallback for lazily-loaded routes. Renders a skeleton shimmer that
 * reserves space, preventing layout shift. Announces politely for screen readers.
 */
export function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div
      className={styles.wrapper}
      role="status"
      aria-live="polite"
      aria-label={t('common.loading')}
    >
      <div className="container-narrow">
        <div className={`skeleton ${styles.skeletonHeader}`} />
        <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '80%' }} />
        <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '65%' }} />
        <div className={`skeleton ${styles.skeletonBlock}`} />
        <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '55%' }} />
        <div className={`skeleton ${styles.skeletonLine}`} style={{ width: '72%' }} />
      </div>
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  );
}
