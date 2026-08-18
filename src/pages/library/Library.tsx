import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useFetchJson } from '@/hooks/useFetchJson';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePageMeta } from '@/hooks/usePageMeta';
import { itemListLd } from '@/lib/seo/jsonld';
import { CORPUS, fetchJson } from '@/lib/content';
import { searchEntryLink, toSearchRef } from '@/lib/contentLinks';
import {
  filterDocs,
  filterSearchHits,
  groupByCategory,
  type SortKey,
} from '@/calc/library/libraryFilter';
import type { CorpusDoc, CorpusIndex, LibraryKind, SearchEntry, SearchIndex } from '@/lib/content';
import {
  useLibraryPrefs,
  isBookmarked,
  saveSearch,
  removeSearch,
  searchKey,
} from '@/lib/prefs/libraryPrefs';
import { LibraryDocItem } from './LibraryDocItem';
import { LibrarySearchResults } from './LibrarySearchResults';
import { LibraryShelves } from './LibraryShelves';
import { useBookmarkGate } from '@/hooks/useBookmarkGate';
import { Disclaimer } from '@/components/Disclaimer';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { Alert } from '@/components/Alert';
import { OfflineDownloads } from '@/components/pwa/OfflineDownloads';
import { SearchHero } from '@/components/SearchHero';
import type { HeroStat } from '@/components/SearchHero';
import { ViewToggle } from '@/components/hub/ViewToggle';
import { SortSelect } from '@/components/hub/SortSelect';
import { useViewMode } from '@/hooks/useViewMode';
import styles from './Library.module.css';
import hub from '@/components/hub/hubList.module.css';
import { Tab, Tabs } from '@/components/ui/Tabs';
import { catToken } from '@/components/categoryTone';

const MIN_QUERY = 3;
/** Max full-text matches collected before we ask the user to refine. */
const HIT_CAP = 400;
const KINDS: LibraryKind[] = ['regulations', 'reference', 'handbook'];
/** Per-category accent — cycles the Falcon hues from the design-token map. */

const VIEW_KEY = 'flygaca:library-view';

/** Which sorts each corpus offers, in display order; the first is its default. */
const SORTS: Record<LibraryKind, SortKey[]> = {
  regulations: ['part', 'title', 'size'],
  reference: ['title', 'size'],
  handbook: ['title', 'size'],
};
/** The size sort's i18n label key differs by corpus (pages vs sections). */
const SIZE_LABEL: Record<LibraryKind, string> = {
  regulations: 'library.sort.pages',
  reference: 'library.sort.sections',
  handbook: 'library.sort.sections',
};
/** Quick-search seed terms shown as chips in the hero, per corpus. */
const SUGGESTIONS: Record<LibraryKind, string[]> = {
  regulations: ['Part 91', 'medical', 'licensing', 'airworthiness', 'operations'],
  reference: ['weather', 'navigation', 'safety', 'airspace'],
  handbook: ['weather', 'aerodrome', 'navigation', 'systems'],
};

