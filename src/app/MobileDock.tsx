import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { DockIcon, MoreIcon } from './DockIcons';
import { PRIMARY, MORE, SIGNED_IN, DOCK_LABEL } from './nav';
import styles from './Header.module.css';

/** The mobile bottom dock, its dimmed backdrop, and the "More" sheet — the
 *  whole sub-860px nav surface, owning its open state, focus trap and
 *  scroll lock. Rendered outside <header> so it anchors to the viewport. */
export function MobileDock({
  signedIn,
  ctaTo,
  ctaLabel,
  ctaIcon,
}: {
  signedIn: boolean;
  ctaTo: string;
  ctaLabel: string;
  ctaIcon: ReactNode;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const sheetRef = useRef<HTMLElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);

  // Close the "More" sheet whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // While the sheet is open: lock body scroll, move focus into the sheet and
  // trap Tab within it so focus can't fall behind the overlay, and close on
  // Escape. Focus returns to the More button when the sheet closes.
  useEffect(() => {
    if (!open) return;
    lockBodyScroll();
    // Capture the trigger now so cleanup restores focus to the same node.
    const moreEl = moreRef.current;

    const focusables = () =>
      Array.from(
        sheetRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]',
        ) ?? [],
      ).filter((el) => el.tabIndex !== -1);
    // Defer to the next tick: the sheet transitions out of visibility:hidden,
    // so the first link isn't focusable on the synchronous commit frame.
    const focusTimer = window.setTimeout(() => focusables()[0]?.focus(), 60);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;
      const inSheet = sheetRef.current?.contains(activeEl);
      if (e.shiftKey && (activeEl === first || !inSheet)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (activeEl === last || !inSheet)) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      unlockBodyScroll();
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(focusTimer);
      moreEl?.focus();
    };
  }, [open]);

  return (
    <>
      {/* Mobile floating bottom dock — quick-access primary tabs + "More". Sits
          outside <header> so it anchors to the viewport (the header's
          backdrop-filter would otherwise become the containing block). */}
      <nav
        className={`${styles.dock} ${open ? styles.dockRaised : ''}`}
        aria-label={t('nav.primary')}
      >
        {PRIMARY.map((item) => (
          <NavLink
            viewTransition
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? `${styles.dockItem} ${styles.dockActive}` : styles.dockItem
            }
          >
            <DockIcon route={item.to} />
            <span>{t(DOCK_LABEL[item.to] ?? item.key)}</span>
          </NavLink>
        ))}
        <button
          ref={moreRef}
          className={`${styles.dockItem} ${styles.dockMore} ${open ? styles.dockActive : ''}`}
          type="button"
          aria-expanded={open}
          aria-controls="more-sheet"
          onClick={() => setOpen((v) => !v)}
        >
          <MoreIcon />
          <span>{t('nav.more')}</span>
        </button>
      </nav>

      {/* Dimmed backdrop behind the "More" sheet; tap to dismiss. */}
      <button
        className={`${styles.backdrop} ${open ? styles.backdropShown : ''}`}
        type="button"
        aria-label={t('common.close')}
        tabIndex={open ? 0 : -1}
        onClick={() => setOpen(false)}
      />

      {/* "More" bottom sheet — the secondary destinations + the Go Pro CTA. */}
      <nav
        ref={sheetRef}
        id="more-sheet"
        className={`${styles.sheet} ${open ? styles.open : ''}`}
        aria-label={t('nav.more')}
      >
        <p className={styles.sheetLabel} aria-hidden="true">
          {t('nav.menu')}
        </p>
        <ul className={styles.sheetList}>
          {MORE.map((item) => (
            <li key={item.to}>
              <NavLink
                viewTransition
                to={item.to}
                className={({ isActive }) =>
                  isActive ? `${styles.sheetLink} ${styles.sheetActive}` : styles.sheetLink
                }
                onClick={() => setOpen(false)}
              >
                <span className={styles.sheetIcon}>
                  <DockIcon route={item.to} />
                </span>
                {t(item.key)}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* When signed in, surface the daily-use pages that otherwise hide
            behind /account, so a returning pilot reaches them in one tap. */}
        {signedIn && (
          <>
            <div className={styles.sheetDivider} aria-hidden="true" />
            <p className={styles.sheetLabel} aria-hidden="true">
              {t('nav.account')}
            </p>
            <ul className={styles.sheetList}>
              {SIGNED_IN.map((item) => (
                <li key={item.to}>
                  <NavLink
                    viewTransition
                    to={item.to}
                    className={({ isActive }) =>
                      isActive ? `${styles.sheetLink} ${styles.sheetActive}` : styles.sheetLink
                    }
                    onClick={() => setOpen(false)}
                  >
                    <span className={styles.sheetIcon}>
                      <DockIcon route={item.to} />
                    </span>
                    {t(item.key)}
                  </NavLink>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className={styles.sheetDivider} aria-hidden="true" />
        <Link className={styles.sheetCta} to={ctaTo} onClick={() => setOpen(false)} viewTransition>
          {ctaIcon}
          {ctaLabel}
        </Link>
      </nav>
    </>
  );
}
