import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { filterConversations, type Conversation } from '@/calc/chat/conversations';
import styles from './ConversationMenu.module.css';

/**
 * The conversation switcher in the chat header: a "New chat" button plus a
 * History menu (native <details> for keyboard/AT support) that lists recent
 * threads to revisit, pin, rename, search, or delete. Pure presentational — the
 * page owns the archive state and persistence; this renders and reports intent.
 */
export function ConversationMenu({
  conversations,
  activeId,
  onNew,
  onSelect,
  onDelete,
  onRename,
  onTogglePin,
}: {
  conversations: Conversation[];
  activeId: string;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onTogglePin: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const menuRef = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  function select(id: string) {
    if (menuRef.current) menuRef.current.open = false;
    onSelect(id);
  }

  function startRename(c: Conversation) {
    setEditingId(c.id);
    setDraft(c.title);
  }

  function commitRename() {
    if (editingId && draft.trim()) onRename(editingId, draft);
    setEditingId(null);
  }

  const visible = filterConversations(conversations, query);

  return (
    <div className={styles.bar}>
      <button type="button" className={styles.newBtn} onClick={onNew}>
        <span aria-hidden="true">＋</span> {t('chat.newChat')}
      </button>

      <details className={styles.menu} ref={menuRef}>
        <summary className={styles.summary}>{t('chat.history')}</summary>
        <div className={styles.panel}>
          {conversations.length > 0 && (
            <input
              type="search"
              className={styles.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('chat.searchHistory')}
              aria-label={t('chat.searchHistory')}
            />
          )}
          {conversations.length === 0 ? (
            <p className={styles.empty}>{t('chat.historyEmpty')}</p>
          ) : visible.length === 0 ? (
            <p className={styles.empty}>{t('chat.noMatches')}</p>
          ) : (
            <ul className={styles.list}>
              {visible.map((c) => (
                <li
                  key={c.id}
                  className={`${styles.row} ${c.id === activeId ? styles.active : ''}`}
                >
                  {editingId === c.id ? (
                    <input
                      className={styles.rename}
                      value={draft}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          commitRename();
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      aria-label={t('chat.rename')}
                    />
                  ) : (
                    <button type="button" className={styles.pick} onClick={() => select(c.id)}>
                      <span className={styles.title}>
                        {c.pinned && <span aria-hidden="true">📌 </span>}
                        {c.title || t('chat.untitled')}
                      </span>
                      <span className={styles.when}>
                        {new Date(c.updatedAt).toLocaleDateString(i18n.language, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.icon}
                    onClick={() => onTogglePin(c.id)}
                    aria-label={c.pinned ? t('chat.unpin') : t('chat.pin')}
                    aria-pressed={c.pinned ?? false}
                  >
                    <span aria-hidden="true">📌</span>
                  </button>
                  <button
                    type="button"
                    className={styles.icon}
                    onClick={() => startRename(c)}
                    aria-label={t('chat.rename')}
                  >
                    <span aria-hidden="true">✎</span>
                  </button>
                  <button
                    type="button"
                    className={styles.del}
                    onClick={() => onDelete(c.id)}
                    aria-label={t('chat.deleteConversation')}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </div>
  );
}
