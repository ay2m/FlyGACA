import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { loadJson } from '@/lib/content';
import { lockBodyScroll, unlockBodyScroll } from '@/lib/scrollLock';
import { liveTools } from '@/lib/tools';
import { GUIDE_SLUGS } from '@/pages/guides/guides';
import { OPEN_CMDK_EVENT } from './openCommandPalette';
import styles from './CommandPalette.module.css';

type Filter = 'all' | 'reg' | 'aero' | 'tool' | 'guide';

interface Item {
  group: Filter;
  code: string;
  name: string;
  tip: string;
  to: string;
}

interface GacarDoc {
  part: string;
  title: string;
  category: string;
  slug: string;
}
interface GacarIndex {
  categories: { id: string; label: string }[];
  documents: GacarDoc[];
}
interface Airport {
  icao: string;
  name_en: string;
  name_ar: string;
  city_en: string;
  city_ar: string;
  elev_ft: number;
}
interface AirportsIndex {
  airports: Airport[];
}

/** A 3-letter mono tag for a tool, derived from its id (density-altitude → DEN). */
function toolCode(id: string): string {
  return id.replace(/-/g, '').slice(0, 3).toUpperCase();
}

/**
 * A global ⌘K command palette: fuzzy-launch into any GACAR Part, aerodrome, or
 * flight tool. Opens on ⌘K / Ctrl-K (or the Header pill via the OPEN_CMDK
 * event), filters by category chip, navigates with the keyboard, and lazily
 * fetches the (small) Part and aerodrome indexes the first time it opens so it
 * adds nothing to first paint. RTL- and reduced-motion-aware.
 */
