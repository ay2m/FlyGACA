import type { ReactNode } from 'react';
import styles from './ChatMessage.module.css';

type MessageRole = 'user' | 'assistant';

interface ChatMessageProps {
  /** 'user' or 'assistant' — determines styling and layout direction. */
  role: MessageRole;
  /** The message content — typically a ReactNode tree or already-rendered markdown. */
  children: ReactNode;
  /** Optional timestamp, already translated. */
  timestamp?: string;
  /** Optional loading indicator (showing while streaming). */
  isLoading?: boolean;
  /** Optional className for the wrapper. */
  className?: string;
}

/**
 * A reusable chat message bubble container for user and assistant messages.
 * Handles layout (left/right alignment by role), styling (tone, gradient, glass),
 * and accessibility (role, aria-live for streaming indicators).
 * Content passed as ReactNode; caller handles markdown rendering.
 */
export function ChatMessage({
  role,
  children,
  timestamp,
  isLoading = false,
  className,
}: ChatMessageProps) {
  const roleClass = role === 'user' ? styles.user : styles.assistant;
  const cls = [styles.root, roleClass, className].filter(Boolean).join(' ');

  const Container = role === 'assistant' ? 'article' : 'div';

  return (
    <Container className={cls} data-role={role} data-testid={`chat-message-${role}`}>
      <div className={styles.bubble}>
        <div className={styles.content}>{children}</div>
        {isLoading && (
          <div className={styles.loading} aria-live="polite" aria-label="Message streaming">
            <span className={styles.dot} data-testid="typing-dot" />
            <span className={styles.dot} data-testid="typing-dot" />
            <span className={styles.dot} data-testid="typing-dot" />
          </div>
        )}
      </div>
      {timestamp && <div className={styles.timestamp}>{timestamp}</div>}
    </Container>
  );
}
