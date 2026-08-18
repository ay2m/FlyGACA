import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { DockIcon } from '@/app/DockIcons';
import { markOnboardingSeen, closeTour } from '@/lib/prefs/onboardingPrefs';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import styles from './OnboardingTour.module.css';

/** A simple globe glyph for the bilingual step — matches the DockIcon line style. */
function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z" />
    </svg>
  );
}

interface Step {
  id: string;
  /** Optional route the step links to ("go there"). */
  to?: string;
  icon: ReactNode;
}

/** One step per core surface — each introduces it and (optionally) links there. */
const STEPS: Step[] = [
  { id: 'welcome', icon: <CaptainAvatar size="lg" pose="wave" decorative /> },
  { id: 'library', to: '/library', icon: <DockIcon route="/library" /> },
  { id: 'tools', to: '/tools', icon: <DockIcon route="/tools" /> },
  { id: 'captainAdel', to: '/chat', icon: <DockIcon route="/chat" /> },
  { id: 'bilingual', icon: <GlobeIcon /> },
];

const TITLE_ID = 'onboarding-tour-title';

/**
 * First-run welcome tour: a centered modal carousel introducing the core
 * surfaces. Lazily mounted by Layout only on a first visit to the home route;
 * every dismissal path persists "seen" via markOnboardingSeen(). Overlay
 * mechanics (scroll-lock, focus-restore, Escape, Tab trap) mirror CommandPalette.
 */
export default function OnboardingTour() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  // Lock body scroll, move focus into the dialog, and restore it on unmount.
  useEffect(() => {
    const restoreFocusTo = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    const id = window.setTimeout(
      () => boxRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(),
      50,
    );
    return () => {
      unlockBodyScroll();
      window.clearTimeout(id);
      restoreFocusTo?.focus?.();
    };
  }, []);

  function dismiss() {
    markOnboardingSeen();
    closeTour();
  }

  // Escape dismisses from anywhere inside; Tab is trapped within the box so
  // focus can never fall behind the scrim.
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      dismiss();
      return;
    }
    if (e.key !== 'Tab') return;
    const box = boxRef.current;
    if (!box) return;
    const focusable = Array.from(
      box.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
    ).filter((el) => el.tabIndex !== -1);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeEl = document.activeElement;
    if (e.shiftKey && (activeEl === first || !box.contains(activeEl))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (activeEl === last || !box.contains(activeEl))) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className={styles.scrim}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        ref={boxRef}
        className={styles.box}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onKeyDown={onKeyDown}
      >
        <button type="button" className={styles.skip} onClick={dismiss} data-autofocus>
          {t('onboarding.skip')}
        </button>

        <div className={styles.icon} aria-hidden="true">
          {step.icon}
        </div>
        <h2 id={TITLE_ID} className={styles.title}>
          {t(`onboarding.steps.${step.id}.title`)}
        </h2>
        <p className={styles.body}>{t(`onboarding.steps.${step.id}.body`)}</p>

        {step.to && (
          <Link className={styles.go} to={step.to} onClick={dismiss}>
            {t('onboarding.goThere')}
          </Link>
        )}

        <div className={styles.dots} aria-hidden="true">
          {STEPS.map((s, i) => (
            <span key={s.id} className={`${styles.dot} ${i === index ? styles.dotActive : ''}`} />
          ))}
        </div>

        <div className={styles.nav}>
          <button
            type="button"
            className={styles.back}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
          >
            {t('onboarding.back')}
          </button>
          <span className={styles.count} aria-live="polite">
            {t('onboarding.progress', { current: index + 1, total: STEPS.length })}
          </span>
          {isLast ? (
            <button type="button" className={styles.next} onClick={dismiss}>
              {t('onboarding.done')}
            </button>
          ) : (
            <button
              type="button"
              className={styles.next}
              onClick={() => setIndex((i) => Math.min(STEPS.length - 1, i + 1))}
            >
              {t('onboarding.next')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
