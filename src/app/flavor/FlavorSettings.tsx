import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FLAVOR } from '../../flavors/current';
import { openExternal } from '@/lib/native/nativeBridge';
import { LangToggle } from '../../components/LangToggle';
import { ThemeToggle } from '../../components/ThemeToggle';
import { Disclaimer } from '../../components/Disclaimer';
import { useNoindexMeta } from '@/hooks/usePageMeta';
import styles from './flavor.module.css';

/**
 * Settings for the standalone prep apps. Deliberately account-free (the apps
 * have no sign-in): language, theme, the cross-promo and the legal pages.
 */
export function FlavorSettings() {
  const { t } = useTranslation();
  useNoindexMeta(t('flavor.settings'));

  return (
    <section className={`container-narrow ${styles.settingsPage}`}>
      <h1>{t('flavor.settings')}</h1>

      <div className={styles.settingsRow}>
        <span className={styles.settingsLabel}>{t('flavor.language')}</span>
        <LangToggle />
      </div>
      <div className={styles.settingsRow}>
        <span className={styles.settingsLabel}>{t('flavor.theme')}</span>
        <ThemeToggle />
      </div>

      <button
        type="button"
        className="btn btn-clay"
        onClick={() => void openExternal(FLAVOR.crossPromoUrl)}
      >
        {t('flavor.getFullApp')}
      </button>

      <nav className={styles.settingsLegal} aria-label={t('footer.legal')}>
        <Link to="/disclaimer" viewTransition>
          {t('footer.disclaimerLink')}
        </Link>
        <Link to="/terms" viewTransition>
          {t('footer.terms')}
        </Link>
        <Link to="/privacy" viewTransition>
          {t('footer.privacy')}
        </Link>
        <Link to="/safety" viewTransition>
          {t('footer.safety')}
        </Link>
      </nav>

      <Disclaimer compact />
    </section>
  );
}
