/**
 * Moyasar billing routes — replaces the `createCheckoutConfig`, `confirmPayment`,
 * `cancelAutoRenew`, `getReferralCode` and `moyasarWebhook` callables plus the
 * `renewMoyasarSubscriptions` scheduled function.
 *
 * The trust model is unchanged and load-bearing:
 *   - the CLIENT NEVER SENDS A PRICE. `/checkout-config` prices the purchase from
 *     the server's SAR table, applies any promo server-side, and persists a
 *     `checkout_intents` row. Fulfilment re-derives kind and amount from THAT row,
 *     never from the callback URL or the widget's metadata;
 *   - `paymentMatchesIntent` is the anti-tamper cross-check: the fetched payment's
 *     amount and currency must equal the server-priced ones;
 *   - `entitlements` is written only here and in the grant routes, and only upward.
 */
import { Router } from "express";
import {
  checkoutKind,
  cadenceOf,
  isRecurringKind,
  describeCheckout,
  amountForCheckout,
  sellablePackId,
  SELLABLE_PACK_IDS,
  entitlementFromCheckout,
  entitlementFromPass,
  effectivePlan,
  extendExpiry,
  nextChargeAt,
  redirectForIntent,
  paymentMatchesIntent,
  webhookPaymentId,
  verifyMoyasarSignature,
  renewalFailureOutcome,
  renewalBaseDate,
  type CheckoutIntent,
  type CheckoutKind,
  type Cadence,
  type Entitlement,
} from "../billing-core.js";
import { CREDIT_PACK_SIZE } from "../chat-quota-core.js";
import { normalizePromoCode, priceAfterPromo, type PromoCode } from "../promo-core.js";
import { referralCode, normalizeCode, REFERRAL_REWARD_CREDITS } from "../referral-core.js";
import { COHORT_SEAT_LIMIT } from "../org-core.js";
import { config } from "../config.js";
import { priceEnv } from "../prices.js";
import { query, queryOne } from "../db.js";
import {
  getEntitlement,
  setEntitlement,
  addChatCredits,
  grantPacks,
  ensureReferralCode,
  findReferralOwner,
  recordReferralConversion,
} from "../store.js";
import { handler, requireUser, badRequest, notFound, HttpError } from "../http.js";

export const billingRouter: Router = Router();

const MOYASAR_API = "https://api.moyasar.com/v1";

