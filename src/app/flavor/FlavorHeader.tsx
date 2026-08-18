import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FLAVOR } from '../../flavors/current';
import { LangToggle } from '../../components/LangToggle';
import { ThemeToggle } from '../../components/ThemeToggle';
import styles from './flavor.module.css';

/** Slim chrome for the standalone prep apps: flavor wordmark, settings, toggles. */
export function FlavorHeader() {
  const { t } = useTranslation();
  return (
    <header className={styles.nav}>
      <div className={`container ${styles.inner}`}>
        <Link className={styles.lockup} to="/" aria-label={t('flavor.home')} viewTransition>
          <img
            className={styles.mark}
            src="/img/flygaca-mark.png"
            alt=""
            width={32}
            height={32}
            decoding="async"
          />
          <span className={styles.wordmark} aria-hidden="true">
            <span className={styles.wmPrimary}>{FLAVOR.wordmark.primary}</span>
            <span className={styles.wmSecondary}>{FLAVOR.wordmark.secondary}</span>
          </span>
        </Link>

        <div className={styles.actions}>
          <ThemeToggle />
          <LangToggle />
          <Link className={styles.settingsLink} to="/settings" viewTransition>
            {t('flavor.settings')}
          </Link>
        </div>
      </div>
    </header>
  );
}
