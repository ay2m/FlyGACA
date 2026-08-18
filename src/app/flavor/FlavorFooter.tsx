import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { FLAVOR } from '../../flavors/current';
import { openExternal } from '@/lib/native/nativeBridge';
import { Disclaimer } from '../../components/Disclaimer';
import styles from './flavor.module.css';

/**
 * Footer for the standalone prep apps. Carries the load-bearing pieces of the
 * main footer — the shared <Disclaimer /> (not-affiliated wording can't drift),
 * the legal pages — plus the "get the full app" cross-promo. openExternal()
 * routes through the in-app browser inside the native shell.
 */
export function FlavorFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.footerInner}`}>
        <button
          type="button"
          className={`btn btn-clay ${styles.crossPromo}`}
          onClick={() => void openExternal(FLAVOR.crossPromoUrl)}
        >
          {t('flavor.getFullApp')}
        </button>

        <nav className={styles.legalRow} aria-label={t('footer.legal')}>
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

        <Disclaimer />

        <div className={styles.bottomRow}>
          <span className={styles.copyright}>
            © {year} {t('footer.copyright')}
          </span>
        </div>
      </div>
    </footer>
  );
}
