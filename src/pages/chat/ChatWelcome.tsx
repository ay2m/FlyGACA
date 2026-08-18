import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { StatusPill } from '@/components/StatusPill';
import styles from './Chat.module.css';

/** Topic-grouped starter prompts shown on the empty-state welcome. */
const GROUPS: { id: string; items: string[] }[] = [
  { id: 'airspace', items: ['s1', 's5'] },
  { id: 'licensing', items: ['s2', 's6'] },
  { id: 'operations', items: ['s3', 's4'] },
];
const SUGGESTION_KEYS = ['s1', 's2', 's3', 's4', 's5', 's6'];
/** Capability chips on the welcome screen (label key → StatusPill tone). */
const CAPABILITIES = [
  { id: 'cites', tone: 'success' as const },
  { id: 'bilingual', tone: 'data' as const },
  { id: 'verify', tone: 'warning' as const },
];

/** Empty-state welcome: avatar, capabilities, starter prompts. */
export function ChatWelcome({ onAsk }: { onAsk: (q: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className={styles.welcome}>
      <CaptainAvatar size="xl" glow live animated pose="wave" className={styles.welcomeAvatar} />
      <p className={styles.welcomeLead}>{t('chat.welcome')}</p>
      <div className={styles.capabilities}>
        {CAPABILITIES.map((c) => (
          <StatusPill key={c.id} tone={c.tone}>
            {t(`chat.capabilities.${c.id}`)}
          </StatusPill>
        ))}
      </div>
      <div className={styles.groups}>
        {GROUPS.map((g) => (
          <div key={g.id} className={styles.group}>
            <span className={styles.groupLabel}>{t(`chat.groups.${g.id}`)}</span>
            <div className={styles.suggestions}>
              {g.items.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.suggestion}
                  onClick={() => onAsk(t(`chat.suggestions.${s}`))}
                >
                  {t(`chat.suggestions.${s}`)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className={styles.welcomeActions}>
        <button
          type="button"
          className={styles.surprise}
          onClick={() => {
            const k = SUGGESTION_KEYS[Math.floor(Math.random() * SUGGESTION_KEYS.length)];
            onAsk(t(`chat.suggestions.${k}`));
          }}
        >
          {t('chat.surprise')}
        </button>
        <Link to="/library" className={styles.welcomeLink}>
          {t('chat.exploreLibrary')}
        </Link>
        <Link to="/tools" className={styles.welcomeLink}>
          {t('chat.exploreTools')}
        </Link>
      </div>
    </div>
  );
}
