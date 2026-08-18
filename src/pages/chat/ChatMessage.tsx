import { useTranslation } from 'react-i18next';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { GroundingBadge } from '@/components/chat/GroundingBadge';
import { RichText } from '@/components/chat/RichText';
import { MessageActions } from '@/components/chat/MessageActions';
import { SourceList } from '@/components/chat/SourceList';
import { CrossRefChips } from '@/components/chat/CrossRefChips';
import { crossRefParts } from '@/calc/chat/chatCrossRefs';
import type { Rating } from '@/calc/chat/chatFeedback';
import type { Message } from './chatLocal';
import styles from './Chat.module.css';

/** One chat turn: avatar, grounding badge, bubble, sources, cross-refs, actions. */
export function ChatMessage({
  m,
  animate,
  resolveCitation,
  validSlugs,
  rating,
  onFeedback,
  onRegenerate,
}: {
  m: Message;
  /** Whether this row's portrait may animate (only the newest reply does). */
  animate: boolean;
  resolveCitation: (partNumber: string) => string | null;
  validSlugs: Set<string>;
  rating?: Rating;
  onFeedback?: (r: Rating) => void;
  onRegenerate: () => void;
}) {
  const { t } = useTranslation();
  const isAdel = m.role === 'assistant';
  // His expression tracks the reply's state: thinking while pending,
  // a calm "hold" when the answer isn't grounded, neutral otherwise.
  const pose = m.pending ? 'thinking' : m.kind === 'refusal' ? 'hold' : 'default';
  return (
    <div
      className={`${styles.msg} ${isAdel ? styles.adel : styles.user} ${
        m.pending ? styles.pending : ''
      }`}
    >
      {isAdel && (
        <CaptainAvatar
          size="sm"
          pose={pose}
          live
          animated={animate && pose === 'default'}
          decorative
          className={styles.msgAvatar}
        />
      )}
      <div className={styles.msgBody}>
        {isAdel && !m.pending && <GroundingBadge kind={m.kind} refusalClass={m.refusalClass} />}
        <div className={styles.bubble}>
          {m.pending ? (
            <span className={styles.thinkingDots} aria-label={t('chat.thinking')} role="status">
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </span>
          ) : isAdel && !m.streaming && !m.error ? (
            <RichText text={m.text} resolveCitation={resolveCitation} />
          ) : (
            <>
              {m.text}
              {m.streaming && <span className={styles.caret} aria-hidden="true" />}
            </>
          )}
        </div>
        {m.sources && m.sources.length > 0 && <SourceList sources={m.sources} valid={validSlugs} />}
        {isAdel && !m.pending && !m.streaming && !m.error && (
          <CrossRefChips refs={crossRefParts(m.text, m.sources, validSlugs)} />
        )}
        {isAdel && !m.pending && !m.streaming && (
          <MessageActions
            text={m.text}
            isError={m.error}
            onRegenerate={onRegenerate}
            shareTitle={t('chat.title')}
            rating={rating}
            onFeedback={onFeedback}
          />
        )}
      </div>
    </div>
  );
}
