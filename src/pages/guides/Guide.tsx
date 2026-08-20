import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '@/components/Disclaimer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { adelLink } from '@/lib/adel';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useCopyToClipboardKeyed } from '@/hooks/useCopyToClipboard';
import { articleLd, breadcrumbLd, faqLd, type Crumb, type QA } from '@/lib/seo/jsonld';
import { KeyFacts, type KeyFact } from '@/components/KeyFacts';
import { Faq } from '@/components/Faq';
import { readingMinutes } from '@/lib/readingTime';
import { useGuidePrefs, toggleBookmark, toggleRead, markRead } from '@/lib/prefs/guidePrefs';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import {
  GUIDE_SLUGS,
  GUIDE_TOOLS,
  GUIDE_REGS,
  GUIDE_QUIZ,
  GUIDE_META,
  GUIDE_STATUS,
  GUIDE_UPDATED,
  TOOL_NAME_KEY,
  partNumber,
  sectionId,
  type GuideSlug,
} from './guides';
import { NotFound } from '@/pages/not-found/NotFound';
import prose from '@/pages/legal/Prose.module.css';
import styles from './Guides.module.css';

interface Section {
  h: string;
  p: string;
}

export function Guide() {
  const { t, i18n } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const valid = !!slug && GUIDE_SLUGS.includes(slug as GuideSlug);
  const base = `guides.items.${slug}`;
  const { bookmarks, read } = useGuidePrefs();

  // One crumb trail feeds both the JSON-LD and the visible <Breadcrumbs/> so they
  // can never drift. Empty for unknown slugs (the page renders <NotFound/>).
  // The Guides + Study hubs merged into /learn; anchor the crumb on the live hub
  // (200, defaults to the Guides tab) rather than the /guides redirect, so both
  // the visible trail and the JSON-LD keep hub context.
  const crumbs: Crumb[] = valid
    ? [
        { name: t('nav.breadcrumbHome'), path: '/' },
        { name: t('nav.learn'), path: '/learn' },
        { name: t(`${base}.name`), path: `/guides/${slug}` },
      ]
    : [];

  // Answer-first FAQ (optional per guide) — read before the meta hook so its
  // FAQPage schema can join the JSON-LD. The on-page text (rendered below) is
  // emitted verbatim, as an FAQPage rich result requires.
  const faqsRaw = valid ? t(`${base}.faqs`, { returnObjects: true }) : null;
  const faqs = Array.isArray(faqsRaw) ? (faqsRaw as unknown as QA[]) : [];

  // Hook must run before the early return; title is undefined for unknown slugs.
  usePageMeta(
    valid ? t(`${base}.name`) : undefined,
    valid ? t(`${base}.blurb`) : undefined,
    valid
      ? [
          articleLd({
            title: t(`${base}.name`),
            description: t(`${base}.blurb`),
            path: `/guides/${slug}`,
            lang: i18n.language,
            // Only guides actually re-verified carry a date (see GUIDE_UPDATED);
            // the builder omits the date fields when this is undefined.
            dateModified: GUIDE_UPDATED[slug as GuideSlug],
          }),
          breadcrumbLd(crumbs, i18n.language),
          ...(faqs.length ? [faqLd(faqs)] : []),
        ]
      : undefined,
    // Valid guides are editorial articles; an unknown slug renders <NotFound/>,
    // so noindex it here (this parent hook runs after the child's, so it owns
    // the final robots state).
    valid ? { ogType: 'article' } : { noindex: true },
  );

  // Deep links to a section (#anchor) — jump once the guide has rendered.
  useScrollToHash(valid);

  const [progress, setProgress] = useState(0);
  const { copiedKey: copied, copy } = useCopyToClipboardKeyed<number>();
  const onScroll = useCallback(() => {
    const el = document.documentElement;
    const total = el.scrollHeight - el.clientHeight;
    setProgress(total > 0 ? Math.round((el.scrollTop / total) * 100) : 0);
  }, []);
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  // Auto-mark a guide read once the reader has scrolled (near) the end.
  useEffect(() => {
    if (valid && slug && progress >= 95) markRead(slug);
  }, [valid, slug, progress]);

  const copyLink = useCallback(
    (i: number, anchor: string) =>
      void copy(i, `${window.location.origin}${window.location.pathname}#${anchor}`),
    [copy],
  );

  if (!valid) return <NotFound />;
  const guideSlug = slug as GuideSlug;
  const sections = t(`${base}.sections`, { returnObjects: true }) as unknown as Section[];
  const takeaways = t(`${base}.takeaways`, { returnObjects: true }) as unknown as string[];
  const keyFactsRaw = t(`${base}.keyFacts`, { returnObjects: true });
  const keyFacts = Array.isArray(keyFactsRaw) ? (keyFactsRaw as unknown as KeyFact[]) : [];
  const intro = t(`${base}.intro`);
  const adel = adelLink(t(`${base}.adel`));
  const tools = GUIDE_TOOLS[guideSlug] ?? [];
  const regs = GUIDE_REGS[guideSlug] ?? [];
  const quizBank = GUIDE_QUIZ[guideSlug];
  const meta = GUIDE_META[guideSlug];
  const minutes = readingMinutes(
    [intro, ...sections.flatMap((s) => [s.h, s.p]), ...takeaways].join(' '),
  );

  // Shown next to the read time when the guide has actually been re-verified —
  // freshness readers (and AI answer engines) can see, matching the dateModified
  // in the JSON-LD above.
  const reviewed = GUIDE_UPDATED[guideSlug];

  const isSaved = bookmarks.includes(guideSlug);
  const isRead = read.includes(guideSlug);

  const idx = GUIDE_SLUGS.indexOf(guideSlug);
  const prev = idx > 0 ? GUIDE_SLUGS[idx - 1] : null;
  const next = idx < GUIDE_SLUGS.length - 1 ? GUIDE_SLUGS[idx + 1] : null;
  const related = GUIDE_SLUGS.filter(
    (s) => s !== guideSlug && GUIDE_META[s].topic === meta.topic,
  ).slice(0, 3);

  return (
    <article className={`container-narrow ${prose.prose}`}>
      <div className={styles.readingTrack} aria-hidden="true">
        <div className={styles.readingBar} style={{ inlineSize: `${progress}%` }} />
      </div>
      <Breadcrumbs items={crumbs} />
      <p className={styles.back}>
        <Link to="/learn">← {t('nav.learn')}</Link>
      </p>
      <header>
        <span className={styles.headMeta}>
          {GUIDE_STATUS[guideSlug] === 'draft' && (
            <span className={styles.draftBadge}>{t('guides.draft')}</span>
          )}
          <span className={styles.level} data-level={meta.level}>
            {t(`guides.level.${meta.level}`)}
          </span>
          <span className={styles.metaDim}>{t('guides.readTime', { min: minutes })}</span>
          {reviewed && (
            <span className={styles.metaDim}>{t('guides.lastReviewed', { date: reviewed })}</span>
          )}
          <button
            type="button"
            className={`${styles.bookmarkBtn} ${isSaved ? styles.bookmarkOn : ''}`}
            aria-pressed={isSaved}
            onClick={() => toggleBookmark(guideSlug)}
          >
            <span aria-hidden="true">{isSaved ? '★' : '☆'}</span>{' '}
            {t(isSaved ? 'guides.unbookmark' : 'guides.bookmark')}
          </button>
        </span>
        <h1>{t(`${base}.name`)}</h1>
        <p className={prose.lead}>{intro}</p>
      </header>

      {takeaways.length > 0 && (
        <aside className={styles.takeaways} aria-label={t('guides.keyTakeaways')}>
          <span className={styles.takeawaysLabel}>{t('guides.keyTakeaways')}</span>
          <ul>
            {takeaways.map((tk, i) => (
              <li key={i}>{tk}</li>
            ))}
          </ul>
        </aside>
      )}

      {keyFacts.length > 0 && <KeyFacts title={t('guides.keyFactsTitle')} facts={keyFacts} />}

      {sections.length > 1 && (
        <nav className={styles.onThisPage} aria-label={t('guides.onThisPage')}>
          <span className={styles.onThisPageLabel}>{t('guides.onThisPage')}</span>
          <ol>
            {sections.map((s, i) => (
              <li key={i}>
                <a href={`#${sectionId(i, s.h)}`}>{s.h}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {sections.map((s, i) => {
        const anchor = sectionId(i, s.h);
        return (
          <section key={i}>
            <h2 id={anchor} className={styles.sectionH}>
              {s.h}
              <button
                type="button"
                className={styles.copyLink}
                aria-label={t('guides.copyLink')}
                title={copied === i ? t('guides.copied') : t('guides.copyLink')}
                onClick={() => copyLink(i, anchor)}
              >
                {copied === i ? '✓' : '🔗'}
              </button>
            </h2>
            <p>{s.p}</p>
          </section>
        );
      })}

      <nav className={styles.links} aria-label={t('guides.tools')}>
        {adel && (
          <Link to={adel} className={styles.adel}>
            {t('guides.askAdel')}
          </Link>
        )}
        {tools.map((to) => (
          <Link key={to} to={to} className={styles.toolChip}>
            {t(TOOL_NAME_KEY[to] ?? to)}
          </Link>
        ))}
        {quizBank && (
          <Link to={`/study/quiz?bank=${quizBank}`} className={styles.toolChip}>
            {t('guides.testYourself')}
          </Link>
        )}
      </nav>

      {regs.length > 0 && (
        <section className={styles.regs}>
          <h2 className={styles.regsHead}>{t('guides.regsCited')}</h2>
          <div className={styles.links}>
            {regs.map((reg) => (
              <Link key={reg} to={`/library/${reg}`} className={styles.regChip}>
                {t('guides.regChip', { part: partNumber(reg) })}
              </Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedHead}>{t('guides.related')}</h2>
          <ul className={styles.grid}>
            {related.map((s) => (
              <li key={s}>
                <Link to={`/guides/${s}`} className={styles.card}>
                  <h3 className={styles.cardTitle}>{t(`guides.items.${s}.name`)}</h3>
                  <p className={styles.blurb}>{t(`guides.items.${s}.blurb`)}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {faqs.length > 0 && <Faq title={t('guides.faqTitle')} items={faqs} />}

      <div className={styles.readToggleRow}>
        <button
          type="button"
          className={`${styles.readToggle} ${isRead ? styles.readToggleOn : ''}`}
          aria-pressed={isRead}
          onClick={() => toggleRead(guideSlug)}
        >
          <span aria-hidden="true">{isRead ? '✓' : '○'}</span>{' '}
          {t(isRead ? 'guides.readDone' : 'guides.markRead')}
        </button>
      </div>

      <nav className={styles.prevNext} aria-label={t('guides.title')}>
        {prev ? (
          <Link to={`/guides/${prev}`} className={styles.prevNextLink}>
            <span className={styles.prevNextDir}>← {t('guides.prev')}</span>
            <span className={styles.prevNextName}>{t(`guides.items.${prev}.name`)}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link to={`/guides/${next}`} className={`${styles.prevNextLink} ${styles.prevNextEnd}`}>
            <span className={styles.prevNextDir}>{t('guides.next')} →</span>
            <span className={styles.prevNextName}>{t(`guides.items.${next}.name`)}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <Disclaimer />
    </article>
  );
}
