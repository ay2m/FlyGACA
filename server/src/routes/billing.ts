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
  extendExpiry,
  nextChargeAt,
  redirectForIntent,
  paymentMatchesIntent,
  webhookPaymentId,
  webhookMayCarryPayment,
  verifyMoyasarWebhook,
  renewalFailureOutcome,
  renewalBaseDate,
  mergeUpward,
  secretEquals,
  type CheckoutIntent,
  type CheckoutKind,
  type Cadence,
} from "../billing-core.js";
import { CREDIT_PACK_SIZE } from "../chat-quota-core.js";
import { normalizePromoCode, priceAfterPromo, type PromoCode } from "../promo-core.js";
import { referralCode, normalizeCode, REFERRAL_REWARD_CREDITS } from "../referral-core.js";
import { buildCohortOrg } from "../org-core.js";
import { config } from "../config.js";
import { priceEnv } from "../prices.js";
import type { PoolClient } from "pg";
import { query, queryOne, tx, execFor } from "../db.js";
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

/** Arm (or re-arm) auto-renewal against the card the buyer just saved. */
async function armRenewal(
  uid: string,
  cadence: Cadence,
  cardToken: string | null,
  expiresAt: Date,
  client?: PoolClient,
): Promise<void> {
  const { query } = execFor(client);
  await query(
    `INSERT INTO subscriptions (user_id, plan, cadence, auto_renew, card_token,
                                next_renewal_at, last_renewal_at, failure_count, updated_at)
     VALUES ($1, 'pro', $2, true, $3, $4, now(), 0, now())
     ON CONFLICT (user_id) DO UPDATE SET
       cadence = EXCLUDED.cadence, auto_renew = true,
       card_token = COALESCE(EXCLUDED.card_token, subscriptions.card_token),
       next_renewal_at = EXCLUDED.next_renewal_at,
       last_renewal_at = now(), failure_count = 0, updated_at = now()`,
    [uid, cadence, cardToken, nextChargeAt(expiresAt)],
  );
}

/**
 * Deliver what the buyer actually paid for. One case per `CheckoutKind`; the
 * entitlement-bearing kinds go through `mergeUpward` so a purchase can never
 * shorten an expiry an earlier purchase or grant already set.
 */
