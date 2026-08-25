import { useTranslation } from 'react-i18next';
import { PageHero } from '@/components/PageHero';
import { Card } from '@/components/ui/Card';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { BrandMark } from '@/components/BrandMark';
import { Disclaimer } from '@/components/Disclaimer';
import { isAuthAvailable } from '@/lib/services/auth';
import { AmbientGlow } from '@/components/AmbientGlow';
import { AuthUnavailable, BackendSignIn, LocalSignIn } from './SignInForms';
import account from './account.module.css';
import styles from './AccountPage.module.css';

/**
 * The signed-out /account screen: a dramatic 2027 split-screen design.
 * The left side floats the authentication forms on frosted glass.
 * The right side features a vibrant animated AmbientGlow background with Captain Adel.
 */
export function AccountSignedOut() {
  const { t } = useTranslation();
  return (
    <section className={`container ${styles.splitScreenPage}`}>
      <AmbientGlow variant="auth" />
      
      <div className={styles.splitScreenContent}>
        {/* Left side: The Auth Forms floating on glass */}
        <div className={styles.authColumn}>
          <div className={styles.authHeader}>
            <BrandMark />
            <h1 className={styles.authTitle}>{t('account.signInTitle')}</h1>
            <p className={styles.authIntro}>{t('account.signInIntro')}</p>
          </div>
          
          <Card variant="raised" className={`${styles.authCard} card-clay`}>
            {isAuthAvailable() ? (
              <BackendSignIn />
            ) : import.meta.env.DEV ? (
              <LocalSignIn />
            ) : (
              <AuthUnavailable />
            )}
          </Card>
          
          <div className={styles.disclaimerWrapper}>
            <Disclaimer compact />
          </div>
        </div>

        {/* Right side: Benefits and Captain Adel in 3D-like space */}
        <div className={styles.benefitsColumn}>
          <CaptainAvatar size="xl" glow pose="wave" decorative className={styles.heroAvatar} />
          
          <Card as="aside" variant="accent" accent="var(--falcon-mist)" className={`${styles.benefitsCard} card-clay`}>
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
      </div>
    </section>
  );
}
