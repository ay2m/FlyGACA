/**
 * Frontend entitlement helpers. The `entitlement` record itself is written
 * SERVER-ONLY (the billing and grants routers) and read here only to gate UI —
 * never to grant access. Pure predicate, mirroring `effectivePlan` in
 * server/src/billing-core.ts so it is unit-testable without any backend.
 */

export type Plan = 'free' | 'pro' | 'school';

export interface Entitlement {
  plan: Plan;
  /** ISO timestamp; absent or in the past means lapsed. */
  expiresAt?: string;
  source?: 'moyasar' | 'revenuecat' | 'school' | 'staff' | 'founding';
}

/** True when the entitlement grants an active paid plan at `now`. */
export function isActive(ent: Entitlement | null | undefined, now: Date = new Date()): boolean {
  if (!ent || ent.plan === 'free') return false;
  if (!ent.expiresAt) return true; // non-expiring grant (e.g. staff/school)
  const expiry = Date.parse(ent.expiresAt);
  return Number.isFinite(expiry) && expiry > now.getTime();
}

/** Whichever plan is in force right now (lapsed paid plans fall back to free). */
export function effectivePlan(ent: Entitlement | null | undefined, now?: Date): Plan {
  return isActive(ent, now) ? (ent as Entitlement).plan : 'free';
}

/**
 * Launch monetization switch. While `true`, the UI treats every visitor as Pro so all
 * paywalls are open (the pre-revenue growth promo). Set to `false` to turn ON revenue:
 * Pro features gate to paying users while the free tier stays generous (full library,
 * all flight tools, 5 Captain Adel questions/day, ground school, quizzes, flashcards
 * and the free sampler pack all remain open). Only affects UI presentation via
 * `uiPlan`/`uiIsPro` and `useFeature`; the pure predicates above stay truthful and the
 * server-enforced gates (chat quota / Pro model, exam-prep packs) are unaffected either
 * way. Deploying this change is the go-live trigger — pair it with the founding launch
 * offer on `/pricing`. Flip back to `true` only to reopen everything.
 */
export const FREE_FOR_EVERYONE = true;

/**
 * Plan to PRESENT in the UI. Honours the {@link FREE_FOR_EVERYONE} promo; the pure
 * `effectivePlan` stays honest because the chat quota UI and the server mirror rely
 * on it. Use this (not `effectivePlan`) for badges, plan labels and non-chat gates.
 */
export function uiPlan(ent: Entitlement | null | undefined, now?: Date): Plan {
  const real = effectivePlan(ent, now);
  // Promo bumps free → pro but never downgrades a genuinely higher active tier (school).
  return FREE_FOR_EVERYONE && real === 'free' ? 'pro' : real;
}

/** Presentational "is this user Pro?" — mirrors {@link uiPlan}. */
export function uiIsPro(ent: Entitlement | null | undefined, now?: Date): boolean {
  return uiPlan(ent, now) !== 'free';
}
