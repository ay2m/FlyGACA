import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from '@/components/ExternalLink';
import styles from './hud.module.css';

/**
 * The permit call-to-action. Fly GACA cannot process permits — the primary
 * action defers to GACA's official portal (same treatment as the footer's
 * verify links), with a secondary path into the airspace study directory.
 */
const GACA_PORTAL = 'https://gaca.gov.sa';

export function PermitCta() {
  const { t } = useTranslation();
  return (
    <section className={styles.permit} aria-labelledby="hud-permit-head">
      <div>
        <h2 id="hud-permit-head" className={styles.permitTitle}>
          {t('hud.permit.title')}
        </h2>
        <p className={styles.permitBody}>{t('hud.permit.body')}</p>
      </div>
      <div className={styles.permitActions}>
        <ExternalLink href={GACA_PORTAL} className={styles.permitPrimary}>
          {t('hud.permit.cta')} <span aria-hidden="true">↗</span>
        </ExternalLink>
        <Link to="/tools/airspace" viewTransition className={styles.permitSecondary}>
          {t('hud.permit.study')}
        </Link>
      </div>
    </section>
  );
}
