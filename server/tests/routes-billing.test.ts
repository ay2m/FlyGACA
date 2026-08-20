/**
 * `server/src/routes/billing.ts` — Moyasar checkout, fulfilment, the webhook and
 * the renewal job.
 *
 * This is the other writer of `entitlements`, and its trust model is the whole
 * point: the CLIENT NEVER SENDS A PRICE, fulfilment re-derives what to grant from
 * the stored `checkout_intents` row rather than the callback URL or the widget's
 * metadata, `paymentMatchesIntent` is the anti-tamper cross-check, and the
 * webhook's shared-secret signature is all that stands between a forged POST and
 * a free entitlement. None of it was covered — `routes/**` was excluded from the
 * coverage include wholesale.
 *
 * The real router runs on a real Express app (including the `rawBody` verify hook
 * index.ts installs, which the signature check depends on). `db.ts` and `store.ts`
 * are mocked as the I/O edges, `fetch` is stubbed for the Moyasar API, and
 * `config`/`prices` are driven by env set before the dynamic import — so
 * billing-core, promo-core and referral-core all run for real.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createHmac } from "node:crypto";
import type { Entitlement } from "../src/billing-core.js";
import type { AuthedUser } from "../src/store.js";

const WEBHOOK_SECRET = "test-webhook-secret";
const CRON_SECRET = "test-cron-secret";

// config.ts and prices.ts read process.env once at import, so set them first.
process.env.MOYASAR_SECRET_KEY = "sk_test";
process.env.MOYASAR_WEBHOOK_SECRET = WEBHOOK_SECRET;
process.env.CRON_SECRET = CRON_SECRET;
process.env.APP_ORIGIN = "https://flygaca.com";
process.env.PRICE_PRO_MONTHLY = "39";
process.env.PRICE_PRO_ANNUAL = "349";
process.env.PRICE_PASS = "99";
process.env.PRICE_CREDITS = "19";
process.env.PRICE_PREP_PACK = "59";
process.env.PRICE_PREP_PACK_ESSENTIAL = "49";
process.env.PRICE_PREP_PACK_STANDARD = "59";
process.env.PRICE_PREP_PACK_COMPLETE = "79";
process.env.PRICE_BUNDLE = "199";
process.env.PRICE_COHORT = "4999";

const query = vi.fn();
const queryOne = vi.fn();
const getEntitlement = vi.fn<(uid: string) => Promise<Entitlement | null>>();
const setEntitlement = vi.fn<(uid: string, ent: Entitlement) => Promise<void>>();
const addChatCredits = vi.fn();
const grantPacks = vi.fn();
const ensureReferralCode = vi.fn();
const findReferralOwner = vi.fn();
const recordReferralConversion = vi.fn();

vi.mock("../src/db.js", () => ({
  query: (...a: unknown[]) => query(...a),
  queryOne: (...a: unknown[]) => queryOne(...a),
}));
vi.mock("../src/store.js", () => ({
  getEntitlement: (...a: unknown[]) => getEntitlement(...(a as [string])),
  setEntitlement: (...a: unknown[]) => setEntitlement(...(a as [string, Entitlement])),
  addChatCredits: (...a: unknown[]) => addChatCredits(...a),
  grantPacks: (...a: unknown[]) => grantPacks(...a),
  ensureReferralCode: (...a: unknown[]) => ensureReferralCode(...a),
  findReferralOwner: (...a: unknown[]) => findReferralOwner(...a),
  recordReferralConversion: (...a: unknown[]) => recordReferralConversion(...a),
}));

const { billingRouter } = await import("../src/routes/billing.js");
const { errorMiddleware } = await import("../src/http.js");
const { SELLABLE_PACK_IDS } = await import("../src/billing-core.js");

let currentUser: AuthedUser | null = null;

const app = express();
// Mirrors index.ts: the signature is checked over the exact bytes Moyasar sent.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as express.Request).rawBody = buf.toString("utf8");
    },
  }),
);
app.use((req, _res, next) => {
  if (currentUser) req.user = currentUser;
  next();
});
app.use("/api/billing", billingRouter);
app.use(errorMiddleware);

function user(over: Partial<AuthedUser> = {}): AuthedUser {
  return {
    uid: "u1",
    email: "buyer@example.com",
    emailVerified: true,
    displayName: "Buyer",
    createdAtMs: Date.parse("2026-01-01T00:00:00Z"),
    ...over,
  };
}

/** A Moyasar payment as the API returns it. */
function payment(over: Record<string, unknown> = {}) {
  return {
    id: "pay_1",
    status: "paid",
    amount: 34900,
    currency: "SAR",
    metadata: { checkoutId: "intent-1" },
    source: { token: "card_tok" },
    ...over,
  };
}

