import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { VoiceButton } from './VoiceButton';
import styles from './ChatComposer.module.css';

/**
 * The Captain Adel input bar: auto-growing textarea, voice dictation, and the
 * send/stop toggle. The page owns the input value and the ask/stop actions;
 * this owns the form chrome, keyboard handling, and the autogrow behaviour.
 */
export function ChatComposer({
  input,
  busy,
  onInput,
  onSubmit,
  onStop,
}: {
  input: string;
  busy: boolean;
  onInput: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Grow the composer to fit its content (capped), and snap back when cleared.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  return (
    <form
      className={styles.composer}
      aria-label={t('chat.composer')}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <textarea
        ref={inputRef}
        className={styles.input}
        value={input}
        onChange={(e) => onInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
          }
        }}
        rows={2}
        placeholder={t('chat.placeholder')}
        aria-label={t('chat.placeholder')}
      />
      <VoiceButton onTranscript={(text) => onInput(input ? `${input} ${text}` : text)} />
      {busy ? (
        <button className="btn btn-primary" type="button" onClick={onStop}>
          {t('chat.stop')}
        </button>
      ) : (
        <button className="btn btn-primary" type="submit" disabled={!input.trim()}>
          {t('chat.send')}
        </button>
      )}
    </form>
  );
}