async function deliver(
  intent: CheckoutIntent,
  payment: MoyasarPayment,
  now: Date,
  client?: PoolClient,
): Promise<void> {
  const { queryOne } = execFor(client);
  const current = await getEntitlement(intent.uid, client);

  switch (intent.kind) {
  case "pro": {
    const cadence = (intent.cadence ?? "annual") as Cadence;
    const ent = entitlementFromCheckout(cadence, now);
    await setEntitlement(intent.uid, mergeUpward(current, ent), client);
    await armRenewal(
      intent.uid,
      cadence,
      payment.source?.token ?? null,
      new Date(ent.expiresAt ?? now.toISOString()),
      client,
    );
    return;
  }
  case "pass":
    await setEntitlement(
      intent.uid,
      mergeUpward(current, entitlementFromPass(now, current)),
      client,
    );
    return;
  case "credits":
    await addChatCredits(intent.uid, CREDIT_PACK_SIZE, client);
    return;
  case "pack":
    if (intent.packId) await grantPacks(intent.uid, [intent.packId], client);
    return;
  case "bundle":
    await grantPacks(intent.uid, SELLABLE_PACK_IDS, client);
    return;
  case "cohort": {
    // Use the pure builder rather than hand-rolling the row: it is what carries the
    // intake window, and ignoring it is how a 90-day product became perpetual.
    const spec = buildCohortOrg(intent.uid, intent.orgName, now);
    const org = await queryOne<{ id: string }>(
      `INSERT INTO orgs (name, owner_user_id, seat_limit, expires_at)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [spec.name, intent.uid, spec.seatLimit, spec.expiresAt],
    );
    console.info("funnel", { event: "cohort_provisioned", orgId: org?.id, uid: intent.uid });
    return;
  }
  }
}

/**
 * Pay out a referral on the referred account's FIRST conversion: both sides get
 * credits, once ever, and only when the code resolves to somebody other than the
 * buyer. `recordReferralConversion` is the one-time lock.
 */
async function payReferralReward(intent: CheckoutIntent): Promise<void> {
  if (!intent.ref) return;
  const owner = await findReferralOwner(intent.ref);
  if (!owner || owner.user_id === intent.uid) return;
  if (!(await recordReferralConversion(intent.ref, intent.uid))) return;

  await addChatCredits(owner.user_id, REFERRAL_REWARD_CREDITS);
  await addChatCredits(intent.uid, REFERRAL_REWARD_CREDITS);
}

/** Record the settled payment for reconciliation. Idempotent on the payment id. */
async function recordPayment(
  intent: CheckoutIntent,
  intentId: string,
  payment: MoyasarPayment,
): Promise<void> {
  await query(
    `INSERT INTO payments (id, user_id, intent_id, amount, currency, status, kind, raw)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO NOTHING`,
    [
      payment.id,
      intent.uid,
      intentId,
      payment.amount,
      payment.currency,
      payment.status,
      intent.kind,
      JSON.stringify(payment),
    ],
  );
}

/**
 * Apply a paid intent: deliver the purchase, count the promo redemption, pay out
 * any referral reward and record the payment. Idempotent, and returns false when
 * another caller already fulfilled this intent.
 */
async function fulfil(row: IntentRow, payment: MoyasarPayment): Promise<boolean> {
  const intent = toIntent(row);

  // The claim and the delivery are ONE transaction.
  //
  // The status guard is still the idempotency lock — the confirm leg and the
  // webhook can both arrive, and only the one that flips pending → paid proceeds.
  // What changed is that the flip no longer commits on its own connection. It used
  // to, which meant a throw from deliver() left the intent `paid` with nothing
  // granted, and left it that way permanently: the next webhook retry re-ran this,
  // failed the status guard, and answered 200. The customer's card was charged,
  // they had no product, and nothing surfaced anywhere.
  //
  // Rolling back together removes the window entirely rather than compensating for
  // it after the fact — a process killed mid-delivery (Cloud Run evicting an
  // instance is routine) leaves the intent `pending`, so Moyasar's retry genuinely
  // re-delivers. Nothing here makes a network call; the Moyasar round-trip already
  // happened, so the transaction is short.
  const claimed = await tx(async (client) => {
    const { queryOne } = execFor(client);
    const got = await queryOne<{ id: string }>(
      `UPDATE checkout_intents SET status = 'paid', payment_id = $2, updated_at = now()
        WHERE id = $1 AND status = 'pending'
        RETURNING id`,
      [row.id, payment.id],
    );
    if (!got) return false;
    await deliver(intent, payment, new Date(), client);
    return true;
  });
  if (!claimed) return false;

  // Past this point the product is delivered. These are counters and records: a
  // failure costs reconciliation accuracy, not the customer's purchase, so it must
  // not roll the delivery back.
  try {
    if (intent.promo) {
      await query("UPDATE promo_codes SET redeemed = redeemed + 1 WHERE code = $1", [intent.promo]);
    }
    await payReferralReward(intent);
    await recordPayment(intent, row.id, payment);
  } catch (err) {
    console.error("fulfil: delivered but bookkeeping failed", row.id, payment.id, err);
  }

  return true;
}

// Re-exported for `tests/entitlement-merge.test.ts`, which has always reached for it
// here; the rule itself now lives in `billing-core.ts` so the grant routes share it.
export { mergeUpward };

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
    // `rawBody` is stashed by the json parser's verify hook (see index.ts) — the HMAC
    // is over the exact bytes Moyasar sent, not a re-serialization.
    const raw = req.rawBody ?? "";
    const body = req.body as {
      id?: string;
      type?: unknown;
      data?: { id?: string };
      secret_token?: unknown;
    };
    // Either scheme authenticates — see verifyMoyasarWebhook for why both are honoured.
    if (
      !verifyMoyasarWebhook(
        raw,
        req.get("x-moyasar-signature"),
        body?.secret_token,
        config.moyasar.webhookSecret,
      )
    ) {
      throw new HttpError(401, "bad-signature");
    }

    // Payout and balance events ride the same endpoint when the webhook subscribes to
    // every type; their ids are not payment ids. Ack and drop them.
    if (!webhookMayCarryPayment(body?.type)) return res.json({ ok: true });

    const paymentId = webhookPaymentId(body);
    if (!paymentId) return res.json({ ok: true });

    const payment = await moyasar<MoyasarPayment>(`/payments/${encodeURIComponent(paymentId)}`);

    // A refund or a void used to fall into the `status !== "paid"` drop below and
    // vanish: nothing recorded, nothing revoked, no signal anywhere. A buyer could
    // take the All-Access Bundle, refund it, and keep every pack permanently.
    //
    // Automatic revocation is deliberately NOT done here, and the reason is the
    // data model rather than caution for its own sake: `pack_entitlements` records
    // no source, so a pack owned both directly and via a bundle is
    // indistinguishable, and revoking would silently strip access somebody still
    // paid for. Entitlements have the same problem once a grant has merged upward.
    // So do the two things that are unambiguous — stop future charges, and make the
    // refund impossible to miss — and leave the revocation decision to a human with
    // everything they need to make it.
    if (payment.status === "refunded" || payment.status === "voided") {
      const refunded = await intentForPayment(payment);
      if (refunded) {
        await query(
          "UPDATE checkout_intents SET status = 'failed', updated_at = now() WHERE id = $1",
          [refunded.id],
        );
        // Never keep charging a card whose purchase was handed back.
        await query(
          "UPDATE subscriptions SET auto_renew = false, updated_at = now() WHERE user_id = $1",
          [refunded.user_id],
        );
      }
      console.error("funnel", {
        event: "payment_refunded",
        paymentId: payment.id,
        status: payment.status,
        intentId: refunded?.id ?? null,
        uid: refunded?.user_id ?? null,
        kind: refunded?.kind ?? null,
        packId: refunded?.pack_id ?? null,
        amount: payment.amount,
        action: "revoke the granted entitlement/packs by hand — see docs/BILLING.md",
      });
      return res.json({ ok: true });
    }

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
    // Constant-time, like every other secret comparison in this file. An unset
    // CRON_SECRET fails closed: the scheduler 401s visibly rather than the
    // endpoint becoming open.
    if (!config.cronSecret || !secretEquals(req.get("X-Cron-Secret") ?? "", config.cronSecret)) {
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
    let skipped = 0;

    for (const sub of due) {
      // Claim before charging. The select above takes no lock, so two overlapping
      // invocations would otherwise read the same rows and charge every card
      // twice — and overlap is the expected case, not a rare one: Cloud Scheduler's
      // default attempt deadline is 180s, this loop is sequential over up to 200
      // cards at a network round-trip each, and Scheduler RETRIES an attempt it
      // considers timed out while the first is still running.
      //
      // Moving next_renewal_at forward conditionally is a compare-and-swap: the
      // second invocation matches no row and skips. Same shape as the status guard
      // that makes fulfil() idempotent. The date is corrected below on success;
      // on failure the catch sets it deliberately.
      const claimed = await queryOne<{ user_id: string }>(
        `UPDATE subscriptions
            SET next_renewal_at = now() + interval '1 day', updated_at = now()
          WHERE user_id = $1
            AND auto_renew
            AND card_token IS NOT NULL
            AND next_renewal_at <= now()
          RETURNING user_id`,
        [sub.user_id],
      );
      if (!claimed) {
        skipped += 1;
        continue;
      }

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
        // mergeUpward, like every other entitlement write on this path. A flat write
        // would demote a user who bought Pro and later received a non-expiring staff
        // or school grant: the renewal would replace `school`/`staff` with an
        // expiring `pro`, destroying the grant and its source audit trail — while
        // charging them for the privilege.
        await setEntitlement(
          sub.user_id,
          mergeUpward(current, {
            plan: "pro",
            source: "moyasar",
            expiresAt: expiresAt.toISOString(),
          }),
        );
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

    // Piggyback the daily housekeeping. Three tables grow without bound and
    // nothing else prunes them: oauth_states leaks a row per abandoned Google
    // sign-in (its only DELETE is the consume path, which is predicated on
    // `expires_at > now()`, so an EXPIRED row is unreachable by design);
    // auth_tokens keeps every used and lapsed verification/reset token; and
    // chat_usage grows with TRAFFIC rather than with users, because its key
    // includes hashed anonymous IPs.
    //
    // Deliberately after the charges and deliberately swallowed: this is a cost and
    // disk concern, and it must never be the reason a renewal sweep reports failure.
    try {
      await query("DELETE FROM oauth_states WHERE expires_at < now()");
      await query("DELETE FROM auth_tokens WHERE expires_at < now() - interval '7 days'");
      // `day` is a DATE column, so compare against a date — not a formatted string
      // leaning on an implicit cast.
      await query("DELETE FROM chat_usage WHERE day < current_date - 90");
    } catch (err) {
      console.error("renew: housekeeping sweep failed", err);
    }

    return res.json({ due: due.length, renewed, failed, skipped });
  }),
);