export function CommandPalette() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const ar = i18n.language === 'ar';

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [active, setActive] = useState(0);
  const [parts, setParts] = useState<Item[]>([]);
  const [aerodromes, setAerodromes] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);

  // Stable ids wiring the combobox input → listbox → active option for AT.
  const listboxId = useId();
  const optionId = (idx: number) => `${listboxId}-opt-${idx}`;

  // Tools come straight from the registry (the single source of truth in
  // src/lib/tools.ts) so the palette can never drift from the live catalog;
  // names are resolved from i18n by id.
  const tools = useMemo<Item[]>(
    () => [
      ...liveTools().map((tool) => ({
        group: 'tool' as const,
        code: toolCode(tool.id),
        name: t(`tools.items.${tool.id}.name`),
        tip: t(`tools.items.${tool.id}.blurb`),
        to: tool.route,
      })),
      // The Airspace HUD is a standalone page, not a registry tool, but the
      // palette is how people reach surfaces — file it with the tools.
      {
        group: 'tool' as const,
        code: 'HUD',
        name: t('hud.title'),
        tip: t('home.dashboard.hud.note'),
        to: '/hud',
      },
    ],
    [t],
  );

  // Guides are static too (names from i18n) — no fetch needed.
  const guides = useMemo<Item[]>(
    () =>
      GUIDE_SLUGS.map((slug) => ({
        group: 'guide' as const,
        code: 'GD',
        name: t(`guides.items.${slug}.name`),
        tip: t(`guides.items.${slug}.blurb`),
        to: `/guides/${slug}`,
      })),
    [t],
  );

  const loadData = useCallback(async () => {
    if (loaded.current) return;
    loaded.current = true;
    setLoading(true);
    try {
      // Shared cache: the palette and the flight tools reuse one airports fetch+parse.
      const [gacar, ap] = await Promise.all([
        loadJson<GacarIndex>('/data/gacar-index.json'),
        loadJson<AirportsIndex>('/data/airports.json'),
      ]);
      const catLabel = new Map(gacar.categories.map((c) => [c.id, c.label]));
      setParts(
        gacar.documents.map((d) => ({
          group: 'reg',
          code: `§${d.part}`,
          name: d.title,
          tip: catLabel.get(d.category) ?? '',
          to: `/library/${d.slug}`,
        })),
      );
      setAerodromes(
        ap.airports.map((a) => ({
          group: 'aero',
          code: a.icao,
          name: ar ? `${a.name_ar} · ${a.city_ar}` : `${a.name_en} · ${a.city_en}`,
          tip: `${a.icao} · ${a.elev_ft} ft`,
          to: '/tools/aerodromes',
        })),
      );
    } catch {
      loaded.current = false; // allow a retry on the next open
    } finally {
      setLoading(false);
    }
  }, [ar]);

  const close = useCallback(() => setOpen(false), []);
  const show = useCallback(() => {
    setOpen(true);
    setQuery('');
    setActive(0);
    void loadData();
  }, [loadData]);

  // ⌘K / Ctrl-K global shortcut + the Header pill event.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
        if (!open) {
          setQuery('');
          setActive(0);
          void loadData();
        }
      }
    };
    const onOpenEvent = () => show();
    window.addEventListener('keydown', onKey);
    window.addEventListener(OPEN_CMDK_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(OPEN_CMDK_EVENT, onOpenEvent);
    };
  }, [open, show, loadData]);

  // Focus the input, lock body scroll, and restore focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const restoreFocusTo = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      unlockBodyScroll();
      window.clearTimeout(id);
      restoreFocusTo?.focus?.();
    };
  }, [open]);

  const results = useMemo<Item[]>(() => {
    const all = [...parts, ...aerodromes, ...tools, ...guides];
    const q = query.trim().toLowerCase();
    return all.filter((it) => {
      if (filter !== 'all' && it.group !== filter) return false;
      if (!q) return true;
      return `${it.code} ${it.name} ${it.tip}`.toLowerCase().includes(q);
    });
  }, [parts, aerodromes, tools, guides, query, filter]);

  // Cap the rendered list (and keyboard navigation) to the first 50 matches so
  // the active index, aria-activedescendant, and scroll-into-view stay in sync.
  const visible = useMemo(() => results.slice(0, 50), [results]);

  const choose = useCallback(
    (item: Item | undefined) => {
      if (!item) return;
      close();
      navigate(item.to, { viewTransition: true });
    },
    [close, navigate],
  );

  // In-palette result nav — focus stays on the combobox input, so the active
  // row is moved via aria-activedescendant rather than real focus.
  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (visible.length ? (a + 1) % visible.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (visible.length ? (a - 1 + visible.length) % visible.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(visible[active]);
    }
  };

  // Dialog-level keys: Escape closes from anywhere inside the modal, and Tab is
  // trapped within the box so focus can never fall behind the scrim. Result rows
  // are tabindex=-1 (arrow-navigated), so the trap cycles input ↔ filter chips.
  const onDialogKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key !== 'Tab') return;
    const box = boxRef.current;
    if (!box) return;
    // Only genuinely tabbable nodes: the result rows are buttons with
    // tabindex=-1 (arrow-navigated), so they must be excluded from the cycle.
    const focusable = Array.from(
      box.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, [tabindex]'),
    ).filter((el) => el.tabIndex !== -1);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeEl = document.activeElement;
    if (e.shiftKey && (activeEl === first || !box.contains(activeEl))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (activeEl === last || !box.contains(activeEl))) {
      e.preventDefault();
      first.focus();
    }
  };

  // Keep the active row scrolled into view.
  useEffect(() => {
    const node = resultsRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, visible]);

  if (!open) return null;

  const chips: { id: Filter; label: string }[] = [
    { id: 'all', label: t('cmdk.all') },
    { id: 'reg', label: t('cmdk.regulations') },
    { id: 'aero', label: t('cmdk.aerodromes') },
    { id: 'tool', label: t('cmdk.tools') },
    { id: 'guide', label: t('cmdk.guides') },
  ];

  return (
    <div
      className={styles.scrim}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={boxRef}
        className={styles.box}
        role="dialog"
        aria-modal="true"
        aria-label={t('cmdk.label')}
        onKeyDown={onDialogKeyDown}
      >
        <div className={styles.inputRow}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={query}
            placeholder={t('cmdk.placeholder')}
            aria-label={t('cmdk.placeholder')}
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={visible.length ? optionId(active) : undefined}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onListKey}
          />
          <span className={styles.esc}>ESC</span>
        </div>

        <div className={styles.chips}>
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`${styles.chip} ${filter === c.id ? styles.chipActive : ''}`}
              onClick={() => {
                setFilter(c.id);
                setActive(0);
              }}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div
          className={styles.results}
          ref={resultsRef}
          role="listbox"
          id={listboxId}
          aria-label={t('cmdk.resultsLabel')}
        >
          {visible.length === 0 ? (
            <p className={styles.empty}>{loading ? t('common.loading') : t('cmdk.empty')}</p>
          ) : (
            visible.map((it, idx) => (
              <button
                key={`${it.group}-${it.code}-${idx}`}
                type="button"
                role="option"
                id={optionId(idx)}
                aria-selected={idx === active}
                tabIndex={-1}
                data-idx={idx}
                className={`${styles.item} ${idx === active ? styles.itemActive : ''}`}
                onMouseEnter={() => setActive(idx)}
                onClick={() => choose(it)}
              >
                <span className={`${styles.code} ${styles[it.group]}`}>{it.code}</span>
                <span className={styles.meta}>
                  <span className={styles.name}>{it.name}</span>
                  <span className={styles.tip}>{it.tip}</span>
                </span>
                <span className={styles.enter}>↵</span>
              </button>
            ))
          )}
        </div>

        {/* Polite live region so AT users hear the match count as they type. */}
        <div className="sr-only" aria-live="polite">
          {visible.length === 0
            ? t('cmdk.empty')
            : t('cmdk.resultCount', { count: results.length })}
        </div>

        <div className={styles.foot}>
          <span>↑↓ {t('cmdk.navigate')}</span>
          <span>↵ {t('cmdk.openHint')}</span>
          <span>esc {t('cmdk.closeHint')}</span>
        </div>
      </div>
    </div>
  );
}
