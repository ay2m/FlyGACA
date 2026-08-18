import type { ViewMode } from '@/hooks/useViewMode';
import styles from './ViewToggle.module.css';

interface ViewToggleProps {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
  /** Accessible label for the toggle group (e.g. t('library.view')). */
  groupLabel: string;
  /** Accessible label / tooltip for the grid button. */
  gridLabel: string;
  /** Accessible label / tooltip for the list button. */
  listLabel: string;
}

/**
 * Grid ⇄ list segmented toggle shared by the browse hubs. Mirrors the corpus-tab
 * control's inset-track styling; the raised button marks the active view.
 */
export function ViewToggle({ value, onChange, groupLabel, gridLabel, listLabel }: ViewToggleProps) {
  return (
    <div className={styles.toggle} role="group" aria-label={groupLabel}>
      <button
        type="button"
        className={`${styles.btn} ${value === 'grid' ? styles.btnActive : ''}`}
        aria-pressed={value === 'grid'}
        aria-label={gridLabel}
        title={gridLabel}
        onClick={() => onChange('grid')}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
        </svg>
      </button>
      <button
        type="button"
        className={`${styles.btn} ${value === 'list' ? styles.btnActive : ''}`}
        aria-pressed={value === 'list'}
        aria-label={listLabel}
        title={listLabel}
        onClick={() => onChange('list')}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <rect x="3" y="4" width="18" height="3" rx="1.5" />
          <rect x="3" y="10.5" width="18" height="3" rx="1.5" />
          <rect x="3" y="17" width="18" height="3" rx="1.5" />
        </svg>
      </button>
    </div>
  );
}
