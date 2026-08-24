/**
 * Pure billing logic shared by the Moyasar functions — no Moyasar SDK/Admin imports
 * so it is unit-testable. Moyasar (unlike Stripe) has no native subscription object:
 * `pro` is "recurring" only in the sense that a saved card token is
 * re-charged by a scheduled function (see ./billing.ts renewMoyasarSubscriptions) and
 * each successful charge EXTENDS `expiresAt` by one cadence period — the same
 * expiry-extension shape already used for the one-time Exam Season Pass
 * (entitlementFromPass). Mirrors src/lib/services/entitlements.ts.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export type Plan = "free" | "pro" | "school";

export interface Entitlement {
  plan: Plan;
  /** ISO timestamp; absent means non-expiring. */
  expiresAt?: string;
  source?: "moyasar" | "revenuecat" | "school" | "staff" | "founding";
}

export type Cadence = "monthly" | "annual";

/** What a checkout is for. `pro` is recurring (token-renewed); the rest are one-time
 * purchases. `bundle` is the All-Access Exam Bundle — one payment that permanently
 * grants every sellable pack. `cohort` is the self-serve B2B Starter tier — one payment
 * creates a 25-seat, 90-day-intake org (see org-core.buildCohortOrg).
 *
 * There was also a `student` kind. It charged less than `pro` and granted exactly the
 * same entitlement, and the eligibility check (`isStudentEmail`) was never wired to any
 * route — so it was strictly the better buy for everyone and `pro`'s price was
 * decorative. Removed rather than gated. */
export type CheckoutKind = "pro" | "pass" | "credits" | "pack" | "bundle" | "cohort";

export function isRecurringKind(kind: CheckoutKind): boolean {
  return kind === "pro";
}

/** The set of accepted checkout kinds — the allow-list `checkoutKind` narrows to. */
export const CHECKOUT_KINDS = new Set<CheckoutKind>([
  "pro",
  "pass",
  "credits",
  "pack",
  "bundle",
  "cohort",
]);

/** Narrow untrusted client input to a known {@link CheckoutKind}, else null. */
export function checkoutKind(v: unknown): CheckoutKind | null {
  return typeof v === "string" && CHECKOUT_KINDS.has(v as CheckoutKind) ? (v as CheckoutKind) : null;
}

/** Coerce untrusted cadence input: only "monthly" is monthly; everything else is annual. */
export function cadenceOf(v: unknown): Cadence {
  return v === "monthly" ? "monthly" : "annual";
}

/** The Moyasar payment description (product line) for a checkout kind. */
export function describeCheckout(kind: CheckoutKind, packId?: string): string {
  switch (kind) {
  case "pro":
    return "Fly GACA Pro";
  case "pass":
    return "Fly GACA Exam Season Pass";
  case "credits":
    return "Fly GACA Captain Adel credit pack";
  case "pack":
    return `Fly GACA Exam Prep Pack — ${packId ?? ""}`;
  case "bundle":
    return "Fly GACA All-Access Exam Bundle";
  case "cohort":
    return "Fly GACA B2B Cohort (up to 25 seats, 90-day intake)";
  }
}

/** Configured SAR list prices (major units, e.g. "59" or "59.00") for every sellable
 * SKU — the authoritative source the server derives the halalas amount from. Mirror
 * the indicative figures shown on `/pricing` (src/pages/pricing/Pricing.tsx) and the
 * exam-prep pack price (src/lib/prepCatalog.ts PREP_PACK_PRICE). */
export interface PriceEnv {
  proMonthly: string;
  proAnnual: string;
  pass: string;
  credits: string;
  /** Legacy flat prep-pack price — the fallback when a band below is unset, so an
   * existing deploy keeps pricing packs until the banded env vars are set. */
  prepPack: string;
  /** Entry band — a focused bank (Conversion, Medical, AIP). */
  prepPackEssential: string;
  /** Mid band — a full topic spread (ELP, ATPL, IR). */
  prepPackStandard: string;
  /** Top band — deepest banks plus ground school and a reading path (CPL, PPL). */
  prepPackComplete: string;
  /** All-Access Exam Bundle — every sellable pack, permanent, one payment. */
  bundle: string;
  /** Self-serve B2B Starter ("Cohort") tier — up to 25 seats, one 90-day intake. */
  cohort: string;
}

