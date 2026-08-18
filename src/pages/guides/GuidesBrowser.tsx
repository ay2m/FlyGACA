import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@/components/SectionHeader';
import { EmptyState } from '@/components/EmptyState';
import { ViewToggle } from '@/components/hub/ViewToggle';
import { SortSelect } from '@/components/hub/SortSelect';
import { useViewMode } from '@/hooks/useViewMode';
import { readingMinutes } from '@/lib/readingTime';
import { useGuidePrefs, toggleBookmark } from '@/lib/prefs/guidePrefs';
import {
  LIVE_GUIDE_SLUGS,
  GUIDE_META,
  GUIDE_TOPICS,
  type GuideLevel,
  type GuideTopic,
} from './guides';
import styles from './Guides.module.css';
import hub from '@/components/hub/hubList.module.css';

interface Section {
  h: string;
  p: string;
}

const TOPIC_ICON: Record<GuideTopic, string> = {
  regulation: '📋',
  licensing: '🪪',
  medical: '🩺',
  language: '🗣️',
  airspace: '🗺️',
  operations: '🛫',
  performance: '📈',
  weather: '🌦️',
  planning: '🗓️',
};

const TOPIC_TONE: Record<GuideTopic, string> = {
  regulation: 'var(--cat-4)',
  licensing: 'var(--cat-1)',
  medical: 'var(--cat-2)',
  language: 'var(--cat-3)',
  airspace: 'var(--cat-4)',
  operations: 'var(--cat-5)',
  performance: 'var(--cat-2)',
  weather: 'var(--cat-5)',
  planning: 'var(--cat-1)',
};

const LEVELS: GuideLevel[] = ['beginner', 'intermediate', 'advanced'];
const LEVEL_ORDER: Record<GuideLevel, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/** Sort orders; 'topic' keeps the grouped-by-collection view, the rest go flat. */
type SortKey = 'topic' | 'title' | 'time' | 'level';
const SORTS: SortKey[] = ['topic', 'title', 'time', 'level'];

const VIEW_KEY = 'flygaca:guides-view';

interface GuidesBrowserProps {
  /** Live search value (owned by the Learn hub so the hero search drives it). */
  query: string;
  /** Active topic filter (controlled by the hub so the hero chips can set it). */
  topic: GuideTopic | 'all';
  onTopicChange: (topic: GuideTopic | 'all') => void;
}

/**
 * The Guides browsing surface: topic/level filters, sort + grid/list toolbar, and
 * the grouped/flat card grid with the Saved row. Extracted from the former Guides
 * hub so the Learn hub can compose it under a shared SearchHero alongside the
 * study dashboard. `query` and `topic` are lifted to the hub; level/sort/view stay
 * local.
 */
