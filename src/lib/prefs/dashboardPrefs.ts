/**
 * Local-first dashboard preferences: hidden-widget ids, a custom widget order,
 * and the one-shot dismissal of the role-picker card. Persisted to localStorage
 * and exposed via useSyncExternalStore so the dashboard re-renders on change.
 * List transforms reuse the pure helpers from toolPrefs.
 */
import { createPrefStore, readRaw, readStringList, save, saveRaw } from './createPrefStore';
import { toggleId } from '@/lib/prefs/toolPrefs';

const HIDDEN_KEY = 'flygaca:dashboard-hidden';
const ORDER_KEY = 'flygaca:dashboard-order';
const ROLE_DISMISS_KEY = 'flygaca:dashboard-role-dismissed';

export interface DashboardPrefs {
  /** Widget ids the user has hidden via the Customize row. */
  hidden: string[];
  /**
   * The user's custom widget order (via the Customize reorder controls). Empty
   * means "follow the role default"; a saved order overrides it across roles,
   * mirroring how `hidden` applies globally.
   */
  order: string[];
  /** True once the role-picker card has been dismissed without choosing. */
  roleDismissed: boolean;
}

const store = createPrefStore<DashboardPrefs>({
  hidden: readStringList(HIDDEN_KEY),
  order: readStringList(ORDER_KEY),
  roleDismissed: readRaw(ROLE_DISMISS_KEY) === '1',
});

export const useDashboardPrefs = store.use;

export function toggleWidget(id: string): void {
  const hidden = toggleId(store.get().hidden, id);
  save(HIDDEN_KEY, hidden);
  store.set({ ...store.get(), hidden });
}

/** Persist a fully-resolved widget order from the Customize reorder controls. */
export function setWidgetOrder(order: string[]): void {
  save(ORDER_KEY, order);
  store.set({ ...store.get(), order });
}

export function dismissRolePrompt(): void {
  saveRaw(ROLE_DISMISS_KEY, '1');
  store.set({ ...store.get(), roleDismissed: true });
}