/** Convert a SAR major-unit string to halalas (integer minor units). Throws on a
 * missing/non-positive/non-numeric env value so a misconfigured deploy fails loudly
 * at checkout time rather than silently charging SAR 0. */
export function sarToHalalas(sar: string | undefined): number {
  const n = Number(sar);
  if (!sar || !Number.isFinite(n) || n <= 0) {
    throw new Error(`invalid-price:${String(sar)}`);
  }
  return Math.round(n * 100);
}

/** The halalas amount for a checkout, from the configured SAR price table. `cadence`
 * only matters for the recurring kind (`pro`); `packId` selects the content band for
 * a `pack` checkout (ignored by every other kind). */
export function amountForCheckout(
  kind: CheckoutKind,
  cadence: Cadence | undefined,
  env: PriceEnv,
  packId?: string,
): number {
  switch (kind) {
  case "pro":
    return sarToHalalas(cadence === "monthly" ? env.proMonthly : env.proAnnual);
  case "pass":
    return sarToHalalas(env.pass);
  case "credits":
    return sarToHalalas(env.credits);
  case "pack": {
    // Priced by content band; falls back to the legacy flat price if a band is unset.
    const band = {
      essential: env.prepPackEssential,
      standard: env.prepPackStandard,
      complete: env.prepPackComplete,
    }[packTier(packId)];
    return sarToHalalas(band || env.prepPack);
  }
  case "bundle":
    return sarToHalalas(env.bundle);
  case "cohort":
    return sarToHalalas(env.cohort);
  }
}

/**
 * The ACTUAL plan (without promo) — a paid plan whose `expiresAt` has passed
 * collapses to `free`, and a non-expiring grant (school/staff) stands. Used for
 * quota/billing enforcement where we need the true account state, not the UI promo.
 */
function actualPlan(ent: Entitlement | null | undefined, now: Date = new Date()): Plan {
  if (!ent || ent.plan === "free") return "free";
  if (!ent.expiresAt) return ent.plan;
  return new Date(ent.expiresAt).getTime() > now.getTime() ? ent.plan : "free";
}

/**
 * The plan actually in force for an entitlement `now`: a paid plan whose `expiresAt`
 * has passed collapses to `free`, and a non-expiring grant (school/staff) stands.
 * Mirrors `effectivePlan` in src/lib/services/entitlements.ts so the gateway gates on
 * exactly the rule the app uses to show UI. Read-only — never grants.
 */
export function effectivePlan(
  ent: Entitlement | null | undefined,
  now: Date = new Date(),
): Plan {
  // Promo: Everyone gets Pro access for now.
  const real = actualPlan(ent, now);
  return real === "free" ? "pro" : real;
}

/** Whether an entitlement grants an active paid plan (pro or school) right now.
 * Uses the ACTUAL plan (not the promo) for quota/billing enforcement. */
export function isPaidActive(
  ent: Entitlement | null | undefined,
  now: Date = new Date(),
): boolean {
  return actualPlan(ent, now) !== "free";
}

/** Days of Pro access granted by one Exam Season Pass purchase. */
export const PASS_DAYS = 90;

/**
 * Entitlement for a one-time Exam Season Pass: `days` (default PASS_DAYS) of Pro
 * from `now`. Given the buyer's `current` entitlement it never SHORTENS an existing
 * later paid expiry and preserves an active higher (`school`) tier — so buying a
 * pass can't downgrade a subscriber.
 */
export function entitlementFromPass(
  now: Date,
  current?: Entitlement | null,
  days: number = PASS_DAYS,
): Entitlement {
  const passExpiry = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const activeNow = effectivePlan(current, now);
  const currentExpiry =
    activeNow !== "free" && current?.expiresAt ? new Date(current.expiresAt) : null;
  const expiresAt =
    currentExpiry && currentExpiry.getTime() > passExpiry.getTime() ? currentExpiry : passExpiry;
  const plan: Plan = activeNow === "school" ? "school" : "pro";
  return { plan, source: "moyasar", expiresAt: expiresAt.toISOString() };
}

