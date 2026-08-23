import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { sendChatStream, type ChatRequestError, type ChatTurn } from '@/lib/api';
import { getIdToken } from '@/lib/services/auth';
import { sessionId } from '@/lib/session';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useFetchJson } from '@/hooks/useFetchJson';
import { useConversations } from '@/hooks/useConversations';
import { useChatFeedback } from '@/hooks/useChatFeedback';
import { useAccount } from '@/lib/services/account';
import { hasFeature } from '@/lib/services/features';
import type { GacarIndex } from '@/lib/content';
import { consume, currentUsage, isExhausted, quotaGate, type Usage } from '@/calc/chat/chatQuota';
import {
  abortCleanup,
  applyStreamEvent,
  beginStream,
  failureFromEvent,
  failureFromCode,
  finalizeStream,
  FAILURE_I18N_KEY,
  type ChatFailure,
} from '@/calc/chat/chatStream';
import { partSlug, conversationParts } from '@/calc/chat/chatSources';
import { followupSuggestions, lastAssistantIndex, showFollowups } from '@/calc/chat/chatFollowups';
import { feedbackKey, getFeedback } from '@/calc/chat/chatFeedback';
import { transcriptToMarkdown } from '@/calc/chat/transcript';
import { Disclaimer } from '@/components/Disclaimer';
import { ConversationMenu } from '@/components/chat/ConversationMenu';
import { ExportActions } from '@/components/chat/ExportActions';
import { SourcesDigest } from '@/components/chat/SourcesDigest';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ChatGate } from '@/components/chat/ChatGate';
import { ChatWelcome } from './ChatWelcome';
import { ChatMessage } from './ChatMessage';
import {
  loadFeedback,
  loadProPref,
  loadUsage,
  persistFeedback,
  persistProPref,
  persistUsage,
  type Message,
} from './chatLocal';
import styles from './Chat.module.css';

