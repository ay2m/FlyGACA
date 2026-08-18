import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useNoindexMeta } from '@/hooks/usePageMeta';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { openCommandPalette } from '@/components/CommandPalette/openCommandPalette';
import styles from './NotFound.module.css';

const LINKS = [
  { to: '/', key: 'home' },
  { to: '/library', key: 'library' },
  { to: '/chat', key: 'chat' },
  { to: '/tools', key: 'tools' },
] as const;

export function NotFound() {
  const { t } = useTranslation();
  // A SPA can't return a real 404 status, so noindex the soft-404 to keep unknown
  // URLs out of the index instead of letting them rank as thin pages.
  useNoindexMeta(t('meta.notFound'));

  return (
    <section className={`container-narrow ${styles.page}`}>
      <CaptainAvatar size="xl" glow pose="hold" className={styles.avatar} decorative />
      <p className={styles.eyebrow}>{t('notFound.eyebrow')}</p>
      <h1 className={styles.title}>{t('notFound.title')}</h1>
      <p className={styles.lead}>{t('notFound.lead')}</p>

      <button type="button" className={styles.search} onClick={openCommandPalette}>
        <span aria-hidden="true">⌕</span>
        {t('notFound.search')}
        <kbd className={styles.kbd} aria-hidden="true">
          ⌘K
        </kbd>
      </button>

      <ul className={styles.tiles}>
        {LINKS.map((l) => (
          <li key={l.to}>
            <Link to={l.to} className={styles.tile}>
              {t(`notFound.links.${l.key}`)}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
