/**
 * B2B readiness prerequisite — sync a compact study-progress projection to the API
 * so a cohort readiness report can read per-seat coverage + Mock Exam scores. The
 * local store (src/lib/studyProgress.ts) stays the SOURCE OF TRUTH for the study UI;
 * this is an upload-only, best-effort backup (same posture as src/lib/services/sync.ts),
 * so the app is unchanged offline. See docs/b2b/DESIGN-study-progress-sync.md.
 *
 * The payload holds SCORES + COMPLETION only — never answers (see `toProgressSummary`).
 */
import { isBackendConfigured, apiFetch } from '@/lib/services/backend';
import { subscribeStudyProgress, getStudyState, toProgressSummary } from '@/lib/studyProgress';

/**
 * Master switch. While false, `startStudyProgressSync` is a no-op, so nothing is
 * written. Enabled — `PUT /api/account/study-progress` accepts the summary; until
 * the route is deployed, writes fail and are swallowed as best-effort.
 */
export const SYNC_STUDY_PROGRESS = true;

/** Debounce window — coalesce a burst of quiz/exam writes into one upload. */
const DEBOUNCE_MS = 5000;

async function writeSummary(): Promise<void> {
  try {
    await apiFetch<unknown>('/account/study-progress', {
      method: 'PUT',
      body: toProgressSummary(getStudyState()),
    });
  } catch {
    /* offline / route not deployed yet — best-effort, retried on the next change */
  }
}

/**
 * Begin syncing the signed-in user's progress projection. Writes once now, then on
 * every progress change (debounced). Returns a stop function; call it on sign-out or
 * account switch. No-op (returns a noop) when the flag is off, Firebase isn't
 * configured, or there's no uid — so callers can wire it unconditionally.
 */
export function startStudyProgressSync(uid: string | null | undefined): () => void {
  if (!SYNC_STUDY_PROGRESS || !uid || !isBackendConfigured()) return () => {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  const flush = () => {
    timer = null;
    void writeSummary();
  };
  const unsubscribe = subscribeStudyProgress(() => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(flush, DEBOUNCE_MS);
  });

  void writeSummary(); // initial upload of whatever is already local

  return () => {
    if (timer) clearTimeout(timer);
    timer = null;
    unsubscribe();
  };
}
