import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './SelectionPopover.module.css';

export interface SelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Props {
  /** Viewport-relative rect of the current selection (position: fixed). */
  rect: SelectionRect;
  onHighlight: () => void;
  onSaveNote: (note: string) => void;
  onClose: () => void;
}

/**
 * A small floating toolbar shown over a text selection in the document reader,
 * offering "Highlight" or "Add note". Self-contained: it manages the note-entry
 * textarea locally and reports the result to the reader via callbacks.
 */
export function SelectionPopover({ rect, onHighlight, onSaveNote, onClose }: Props) {
  const { t } = useTranslation();
  const [noteMode, setNoteMode] = useState(false);
  const [text, setText] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (noteMode) inputRef.current?.focus();
  }, [noteMode]);

  // Dismiss on Escape from anywhere inside the popover.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const style = {
    insetBlockStart: `${rect.top + rect.height + 6}px`,
    insetInlineStart: `${rect.left}px`,
  };

  return (
    <div
      ref={ref}
      className={styles.popover}
      style={style}
      role="dialog"
      aria-label={t('document.annotate')}
      onKeyDown={onKeyDown}
      onMouseDown={(e) => e.preventDefault() /* keep the text selection alive */}
    >
      {noteMode ? (
        <div className={styles.noteBox}>
          <textarea
            ref={inputRef}
            className={styles.noteInput}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('document.notePlaceholder')}
            rows={3}
          />
          <div className={styles.row}>
            <button type="button" className={styles.ghost} onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className={styles.primary}
              disabled={!text.trim()}
              onClick={() => onSaveNote(text.trim())}
            >
              {t('document.saveNote')}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.row}>
          <button type="button" className={styles.action} onClick={onHighlight}>
            <span aria-hidden="true">🖊</span> {t('document.highlight')}
          </button>
          <button type="button" className={styles.action} onClick={() => setNoteMode(true)}>
            <span aria-hidden="true">✎</span> {t('document.addNote')}
          </button>
        </div>
      )}
    </div>
  );
}
