import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useOnline } from '@/lib/native/pwa';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import styles from './Offline.module.css';

// Areas that keep working without a connection: the calculators run fully
// client-side, the library serves whatever was saved for offline, and the
// study material is bundled — so these are the useful places to send someone.
const LINKS = [
  { to: '/tools', key: 'tools' },
  { to: '/library', key: 'library' },
  { to: '/learn', key: 'study' },
] as const;

/**
 * Offline fallback page. The app shell is precached, so navigating while offline
 * still loads the SPA; this is the friendly landing the service worker (and the
 * in-app "you're offline" affordances) point to. It reacts live to connectivity
 * via `useOnline`, surfacing a reassurance once the network returns.
 */
export function Offline() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const online = useOnline();
  usePageMeta(t('meta.offline'));

  return (
    <section className={`container-narrow ${styles.page}`}>
      <CaptainAvatar size="xl" glow pose="hold" className={styles.avatar} decorative />
      <p className={styles.eyebrow}>{t('offlinePage.eyebrow')}</p>
      <h1 className={styles.title}>{t('offlinePage.title')}</h1>
      <p className={styles.lead}>{t('offlinePage.lead')}</p>

      {online && (
        <p className={styles.back} role="status">
          {t('offlinePage.back')}
        </p>
      )}

      <button type="button" className={styles.retry} onClick={() => navigate('/')}>
        {t('offlinePage.retry')}
      </button>

      <ul className={styles.tiles}>
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className={styles.tile}>
              {t(`offlinePage.links.${l.key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
