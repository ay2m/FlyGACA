import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { loadConversations } from '@/lib/adelConversations';
import styles from './dashboard-widgets.module.css';

const MAX_THREADS = 3;

/**
 * Recent Captain Adel conversations. The chat page owns the archive; this
 * reads it once on mount (writes only happen on /chat, so there is nothing to
 * subscribe to here) and links back into the chat, which restores threads.
 */
export function AdelThreadsWidget() {
  const { t } = useTranslation();
  const [threads] = useState(() => loadConversations().slice(0, MAX_THREADS));

  return (
    <>
      <div className={styles.head}>
        <h2>{t('dashboard.widgets.adel.title')}</h2>
        <Link to="/chat" className={styles.headLink}>
          {t('dashboard.widgets.adel.open')}
        </Link>
      </div>
      {threads.length > 0 ? (
        <ul className={styles.rowList}>
          {threads.map((c) => (
            <li key={c.id}>
              <Link to="/chat" className={styles.rowLink}>
                <span className={styles.rowTitle}>
                  {c.title || t('dashboard.widgets.adel.untitled')}
                </span>
                {c.updatedAt > 0 && (
                  <span className={styles.rowMeta}>
                    {/* ISO date, matching the logbook rows — locale-formatted
                        dates embed bidi marks that scramble inside bdi. */}
                    <bdi dir="ltr">{new Date(c.updatedAt).toISOString().slice(0, 10)}</bdi>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>
          <CaptainAvatar size="sm" pose="wave" decorative /> {t('dashboard.widgets.adel.empty')}{' '}
          <Link to="/chat" className={styles.emptyCta}>
            {t('dashboard.widgets.adel.open')}
          </Link>
        </p>
      )}
    </>
  );
}
