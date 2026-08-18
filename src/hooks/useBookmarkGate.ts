/**
 * Pro gate for library / approach-plate bookmarking. Bookmarking is a Pro perk
 * (the `bookmarks` feature), but the gate is intentionally one-directional:
 * adding a new bookmark requires Pro, while REMOVING one is always allowed so a
 * lapsed user can still clean up — and existing bookmarks stay readable. When a
 * free user tries to add, we route to /pricing, matching the app's other upsell
 * surfaces (currency export, prep packs) so the upgrade flow lives in one place.
 */
import { useNavigate } from 'react-router';
import { useFeature } from '@/lib/services/features';
import { toggleBookmark, type LibBookmark } from '@/lib/prefs/libraryPrefs';

export interface BookmarkGate {
  /** True when the user may add new bookmarks. */
  canBookmark: boolean;
  /**
   * Toggle a bookmark, gating only the add path. `marked` is whether the item is
   * currently bookmarked; removing is always allowed, adding routes free users
   * to /pricing.
   */
  toggle: (b: LibBookmark, marked: boolean) => void;
}

export function useBookmarkGate(): BookmarkGate {
  const canBookmark = useFeature('bookmarks');
  const navigate = useNavigate();
  return {
    canBookmark,
    toggle(b, marked) {
      if (!marked && !canBookmark) {
        navigate('/pricing');
        return;
      }
      toggleBookmark(b);
    },
  };
}
