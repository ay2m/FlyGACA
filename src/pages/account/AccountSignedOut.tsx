import { useTranslation } from 'react-i18next';
import { PageHero } from '@/components/PageHero';
import { Card } from '@/components/ui/Card';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { BrandMark } from '@/components/BrandMark';
import { Disclaimer } from '@/components/Disclaimer';
import { isAuthAvailable } from '@/lib/services/auth';
import { AuthUnavailable, BackendSignIn, LocalSignIn } from './SignInForms';
import account from './account.module.css';
import styles from './AccountPage.module.css';

/**
 * The signed-out /account screen: a shared page hero over a two-card split —
 * the auth chooser card beside a benefits card. The chooser is unchanged from
 * the original page: real server sign-in when configured, a dev-only local
 * form otherwise, and an explicit "unavailable" notice in a config-less
 * production build (never a fake session).
 */
export function AccountSignedOut() {
  const { t } = useTranslation();
  return (
    <section className={`container ${account.page}`}>
      <PageHero
        eyebrow={t('account.eyebrow')}
        title={t('account.signInTitle')}
        subtitle={t('account.signInIntro')}
        media={<CaptainAvatar size="xl" glow pose="wave" decorative />}
      />
      <div className={styles.authLayout}>
        <Card variant="raised" className={styles.authCard}>
          {isAuthAvailable() ? (
            <BackendSignIn />
          ) : import.meta.env.DEV ? (
            <LocalSignIn />
          ) : (
            <AuthUnavailable />
          )}
        </Card>
        <Card as="aside" variant="accent" accent="var(--gold)" className={styles.benefitsCard}>
          <BrandMark />
          <p className={styles.asideEyebrow}>{t('account.benefits.eyebrow')}</p>
          <h2 className={styles.asideTitle}>{t('account.benefits.title')}</h2>
          <ul className={styles.benefitList}>
            <li>
              <strong>{t('account.roles.pilot')}</strong>
              <span>{t('account.benefits.pilot')}</span>
            </li>
            <li>
              <strong>{t('account.roles.student')}</strong>
              <span>{t('account.benefits.student')}</span>
            </li>
            <li>
              <strong>{t('account.roles.instructor')}</strong>
              <span>{t('account.benefits.instructor')}</span>
            </li>
          </ul>
          <p className={account.note}>{t('account.benefits.local')}</p>
        </Card>
      </div>
      <Disclaimer compact />
    </section>
  );
}
