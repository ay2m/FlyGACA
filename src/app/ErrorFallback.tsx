import { useTranslation } from 'react-i18next';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import styles from './ErrorBoundary.module.css';

/** The calm, bilingual fallback shown by ErrorBoundary. A functional component
 *  so it can use i18n; "back home" is a hard navigation to `/` which also
 *  clears the boundary. */
export function ErrorFallback() {
  const { t } = useTranslation();
  return (
    <section className={`container-narrow ${styles.page}`} role="alert">
      <CaptainAvatar size="xl" pose="hold" className={styles.avatar} decorative />
      <h1 className={styles.title}>{t('errors.boundary.title')}</h1>
      <p className={styles.lead}>{t('errors.boundary.lead')}</p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={() => window.location.reload()}>
          {t('errors.boundary.reload')}
        </button>
        <a className={styles.secondary} href="/">
          {t('errors.boundary.home')}
        </a>
      </div>
    </section>
  );
}
