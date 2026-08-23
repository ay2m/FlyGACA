import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import { sanitizeHtml, tocFromHtml, useFetchText } from '@/hooks/useFetchText';
import { CORPUS } from '@/lib/content';
import type { CorpusIndex, LibraryKind } from '@/lib/content';
import { asDate, docNeighbors, relatedDocs } from '@/calc/library/corpusNav';
import { toolsForPartSlug } from '@/lib/toolRegulations';
import { adelLink } from '@/lib/adel';
import { loadSaved, removeDoc, saveDoc } from '@/lib/native/offlineCache';
import { shareCurrent } from '@/lib/share';
import { useOnline } from '@/lib/native/pwa';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useCopyToClipboardKeyed } from '@/hooks/useCopyToClipboard';
import { addClauseAnchors, extractPartNumber } from '@/lib/library/clauseAnchors';
import {
  useLibraryPrefs,
  recordView,
  removeNote,
  isBookmarked,
  docKey,
} from '@/lib/prefs/libraryPrefs';
import { decorateHeadings } from '@/lib/readerMarks';
import { useFindInPage } from '@/hooks/useFindInPage';
import { useReaderAnnotations } from '@/hooks/useReaderAnnotations';
import { useBookmarkGate } from '@/hooks/useBookmarkGate';
import { useFeature } from '@/lib/services/features';
import { SelectionPopover } from '@/components/library/SelectionPopover';
import { breadcrumbLd, techArticleLd, type Crumb } from '@/lib/seo/jsonld';
import { ReaderToolbar } from './ReaderToolbar';
import { ReaderToc } from './ReaderToc';
import { ReaderNotes } from './ReaderNotes';
import { ReaderFooterNav } from './ReaderFooterNav';
import { Disclaimer } from '@/components/Disclaimer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Provenance } from '@/components/Provenance';
import styles from './Document.module.css';

interface DocumentProps {
  /** Which corpus this reader is mounted for. Defaults to GACAR regulations. */
  kind?: LibraryKind;
}

const SCALE_KEY = 'flygaca:reader-scale';
const SCALE_MIN = 0.9;
const SCALE_MAX = 1.4;
const SCALE_STEP = 0.1;

