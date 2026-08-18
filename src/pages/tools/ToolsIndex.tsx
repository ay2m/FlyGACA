import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass, Star, ClockCounterClockwise } from '@phosphor-icons/react';
import { TOOLS, TOOL_CATEGORIES, type ToolCategoryId, type ToolMeta } from '@/lib/tools';
import { useToolPrefs } from '@/lib/prefs/toolPrefs';
import { CategoryIcon, TOOL_ICON_WEIGHT } from '@/lib/toolIcons';
import { usePageMeta } from '@/hooks/usePageMeta';
import { itemListLd } from '@/lib/seo/jsonld';
import { Disclaimer } from '@/components/Disclaimer';
import { EmptyState } from '@/components/EmptyState';
import { SectionHeader } from '@/components/SectionHeader';
import { SearchHero } from '@/components/SearchHero';
import type { HeroStat } from '@/components/SearchHero';
import { ViewToggle } from '@/components/hub/ViewToggle';
import { SortSelect } from '@/components/hub/SortSelect';
import { useViewMode } from '@/hooks/useViewMode';
import { ToolCard } from './ToolCard';
import styles from './ToolsIndex.module.css';
import hub from '@/components/hub/hubList.module.css';
import { catToken } from '@/components/categoryTone';

/** Per-category accent — cycles the Falcon hues from the design-token map. */
/** Deterministic category → accent, by the category's order in the master list. */
const catTone = (cat: ToolCategoryId) => catToken(TOOL_CATEGORIES.indexOf(cat));

/** Section heading content: an accent-toned glyph beside the label. */
function TitleWithIcon({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className={styles.secTitle}>
      {icon}
      <span>{children}</span>
    </span>
  );
}

/** Quick-pick categories surfaced as chips in the hero. */
const POPULAR_CATS: ToolCategoryId[] = [
  'performance',
  'navigation',
  'weight-fuel',
  'atmosphere-weather',
  'regulations',
];

/** Curated flagship tools surfaced in the "Start here" row at the top of the
 *  default view — the most-reached-for calculators. Edit this list to retune. */
const FEATURED: string[] = [
  'crosswind',
  'density-altitude',
  'wind-triangle',
  'fuel-reserves',
  'metar',
  'weight-balance',
];

/** Sort orders; 'category' keeps the grouped view, 'name' goes flat A–Z. */
type SortKey = 'category' | 'name';
const SORTS: SortKey[] = ['category', 'name'];

const VIEW_KEY = 'flygaca:tools-view';

