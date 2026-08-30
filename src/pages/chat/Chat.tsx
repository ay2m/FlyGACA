import { useEffect, useMemo, useRef, useState } from 'react';
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
import { AmbientGlow } from '@/components/AmbientGlow';
import styles from './Chat.module.css';

import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoCard } from '@/components/bento/BentoCard';
import { CaptainAvatar } from '@/components/CaptainAvatar';

/**
 * Captain Adel — conversational GACAR flight instructor.
 *
 * Grounding rules:
 * - Green badge: answer quotes/cites verbatim GACAR section.
 * - Yellow badge: answer references GACAR Part broadly or general aviation knowledge.
 * - Refusal: model cannot ground answer in corpus, refuses to guess.
 * - Every regulatory claim MUST link to /library/<slug>#<section>.
 */
export default function Chat() {
  const { t } = useTranslation();
  usePageMeta(t('meta.chat'), t('metaDesc.chat'));

  const [params, setParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [usePro, setUsePro] = useState(loadProPref);
  const { conversations, activeId, newChat, selectConversation, deleteConversation, rename, pin } =
    useConversations<Message>(busy);
  const [usage, setUsage] = useState<Usage>(loadUsage);
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
  const { dailyLimit, left, gated } = quotaGate(usage, {
    signedIn: !!session,
    isPro,
    chatCredits,
  });

  const gacar = useFetchJson<GacarIndex>('/data/gacar-index.json');
  const validSlugs = useMemo(() => {
    return new Set(gacar.data?.documents.map((d) => d.slug) ?? []);
  }, [gacar.data]);

  function resolveCitation(partNumber: string): string | null {
    const slug = partSlug(validSlugs, partNumber);
    return slug ? `/library/${slug}` : null;
  }

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
      setMessages((prev) => finalizeStream(prev, notReady));
    } catch (e) {
      if ((e as Error)?.name === 'AbortError') {
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

  useEffect(() => {
    const q = params.get('q');
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      setParams({}, { replace: true });
      void ask(q);
    }
  }, []);

  useEffect(() => {
    if (atBottomRef.current) {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
    }
  }, [messages]);

  const last = messages[messages.length - 1];
  const lastAssistantIdx = lastAssistantIndex(messages);
  const followupsVisible = showFollowups(last, { gated, busy });
  const digest = conversationParts(messages, validSlugs);
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
    <section className={`container ${styles.page}`} style={{ position: 'relative' }}>
      <AmbientGlow
        variant="dashboard"
        style={{
          position: 'absolute',
          top: '-100px',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: -1,
          opacity: 0.8,
        }}
      />

      <header
        className={styles.head}
        style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <CaptainAvatar size="sm" live glow pose="default" />
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)' }}>
              {t('chat.title', 'Captain Adel')}
            </h1>
            <p className={styles.status} style={{ margin: 0 }}>
              <span className={styles.statusDot} aria-hidden="true" />
              {t('chat.status', 'System Nominal')}
            </p>
          </div>
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

      <BentoGrid>
        {/* Main Chat Area */}
        <BentoCard
          className={`card-clay ${styles.chatMainCard}`}
          style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
        >
          <div className={styles.logWrap} style={{ flex: 1, position: 'relative' }}>
            <div
              className={styles.log}
              ref={logRef}
              role="log"
              aria-live="polite"
              style={{
                padding: '2rem',
                height: '100%',
                overflowY: 'auto',
                border: 'none',
                borderRadius: 0,
                background: 'transparent',
                boxShadow: 'none',
              }}
              onScroll={(e) => {
                const el = e.currentTarget;
                const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
                atBottomRef.current = near;
                setAtBottom(near);
              }}
            >
              {messages.length === 0 && <ChatWelcome onAsk={(q) => void ask(q)} />}
              {messages.map((m, i) => (
                <ChatMessage
                  key={i}
                  m={m}
                  animate={i === lastAssistantIdx}
                  resolveCitation={resolveCitation}
                  validSlugs={validSlugs}
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
                        className="btn-clay"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
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
                style={{ bottom: '1rem', right: '1rem', zIndex: 10 }}
              >
                <span aria-hidden="true">↓</span>
              </button>
            )}
          </div>

          <div
            style={{
              padding: '1.5rem',
              borderTop: 'var(--clay-border)',
              background: 'var(--surface-raised)',
            }}
          >
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
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '0.75rem',
                  }}
                >
                  {isPro ? (
                    <label className={styles.proToggle}>
                      <input type="checkbox" checked={usePro} onChange={togglePro} />
                      <span>{t('chat.proModel')}</span>
                      <span className={styles.proHint}>{t('chat.proModelHint')}</span>
                    </label>
                  ) : chatCredits > 0 && isExhausted(currentUsage(usage)) ? (
                    <p className={styles.quota}>{t('chat.quota.credits', { n: chatCredits })}</p>
                  ) : (
                    <p className={styles.quota}>
                      {t('chat.quota.left', { n: left, limit: dailyLimit })}
                    </p>
                  )}
                  <p className={styles.note} style={{ margin: 0 }}>
                    {t('chat.disclaimer')}
                  </p>
                </div>
              </>
            )}
          </div>
        </BentoCard>

        {/* Side Panel for Citations / Status */}
        <BentoCard
          className={`card-clay ${styles.chatSideCard}`}
          style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}
        >
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', color: 'var(--brand-hover)' }}>
              {t('chat.sourcesLabel')}
            </h3>
            {hasMessages && digest.length > 0 ? (
              <SourcesDigest parts={digest} />
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {t(
                  'chat.noSourcesYet',
                  'As Captain Adel cites GACAR regulations, they will appear here.',
                )}
              </p>
            )}
          </div>

          <div style={{ flex: 1 }} />

          <div
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'rgba(0,0,0,0.2)',
              border: 'var(--clay-border)',
            }}
          >
            <h4
              style={{
                fontSize: '0.9rem',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--neon-green)',
                  boxShadow: '0 0 6px var(--neon-green)',
                }}
              ></span>
              {t('chat.engineStatus', 'Engine Status')}
            </h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
              {isPro && usePro
                ? t('chat.proActive', 'Pro Model Active')
                : t('chat.standardActive', 'Standard Model Active')}
            </p>
          </div>
        </BentoCard>
      </BentoGrid>

      <Disclaimer compact />
    </section>
  );
}