export function Library() {
  const { t } = useTranslation();
  const [kind, setKind] = useState<LibraryKind>('regulations');
  const [reload, setReload] = useState(0);
  const { data, error, loading } = useFetchJson<CorpusIndex>(CORPUS[kind].index, reload);
  // Expose the active corpus as an ItemList so crawlers read the hub as an
  // ordered set of its documents (for a crawler that's the default 74 GACAR Parts).
  const itemLd = useMemo(
    () =>
      data
        ? itemListLd(
            data.documents.map((d) => ({ name: d.title, path: `${CORPUS[kind].base}/${d.slug}` })),
          )
        : undefined,
    [data, kind],
  );
  usePageMeta(t('meta.library'), t('metaDesc.library'), itemLd);
  const [category, setCategory] = useState<string>('all');
  // Seed the search from a `?q=` deep link (e.g. the home dashboard's search tile).
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [sort, setSort] = useState<SortKey>(() => SORTS[kind][0]);
  const [view, setView] = useViewMode(VIEW_KEY);
  const prefs = useLibraryPrefs();
  const bookmark = useBookmarkGate();
  const { bookmarks, recents, searches } = prefs;
  // When applying a saved search, carry its category across the corpus switch.
  const pendingCat = useRef<string | null>(null);

  // Reset the category filter + sort whenever the corpus changes (honour pending apply).
  useEffect(() => {
    setCategory(pendingCat.current ?? 'all');
    pendingCat.current = null;
    setSort(SORTS[kind][0]);
  }, [kind]);

  const applySearch = (s: { kind: LibraryKind; category: string; query: string }) => {
    setQuery(s.query);
    if (s.kind !== kind) {
      pendingCat.current = s.category;
      setKind(s.kind);
    } else {
      setCategory(s.category);
    }
  };

  // Lazy full-text index — fetched once, the first time a query reaches MIN_QUERY chars.
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [indexLoading, setIndexLoading] = useState(false);
  const requested = useRef(false);

  // Debounce the live query so we don't refilter the corpus on every keystroke.
  const q = useDebouncedValue(query.trim(), 200);
  const fullText = q.length >= MIN_QUERY;

  useEffect(() => {
    if (!fullText || requested.current) return;
    requested.current = true;
    setIndexLoading(true);
    fetchJson<SearchIndex>('/data/library-search.json')
      .then((idx) => setEntries(idx.entries))
      .catch(() => setEntries([]))
      .finally(() => setIndexLoading(false));
  }, [fullText]);

  const docs = useMemo(
    () => (data ? filterDocs(data.documents, category, q, sort) : []),
    [data, category, q, sort],
  );

  // Animated corpus figures for the hero readout. Pages (regulations) or
  // sections (reference/handbooks), whichever the corpus carries.
  const stats = useMemo<HeroStat[]>(() => {
    if (!data) return [];
    const pages = data.documents.reduce((s, d) => s + (d.pages ?? 0), 0);
    const sections = data.documents.reduce((s, d) => s + (d.sections ?? 0), 0);
    const out: HeroStat[] = [
      { label: t('library.stats.documents'), value: data.count, tone: 'cyan' },
    ];
    if (pages > 0) out.push({ label: t('library.stats.pages'), value: pages, tone: 'green' });
    else if (sections > 0)
      out.push({ label: t('library.stats.sections'), value: sections, tone: 'green' });
    out.push({ label: t('library.stats.categories'), value: data.categories.length, tone: 'gold' });
    return out;
  }, [data, t]);

  // slug → category for the active corpus, so full-text hits can honour the chips.
  const docCat = useMemo(() => {
    const m = new Map<string, string>();
    data?.documents.forEach((d) => m.set(d.slug, d.category));
    return m;
  }, [data]);

  // Full-text hits, scoped to the active corpus tab and category chip.
  const hits = useMemo(
    () =>
      fullText && entries
        ? filterSearchHits(entries, q, kind, category, docCat, HIT_CAP, (e) =>
            toSearchRef(searchEntryLink(e)),
          )
        : [],
    [fullText, entries, q, kind, category, docCat],
  );

  const categoryLabel = (id: string) => data?.categories.find((c) => c.id === id)?.label ?? id;

  // Deterministic category → accent colour, by the category's order in the index.
  const catColor = useMemo(() => {
    const map = new Map<string, string>();
    data?.categories.forEach((c, i) => map.set(c.id, catToken(i)));
    return (id: string) => map.get(id) ?? catToken(0);
  }, [data]);

  // When not searching by text, group the cards under category section headers.
  const groups = useMemo(() => (data ? groupByCategory(data.categories, docs) : []), [data, docs]);

  const renderDoc = (d: CorpusDoc) => {
    const marked = isBookmarked(prefs, kind, d.slug);
    return (
      <LibraryDocItem
        key={d.slug}
        d={d}
        view={view}
        kind={kind}
        marked={marked}
        onToggleBookmark={() => bookmark.toggle({ kind, slug: d.slug, title: d.title }, marked)}
        catColor={catColor}
        categoryLabel={categoryLabel}
      />
    );
  };

  const listClass = `${hub.grid} ${view === 'list' ? hub.list : ''} stagger-grid`;

  return (
    <section className={`container ${styles.page}`}>
      <SearchHero
        eyebrow={t('library.eyebrow')}
        title={t('library.title')}
        subtitle={t('library.subtitle')}
        placeholder={t('library.searchPlaceholder')}
        query={query}
        onQueryChange={setQuery}
        stats={stats}
        chipsLabel={t('library.popular')}
        chips={SUGGESTIONS[kind].map((s) => ({ label: s, onClick: () => setQuery(s) }))}
        trailing={
          <>
            <Link to="/library/charts">{t('library.viewCharts')} →</Link>
            <Link to="/library/glossary">{t('library.viewGlossary')} →</Link>
          </>
        }
      />

      <OfflineDownloads />

      <Link to="/updates" className={styles.updatesLink}>
        <span className={styles.updatesText}>{t('alerts.libraryLink')}</span>
        <span className={styles.updatesPro}>{t('upsell.proOnly')}</span>
        <span aria-hidden="true">→</span>
      </Link>

      {!q && <LibraryShelves recents={recents} bookmarks={bookmarks} />}

      <Tabs label={t('library.browse')} className={styles.tabs}>
        {KINDS.map((k) => (
          <Tab key={k} active={kind === k} onClick={() => setKind(k)}>
            {t(`library.kind.${k}`)}
          </Tab>
        ))}
      </Tabs>

      {loading && (
        <ul className={`${hub.grid} ${styles.skeletonGrid}`} aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className={styles.skeleton} />
          ))}
        </ul>
      )}
      {error && (
        <Alert
          tone="error"
          role="alert"
          icon="⚠"
          action={{ label: t('library.retry'), onClick: () => setReload((r) => r + 1) }}
        >
          {t('common.loadError')}
        </Alert>
      )}

      {data && (
        <>
          <div className={styles.controls}>
            <div className={styles.chips} role="group" aria-label={t('library.eyebrow')}>
              <button
                type="button"
                className={`${styles.chip} ${category === 'all' ? styles.chipActive : ''}`}
                onClick={() => setCategory('all')}
              >
                {t('library.all')} <span className={styles.count}>{data.count}</span>
              </button>
              {data.categories.map((c) => {
                const n = data.documents.filter((d) => d.category === c.id).length;
                return (
                  <button
                    key={c.id}
                    type="button"
                    className={`${styles.chip} ${category === c.id ? styles.chipActive : ''}`}
                    onClick={() => setCategory(c.id)}
                  >
                    {c.label} <span className={styles.count}>{n}</span>
                  </button>
                );
              })}
            </div>

            <div className={styles.toolbar}>
              {(query.trim() || category !== 'all') && (
                <button
                  type="button"
                  className={styles.saveSearchBtn}
                  onClick={() => saveSearch({ kind, category, query: query.trim() })}
                >
                  ☆ {t('library.saveSearch')}
                </button>
              )}
              <div className={styles.toolbarEnd}>
                <SortSelect
                  label={t('library.sortBy')}
                  value={sort}
                  onChange={(v) => setSort(v as SortKey)}
                  options={SORTS[kind].map((s) => ({
                    value: s,
                    label: t(s === 'size' ? SIZE_LABEL[kind] : `library.sort.${s}`),
                  }))}
                />
                <ViewToggle
                  value={view}
                  onChange={setView}
                  groupLabel={t('library.view')}
                  gridLabel={t('library.viewGrid')}
                  listLabel={t('library.viewList')}
                />
              </div>
            </div>

            {query.trim() && !fullText && (
              <p className={styles.searchHint}>{t('library.searchHint')}</p>
            )}

            {searches.length > 0 && (
              <div className={styles.savedSearches} aria-label={t('library.savedSearches')}>
                {searches.map((s) => (
                  <span key={searchKey(s)} className={styles.savedSearch}>
                    <button
                      type="button"
                      className={styles.savedSearchApply}
                      onClick={() => applySearch(s)}
                    >
                      {s.query || t(`library.kind.${s.kind}`)}
                      {s.category !== 'all' ? ` · ${categoryLabel(s.category)}` : ''}
                    </button>
                    <button
                      type="button"
                      className={styles.savedSearchX}
                      aria-label={t('library.removeSearch')}
                      onClick={() => removeSearch(searchKey(s))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {docs.length === 0 ? (
            <EmptyState
              icon="🔍"
              action={{
                label: t('common.clear'),
                onClick: () => {
                  setQuery('');
                  setCategory('all');
                },
              }}
            >
              {t('library.empty')}
            </EmptyState>
          ) : q ? (
            <ul className={listClass}>{docs.map(renderDoc)}</ul>
          ) : (
            groups.map((g) => (
              <section key={g.id} className={styles.group}>
                <SectionHeader
                  title={g.label}
                  tone={catColor(g.id)}
                  count={t('library.docsCount', { count: g.docs.length })}
                />
                <ul className={listClass}>{g.docs.map(renderDoc)}</ul>
              </section>
            ))
          )}

          {fullText && (
            <LibrarySearchResults
              q={q}
              kind={kind}
              category={category}
              hits={hits}
              indexLoading={indexLoading}
              entriesLoaded={entries !== null}
              cap={HIT_CAP}
            />
          )}

          <p className={styles.synced}>{t('library.synced', { date: data.generated })}</p>
        </>
      )}

      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}
