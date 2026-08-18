import { useTranslation } from 'react-i18next';
import { shareCurrent } from '@/lib/share';
import type { Rating } from '@/calc/chat/chatFeedback';
import { SpeakButton } from './SpeakButton';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import styles from './MessageActions.module.css';

/**
 * The row of actions under a finalized Captain Adel reply: copy, share, 👍/👎
 * feedback, and regenerate (re-ask the preceding question). For an errored turn
 * only the regenerate slot shows, reading as "Retry". Mostly presentational — the
 * page owns regenerate, the clipboard/share text, and persisted feedback.
 */
export function MessageActions({
  text,
  onRegenerate,
  isError,
  rating,
  onFeedback,
  shareTitle,
}: {
  text: string;
  onRegenerate: () => void;
  isError?: boolean;
  rating?: Rating;
  onFeedback?: (rating: Rating) => void;
  shareTitle?: string;
}) {
  const { t } = useTranslation();
  const { copied, copy } = useCopyToClipboard();

  // Capacitor Share on native · Web Share · clipboard fallback (all in `share`),
  // with ?ref=chat appended for attribution.
  async function shareReply() {
    try {
      await shareCurrent('chat', { title: shareTitle ?? t('chat.title'), text });
    } catch {
      /* user dismissed the sheet, or sharing unavailable — ignore */
    }
  }

  return (
    <div className={styles.actions}>
      {!isError && (
        <button
          type="button"
          className={styles.action}
          onClick={() => void copy(text)}
          aria-label={t('chat.copy')}
        >
          <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
          <span className={styles.label}>{copied ? t('chat.copied') : t('chat.copy')}</span>
        </button>
      )}
      {!isError && (
        <button
          type="button"
          className={styles.action}
          onClick={() => void shareReply()}
          aria-label={t('chat.share')}
        >
          <span aria-hidden="true">↗</span>
          <span className={styles.label}>{t('chat.share')}</span>
        </button>
      )}
      {!isError && <SpeakButton text={text} />}
      {!isError && onFeedback && (
        <>
          <button
            type="button"
            className={`${styles.action} ${rating === 'up' ? styles.active : ''}`}
            onClick={() => onFeedback('up')}
            aria-label={t('chat.feedback.up')}
            aria-pressed={rating === 'up'}
          >
            <span aria-hidden="true">👍</span>
          </button>
          <button
            type="button"
            className={`${styles.action} ${rating === 'down' ? styles.active : ''}`}
            onClick={() => onFeedback('down')}
            aria-label={t('chat.feedback.down')}
            aria-pressed={rating === 'down'}
          >
            <span aria-hidden="true">👎</span>
          </button>
          {rating && <span className={styles.thanks}>{t('chat.feedback.thanks')}</span>}
        </>
      )}
      <button
        type="button"
        className={styles.action}
        onClick={onRegenerate}
        aria-label={isError ? t('chat.retry') : t('chat.regenerate')}
      >
        <span aria-hidden="true">↻</span>
        <span className={styles.label}>{isError ? t('chat.retry') : t('chat.regenerate')}</span>
      </button>
    </div>
  );
}