export function Document({ kind = 'regulations' }: DocumentProps) {
  const { t, i18n } = useTranslation();
  const { hash, pathname } = useLocation();
  const navigate = useNavigate();
  const bookmark = useBookmarkGate();
  const canOffline = useFeature('offline-sync');
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get('q') ?? '').trim();
  const corpus = CORPUS[kind];
  const index = useFetchJson<CorpusIndex>(corpus.index);
  const docs = useMemo(() => index.data?.documents ?? [], [index.data]);
  const doc = docs.find((d) => d.slug === slug);
  const { text, error, loading } = useFetchText(`${corpus.dir}/${slug}.html`);
  const online = useOnline();
  const prefs = useLibraryPrefs();
  const dk = docKey({ kind, slug: slug ?? '' });
  const notesForDoc = prefs.notes[dk];
  const docBookmarked = !!slug && isBookmarked(prefs, kind, slug);
  const [filter, setFilter] = useState('');
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const { copiedKey, copy } = useCopyToClipboardKeyed<string>();
  const contentRef = useRef<HTMLDivElement>(null);
  const docDesc = doc?.title ? `${doc.title} — ${t('document.verifyAtGaca')}` : undefined;
  // The corpus carries a real freshness signal (effectiveDate, or a date-shaped
  // revision marker); fall back to the index's generated date. `asDate`
  // (calc/library/corpusNav) mirrors the same resolution in
  // scripts/build-sitemap.mjs + scripts/prerender-head.mjs.
  const dateModified =
    asDate(doc?.effectiveDate) ?? asDate(doc?.revision) ?? asDate(index.data?.generated);
  // One crumb trail for both the JSON-LD and the visible <Breadcrumbs/>.
  const crumbs: Crumb[] = doc?.title
    ? [
        { name: t('nav.breadcrumbHome'), path: '/' },
        { name: t('nav.library'), path: '/library' },
        { name: doc.title, path: pathname },
      ]
    : [];
  usePageMeta(
    doc?.title,
    docDesc,
    doc?.title
      ? [
          techArticleLd({
            title: doc.title,
            description: docDesc,
            path: pathname,
            lang: i18n.language,
            dateModified,
          }),
          breadcrumbLd(crumbs, i18n.language),
        ]
      : undefined,
    { ogType: 'article' },
  );

  // ── Reading font scale (persisted) ──
  const [scale, setScale] = useState(() => {
    try {
      const v = parseFloat(localStorage.getItem(SCALE_KEY) ?? '1');
      return Number.isFinite(v) ? Math.min(SCALE_MAX, Math.max(SCALE_MIN, v)) : 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(SCALE_KEY, String(scale));
    } catch {
      /* ignore */
    }
  }, [scale]);
  const step = (delta: number) =>
    setScale((s) => Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round((s + delta) * 10) / 10)));

  // ── Rendered content + table of contents ──
  const html = useMemo(() => {
    if (!text) return '';
    const sanitized = sanitizeHtml(text);
    // For regulation documents, add clause-level anchor IDs to enable deep-linking
    if (kind === 'regulations' && slug) {
      const partNumber = extractPartNumber(slug);
      if (partNumber) {
        return addClauseAnchors(sanitized, partNumber);
      }
    }
    return sanitized;
  }, [text, kind, slug]);
  const toc = useMemo(() => (text ? tocFromHtml(text) : []), [text]);
  const filteredToc = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle ? toc.filter((e) => e.title.toLowerCase().includes(needle)) : toc;
  }, [toc, filter]);

  const copyLink = useCallback(
    (id: string) => {
      void copy(id, `${window.location.origin}${pathname}#${id}`);
      window.history.replaceState(null, '', `#${id}`);
    },
    [copy, pathname],
  );

  // ── Find-in-page ── (query state + highlight choreography live in the hook)
  const { find, setFind, matchCount, activeMatch, cycle } = useFindInPage(contentRef, html, q);

  // ── Text selection → highlight / note popover ── (selection state + effects in the hook)
  const { sel, closeSel, dismissSelection, saveAnnotation } = useReaderAnnotations({
    contentRef,
    html,
    notes: notesForDoc,
    dk,
    slug,
    annotClass: styles.annot,
  });

  // ── Reading progress + back-to-top ──

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const onScroll = useCallback(() => {
    const el = document.documentElement;
    const total = el.scrollHeight - el.clientHeight;
    setProgress(total > 0 ? Math.round((el.scrollTop / total) * 100) : 0);
    setShowTop(el.scrollTop > 600);
    dismissSelection(); // a moved selection rect would be stale
  }, [dismissSelection]);
  useEffect(() => {
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  // Scroll to the hash anchor on load (when not actively searching).
  useEffect(() => {
    if (!html || find.trim()) return;
    const id = hash.replace(/^#/, '');
    if (id) document.getElementById(id)?.scrollIntoView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, hash]);

  // Scroll-spy: track the heading nearest the top of the viewport.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !html) return;
    const heads = Array.from(root.querySelectorAll<HTMLElement>('h2[id],h3[id]'));
    if (!heads.length) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-120px 0px -68% 0px' },
    );
    heads.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [html]);

  // Decorate each heading with a clean clause anchor + a trailing copy-link
  // affordance (added to the sanitized DOM). See `decorateHeadings`
  // (lib/readerMarks) — the clean `sec-<part>-<n>` ids are the citation deep
  // links the sitemap's clause anchors depend on.
  useEffect(() => {
    const root = contentRef.current;
    if (!root || !html) return;
    decorateHeadings(root, {
      anchorTargetClass: styles.anchorTarget,
      anchorClass: styles.anchor,
      label: t('document.copyLink'),
      onCopy: copyLink,
    });
    // The load-time hash-scroll ran before these ids existed; honor a hash that
    // points at a freshly-injected clean anchor.
    const id = hash.replace(/^#/, '');
    if (id) document.getElementById(id)?.scrollIntoView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html, copyLink]);

  // Record this document in "recently viewed" once its metadata resolves.
  useEffect(() => {
    if (doc && slug) recordView({ kind, slug, title: doc.title });
  }, [doc, slug, kind]);

  const { prev, next } = docNeighbors(docs, slug);
  const related = relatedDocs(docs, slug);
  // Reciprocal of the tools' "governing regulation" link: the flight tools that
  // operate under this Part (regulations corpus only).
  const partTools = kind === 'regulations' ? toolsForPartSlug(slug) : [];
  const adel = doc ? adelLink(t('document.adelPrompt', { title: doc.title })) : null;

  // "Save for offline": warm the SW data cache with this doc's HTML + its index.
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaved(!!slug && loadSaved().includes(slug));
  }, [slug]);
  async function toggleSave() {
    if (!slug) return;
    // Saving for offline is a Pro perk; removing an existing save is always
    // allowed so a lapsed user can reclaim space.
    if (!saved && !canOffline) {
      navigate('/pricing');
      return;
    }
    const urls = [`${corpus.dir}/${slug}.html`, corpus.index];
    if (saved) {
      await removeDoc(slug, urls);
      setSaved(false);
    } else {
      const ok = await saveDoc(slug, urls);
      setSaved(ok);
    }
  }
  function shareDoc() {
    void shareCurrent('library', { title: doc?.title });
  }

  // The eyebrow badge: "Part 91" for regulations, the corpus badge otherwise.
  const badge = doc?.part ? `${t('library.part')} ${doc.part}` : doc?.badge;
  const count = doc?.pages
    ? `${doc.pages} ${t('library.pages')}`
    : doc?.sections
      ? `${doc.sections} ${t('document.sections')}`
      : null;

  return (
    <article className={`container ${styles.page}`}>
      {html && (
        <div className={styles.readingTrack} aria-hidden="true">
          <div className={styles.readingBar} style={{ inlineSize: `${progress}%` }} />
        </div>
      )}
      <Breadcrumbs items={crumbs} />
      <p className={styles.back}>
        <Link to="/library">← {t('library.title')}</Link>
      </p>

      {loading && <p>{t('common.loading')}</p>}
      {error &&
        (online ? (
          <p role="alert">{t('common.loadError')}</p>
        ) : (
          // The doc wasn't in the offline cache and there's no network to fetch it.
          <div className={styles.offlineNotice} role="status">
            <h2>{t('offline.unavailable')}</h2>
            <p>{t('offline.unavailableHint')}</p>
          </div>
        ))}

      {html && (
        <>
          <header className={styles.head}>
            <div className={styles.meta}>
              {badge && <span className={styles.badge}>{badge}</span>}
              {count && <span className={styles.pages}>{count}</span>}
            </div>
            {doc && <h1>{doc.title}</h1>}
            <p className={styles.verify}>{t('document.verifyLine')}</p>
            <Provenance
              date={dateModified}
              revision={doc?.revision}
              sourceUrl={doc?.sourceUrl ?? index.data?.sourceUrl}
            />
          </header>

          <ReaderToolbar
            find={find}
            onFindChange={setFind}
            matchCount={matchCount}
            activeMatch={activeMatch}
            onCycle={cycle}
            onSmaller={() => step(-SCALE_STEP)}
            onLarger={() => step(SCALE_STEP)}
            canSmaller={scale > SCALE_MIN}
            canLarger={scale < SCALE_MAX}
            docTitle={doc?.title}
            kind={kind}
            slug={slug}
            docBookmarked={docBookmarked}
            bookmark={bookmark}
            saved={saved}
            canOffline={canOffline}
            onToggleSave={() => void toggleSave()}
            onShare={shareDoc}
            adel={adel}
          />

          <button
            type="button"
            className={styles.tocToggle}
            aria-expanded={tocOpen}
            onClick={() => setTocOpen((o) => !o)}
          >
            {t('document.toc')}
          </button>

          <div className={styles.layout}>
            <ReaderToc
              open={tocOpen}
              onNavigate={() => setTocOpen(false)}
              filter={filter}
              onFilterChange={setFilter}
              entries={filteredToc}
              activeId={activeId}
              kind={kind}
              slug={slug}
              docTitle={doc?.title}
              prefs={prefs}
              bookmark={bookmark}
              copiedId={copiedKey ?? ''}
              onCopyLink={copyLink}
            />

            <div
              ref={contentRef}
              data-testid="reader-body"
              className={styles.content}
              style={{ ['--reader-scale' as string]: String(scale) }}
              // Trusted, machine-extracted GACAR HTML from our own corpus; sanitized above.
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          {sel && (
            <SelectionPopover
              rect={sel.rect}
              onHighlight={() => saveAnnotation('')}
              onSaveNote={saveAnnotation}
              onClose={closeSel}
            />
          )}

          {notesForDoc && notesForDoc.length > 0 && (
            <ReaderNotes
              notes={notesForDoc}
              onJump={(id) =>
                contentRef.current
                  ?.querySelector(`mark[data-annot="${id}"]`)
                  ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
              }
              onRemove={(id) => removeNote(dk, id)}
            />
          )}

          <ReaderFooterNav
            related={related}
            partTools={partTools}
            prev={prev}
            next={next}
            base={corpus.base}
          />

          <Disclaimer />
        </>
      )}

      {showTop && (
        <button
          type="button"
          className={styles.backTop}
          aria-label={t('document.backToTop')}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          ↑
        </button>
      )}
    </article>
  );
}