/** Server-to-server call to Moyasar, authenticated with the secret key. */
async function moyasar<T>(path: string, init?: RequestInit): Promise<T> {
  if (!config.moyasar.secretKey) throw new HttpError(500, "billing-unavailable");
  const auth = Buffer.from(`${config.moyasar.secretKey}:`).toString("base64");
  const res = await fetch(`${MOYASAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    console.error(`Moyasar ${path} failed (${res.status}):`, await res.text());
    throw new HttpError(502, "billing-upstream");
  }
  return (await res.json()) as T;
}

// ------------------------------------------------------------ referral code --

billingRouter.get(
  "/referral-code",
  handler(async (req, res) => {
    const user = requireUser(req);
    const code = await ensureReferralCode(user.uid, referralCode(user.uid));
    return res.json({ code });
  }),
);

// --------------------------------------------------------------- checkout --

interface PromoRow {
  code: string;
  type: "percent" | "fixed";
  value: number;
  active: boolean;
  applies_to: string[] | null;
  expires_at: Date | null;
  max_redemptions: number | null;
  redeemed: number;
}

function toPromoCode(row: PromoRow | null): PromoCode | null {
  if (!row) return null;
  return {
    type: row.type,
    value: row.value,
    active: row.active,
    ...(row.applies_to?.length ? { appliesTo: row.applies_to as CheckoutKind[] } : {}),
    ...(row.expires_at ? { expiresAt: row.expires_at.toISOString() } : {}),
    ...(row.max_redemptions !== null ? { maxRedemptions: row.max_redemptions } : {}),
    redeemed: row.redeemed,
  };
}

billingRouter.post(
  "/checkout-config",
  handler(async (req, res) => {
    const user = requireUser(req);
    const b = (req.body ?? {}) as Record<string, unknown>;

    const kind = checkoutKind(b.kind);
    if (!kind) throw badRequest("unknown-checkout-kind");

    const cadence = isRecurringKind(kind) ? cadenceOf(b.cadence) : undefined;
    const packId = kind === "pack" ? sellablePackId(b.packId) : null;
    if (kind === "pack" && !packId) throw badRequest("unknown-pack");

    const orgName = kind === "cohort" ? String(b.orgName ?? "").trim().slice(0, 120) : null;
    if (kind === "cohort" && !orgName) throw badRequest("org-name-required");

    // Price server-side, then discount server-side. The client only ever passed a
    // code string — it can neither name a price nor claim a discount.
    const listAmount = amountForCheckout(kind, cadence, priceEnv(), packId ?? undefined);
    const promoInput = normalizePromoCode(typeof b.promo === "string" ? b.promo : "");
    const promoRow = promoInput
      ? await queryOne<PromoRow>("SELECT * FROM promo_codes WHERE code = $1", [promoInput])
      : null;
    const { amount, promo } = priceAfterPromo(
      listAmount,
      toPromoCode(promoRow),
      kind,
      promoInput,
    );

    const ref = normalizeCode(typeof b.ref === "string" ? b.ref : "") || null;

    const intent = await queryOne<{ id: string }>(
      `INSERT INTO checkout_intents
         (user_id, kind, cadence, pack_id, org_name, ref_code, promo_code,
          amount, list_amount, currency)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'SAR')
       RETURNING id`,
      [user.uid, kind, cadence ?? null, packId, orgName, ref, promo, amount, listAmount],
    );
    if (!intent) throw new HttpError(500, "internal");

    return res.json({
      checkoutId: intent.id,
      amount,
      listAmount,
      promoApplied: promo,
      currency: "SAR",
      description: describeCheckout(kind, packId ?? undefined),
      callbackUrl: `${config.appOrigin}/checkout/return`,
      methods: ["creditcard", "applepay"],
      supportedNetworks: ["mada", "visa", "mastercard"],
      saveCard: isRecurringKind(kind),
    });
  }),
);

// ------------------------------------------------------------- fulfilment --

interface IntentRow {
  id: string;
  user_id: string;
  kind: CheckoutKind;
  cadence: Cadence | null;
  pack_id: string | null;
  org_name: string | null;
  ref_code: string | null;
  promo_code: string | null;
  amount: number;
  currency: string;
  status: string;
}

function toIntent(row: IntentRow): CheckoutIntent {
  return {
    uid: row.user_id,
    kind: row.kind,
    cadence: row.cadence,
    packId: row.pack_id,
    orgName: row.org_name,
    ref: row.ref_code,
    promo: row.promo_code,
    amount: row.amount,
    currency: row.currency,
    status: row.status === "paid" ? "fulfilled" : "pending",
  };
}

interface MoyasarPayment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  source?: { token?: string; type?: string };
  metadata?: { checkoutId?: string };
}

/**
 * Apply a paid intent: grant the entitlement/packs/credits, arm auto-renewal,
 * count the promo redemption and pay out any referral reward. Idempotent — the
 * `status = 'pending'` guard on the intent update is the lock, so the confirm leg
 * and the webhook can both run without double-granting.
 */
async function fulfil(row: IntentRow, payment: MoyasarPayment): Promise<boolean> {
  const claimed = await queryOne<{ id: string }>(
    `UPDATE checkout_intents SET status = 'paid', payment_id = $2, updated_at = now()
      WHERE id = $1 AND status = 'pending'
      RETURNING id`,
    [row.id, payment.id],
  );
  if (!claimed) return false;

  const intent = toIntent(row);
  const now = new Date();
  const current = await getEntitlement(intent.uid);

  switch (intent.kind) {
  case "pro":
  case "student": {
    const cadence = (intent.cadence ?? "annual") as Cadence;
    const ent = entitlementFromCheckout(cadence, now);
    // Upgrade-only: never shorten an expiry a grant or earlier purchase set.
    await setEntitlement(intent.uid, mergeUpward(current, ent));
    await query(
      `INSERT INTO subscriptions (user_id, plan, cadence, auto_renew, card_token,
                                    next_renewal_at, last_renewal_at, failure_count, updated_at)
         VALUES ($1, 'pro', $2, true, $3, $4, now(), 0, now())
         ON CONFLICT (user_id) DO UPDATE SET
           cadence = EXCLUDED.cadence, auto_renew = true,
           card_token = COALESCE(EXCLUDED.card_token, subscriptions.card_token),
           next_renewal_at = EXCLUDED.next_renewal_at,
           last_renewal_at = now(), failure_count = 0, updated_at = now()`,
      [
        intent.uid,
        cadence,
        payment.source?.token ?? null,
        nextChargeAt(new Date(ent.expiresAt ?? now.toISOString())),
      ],
    );
    break;
  }
  case "pass":
    await setEntitlement(intent.uid, mergeUpward(current, entitlementFromPass(now, current)));
    break;
  case "credits":
    await addChatCredits(intent.uid, CREDIT_PACK_SIZE);
    break;
  case "pack":
    if (intent.packId) await grantPacks(intent.uid, [intent.packId]);
    break;
  case "bundle":
    await grantPacks(intent.uid, SELLABLE_PACK_IDS);
    break;
  case "cohort": {
    const org = await queryOne<{ id: string }>(
      "INSERT INTO orgs (name, owner_user_id, seat_limit) VALUES ($1, $2, $3) RETURNING id",
      [intent.orgName ?? "Cohort", intent.uid, COHORT_SEAT_LIMIT],
    );
    console.info("funnel", { event: "cohort_provisioned", orgId: org?.id, uid: intent.uid });
    break;
  }
  }

  if (intent.promo) {
    await query("UPDATE promo_codes SET redeemed = redeemed + 1 WHERE code = $1", [intent.promo]);
  }

  // Referral reward — both sides get credits, once per referred account, and only
  // when the code resolves to somebody other than the buyer.
  if (intent.ref) {
    const owner = await findReferralOwner(intent.ref);
    if (owner && owner.user_id !== intent.uid) {
      if (await recordReferralConversion(intent.ref, intent.uid)) {
        await addChatCredits(owner.user_id, REFERRAL_REWARD_CREDITS);
        await addChatCredits(intent.uid, REFERRAL_REWARD_CREDITS);
      }
    }
  }

  await query(
    `INSERT INTO payments (id, user_id, intent_id, amount, currency, status, kind, raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [
      payment.id,
      intent.uid,
      row.id,
      payment.amount,
      payment.currency,
      payment.status,
      intent.kind,
      JSON.stringify(payment),
    ],
  );

  return true;
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
 * Exported for `tests/entitlement-merge.test.ts` — this is the invariant that stops
 * a comp from clobbering a paying user.
 */
export function mergeUpward(current: Entitlement | null, next: Entitlement): Entitlement {
  const activeNow = current ? effectivePlan(current) : "free";
  if (!current || activeNow === "free") return next;

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

/** Load the intent a payment refers to, matching on metadata then on our own record. */
async function intentForPayment(payment: MoyasarPayment): Promise<IntentRow | null> {
  const byMetadata = payment.metadata?.checkoutId
    ? await queryOne<IntentRow>("SELECT * FROM checkout_intents WHERE id = $1", [
      payment.metadata.checkoutId,
    ])
    : null;
  return (
    byMetadata ??
    (await queryOne<IntentRow>("SELECT * FROM checkout_intents WHERE payment_id = $1", [
      payment.id,
    ]))
  );
}

billingRouter.post(
  "/confirm",
  handler(async (req, res) => {
    const user = requireUser(req);
    const id = typeof req.body?.id === "string" ? req.body.id : "";
    if (!id) throw badRequest("payment-id-required");

    const payment = await moyasar<MoyasarPayment>(`/payments/${encodeURIComponent(id)}`);
    const row = await intentForPayment(payment);
    if (!row) throw notFound("unknown-checkout");
    // The intent's owner is the only account that can confirm it.
    if (row.user_id !== user.uid) throw notFound("unknown-checkout");

    const ok = payment.status === "paid" && paymentMatchesIntent(payment, toIntent(row));
    if (ok) await fulfil(row, payment);

    return res.json({ redirectTo: redirectForIntent(toIntent(row), ok) });
  }),
);

/**
 * Moyasar's server-to-server notification. Unauthenticated by definition, so the
 * shared-secret signature is the only thing standing between this and a forged
 * fulfilment — reject before touching the database.
 */
billingRouter.post(
  "/webhook/moyasar",
  handler(async (req, res) => {
    // `rawBody` is stashed by the json parser's verify hook (see index.ts) — the
    // signature is over the exact bytes Moyasar sent, not a re-serialization.
    const raw = req.rawBody ?? "";
    if (
      !verifyMoyasarSignature(
        raw,
        req.get("x-moyasar-signature"),
        config.moyasar.webhookSecret,
      )
    ) {
      throw new HttpError(401, "bad-signature");
    }

    const body = req.body as { id?: string; data?: { id?: string } };
    const paymentId = webhookPaymentId(body);
    if (!paymentId) return res.json({ ok: true });

    const payment = await moyasar<MoyasarPayment>(`/payments/${encodeURIComponent(paymentId)}`);
    if (payment.status !== "paid") return res.json({ ok: true });

    const row = await intentForPayment(payment);
    if (row && paymentMatchesIntent(payment, toIntent(row))) await fulfil(row, payment);

    return res.json({ ok: true });
  }),
);

// ------------------------------------------------------------- management --

billingRouter.post(
  "/cancel-auto-renew",
  handler(async (req, res) => {
    const user = requireUser(req);
    // The plan stays active until its already-granted expiry; it just won't be
    // recharged. Moyasar has no hosted portal, so this is the whole surface.
    await query(
      "UPDATE subscriptions SET auto_renew = false, updated_at = now() WHERE user_id = $1",
      [user.uid],
    );
    return res.json({ ok: true });
  }),
);

/**
 * The renewal engine, driven by Cloud Scheduler (`POST /api/billing/renew` with the
 * `X-Cron-Secret` header). Charges the saved card for every subscription whose lead
 * window has opened, extends the entitlement on success, and applies the
 * back-off/cancel policy from `renewalFailureOutcome` on failure.
 */
billingRouter.post(
  "/renew",
  handler(async (req, res) => {
    if (!config.cronSecret || req.get("X-Cron-Secret") !== config.cronSecret) {
      throw new HttpError(401, "unauthenticated");
    }

    const due = await query<{
      user_id: string;
      cadence: Cadence;
      card_token: string;
      failure_count: number;
    }>(
      `SELECT user_id, cadence, card_token, failure_count
         FROM subscriptions
        WHERE auto_renew AND card_token IS NOT NULL AND next_renewal_at <= now()
        ORDER BY next_renewal_at
        LIMIT 200`,
    );

    const now = new Date();
    let renewed = 0;
    let failed = 0;

    for (const sub of due) {
      const current = await getEntitlement(sub.user_id);
      try {
        const amount = amountForCheckout("pro", sub.cadence, priceEnv());
        const payment = await moyasar<MoyasarPayment>("/payments", {
          method: "POST",
          body: JSON.stringify({
            amount,
            currency: "SAR",
            description: describeCheckout("pro"),
            source: { type: "token", token: sub.card_token },
          }),
        });
        if (payment.status !== "paid") throw new Error(`status:${payment.status}`);

        const base = renewalBaseDate(current?.expiresAt, now);
        const expiresAt = extendExpiry(base, sub.cadence);
        await setEntitlement(sub.user_id, {
          plan: "pro",
          source: "moyasar",
          expiresAt: expiresAt.toISOString(),
        });
        await query(
          `UPDATE subscriptions
              SET next_renewal_at = $2, last_renewal_at = now(),
                  failure_count = 0, updated_at = now()
            WHERE user_id = $1`,
          [sub.user_id, nextChargeAt(expiresAt)],
        );
        renewed += 1;
      } catch (err) {
        // Retry tomorrow until the budget is spent, then switch auto-renew off —
        // the plan lapses at its already-granted expiry, like any other
        // subscription that stops paying.
        const outcome = renewalFailureOutcome(sub.failure_count);
        await query(
          `UPDATE subscriptions
              SET failure_count = $2,
                  auto_renew = $3,
                  next_renewal_at = now() + interval '1 day',
                  updated_at = now()
            WHERE user_id = $1`,
          [sub.user_id, outcome.attempts, !outcome.gaveUp],
        );
        console.error("renewal failed for", sub.user_id, outcome.status, err);
        failed += 1;
      }
    }

    return res.json({ due: due.length, renewed, failed });
  }),
);
