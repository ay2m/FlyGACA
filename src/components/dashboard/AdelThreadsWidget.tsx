import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import styles from './dashboard-widgets.module.css';

/**
 * A direct line to Captain Adel from the dashboard.
 * Since the chat is now powered by the official captadel.com iframe,
 * we provide a quick input to jump straight into a conversation.
 */
export function AdelThreadsWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  const handleAsk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    navigate(`/chat?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <>
      <div className={styles.head}>
        <h2>{t('dashboard.widgets.adel.title')}</h2>
      </div>
      
      <div className={styles.adelQuickAsk}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <CaptainAvatar size="md" glow pose="default" />
          <p className={styles.empty} style={{ margin: 0, textAlign: 'left' }}>
            {t('dashboard.widgets.adel.empty', 'Ask Captain Adel anything about GACAR regulations.')}
          </p>
        </div>
        
        <form onSubmit={handleAsk} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('chat.inputPlaceholder', 'Ask a question...')}
            className="form-input"
            style={{ flex: 1, borderRadius: 'var(--radius-pill)', padding: '0.5rem 1rem' }}
          />
          <button type="submit" className="btn-clay-primary" style={{ borderRadius: 'var(--radius-pill)', padding: '0.5rem 1.5rem' }}>
            {t('chat.send', 'Ask')}
          </button>
        </form>
      </div>
    </>
  );
}
