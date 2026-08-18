import { useEffect, useState } from 'react';

/** How a hub's card collection is laid out. */
export type ViewMode = 'grid' | 'list';

/**
 * Persisted grid/list view state for a browse hub. Seeds from `localStorage`
 * (defaulting to 'grid') and writes back on change, so the choice survives
 * reloads. Each hub passes its own key (e.g. `flygaca:library-view`). Shared by
 * the Library, Guides and Tools hubs so the toggle behaves identically everywhere.
 */
export function useViewMode(storageKey: string): [ViewMode, (next: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>(() => {
    try {
      return localStorage.getItem(storageKey) === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, view);
    } catch {
      /* storage unavailable — keep in-memory */
    }
  }, [storageKey, view]);

  return [view, setView];
}