export function GuidesBrowser({ query, topic, onTopicChange }: GuidesBrowserProps) {
  const { t } = useTranslation();
  const [level, setLevel] = useState<GuideLevel | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('topic');
  const [view, setView] = useViewMode(VIEW_KEY);
  const { bookmarks, read } = useGuidePrefs();
  const q = query.trim().toLowerCase();

  const guides = useMemo(
    () =>
      LIVE_GUIDE_SLUGS.map((slug) => {
        const name = t(`guides.items.${slug}.name`);
        const blurb = t(`guides.items.${slug}.blurb`);
        const intro = t(`guides.items.${slug}.intro`);
        const sections = t(`guides.items.${slug}.sections`, { returnObjects: true }) as Section[];
        const takeaways = t(`guides.items.${slug}.takeaways`, { returnObjects: true }) as string[];
        const text = [intro, ...sections.flatMap((s) => [s.h, s.p]), ...takeaways].join(' ');
        return {
          slug,
          name,
          blurb,
          sectionCount: sections.length,
          minutes: readingMinutes(text),
          topic: GUIDE_META[slug].topic,
          level: GUIDE_META[slug].level,
          haystack: `${name} ${blurb} ${text}`.toLowerCase(),
        };
      }),
    [t],
  );

  type GuideRow = (typeof guides)[number];

  const filtered = guides.filter(
    (g) =>
      (topic === 'all' || g.topic === topic) &&
      (level === 'all' || g.level === level) &&
      (!q || g.haystack.includes(q)),
  );

  // 'topic' renders the grouped-by-collection view; every other sort is a flat,
  // sorted list. Grouping only kicks in with no active search/filter.
  const grouped = sort === 'topic' && topic === 'all' && level === 'all' && !q;
  const sortedFlat = useMemo(() => {
    const arr = [...filtered];
    if (sort === 'title') arr.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'time')
      arr.sort((a, b) => a.minutes - b.minutes || a.name.localeCompare(b.name));
    else if (sort === 'level')
      arr.sort(
        (a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] || a.name.localeCompare(b.name),
      );
    return arr;
    // filtered is derived from these inputs; recompute when any changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guides, topic, level, q, sort]);

  const groups = GUIDE_TOPICS.map((tp) => ({
    topic: tp,
    items: filtered.filter((g) => g.topic === tp),
  })).filter((grp) => grp.items.length > 0);

  const saved = grouped ? guides.filter((g) => bookmarks.includes(g.slug)) : [];
  const readCount = read.length;

  const card = (g: GuideRow) => {
    const isSaved = bookmarks.includes(g.slug);
    const isRead = read.includes(g.slug);
    return (
      <li key={g.slug} className={styles.cardWrap}>
        <button
          type="button"
          className={`${styles.star} ${isSaved ? styles.starOn : ''}`}
          aria-label={t(isSaved ? 'guides.unbookmark' : 'guides.bookmark')}
          aria-pressed={isSaved}
          onClick={() => toggleBookmark(g.slug)}
        >
          {isSaved ? '★' : '☆'}
        </button>
        <Link to={`/guides/${g.slug}`} className={styles.card}>
          <h3 className={styles.cardTitle}>{g.name}</h3>
          <p className={styles.blurb}>{g.blurb}</p>
          <span className={styles.metaRow}>
            <span className={styles.level} data-level={g.level}>
              {t(`guides.level.${g.level}`)}
            </span>
            <span className={styles.metaDim}>{t('guides.readTime', { min: g.minutes })}</span>
            <span className={styles.metaDim}>
              {t('guides.sectionCount', { count: g.sectionCount })}
            </span>
            {isRead && (
              <span className={styles.readBadge}>
                <span aria-hidden="true">✓</span> {t('guides.readDone')}
              </span>
            )}
          </span>
        </Link>
      </li>
    );
  };

  // Compact list row — same guide, denser for scanning.
  const row = (g: GuideRow) => {
    const isSaved = bookmarks.includes(g.slug);
    const isRead = read.includes(g.slug);
    return (
      <li key={g.slug} className={hub.rowWrap}>
        <Link to={`/guides/${g.slug}`} className={styles.row}>
          <span className={styles.rowLevel} data-level={g.level}>
            {t(`guides.level.${g.level}`)}
          </span>
          <span className={styles.rowTitle}>{g.name}</span>
          <span className={styles.rowMeta}>{t('guides.readTime', { min: g.minutes })}</span>
          <span className={styles.rowMeta}>
            {t('guides.sectionCount', { count: g.sectionCount })}
          </span>
          {isRead && (
            <span className={styles.rowRead}>
              <span aria-hidden="true">✓</span> {t('guides.readDone')}
            </span>
          )}
        </Link>
        <button
          type="button"
          className={`${hub.rowStar} ${isSaved ? hub.starOn : ''}`}
          aria-label={t(isSaved ? 'guides.unbookmark' : 'guides.bookmark')}
          aria-pressed={isSaved}
          onClick={() => toggleBookmark(g.slug)}
        >
          {isSaved ? '★' : '☆'}
        </button>
      </li>
    );
  };

  const renderDoc = (g: GuideRow) => (view === 'list' ? row(g) : card(g));
  const listClass = `${hub.grid} ${view === 'list' ? hub.list : ''} stagger-grid`;

  return (
    <>
      <div className={styles.filters}>
        <div className={styles.chips} role="group" aria-label={t('guides.title')}>
          <button
            type="button"
            className={`${styles.chip} ${topic === 'all' ? styles.chipActive : ''}`}
            onClick={() => onTopicChange('all')}
          >
            {t('guides.allTopics')}
          </button>
          {GUIDE_TOPICS.map((tp) => (
            <button
              key={tp}
              type="button"
              className={`${styles.chip} ${topic === tp ? styles.chipActive : ''}`}
              onClick={() => onTopicChange(tp)}
            >
              <span aria-hidden="true">{TOPIC_ICON[tp]}</span> {t(`guides.topics.${tp}`)}
            </button>
          ))}
        </div>
        <div className={styles.chips} role="group" aria-label={t('guides.levelLabel')}>
          <button
            type="button"
            className={`${styles.chip} ${level === 'all' ? styles.chipActive : ''}`}
            onClick={() => setLevel('all')}
          >
            {t('guides.allLevels')}
          </button>
          {LEVELS.map((lv) => (
            <button
              key={lv}
              type="button"
              className={`${styles.chip} ${level === lv ? styles.chipActive : ''}`}
              onClick={() => setLevel(lv)}
            >
              {t(`guides.level.${lv}`)}
            </button>
          ))}
        </div>

        <div className={styles.toolbar}>
          <p className={styles.progress} role="status">
            {t('guides.readProgress', { done: readCount, total: LIVE_GUIDE_SLUGS.length })}
          </p>
          <div className={styles.toolbarEnd}>
            <SortSelect
              label={t('guides.sortBy')}
              value={sort}
              onChange={(v) => setSort(v as SortKey)}
              options={SORTS.map((s) => ({ value: s, label: t(`guides.sort.${s}`) }))}
            />
            <ViewToggle
              value={view}
              onChange={setView}
              groupLabel={t('guides.view')}
              gridLabel={t('guides.viewGrid')}
              listLabel={t('guides.viewList')}
            />
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🔍">{t('guides.empty')}</EmptyState>
      ) : grouped ? (
        <>
          {saved.length > 0 && (
            <section className={styles.group}>
              <SectionHeader
                title={`★ ${t('guides.saved')}`}
                tone="var(--gold)"
                count={t('guides.guideCount', { count: saved.length })}
              />
              <ul className={listClass}>{saved.map(renderDoc)}</ul>
            </section>
          )}
          {groups.map((grp) => (
            <section key={grp.topic} className={styles.group}>
              <SectionHeader
                title={`${TOPIC_ICON[grp.topic]} ${t(`guides.topics.${grp.topic}`)}`}
                tone={TOPIC_TONE[grp.topic]}
                count={t('guides.guideCount', { count: grp.items.length })}
              />
              <ul className={listClass}>{grp.items.map(renderDoc)}</ul>
            </section>
          ))}
        </>
      ) : (
        <ul className={listClass}>{sortedFlat.map(renderDoc)}</ul>
      )}
    </>
  );
}
