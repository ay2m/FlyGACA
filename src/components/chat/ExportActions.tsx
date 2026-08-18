import { useTranslation } from 'react-i18next';
import styles from './ExportActions.module.css';
import { triggerDownload } from '@/lib/download';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';

/**
 * Header actions to take the whole conversation with you: copy it to the
 * clipboard as Markdown, or download it as a `.md` file. Pure presentational —
 * the page builds the Markdown (via `transcriptToMarkdown`) and owns when this is
 * shown (only when the active conversation has messages).
 */
export function ExportActions({ markdown, filename }: { markdown: string; filename: string }) {
  const { t } = useTranslation();
  const { copied, copy } = useCopyToClipboard();

  function download() {
    triggerDownload(filename, markdown, 'text/markdown');
  }

  return (
    <div className={styles.actions}>
      <button type="button" className={styles.action} onClick={() => void copy(markdown)}>
        <span aria-hidden="true">{copied ? '✓' : '⧉'}</span>
        <span className={styles.label}>{copied ? t('chat.exportCopied') : t('chat.export')}</span>
      </button>
      <button type="button" className={styles.action} onClick={download}>
        <span aria-hidden="true">↓</span>
        <span className={styles.label}>{t('chat.download')}</span>
      </button>
    </div>
  );
}