/**
 * Exam-prep packs that can be bought one-time. MUST mirror the paid + live packs in
 * src/lib/prepCatalog.ts (`access: 'paid'`, `status: 'live'`). The server validates
 * the `packId` on checkout AND at fulfilment against this list so an unknown/`soon`/
 * tampered id can never grant ownership. A pack going live is a one-line addition
 * here + a deploy; a frontend-only catalog change never grants.
 */
export const SELLABLE_PACK_IDS = [
  "ppl-exam",
  "medical",
  "aip",
  "elp",
  "conversion",
  "cpl",
  "ir",
  "atpl",
] as const;

/** Narrow untrusted input to a sellable pack id, else null. */
export function sellablePackId(v: unknown): string | null {
  return typeof v === "string" && (SELLABLE_PACK_IDS as readonly string[]).includes(v) ? v : null;
}

/**
 * Price band for a sellable pack, set by how much material the pack actually carries
 * rather than by its certificate/subject label.
 *
 * The label was the wrong axis: `conversion` (76 questions) and `ppl-exam` (514, plus
 * nine ground-school modules) are both "certificate" packs and used to cost the same,
 * which over-charged the thin ones and under-charged the deep ones by ~7x of content.
 * Bands are declared, not computed, because the server has to price a checkout without
 * loading the question corpus — `tests/pricing-server-parity.test.ts` is what keeps
 * this map honest against `src/lib/prepCatalog.ts`.
 */
export type PackTier = "essential" | "standard" | "complete";

export const PACK_TIERS: Record<string, PackTier> = {
  // Essential — a focused bank, under ~150 questions.
  conversion: "essential",
  medical: "essential",
  aip: "essential",
  // Standard — a full topic spread.
  elp: "standard",
  atpl: "standard",
  ir: "standard",
  // Complete — the deepest banks, with ground school and a reading path.
  cpl: "complete",
  "ppl-exam": "complete",
};

/** The price band a sellable pack falls in; unknown ids price at the entry band. */
export function packTier(id: string | undefined): PackTier {
  return (id && PACK_TIERS[id]) || "essential";
}

/** Days one successful (initial or renewal) charge buys, by cadence. */
export function cadenceDays(cadence: Cadence): number {
  return cadence === "monthly" ? 30 : 365;
}

/** How many days before `expiresAt` the renewal engine attempts the recharge — a
 * buffer so a few retry attempts (see MAX_RENEWAL_ATTEMPTS) fit before access lapses. */
export const RENEWAL_LEAD_DAYS = 3;

/** Consecutive failed renewal charges before auto-renew gives up (the plan then
 * lapses to free at its already-set `expiresAt`, same as a lapsed Stripe subscription). */
export const MAX_RENEWAL_ATTEMPTS = 3;

/** The next renewal-charge attempt date, `leadDays` before `expiresAt`. */
export function nextChargeAt(expiresAt: Date, leadDays: number = RENEWAL_LEAD_DAYS): Date {
  return new Date(expiresAt.getTime() - leadDays * 24 * 60 * 60 * 1000);
}

/** Extend an expiry by one cadence period FROM ITSELF (not from `now`), so a renewal
 * charged a few days early (RENEWAL_LEAD_DAYS) doesn't shave time off the period the
 * subscriber already paid for. */
export function extendExpiry(expiresAt: Date, cadence: Cadence): Date {
  return new Date(expiresAt.getTime() + cadenceDays(cadence) * 24 * 60 * 60 * 1000);
}

/**
 * Entitlement to persist after a paid `pro` charge — a NEW purchase passes `now` as
 * `from`; a renewal charge passes the current `expiresAt` so the fresh period is
 * appended rather than measured from the (early) charge date.
 */
export function entitlementFromCheckout(cadence: Cadence, from: Date): Entitlement {
  return { plan: "pro", source: "moyasar", expiresAt: extendExpiry(from, cadence).toISOString() };
}

/**
 * Constant-time compare of two short secrets. Length is not itself secret here
 * (both sides are operator-configured), but the comparison must not short-circuit.
 */
