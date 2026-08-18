import { useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { DockIcon } from './DockIcons';
import { SIGNED_IN } from './nav';
import styles from './Header.module.css';

/** Desktop account dropdown — a native <details> (keyboard/AT-friendly, mirrors
 *  ConversationMenu) that reveals the signed-in daily surfaces plus the /account
 *  hub, so they aren't buried a click deep behind a single nav link. Closes on
 *  outside-click, Escape, and route change. */
export function AccountMenu() {
  const { t } = useTranslation();
  const ref = useRef<HTMLDetailsElement>(null);
  const { pathname } = useLocation();

  const close = () => {
    if (ref.current) ref.current.open = false;
  };
  // Close on route change so a picked destination doesn't leave the menu open.
  useEffect(close, [pathname]);
  // Dismiss on outside pointerdown or Escape while open.
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && ref.current?.open) {
        close();
        ref.current.querySelector<HTMLElement>('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <details ref={ref} className={styles.accountMenu}>
      <summary className={styles.accountSummary}>
        <DockIcon route="/account" width={18} height={18} />
        {t('nav.account')}
        <svg
          className={styles.accountCaret}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>
      <div className={styles.accountPanel} role="menu">
        {SIGNED_IN.map((item) => (
          <NavLink
            viewTransition
            key={item.to}
            to={item.to}
            role="menuitem"
            className={({ isActive }) =>
              isActive ? `${styles.accountItem} ${styles.accountItemActive}` : styles.accountItem
            }
            onClick={close}
          >
            <span className={styles.accountItemIcon}>
              <DockIcon route={item.to} />
            </span>
            {t(item.key)}
          </NavLink>
        ))}
        <div className={styles.accountMenuDivider} aria-hidden="true" />
        <NavLink
          viewTransition
          to="/account"
          role="menuitem"
          className={({ isActive }) =>
            isActive ? `${styles.accountItem} ${styles.accountItemActive}` : styles.accountItem
          }
          onClick={close}
        >
          <span className={styles.accountItemIcon}>
            <DockIcon route="/account" />
          </span>
          {t('nav.manageAccount')}
        </NavLink>
      </div>
    </details>
  );
}
