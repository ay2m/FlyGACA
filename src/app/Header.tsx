import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LangToggle } from '@/components/LangToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { InstallButton } from '@/components/pwa/InstallButton';
import { openCommandPalette } from '@/components/CommandPalette/openCommandPalette';
import { ButtonLink } from '@/components/ui/Button';
import { useAccount } from '@/lib/services/account';
import { uiIsPro } from '@/lib/services/entitlements';
import { AccountMenu } from './AccountMenu';
import { MobileDock } from './MobileDock';
import { NAV } from './nav';
import styles from './Header.module.css';

/** True once the page has scrolled past `threshold`px — drives the header's
 *  elevated state (hairline + shadow appear, background firms up). Passive
 *  listener; the global reduced-motion rule already neutralises the transition. */
function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(
    () => typeof window !== 'undefined' && window.scrollY > threshold,
  );
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);
  return scrolled;
}

export function Header() {
  const { t } = useTranslation();
  const scrolled = useScrolled();
  const { session, entitlement } = useAccount();
  const signedIn = Boolean(session);
  // A paying pilot shouldn't be shown "Go Pro" — point the header CTA at their
  // dashboard home instead, aligning the primary CTA to a single target by plan.
  const isPro = signedIn && uiIsPro(entitlement);
  const ctaTo = isPro ? '/dashboard' : '/pricing';
  const ctaLabel = isPro ? t('account.dashboard') : t('common.goPro');
  const ctaIcon = isPro ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  ) : (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3l1.9 4.8L18.7 9l-4.8 1.9L12 15.7l-1.9-4.8L5.3 9l4.8-1.9z" />
    </svg>
  );

  return (
    <>
      <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}>
        <div className={`container ${styles.inner}`}>
          <Link className={styles.lockup} to="/" aria-label={t('nav.home')} viewTransition>
            <img
              className={styles.mark}
              src="/img/flygaca-mark.png"
              alt=""
              width={36}
              height={36}
              decoding="async"
            />
            <span className={styles.wordmark} aria-hidden="true">
              <span className={styles.wmFly}>Fly</span>
              <span className={styles.wmGaca}>GACA</span>
            </span>
          </Link>

          {/* Desktop inline nav (hidden ≤860px, where the bottom dock takes over).
              When signed in, /account becomes a dropdown surfacing the daily pages. */}
          <nav className={styles.links} aria-label={t('nav.primary')}>
            {NAV.map((item) =>
              item.to === '/account' && signedIn ? (
                <AccountMenu key={item.to} />
              ) : (
                <NavLink
                  viewTransition
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => (isActive ? styles.active : undefined)}
                >
                  {t(item.key)}
                </NavLink>
              ),
            )}
          </nav>

          <div className={styles.actions}>
            <button
              className={styles.searchPill}
              type="button"
              onClick={openCommandPalette}
              aria-label={t('cmdk.label')}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className={styles.searchPillText}>{t('cmdk.search')}</span>
              <kbd className={styles.searchPillKbd} aria-hidden="true">
                ⌘K
              </kbd>
            </button>
            <ThemeToggle className={styles.langToggle} />
            <LangToggle className={styles.langToggle} />
            <InstallButton />
            <ButtonLink className={styles.cta} to={ctaTo} viewTransition icon={ctaIcon}>
              {ctaLabel}
            </ButtonLink>
          </div>
        </div>
      </header>

      <MobileDock signedIn={signedIn} ctaTo={ctaTo} ctaLabel={ctaLabel} ctaIcon={ctaIcon} />
    </>
  );
}
