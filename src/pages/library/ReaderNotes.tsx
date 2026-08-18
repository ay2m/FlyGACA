import { useTranslation } from 'react-i18next';
import type { LibNote } from '@/lib/prefs/libraryPrefs';
import styles from './Document.module.css';

/** The saved highlights/notes panel below the reader. */
export function ReaderNotes({
  notes,
  onJump,
  onRemove,
}: {
  notes: LibNote[];
  /** Scroll the reader to the annotation mark for a note id. */
  onJump: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.notes}>
      <h2 className={styles.notesHead}>{t('document.notes', { n: notes.length })}</h2>
      <ul className={styles.notesList}>
        {notes.map((n) => (
          <li key={n.id} className={styles.noteItem}>
            <button type="button" className={styles.noteQuote} onClick={() => onJump(n.id)}>
              “{n.quote}”
            </button>
            {n.note && <p className={styles.noteText}>{n.note}</p>}
            <button
              type="button"
              className={styles.noteRemove}
              aria-label={t('document.removeNote')}
              onClick={() => onRemove(n.id)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