/** A `checkout_intents` row as stored by /checkout-config. */
function intentRow(over: Record<string, unknown> = {}) {
  return {
    id: "intent-1",
    user_id: "u1",
    kind: "pro",
    cadence: "annual",
    pack_id: null,
    org_name: null,
    ref_code: null,
    promo_code: null,
    amount: 34900,
    currency: "SAR",
    status: "pending",
    ...over,
  };
}

/** Stub the Moyasar API to return `body` for the next GET /payments/:id. */
function stubMoyasar(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    }),
  );
}

const sign = (raw: string) => createHmac("sha256", WEBHOOK_SECRET).update(raw).digest("hex");

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  currentUser = null;
  query.mockResolvedValue([]);
  queryOne.mockResolvedValue(null);
  getEntitlement.mockResolvedValue(null);
  setEntitlement.mockResolvedValue(undefined);
  addChatCredits.mockResolvedValue(undefined);
  grantPacks.mockResolvedValue(undefined);
  findReferralOwner.mockResolvedValue(null);
  recordReferralConversion.mockResolvedValue(true);
});

describe("POST /checkout-config — the client never names a price", () => {
  it("prices an annual Pro purchase from the server table and persists the intent", async () => {
    currentUser = user();
    queryOne.mockResolvedValueOnce({ id: "intent-1" }); // the INSERT ... RETURNING id

    const res = await request(app)
      .post("/api/billing/checkout-config")
      .send({ kind: "pro", cadence: "annual" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      checkoutId: "intent-1",
      amount: 34900, // SAR 349 → halalas, from PRICE_PRO_ANNUAL
      listAmount: 34900,
      currency: "SAR",
      saveCard: true, // recurring kind
      callbackUrl: "https://flygaca.com/checkout/return",
    });
  });

  it("ignores an amount the client tries to supply", async () => {
    // The route reads only kind/cadence/packId/orgName/promo/ref off the body.
    currentUser = user();
    queryOne.mockResolvedValueOnce({ id: "intent-1" });

    const res = await request(app)
      .post("/api/billing/checkout-config")
      .send({ kind: "pro", cadence: "monthly", amount: 1, listAmount: 1, currency: "USD" });

    expect(res.body.amount).toBe(3900); // PRICE_PRO_MONTHLY, not the 1 sent
    expect(res.body.currency).toBe("SAR");
    const [, params] = queryOne.mock.calls[0];
    expect(params).toContain(3900);
  });

  it("does not arm card-saving for a one-off purchase", async () => {
    currentUser = user();
    queryOne.mockResolvedValueOnce({ id: "intent-1" });

    const res = await request(app).post("/api/billing/checkout-config").send({ kind: "credits" });

    expect(res.body.saveCard).toBe(false);
    expect(res.body.amount).toBe(1900);
  });

  it("rejects an unknown checkout kind", async () => {
    currentUser = user();
    const res = await request(app).post("/api/billing/checkout-config").send({ kind: "free-stuff" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("unknown-checkout-kind");
  });

  it("rejects a pack id that is not sellable", async () => {
    currentUser = user();
    const res = await request(app)
      .post("/api/billing/checkout-config")
      .send({ kind: "pack", packId: "not-a-pack" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("unknown-pack");
  });

  it("requires an org name for a cohort purchase", async () => {
    currentUser = user();
    const res = await request(app).post("/api/billing/checkout-config").send({ kind: "cohort" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("org-name-required");
  });

  it("applies a valid promo server-side, from the stored row", async () => {
    currentUser = user();
    queryOne
      .mockResolvedValueOnce({
        code: "LAUNCH20",
        type: "percent",
        value: 20,
        active: true,
        applies_to: null,
        expires_at: null,
        max_redemptions: null,
        redeemed: 0,
      })
      .mockResolvedValueOnce({ id: "intent-1" });

    const res = await request(app)
      .post("/api/billing/checkout-config")
      .send({ kind: "pro", cadence: "annual", promo: "launch20" });

    expect(res.body.listAmount).toBe(34900);
    expect(res.body.amount).toBe(27920); // 20% off, computed by promo-core
    expect(res.body.promoApplied).toBe("LAUNCH20");
  });

  it("charges list price when the promo code does not exist", async () => {
    currentUser = user();
    queryOne
      .mockResolvedValueOnce(null) // no promo row
      .mockResolvedValueOnce({ id: "intent-1" });

    const res = await request(app)
      .post("/api/billing/checkout-config")
      .send({ kind: "pro", cadence: "annual", promo: "MADE-UP" });

    expect(res.body.amount).toBe(34900);
    expect(res.body.promoApplied).toBeNull();
  });

  it("charges list price for an inactive promo", async () => {
    currentUser = user();
    queryOne
      .mockResolvedValueOnce({
        code: "EXPIRED",
        type: "percent",
        value: 50,
        active: false,
        applies_to: null,
        expires_at: null,
        max_redemptions: null,
        redeemed: 0,
      })
      .mockResolvedValueOnce({ id: "intent-1" });

    const res = await request(app)
      .post("/api/billing/checkout-config")
      .send({ kind: "pro", cadence: "annual", promo: "EXPIRED" });

    expect(res.body.amount).toBe(34900);
    expect(res.body.promoApplied).toBeNull();
  });

  it("requires a session", async () => {
    const res = await request(app).post("/api/billing/checkout-config").send({ kind: "pro" });
    expect(res.status).toBe(401);
  });
});

describe("POST /confirm — fulfilment re-derives from the stored intent", () => {
  it("grants Pro and arms renewal when the payment matches", async () => {
    currentUser = user();
    stubMoyasar(payment());
    queryOne
      .mockResolvedValueOnce(intentRow()) // intentForPayment, by metadata
      .mockResolvedValueOnce({ id: "intent-1" }); // fulfil's pending → paid claim

    const res = await request(app).post("/api/billing/confirm").send({ id: "pay_1" });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ redirectTo: "/account?checkout=success" });
    expect(setEntitlement).toHaveBeenCalledWith("u1", expect.objectContaining({ plan: "pro" }));
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO subscriptions"),
      expect.arrayContaining(["u1", "annual", "card_tok"]),
    );
  });

  it("refuses to fulfil when the paid amount does not match the intent", async () => {
    // The anti-tamper cross-check: the browser could have altered the widget's
    // amount, so the stored intent decides what was owed.
    currentUser = user();
    stubMoyasar(payment({ amount: 100 }));
    queryOne.mockResolvedValueOnce(intentRow());

    const res = await request(app).post("/api/billing/confirm").send({ id: "pay_1" });

    expect(res.body).toEqual({ redirectTo: "/pricing?checkout=cancel" });
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("refuses to fulfil when the currency does not match", async () => {
    currentUser = user();
    stubMoyasar(payment({ currency: "USD" }));
    queryOne.mockResolvedValueOnce(intentRow());

    const res = await request(app).post("/api/billing/confirm").send({ id: "pay_1" });

    expect(res.body.redirectTo).toContain("checkout=cancel");
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("refuses to fulfil an unpaid payment", async () => {
    currentUser = user();
    stubMoyasar(payment({ status: "failed" }));
    queryOne.mockResolvedValueOnce(intentRow());

    const res = await request(app).post("/api/billing/confirm").send({ id: "pay_1" });

    expect(res.body.redirectTo).toContain("checkout=cancel");
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("will not let one account confirm another's checkout", async () => {
    currentUser = user({ uid: "attacker" });
    stubMoyasar(payment());
    queryOne.mockResolvedValueOnce(intentRow({ user_id: "victim" }));

    const res = await request(app).post("/api/billing/confirm").send({ id: "pay_1" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("unknown-checkout");
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("404s when no intent matches the payment", async () => {
    currentUser = user();
    stubMoyasar(payment());
    queryOne.mockResolvedValue(null);

    const res = await request(app).post("/api/billing/confirm").send({ id: "pay_1" });

    expect(res.status).toBe(404);
  });

  it("requires a payment id", async () => {
    currentUser = user();
    const res = await request(app).post("/api/billing/confirm").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("payment-id-required");
  });

  it("is idempotent — a replay that loses the status race grants nothing twice", async () => {
    currentUser = user();
    stubMoyasar(payment());
    queryOne
      .mockResolvedValueOnce(intentRow())
      .mockResolvedValueOnce(null); // pending → paid claim already taken

    const res = await request(app).post("/api/billing/confirm").send({ id: "pay_1" });

    expect(res.body.redirectTo).toBe("/account?checkout=success");
    expect(setEntitlement).not.toHaveBeenCalled();
    expect(addChatCredits).not.toHaveBeenCalled();
  });

  it("surfaces a Moyasar outage as 502 rather than granting anything", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    currentUser = user();
    stubMoyasar({ message: "upstream down" }, false, 500);

    const res = await request(app).post("/api/billing/confirm").send({ id: "pay_1" });

    expect(res.status).toBe(502);
    expect(res.body.error).toBe("billing-upstream");
    expect(setEntitlement).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("fulfilment delivers what was bought", () => {
  /** Drive a successful confirm for an intent of the given shape. */
  async function fulfilIntent(over: Record<string, unknown>, pay: Record<string, unknown> = {}) {
    currentUser = user();
    stubMoyasar(payment(pay));
    queryOne.mockResolvedValueOnce(intentRow(over)).mockResolvedValueOnce({ id: "intent-1" });
    return request(app).post("/api/billing/confirm").send({ id: "pay_1" });
  }

  it("credits a credit-pack purchase instead of touching the entitlement", async () => {
    await fulfilIntent({ kind: "credits", cadence: null, amount: 1900 }, { amount: 1900 });
    expect(addChatCredits).toHaveBeenCalledWith("u1", expect.any(Number));
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("grants a single pack and redirects to it", async () => {
    const packId = SELLABLE_PACK_IDS[0];
    const res = await fulfilIntent(
      { kind: "pack", cadence: null, pack_id: packId, amount: 5900 },
      { amount: 5900 },
    );
    expect(grantPacks).toHaveBeenCalledWith("u1", [packId]);
    expect(res.body.redirectTo).toBe(`/study/packs/${packId}?checkout=success`);
  });

  it("grants every sellable pack for the bundle", async () => {
    const res = await fulfilIntent({ kind: "bundle", cadence: null, amount: 19900 }, { amount: 19900 });
    expect(grantPacks).toHaveBeenCalledWith("u1", SELLABLE_PACK_IDS);
    expect(res.body.redirectTo).toBe("/study/packs?checkout=success");
  });

  it("provisions an org for a cohort purchase", async () => {
    queryOne.mockReset();
    currentUser = user();
    stubMoyasar(payment({ amount: 499900 }));
    queryOne
      .mockResolvedValueOnce(intentRow({ kind: "cohort", cadence: null, org_name: "Riyadh Wings", amount: 499900 }))
      .mockResolvedValueOnce({ id: "intent-1" })
      .mockResolvedValueOnce({ id: "org-1" });

    const res = await request(app).post("/api/billing/confirm").send({ id: "pay_1" });

    expect(queryOne).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO orgs"),
      expect.arrayContaining(["Riyadh Wings", "u1"]),
    );
    expect(res.body.redirectTo).toBe("/business/admin?checkout=success");
  });

  it("counts the promo redemption once fulfilled", async () => {
    await fulfilIntent({ promo_code: "LAUNCH20" });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE promo_codes"), ["LAUNCH20"]);
  });

  it("pays both sides of a referral on first conversion", async () => {
    findReferralOwner.mockResolvedValue({ user_id: "referrer" });
    await fulfilIntent({ ref_code: "ABC123" });
    expect(addChatCredits).toHaveBeenCalledWith("referrer", expect.any(Number));
    expect(addChatCredits).toHaveBeenCalledWith("u1", expect.any(Number));
  });

  it("pays nothing when the referral code resolves to the buyer", async () => {
    findReferralOwner.mockResolvedValue({ user_id: "u1" });
    await fulfilIntent({ ref_code: "SELFREF" });
    expect(addChatCredits).not.toHaveBeenCalled();
  });

  it("pays nothing on a repeat conversion", async () => {
    findReferralOwner.mockResolvedValue({ user_id: "referrer" });
    recordReferralConversion.mockResolvedValue(false); // the one-time lock held
    await fulfilIntent({ ref_code: "ABC123" });
    expect(addChatCredits).not.toHaveBeenCalled();
  });

  it("records the settled payment for reconciliation", async () => {
    await fulfilIntent({});
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO payments"),
      expect.arrayContaining(["pay_1", "u1"]),
    );
  });
});

describe("POST /webhook/moyasar — the signature is the only gate", () => {
  /** POST a signed (or deliberately mis-signed) webhook body. */
  function post(body: unknown, signature?: string) {
    const raw = JSON.stringify(body);
    const req = request(app)
      .post("/api/billing/webhook/moyasar")
      .set("Content-Type", "application/json");
    if (signature !== undefined) req.set("x-moyasar-signature", signature);
    return req.send(raw);
  }

  it("fulfils a correctly signed notification", async () => {
    const body = { id: "evt_1", data: { id: "pay_1" } };
    stubMoyasar(payment());
    queryOne.mockResolvedValueOnce(intentRow()).mockResolvedValueOnce({ id: "intent-1" });

    const res = await post(body, sign(JSON.stringify(body)));

    expect(res.status).toBe(200);
    expect(setEntitlement).toHaveBeenCalledWith("u1", expect.objectContaining({ plan: "pro" }));
  });

  it("releases the claim when delivery fails, so the retry can re-deliver", async () => {
    // The claim commits on its own connection, so a throw from deliver() used to
    // leave the intent `paid` with nothing granted — permanently. The next retry
    // would fail the status guard and answer 200, so the customer stayed charged
    // with no product and nothing surfaced anywhere.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const body = { id: "evt_1", data: { id: "pay_1" } };
    stubMoyasar(payment());
    queryOne.mockResolvedValueOnce(intentRow()).mockResolvedValueOnce({ id: "intent-1" });
    setEntitlement.mockRejectedValueOnce(new Error("connection terminated"));

    const res = await post(body, sign(JSON.stringify(body)));

    expect(res.status).toBe(500);
    const release = query.mock.calls.find(([sql]) =>
      /UPDATE checkout_intents/.test(String(sql)) && /'pending'/.test(String(sql)),
    );
    expect(release, "the intent must be released back to pending").toBeDefined();
    // Guarded so a release cannot clobber an intent some other caller has since
    // legitimately fulfilled.
    expect(String(release?.[0])).toMatch(/status = 'paid'/);
    expect(release?.[1]).toEqual(["intent-1"]);
    spy.mockRestore();
  });

  it("keeps the delivery when only the bookkeeping fails", async () => {
    // The mirror case. Past deliver() the customer HAS their product, so releasing
    // would re-deliver on retry — double credits, a second org. A counter that did
    // not increment is a reconciliation problem, not the customer's problem.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const body = { id: "evt_1", data: { id: "pay_1" } };
    stubMoyasar(payment({ amount: 1900 }));
    // A `credits` intent so delivery goes through addChatCredits (a store mock) and
    // touches `query` not at all — every query() call below therefore belongs to the
    // bookkeeping that runs after the product is delivered.
    queryOne
      .mockResolvedValueOnce(intentRow({ kind: "credits", cadence: null, amount: 1900 }))
      .mockResolvedValueOnce({ id: "intent-1" });
    query.mockRejectedValue(new Error("insert failed"));

    const res = await post(body, sign(JSON.stringify(body)));

    expect(res.status).toBe(200);
    expect(addChatCredits).toHaveBeenCalled();
    const release = query.mock.calls.find(([sql]) =>
      /UPDATE checkout_intents/.test(String(sql)) && /'pending'/.test(String(sql)),
    );
    expect(release, "a delivered order must not be released").toBeUndefined();
    spy.mockRestore();
  });

  it("rejects a forged notification before touching the database", async () => {
    const body = { id: "evt_1", data: { id: "pay_1" } };

    const res = await post(body, "deadbeef");

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("bad-signature");
    expect(queryOne).not.toHaveBeenCalled();
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("rejects a notification with no signature at all", async () => {
    const res = await post({ id: "evt_1", data: { id: "pay_1" } });
    expect(res.status).toBe(401);
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("rejects a signature computed over different bytes", async () => {
    // The hook signs the exact bytes received, so a body swapped after signing fails.
    const res = await post({ id: "evt_1", data: { id: "pay_2" } }, sign(JSON.stringify({ id: "evt_1" })));
    expect(res.status).toBe(401);
  });

  it("acknowledges a signed notification carrying no payment id", async () => {
    // `webhookPaymentId` reads `data.id` then falls back to the envelope's own
    // `id`, so "no payment id" means neither is present.
    const body = {};
    const res = await post(body, sign(JSON.stringify(body)));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("falls back to the envelope id when the notification has no data.id", async () => {
    const body = { id: "pay_1" };
    stubMoyasar(payment());
    queryOne.mockResolvedValueOnce(intentRow()).mockResolvedValueOnce({ id: "intent-1" });

    const res = await post(body, sign(JSON.stringify(body)));

    expect(res.status).toBe(200);
    expect(setEntitlement).toHaveBeenCalledWith("u1", expect.objectContaining({ plan: "pro" }));
  });

  it("acknowledges but does not fulfil an unpaid payment", async () => {
    const body = { id: "evt_1", data: { id: "pay_1" } };
    stubMoyasar(payment({ status: "failed" }));

    const res = await post(body, sign(JSON.stringify(body)));

    expect(res.status).toBe(200);
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("does not fulfil when the payment fails the amount cross-check", async () => {
    const body = { id: "evt_1", data: { id: "pay_1" } };
    stubMoyasar(payment({ amount: 1 }));
    queryOne.mockResolvedValueOnce(intentRow());

    const res = await post(body, sign(JSON.stringify(body)));

    expect(res.status).toBe(200);
    expect(setEntitlement).not.toHaveBeenCalled();
  });
});

describe("POST /cancel-auto-renew", () => {
  it("stops the recharge without revoking the paid-for period", async () => {
    currentUser = user();
    const res = await request(app).post("/api/billing/cancel-auto-renew");

    expect(res.body).toEqual({ ok: true });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("auto_renew = false"), ["u1"]);
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("requires a session", async () => {
    const res = await request(app).post("/api/billing/cancel-auto-renew");
    expect(res.status).toBe(401);
  });
});

describe("POST /renew — the Cloud Scheduler job", () => {
  it("rejects a request without the cron secret", async () => {
    const res = await request(app).post("/api/billing/renew");
    expect(res.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("rejects a wrong cron secret", async () => {
    const res = await request(app).post("/api/billing/renew").set("X-Cron-Secret", "guess");
    expect(res.status).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("needs no session — it is machine-to-machine", async () => {
    currentUser = null;
    query.mockResolvedValue([]);

    const res = await request(app).post("/api/billing/renew").set("X-Cron-Secret", CRON_SECRET);

    expect(res.status).toBe(200);
  });

  it("extends the entitlement when the saved card charges successfully", async () => {
    query.mockResolvedValueOnce([
      { user_id: "u1", cadence: "monthly", card_token: "card_tok", failure_count: 0 },
    ]);
    queryOne.mockResolvedValueOnce({ user_id: "u1" }); // wins the claim
    getEntitlement.mockResolvedValue({
      plan: "pro",
      source: "moyasar",
      expiresAt: "2026-09-01T00:00:00.000Z",
    });
    stubMoyasar(payment({ status: "paid", amount: 3900 }));

    const res = await request(app).post("/api/billing/renew").set("X-Cron-Secret", CRON_SECRET);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ renewed: 1 });
    expect(setEntitlement).toHaveBeenCalledWith("u1", expect.objectContaining({ plan: "pro" }));
  });

  it("does not extend the entitlement when the charge fails", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    query.mockResolvedValueOnce([
      { user_id: "u1", cadence: "monthly", card_token: "card_tok", failure_count: 0 },
    ]);
    queryOne.mockResolvedValueOnce({ user_id: "u1" }); // wins the claim
    getEntitlement.mockResolvedValue({
      plan: "pro",
      source: "moyasar",
      expiresAt: "2026-09-01T00:00:00.000Z",
    });
    stubMoyasar({ message: "card declined" }, false, 402);

    const res = await request(app).post("/api/billing/renew").set("X-Cron-Secret", CRON_SECRET);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ failed: 1 });
    expect(setEntitlement).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("does not charge a card another invocation already claimed", async () => {
    // The due-set select takes no lock, so two overlapping runs read the same
    // rows. Cloud Scheduler's 180s attempt deadline is shorter than a 200-card
    // sequential sweep and it retries on timeout, so overlap is the expected case.
    // Losing the compare-and-swap must mean skipping, not charging again.
    query.mockResolvedValueOnce([
      { user_id: "u1", cadence: "monthly", card_token: "card_tok", failure_count: 0 },
    ]);
    queryOne.mockResolvedValueOnce(null); // another invocation got there first
    stubMoyasar(payment({ status: "paid", amount: 3900 }));

    const res = await request(app).post("/api/billing/renew").set("X-Cron-Secret", CRON_SECRET);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ renewed: 0, failed: 0, skipped: 1 });
    // The point of the claim: no card is touched when the CAS is lost.
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(setEntitlement).not.toHaveBeenCalled();
  });

  it("claims a subscription before charging it, never after", async () => {
    query.mockResolvedValueOnce([
      { user_id: "u1", cadence: "monthly", card_token: "card_tok", failure_count: 0 },
    ]);
    queryOne.mockResolvedValueOnce({ user_id: "u1" });
    stubMoyasar(payment({ status: "paid", amount: 3900 }));

    await request(app).post("/api/billing/renew").set("X-Cron-Secret", CRON_SECRET);

    // The claim is a conditional UPDATE — it must re-assert every predicate from
    // the due-set select, or it would claim a row that is no longer eligible.
    const claim = queryOne.mock.calls[0][0] as string;
    expect(claim).toMatch(/UPDATE subscriptions/);
    expect(claim).toMatch(/SET next_renewal_at/);
    expect(claim).toMatch(/next_renewal_at <= now\(\)/);
    expect(claim).toMatch(/auto_renew/);
    expect(claim).toMatch(/card_token IS NOT NULL/);
    expect(claim).toMatch(/RETURNING/);
  });

  it("never downgrades a school or staff grant it is renewing under", async () => {
    // A user who bought Pro and later received a non-expiring staff/school grant
    // still has auto_renew on with a saved card. A flat write would replace
    // `school` with an expiring `pro` — destroying the grant and its audit trail,
    // and charging them for it.
    query.mockResolvedValueOnce([
      { user_id: "u1", cadence: "monthly", card_token: "card_tok", failure_count: 0 },
    ]);
    queryOne.mockResolvedValueOnce({ user_id: "u1" });
    getEntitlement.mockResolvedValue({ plan: "school", source: "staff" });
    stubMoyasar(payment({ status: "paid", amount: 3900 }));

    await request(app).post("/api/billing/renew").set("X-Cron-Secret", CRON_SECRET);

    expect(setEntitlement).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({ plan: "school", source: "staff" }),
    );
  });
});

describe("GET /referral-code", () => {
  it("returns the account's stable code", async () => {
    currentUser = user();
    ensureReferralCode.mockResolvedValue("FLY-ABC123");

    const res = await request(app).get("/api/billing/referral-code");

    expect(res.body).toEqual({ code: "FLY-ABC123" });
  });

  it("requires a session", async () => {
    const res = await request(app).get("/api/billing/referral-code");
    expect(res.status).toBe(401);
  });
});