export function ToolsIndex() {
  const { t } = useTranslation();
  // Expose the live tools as an ItemList so the hub reads as a catalog of its
  // leaf pages for crawlers (the names resolve from i18n by id).
  const toolListLd = useMemo(
    () =>
      itemListLd(
        TOOLS.filter((x) => x.status === 'live').map((x) => ({
          name: t(`tools.items.${x.id}.name`),
          path: x.route,
        })),
      ),
    [t],
  );
  usePageMeta(t('meta.tools'), t('metaDesc.tools'), toolListLd);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ToolCategoryId | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('category');
  const [view, setView] = useViewMode(VIEW_KEY);
  const { favorites, recents } = useToolPrefs();
  const searchRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const liveCount = TOOLS.filter((x) => x.status === 'live').length;
  const byId = useMemo(() => new Map(TOOLS.map((tl) => [tl.id, tl])), []);
  const q = query.trim();

  const matches = useMemo(() => {
    const needle = q.toLowerCase();
    if (!needle) return TOOLS;
    return TOOLS.filter((tool) =>
      [
        t(`tools.items.${tool.id}.name`),
        t(`tools.items.${tool.id}.blurb`),
        ...(tool.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    );
  }, [q, t]);

  const filtered = category === 'all' ? matches : matches.filter((x) => x.category === category);
  const grouped = TOOL_CATEGORIES.map((cat) => ({
    cat,
    tools: filtered.filter((x) => x.category === cat),
  })).filter((g) => g.tools.length > 0);
  // Category counts (independent of the active filter) for the chip badges.
  const catCount = useMemo(() => {
    const m = new Map<ToolCategoryId, number>();
    for (const tl of matches) m.set(tl.category, (m.get(tl.category) ?? 0) + 1);
    return m;
  }, [matches]);
  const unfiltered = category === 'all';

  // Group the catalogue only in the default "by category" sort with no active
  // search/filter; otherwise show a single flat grid sorted by the chosen order.
  const showGrouped = sort === 'category' && unfiltered && !q;
  const flat =
    sort === 'name'
      ? [...filtered].sort((a, b) =>
          t(`tools.items.${a.id}.name`).localeCompare(t(`tools.items.${b.id}.name`)),
        )
      : filtered;

  // Featured "Start here" row + pinned/recent rows — grouped (default) view only.
  const featured = FEATURED.map((id) => byId.get(id)).filter((x): x is ToolMeta => Boolean(x));
  const pinned = favorites.map((id) => byId.get(id)).filter((x): x is ToolMeta => Boolean(x));
  const recent = recents
    .map((id) => byId.get(id))
    .filter((x): x is ToolMeta => Boolean(x) && !favorites.includes(x!.id));

  // Animated figures for the hero readout.
  const stats = useMemo<HeroStat[]>(() => {
    const soon = TOOLS.filter((x) => x.status === 'soon').length;
    const cats = TOOL_CATEGORIES.filter((c) =>
      TOOLS.some((x) => x.category === c && x.status === 'live'),
    ).length;
    const out: HeroStat[] = [
      { label: t('tools.stats.tools'), value: liveCount, tone: 'cyan' },
      { label: t('tools.stats.categories'), value: cats, tone: 'green' },
    ];
    if (soon > 0) out.push({ label: t('tools.stats.soon'), value: soon, tone: 'gold' });
    return out;
  }, [t, liveCount]);

  // Quick-pick category chips for the hero; toggle the matching category filter.
  const popularChips = POPULAR_CATS.map((c) => ({
    label: t(`tools.categories.${c}`),
    onClick: () => setCategory((cur) => (cur === c ? 'all' : c)),
    active: category === c,
  }));

  // Press "/" anywhere (outside a field) to focus the search box.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
      if (typing) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Arrow keys move focus between tool cards in document order.
  function onGridKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
    if (!keys.includes(e.key)) return;
    const items = Array.from(
      rootRef.current?.querySelectorAll<HTMLAnchorElement>('[data-toolcard]') ?? [],
    );
    const at = items.indexOf(document.activeElement as HTMLAnchorElement);
    if (at === -1) return;
    e.preventDefault();
    const fwd = e.key === 'ArrowDown' || e.key === 'ArrowRight';
    const next = fwd ? Math.min(at + 1, items.length - 1) : Math.max(at - 1, 0);
    items[next]?.focus();
  }

  const listClass = `${hub.grid} ${view === 'list' ? hub.list : ''} stagger-grid`;
  const renderGrid = (tools: ToolMeta[]) => (
    <ul className={listClass}>
      {tools.map((tool) => (
        <ToolCard
          key={tool.id}
          tool={tool}
          tone={catTone(tool.category)}
          query={q}
          favorite={favorites.includes(tool.id)}
          view={view}
        />
      ))}
    </ul>
  );

  return (
    <section className={`container ${styles.page}`}>
      <SearchHero
        eyebrow={t('tools.eyebrow')}
        title={t('tools.title')}
        subtitle={t('tools.subtitle')}
        placeholder={t('tools.searchPlaceholder', { count: liveCount })}
        query={query}
        onQueryChange={setQuery}
        stats={stats}
        chipsLabel={t('tools.popular')}
        chips={popularChips}
        inputRef={searchRef}
      />

      <div className={styles.controls}>
        <div className={styles.filters} role="group" aria-label={t('tools.title')}>
          <button
            type="button"
            className={`${styles.filterChip} ${unfiltered ? styles.filterChipActive : ''}`}
            aria-pressed={unfiltered}
            onClick={() => setCategory('all')}
          >
            {t('tools.allCategories')}
          </button>
          {TOOL_CATEGORIES.filter((cat) => (catCount.get(cat) ?? 0) > 0).map((cat) => (
            <button
              key={cat}
              type="button"
              className={`${styles.filterChip} ${category === cat ? styles.filterChipActive : ''}`}
              aria-pressed={category === cat}
              onClick={() => setCategory(cat)}
              style={{ '--cat-color': catTone(cat) } as CSSProperties}
            >
              <CategoryIcon cat={cat} size={16} />
              {t(`tools.categories.${cat}`)}
            </button>
          ))}
        </div>

        <div className={styles.toolbar}>
          <p className={styles.searchMeta} role="status">
            {q ? t('tools.resultCount', { count: matches.length }) : ''}
          </p>
          <div className={styles.toolbarEnd}>
            <SortSelect
              label={t('tools.sortBy')}
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={SORTS.map((s) => ({ value: s, label: t(`tools.sort.${s}`) }))}
            />
            <ViewToggle
              value={view}
              onChange={setView}
              groupLabel={t('tools.view')}
              gridLabel={t('tools.viewGrid')}
              listLabel={t('tools.viewList')}
            />
          </div>
        </div>
      </div>

      <div ref={rootRef} onKeyDown={onGridKeyDown}>
        {showGrouped && featured.length > 0 && (
          <section className={styles.category}>
            <SectionHeader title={t('tools.featured')} tone="var(--brand-hover)" />
            <ul className={`${styles.featuredGrid} stagger-grid`}>
              {featured.map((tool) => (
                <ToolCard
                  key={tool.id}
                  tool={tool}
                  tone={catTone(tool.category)}
                  query={q}
                  favorite={favorites.includes(tool.id)}
                  view="grid"
                  featured
                />
              ))}
            </ul>
          </section>
        )}
        {showGrouped && pinned.length > 0 && (
          <section className={styles.category}>
            <SectionHeader
              title={
                <TitleWithIcon icon={<Star size={20} weight="fill" aria-hidden />}>
                  {t('tools.pinned')}
                </TitleWithIcon>
              }
              tone="var(--gold)"
            />
            {renderGrid(pinned)}
          </section>
        )}
        {showGrouped && recent.length > 0 && (
          <section className={styles.category}>
            <SectionHeader
              title={
                <TitleWithIcon
                  icon={<ClockCounterClockwise size={20} weight={TOOL_ICON_WEIGHT} aria-hidden />}
                >
                  {t('tools.recent')}
                </TitleWithIcon>
              }
              tone="var(--cat-2)"
            />
            {renderGrid(recent)}
          </section>
        )}

        {showGrouped && grouped.length > 1 && (
          <nav className={styles.jump} aria-label={t('tools.jumpNav')}>
            {grouped.map(({ cat }) => (
              <a key={cat} href={`#${cat}`} className={styles.jumpChip}>
                <CategoryIcon cat={cat} size={16} />
                {t(`tools.categories.${cat}`)}
              </a>
            ))}
          </nav>
        )}

        {flat.length === 0 ? (
          <EmptyState
            icon={<MagnifyingGlass size={44} weight="regular" aria-hidden />}
            action={{
              label: t('common.clear'),
              onClick: () => {
                setQuery('');
                setCategory('all');
              },
            }}
          >
            {t('tools.empty')}
          </EmptyState>
        ) : showGrouped ? (
          grouped.map(({ cat, tools }) => (
            <section key={cat} id={cat} className={styles.category}>
              <SectionHeader
                title={
                  <TitleWithIcon icon={<CategoryIcon cat={cat} size={20} />}>
                    {t(`tools.categories.${cat}`)}
                  </TitleWithIcon>
                }
                count={t('tools.resultCount', { count: tools.length })}
                tone={catTone(cat)}
              />
              {renderGrid(tools)}
            </section>
          ))
        ) : (
          renderGrid(flat)
        )}
      </div>

      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}
