import { useSyncExternalStore } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnboardingSeen, markOnboardingSeen, openTour } from '@/lib/prefs/onboardingPrefs';
import styles from './OnboardingHint.module.css';

/** Client-only flag (false in the prerender snapshot) via the store idiom — so the
 *  hint never bakes into crawler HTML and returning users get no hint→hide flash. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/**
 * A small, dismissible "take a tour" prompt for first-time visitors — the
 * non-blocking replacement for the old welcome modal that auto-covered the hero.
 * Renders only on the client and only while the tour is unseen.
 */
export function OnboardingHint() {
  const { t } = useTranslation();
  const seen = useOnboardingSeen();
  const isClient = useIsClient();

  if (!isClient || seen) return null;

  return (
    <aside className={styles.hint} aria-label={t('onboarding.hintLabel')}>
      <span className={styles.text}>{t('onboarding.hintText')}</span>
      <span className={styles.actions}>
        <button type="button" className={styles.take} onClick={openTour}>
          {t('onboarding.hintTake')}
        </button>
        <button
          type="button"
          className={styles.dismiss}
          onClick={markOnboardingSeen}
          aria-label={t('onboarding.hintDismiss')}
        >
          ✕
        </button>
      </span>
    </aside>
  );
}