function secretEquals(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Verify the `x-moyasar-signature` header as an HMAC-SHA256 hex digest over the raw
 * webhook body. One of the two schemes `verifyMoyasarWebhook` accepts — see there.
 */
export function verifyMoyasarSignature(
  rawBody: string,
  signature: string | string[] | undefined,
  secret: string,
): boolean {
  if (!signature || Array.isArray(signature)) return false;
  return secretEquals(createHmac("sha256", secret).update(rawBody).digest("hex"), signature);
}

/**
 * Authenticate a Moyasar webhook delivery, accepting EITHER scheme:
 *
 *   1. a `secret_token` field in the JSON body carrying the endpoint's shared secret
 *      verbatim — this is what Moyasar's own webhook documentation describes, and what
 *      the pre-Cloud-Run implementation compared against (see docs/BILLING.md); or
 *   2. an `x-moyasar-signature` header holding an HMAC-SHA256 hex digest over the raw
 *      body, keyed by the same shared secret — the scheme Moyasar's newer SDKs use.
 *
 * Accepting both is deliberate. We could not confirm from primary source which one a
 * given account is sent (docs.moyasar.com blocks automated fetches), and honouring one
 * scheme alone makes the webhook silently inert against an account using the other —
 * exactly the failure this integration hit. Neither branch weakens the other: both
 * require possession of the shared secret and compare in constant time.
 *
 * An empty `secret` never authenticates, so a missing MOYASAR_WEBHOOK_SECRET fails
 * closed rather than accepting an unsigned POST.
 */
export function verifyMoyasarWebhook(
  rawBody: string,
  signature: string | string[] | undefined,
  bodyToken: unknown,
  secret: string,
): boolean {
  if (!secret) return false;
  if (typeof bodyToken === "string" && bodyToken && secretEquals(bodyToken, secret)) return true;
  return verifyMoyasarSignature(rawBody, signature, secret);
}

// ---- Checkout intent + fulfilment (pure) ----------------------------------------

/**
 * The server-trusted checkout record persisted at `checkoutIntents/{id}` by the
 * checkout callable and read back at fulfilment. The `amount`/`currency`/`uid`/`kind`
 * here — never the payment's own (browser-influenced) metadata — decide what gets
 * granted; see billing.ts `fulfillPayment`.
 */
export interface CheckoutIntent {
  uid: string;
  kind: CheckoutKind;
  cadence?: Cadence | null;
  packId?: string | null;
  /** The buyer-supplied org name, for a `cohort` checkout only. */
  orgName?: string | null;
  ref?: string | null;
  /** The promo code applied to `amount`, if any — bumps its `redeemed` count on grant. */
  promo?: string | null;
  amount: number;
  currency: string;
  status: "pending" | "fulfilled";
}

/**
 * Where the confirming client should navigate next — a RELATIVE path (never built
 * from APP_ORIGIN) so it resolves on whichever host served the app (prod, a preview
 * deploy, localhost). Moyasar's own absolute `callback_url` is built separately.
 */
export function redirectForIntent(
  intent: Pick<CheckoutIntent, "kind" | "packId">,
  ok: boolean,
): string {
  if (ok && intent.kind === "pack" && intent.packId) return `/study/packs/${intent.packId}?checkout=success`;
  if (ok && intent.kind === "bundle") return "/study/packs?checkout=success";
  if (ok && intent.kind === "cohort") return "/business/admin?checkout=success";
  if (ok) return "/account?checkout=success";
  if (intent.kind === "pack" && intent.packId) return `/study/packs/${intent.packId}?checkout=cancel`;
  if (intent.kind === "bundle") return "/study/packs?checkout=cancel";
  if (intent.kind === "cohort") return "/schools?checkout=cancel";
  return "/pricing?checkout=cancel";
}

/**
 * The anti-tamper cross-check at fulfilment: a fetched payment matches the stored
 * intent only when its amount AND currency are exactly the server-priced ones — the
 * browser could have altered the widget's amount/metadata before submitting, so the
 * intent (not the payment) is the source of truth for what was owed.
 */
export function paymentMatchesIntent(
  payment: { amount: number; currency: string },
  intent: { amount: number; currency: string },
): boolean {
  return payment.amount === intent.amount && payment.currency === intent.currency;
}

/**
 * The payment id from a Moyasar webhook body. Payload shape per Moyasar's
 * payment-webhooks docs is `{ id, type, data: <payment> }`, so `data.id` is the
 * payment id; fall back to a top-level `id` defensively.
 */
export function webhookPaymentId(
  body: { id?: string; data?: { id?: string } } | undefined,
): string | undefined {
  return body?.data?.id ?? body?.id;
}

/**
 * True when a webhook event could carry a payment object worth looking up.
 *
 * A webhook subscribed to every event type (the dashboard's default) also delivers
 * `payout_*` and `balance_transferred`, whose `data.id` is a payout/transfer id — not
 * a payment id. Fetching it from `/payments/{id}` 404s, which the gateway surfaces as
 * a 502 and Moyasar then retries, so an unfiltered endpoint turns every settlement
 * into a retry storm. Gate on the event type instead of narrowing the subscription,
 * so the endpoint stays correct whatever the dashboard is set to.
 *
 * A payload with no `type` at all is treated as fulfillable: older deliveries omit it,
 * and the payment lookup plus `status === "paid"` check still gate what is granted.
 */
export function webhookMayCarryPayment(type: unknown): boolean {
  if (typeof type !== "string" || !type) return true;
  return type.toLowerCase().startsWith("payment");
}

/** The subscription state after a failed renewal charge (pure — the wrapper writes it). */
export interface RenewalFailureOutcome {
  /** The incremented failed-attempt count to persist. */
  attempts: number;
  /** True once the retry budget is spent and auto-renew gives up. */
  gaveUp: boolean;
  status: "canceled" | "past_due";
  /** Present (and false) only when giving up, to switch auto-renew off. */
  autoRenew?: false;
}

/**
 * The retry/give-up ladder for a failed renewal charge: increment the attempt count,
 * and once it reaches `max` (default MAX_RENEWAL_ATTEMPTS) cancel + switch auto-renew
 * off (the plan then lapses at its already-set `expiresAt`); otherwise mark it
 * past_due for tomorrow's sweep.
 */
export function renewalFailureOutcome(
  failedAttempts: number,
  max: number = MAX_RENEWAL_ATTEMPTS,
): RenewalFailureOutcome {
  const attempts = failedAttempts + 1;
  return attempts >= max
    ? { attempts, gaveUp: true, status: "canceled", autoRenew: false }
    : { attempts, gaveUp: false, status: "past_due" };
}

/**
 * The base date a successful renewal charge extends from: the current `expiresAt`
 * when present, else `now`. NB (pinned behavior): this extends from `expiresAt` even
 * when it is already in the PAST, so a long-lapsed subscriber who renews gets a period
 * measured from their old expiry rather than from today. Documented here, not changed.
 */
export function renewalBaseDate(currentExpiresAt: string | undefined, now: Date): Date {
  return currentExpiresAt ? new Date(currentExpiresAt) : now;
}

/**
 * Grant `next` without ever shortening or downgrading what `current` already gives.
 *
 * Two axes move independently, which is why this isn't simply "take the later one":
 *  - PLAN — an in-force `school` tier outranks a `pro` purchase, so it stands.
 *  - EXPIRY — whichever entitlement runs longer wins, and its `source` travels with
 *    it so the surviving grant stays attributable. An absent `expiresAt` means "no
 *    expiry" and therefore always wins.
 *
 * A lapsed `current` is not a downgrade to protect, so it is simply replaced.
 * This is the invariant that stops a comp from clobbering a paying user, so it
 * lives here rather than in a route: every writer of `entitlements` — billing
 * fulfilment and the grant routes alike — has to be able to reach it.
 */
export function mergeUpward(current: Entitlement | null, next: Entitlement): Entitlement {
  // Check the actual plan, not the effective plan (which applies the promo).
  // If there's no current entitlement or it's explicitly free, just take the new grant.
  if (!current || current.plan === "free") return next;

  const activeNow = effectivePlan(current);
  // Also treat lapsed entitlements as free — not a downgrade to protect.
  if (activeNow === "free") return next;

  const expiryOf = (e: Entitlement): number =>
    e.expiresAt ? Date.parse(e.expiresAt) : Infinity;
  const longest = expiryOf(current) > expiryOf(next) ? current : next;

  const merged: Entitlement = {
    plan: activeNow === "school" ? "school" : next.plan,
    source: longest.source,
  };
  if (longest.expiresAt) merged.expiresAt = longest.expiresAt;
  return merged;
}