export function Chat() {
  const { t } = useTranslation();
  usePageMeta(t('meta.chat'), t('metaDesc.chat'));
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const {
    conversations,
    activeId,
    messages,
    setMessages,
    newChat,
    selectConversation,
    deleteConversation,
    rename,
    pin,
  } = useConversations<Message>(busy);
  const [usage, setUsage] = useState<Usage>(loadUsage);
  const [usePro, setUsePro] = useState<boolean>(loadProPref);
  const [atBottom, setAtBottom] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const sentInitial = useRef(false);

  const { feedback, rate: rateAnswer } = useChatFeedback({
    messages,
    load: loadFeedback,
    persist: persistFeedback,
  });

  const { entitlement, session, chatCredits } = useAccount();
  const isPro = hasFeature(entitlement, 'adel-unlimited');
  // Anonymous visitors get a smaller daily "taste" before the sign-in nudge; a
  // signed-in free account gets the full free allowance, and purchased credits
  // lift the gate past it (the server enforces the same split and spends the
  // credit — this stays a UI nudge). All derived in one pure step.
  const { dailyLimit, left, gated } = quotaGate(usage, {
    signedIn: !!session,
    isPro,
    chatCredits,
  });

  const gacar = useFetchJson<GacarIndex>('/data/gacar-index.json');
  const validSlugs = useRef<Set<string>>(new Set());
  // eslint-disable-next-line react-hooks/refs
  if (gacar.data && validSlugs.current.size === 0) {
    // eslint-disable-next-line react-hooks/refs
    validSlugs.current = new Set(gacar.data.documents.map((d) => d.slug));
  }

  /** Resolve a Part number cited in prose to an in-app Library link (or null). */
  function resolveCitation(partNumber: string): string | null {
    const slug = partSlug(validSlugs.current, partNumber);
    return slug ? `/library/${slug}` : null;
  }

  /** Persisted toggle for the higher-quality "Pro" model (Pro/School plans only). */
  function togglePro() {
    setUsePro((prev) => {
      const next = !prev;
      persistProPref(next);
      return next;
    });
  }

  async function ask(question: string, base: Message[] = messages) {
    const q = question.trim();
    if (!q || busy) return;

    // No sign-in required — anonymous visitors can ask Captain Adel. The daily gate
    // below (UI nudge only; the server is the source of truth) holds them to the
    // anonymous allowance and nudges them to sign in once it's spent.
    if (!isPro) {
      const u = currentUsage(usage);
      if (isExhausted(u, dailyLimit)) return;
      const next = consume(u);
      setUsage(next);
      persistUsage(next);
    }

    setBusy(true);
    setInput('');

    const history: ChatTurn[] = base
      .filter((m) => !m.error && !m.pending)
      .map((m) => ({ role: m.role, content: m.text }));

    setMessages(beginStream(base, q));

    const controller = new AbortController();
    abortRef.current = controller;
    // What a failed turn says depends on why it failed: an unconfigured model is
    // an honest "being connected" message, a 429 is the upsell, everything else
    // is the transient fallback.
    const failureText = (f: ChatFailure) => t(FAILURE_I18N_KEY[f]);
    const notReady = failureText('transient');

    try {
      const token = (await getIdToken()) ?? undefined;
      for await (const ev of sendChatStream(
        {
          message: q,
          history,
          session: sessionId(),
          provider: isPro && usePro ? 'pro' : undefined,
        },
        token,
        controller.signal,
      )) {
        setMessages((prev) =>
          applyStreamEvent(
            prev,
            ev,
            ev.type === 'error' ? failureText(failureFromEvent(ev)) : notReady,
          ),
        );
      }
      // A stream that closed without ever leaving the pending state → not connected.
      setMessages((prev) => finalizeStream(prev, notReady));
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
        // User stopped the stream: keep whatever arrived; drop an empty bubble.
        setMessages((prev) => abortCleanup(prev));
      } else {
        const text = failureText(failureFromCode((e as ChatRequestError)?.code));
        setMessages((prev) => applyStreamEvent(prev, { type: 'error' }, text));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  /** Re-ask the user turn that produced the assistant message at `idx`. */
  function regenerate(idx: number) {
    const userMsg = messages[idx - 1];
    if (!userMsg || userMsg.role !== 'user' || busy) return;
    void ask(userMsg.text, messages.slice(0, idx - 1));
  }

  function stop() {
    abortRef.current?.abort();
  }

  function scrollToLatest() {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }

  // Prefill + auto-send from ?q= (e.g. the "Ask Captain Adel" deep link).
  useEffect(() => {
    const q = params.get('q');
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      setParams({}, { replace: true });
      void ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll only when the reader is already near the bottom.
  useEffect(() => {
    if (atBottomRef.current) {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    }
  }, [messages]);

  const last = messages[messages.length - 1];
  // Only the newest reply animates his portrait — one focal loop, never a wall of them.
  const lastAssistantIdx = lastAssistantIndex(messages);
  const followupsVisible = showFollowups(last, { gated, busy });

  // eslint-disable-next-line react-hooks/refs
  const digest = conversationParts(messages, validSlugs.current);
  const hasMessages = messages.length > 0;
  const transcriptMd = hasMessages
    ? transcriptToMarkdown(messages, {
        title: t('chat.transcriptTitle'),
        disclaimer: t('chat.disclaimer'),
        you: t('chat.you'),
        adel: t('chat.title'),
        sources: t('chat.sourcesLabel'),
      })
    : '';

  return (
    <section className={`container-narrow ${styles.page}`}>
      <header className={styles.head}>
        <div>
          <h1>{t('chat.title')}</h1>
          <p className={styles.status}>
            <span className={styles.statusDot} aria-hidden="true" />
            {t('chat.status')}
          </p>
        </div>
        <div className={styles.headActions}>
          {hasMessages && (
            <ExportActions markdown={transcriptMd} filename="flygaca-captain-adel.md" />
          )}
          <ConversationMenu
            conversations={conversations}
            activeId={activeId}
            onNew={newChat}
            onSelect={selectConversation}
            onDelete={deleteConversation}
            onRename={rename}
            onTogglePin={pin}
          />
        </div>
      </header>

      <div className={styles.logWrap}>
        <div
          className={styles.log}
          ref={logRef}
          role="log"
          aria-live="polite"
          onScroll={(e) => {
            const el = e.currentTarget;
            const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            atBottomRef.current = near;
            setAtBottom(near);
          }}
        >
          {messages.length === 0 && <ChatWelcome onAsk={(q) => void ask(q)} />}
          // eslint-disable-next-line react-hooks/refs
          {messages.map((m, i) => (
            <ChatMessage
              key={i}
              m={m}
              animate={i === lastAssistantIdx}
              resolveCitation={resolveCitation}
              validSlugs={validSlugs.current}
              rating={m.error ? undefined : getFeedback(feedback, feedbackKey(m.text))}
              onFeedback={m.error ? undefined : (r) => rateAnswer(i, r)}
              onRegenerate={() => regenerate(i)}
            />
          ))}
          {followupsVisible && (
            <div className={styles.followups}>
              {followupSuggestions(last).map((f) => {
                const label = t(`chat.followups.${f.id}`, { cite: f.cite, part: f.part });
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={styles.followup}
                    onClick={() => void ask(label)}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {!atBottom && messages.length > 0 && (
          <button
            type="button"
            className={styles.scrollDown}
            onClick={scrollToLatest}
            aria-label={t('chat.scrollToLatest')}
          >
            <span aria-hidden="true">↓</span>
          </button>
        )}
      </div>

      {hasMessages && <SourcesDigest parts={digest} />}

      {gated ? (
        <ChatGate signedIn={!!session} />
      ) : (
        <>
          <ChatComposer
            input={input}
            busy={busy}
            onInput={setInput}
            onSubmit={() => void ask(input)}
            onStop={stop}
          />
          {isPro ? (
            <label className={styles.proToggle}>
              <input type="checkbox" checked={usePro} onChange={togglePro} />
              <span>{t('chat.proModel')}</span>
              <span className={styles.proHint}>{t('chat.proModelHint')}</span>
            </label>
          ) : chatCredits > 0 && isExhausted(currentUsage(usage)) ? (
            <p className={styles.quota}>{t('chat.quota.credits', { n: chatCredits })}</p>
          ) : (
            <p className={styles.quota}>{t('chat.quota.left', { n: left, limit: dailyLimit })}</p>
          )}
        </>
      )}

      <p className={styles.note}>{t('chat.disclaimer')}</p>
      <Disclaimer compact />
    </section>
  );
}
