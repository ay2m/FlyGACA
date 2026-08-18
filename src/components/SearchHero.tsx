import type { CSSProperties, ReactNode, Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { CountUp } from './CountUp';
import band from './heroBand.module.css';
import styles from './SearchHero.module.css';

/** One animated stat in the hero readout strip. */
export interface HeroStat {
  /** Translated label, e.g. "Documents". */
  label: string;
  /** The figure to count up to. */
  value: number;
  /** Neon accent token driving the tile's glow. */
  tone: 'cyan' | 'green' | 'gold';
}

/** A quick-action chip below the search field (a seed search or a filter shortcut). */
export interface HeroChip {
  label: string;
  onClick: () => void;
  /** Renders the chip in its selected state (e.g. the matching filter is active). */
  active?: boolean;
}

interface SearchHeroProps {
  /** Eyebrow kicker above the title. */
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Placeholder + accessible label for the search field. */
  placeholder: string;
  /** Live search value (lifted from the page so debounce/filter logic stays there). */
  query: string;
  onQueryChange: (q: string) => void;
  /** Animated figures for the instrument-style readout strip. */
  stats?: HeroStat[];
  /** Label preceding the quick chips (e.g. "Quick searches"). */
  chipsLabel?: string;
  /** Quick-action chips below the input. */
  chips?: HeroChip[];
  /** Optional trailing element in the stats row (e.g. a "Browse charts →" link). */
  trailing?: ReactNode;
  /** Forwarded to the search input (e.g. to support a "/"-to-focus shortcut). */
  inputRef?: Ref<HTMLInputElement>;
}

const TONE_VAR: Record<HeroStat['tone'], string> = {
  cyan: 'var(--neon-cyan)',
  green: 'var(--neon-green)',
  gold: 'var(--gold)',
};

/**
 * Search-first hub hero — the signature falcon-stroke band with the search field
 * promoted to the centerpiece, quick-action chips, and an instrument-style stats
 * readout that counts up on first paint. Purely presentational; shared by the
 * Library and Guides hubs so the two surfaces feel like one product.
 */
export function SearchHero({
  eyebrow,
  title,
  subtitle,
  placeholder,
  query,
  onQueryChange,
  stats = [],
  chipsLabel,
  chips = [],
  trailing,
  inputRef,
}: SearchHeroProps) {
  const { t } = useTranslation();

  return (
    <header className={`${band.band} ${styles.hero}`}>
      <div className={band.glow} aria-hidden="true" />
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>

        <form className={styles.searchForm} role="search" onSubmit={(e) => e.preventDefault()}>
          <span className={styles.searchIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="7" strokeWidth="2" />
              <path d="m20 20-3.5-3.5" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <input
            ref={inputRef}
            className={styles.search}
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className={styles.clear}
              aria-label={t('common.clear')}
              onClick={() => onQueryChange('')}
            >
              ×
            </button>
          )}
        </form>

        {chips.length > 0 && (
          <div className={styles.suggest}>
            {chipsLabel && <span className={styles.suggestLabel}>{chipsLabel}</span>}
            <ul className={styles.suggestList}>
              {chips.map((c) => (
                <li key={c.label}>
                  <button
                    type="button"
                    className={`${styles.suggestChip} ${c.active ? styles.suggestChipActive : ''}`}
                    aria-pressed={c.active}
                    onClick={c.onClick}
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {(stats.length > 0 || trailing) && (
          <div className={styles.afterRow}>
            {stats.length > 0 && (
              <dl className={styles.stats}>
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className={styles.stat}
                    style={{ '--stat-tone': TONE_VAR[s.tone] } as CSSProperties}
                  >
                    <dt className={styles.statLabel}>{s.label}</dt>
                    <dd className={styles.statValue}>
                      <CountUp to={s.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            )}
            {trailing && <div className={styles.trailing}>{trailing}</div>}
          </div>
        )}
      </div>
    </header>
  );
}
