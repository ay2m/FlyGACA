# Billing (Moyasar) — setup & verification

> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

The app sells **Pro** (auto-renewing), a discounted **student** rate, the **Exam Season Pass** and
**exam-prep packs** (one-time), and Captain Adel **credit packs** (one-time) via Moyasar's hosted
checkout widget (web) / RevenueCat IAP (native iOS). Unlike Stripe, Moyasar has no native
subscription object — Pro/student are "recurring" only because a saved card **token** is
re-charged by a scheduled function; see [Renewal engine](#renewal-engine-no-native-subscriptions)
below. The web flow and the backend functions live in this repo; the entitlement / pack ownership
is granted server-side and read-only on the client.

## Seller of record & VAT

- **Seller of record (web checkout):** BDA Company International (شركة بدع الدولية) — a Saudi
  limited-liability company, CR 7030976893, VAT 311415259500003, Riyadh 12965, Saudi Arabia.
  Moyasar is the payment processor only, never the merchant. (On native iOS, Apple is the seller
  of record via the App Store / RevenueCat.)
- **Prices are VAT-inclusive** for consumer plans (the pricing page shows `incl. 15% VAT`,
  `pricing.vatIncl`); school/seat invoices are VAT-exclusive (`pricing.vatExcl`) and VAT is added
  on the invoice.
- **Tax invoices (ZATCA):** the company is VAT-registered with quarterly returns. Receipts/tax
  invoices must carry the seller's Arabic legal name, VAT number, CR number and a QR code for
  simplified invoices — see the Fatoora/e-invoicing pack and
  `invoicing-and-vat-returns` doc in the internal Offfice repo for the operating procedure.
  Bank/settlement details live in internal finance docs only — never in this repo or the app.

## Pieces

- **Frontend**:
  - `src/lib/services/billing.ts` — `startProCheckout(plan)` / `startPackCheckout(packId)` /
    `startBundleCheckout()` / `startCohortCheckout(orgName)` navigate to the in-app `/checkout` route
    (no network call yet); `cancelAutoRenew()` calls the
    callable of the same name. `effectivePlan(entitlement)` gates UI; `refreshAccount()` re-reads
    the entitlement after checkout returns.
  - `src/pages/checkout/Checkout.tsx` — the checkout surface itself, handling BOTH legs of a
    purchase:
    - **Start** (`?kind=pro|student|pass|credits|pack|bundle|cohort&...`): calls `createCheckoutConfig` to price
      the checkout server-side, then mounts Moyasar's hosted JS widget
      (`cdn.moyasar.com/mpf/…/moyasar.{js,css}`). Card/mada/Apple Pay/STC Pay data goes straight
      from the browser to Moyasar — it never touches this app's servers (PCI SAQ‑A scope).
    - **Return** (`?id=<payment_id>`, appended by Moyasar to `callback_url`): calls `confirmPayment`
      to fetch + verify the payment server-to-server and fulfil it, then navigates to wherever that
      purchase belongs.
- **Backend** (`functions/src/billing.ts`, pure logic in `functions/src/billing-core.ts`):
  - `createCheckoutConfig` (callable) — validates the checkout (student email verification, pack-id
    validation), computes the halalas amount from the configured SAR price table, and persists a
    server-trusted `checkoutIntents/{id}` record the browser can't tamper with (the browser only
    ever sees an opaque `checkoutId` in the widget's `metadata`).
  - `confirmPayment` (callable) — the PRIMARY, trusted fulfilment path. Fetches the payment by id
    with the secret key, cross-checks its amount/currency/uid against the stored `checkoutIntent`
    (not the payment's own metadata, which the browser could have altered before submitting to
    Moyasar), then grants.
  - `moyasarWebhook` (HTTP, `/api/moyasar-webhook` — **the Cloud Run route is
    `/api/billing/webhook/moyasar`**; the old path was a Firebase Hosting rewrite that no longer
    exists) — an async backstop for the same fulfilment
    path (`fulfillPayment`, shared with `confirmPayment`). A `moyasarPayments/{id}` idempotency
    marker means whichever of the two lands first does the actual grant.
  - `cancelAutoRenew` (callable) — turns off the renewal engine for a subscriber; the plan stays
    active until its already-granted `expiresAt`.
  - `renewMoyasarSubscriptions` (scheduled, daily) — the renewal engine; see below.
  - `users/{uid}.entitlement` is written ONLY here (`writeEntitlement`, bypassing `firestore.rules`
    via the Admin SDK) — derived by `billing-core.ts`'s pure functions from a paid checkout/renewal.
    Same for the pass grant, `chatCredits/{uid}` and `packEntitlements/{uid}` (pack ownership).
- **Exam-prep packs**: priced by band — `PRICE_PREP_PACK_ESSENTIAL` / `_STANDARD` / `_COMPLETE`,
  assigned per pack id by `PACK_TIERS`; the bought pack rides on the checkout
  intent's `packId`, validated server-side against `SELLABLE_PACK_IDS` in
  `functions/src/billing-core.ts` (which mirrors the paid + live packs in `src/lib/prepCatalog.ts`).
  Ownership is written to `packEntitlements/{uid}` (server-only write, owner-readable — same shape as
  `chatCredits`).
- **All-Access Exam Bundle** (`kind: 'bundle'`, `PRICE_BUNDLE`): one payment writes
  ownership of **every** sellable pack into `packEntitlements/{uid}` in a single grant, so the
  storefront's per-pack `ownsPack`/`hasPackAccess` gates all light up with no extra plumbing.
- **B2B self-serve Cohort** (`kind: 'cohort'`, `PRICE_COHORT`): the self-serve slice of
  the Starter tier in `docs/b2b/PLAN.md` §5 — one payment creates an `orgs/{orgId}` doc
  (`org-core.buildCohortOrg`) with the buyer as sole owner, `seatLimit: 25` and a 90-day informational
  `expiresAt`. The buyer lands on `/business/admin?checkout=success` and can invite seats immediately
  via the existing `provisionSeats` callable — no ops-script (`grant-org.mjs`) step needed for this
  tier. Academy/Institution stay invoice-only (`/schools`'s contact form). The checkout requires a
  non-blank `orgName` (`createCheckoutConfig` throws `org-name-required` otherwise); the name is
  display-only and never affects price or fulfilment.
- **Collections** (all server-only; deny-all in `firestore.rules`):
  - `checkoutIntents/{id}` — the price/kind/uid a payment must match, written by
    `createCheckoutConfig`, read by `fulfillPayment`.
  - `moyasarPayments/{id}` — payment-id idempotency markers (parity with the old `stripeEvents`).
  - `moyasarCustomers/{uid}` — the saved card token (`save_card` on a `pro`/`student` checkout),
    used by the renewal engine to charge off-session.
  - `subscriptions/{uid}` — auto-renew state: `cadence`, `autoRenew`, `status`
    (`active`/`past_due`/`canceled`), `failedAttempts`, `nextChargeAt`.
  - `promoCodes/{code}` — a discount code + its `redeemed` counter (see below).
  - `foundingGrants/{uid}` — one-time markers for the founding grandfather grant.

## Promo codes (launch discounts)

`createCheckoutConfig` applies a discount server-side (the client only passes the `?promo=` code;
it never prices its own checkout). The policy is the pure `functions/src/promo-core.ts` (`applyPromo`
/ `isPromoApplicable`), the doc is `promoCodes/{code}`:

```
promoCodes/LAUNCH25 = {
  type: "percent",           // or "fixed" (value = halalas off)
  value: 25,                 // percent 0–100, or halalas for fixed
  active: true,              // a code is OFF unless active === true
  appliesTo: ["pro","bundle"], // optional; omit = every checkout kind
  expiresAt: "2026-12-31T00:00:00Z", // optional
  maxRedemptions: 500,       // optional cap; redeemed increments on each paid grant
  redeemed: 0
}
```

The discount hits the **initial** charge only (the renewal engine charges the full list price), is
clamped to `MIN_CHARGE_HALALAS` (SAR 1), and the applied code + saving are echoed in the checkout
config so `/checkout` can confirm it. Codes are created out-of-band (Admin SDK / console) — deny-all
to clients.

## Founding access (grandfather grant)

`claimFoundingAccess` (`functions/src/founding.ts`) grants a pre-launch account a complimentary,
time-limited **Pro** window (`FOUNDING_GRANT_DAYS`, default 180) when monetization is turned on.
Eligibility = the account's Firebase Auth `creationTime` predates `FOUNDING_CUTOFF_ISO` — a
server-only signal, so it can't be spoofed. The app calls it on sign-in for a verified, still-free
user (mirrors `claimSchoolSeat`); it's upgrade-only and one grant per account (the
`foundingGrants/{uid}` marker is the lock). Policy lives in the pure `founding-core.ts`.

## Renewal engine (no native subscriptions)

Moyasar's core API is payments + invoices + card tokenization — there's no Stripe-style
subscription object with automatic recurring billing. So a `pro`/`student` checkout requests
`save_card: true` (cards/mada only — Apple Pay and STC Pay tokens are single-use and can't be
recharged, so recurring checkouts only ever offer `methods: ['creditcard']`); on a successful
payment the returned card token is stored in `moyasarCustomers/{uid}` and a `subscriptions/{uid}`
doc opens with `nextChargeAt` set `RENEWAL_LEAD_DAYS` (3) days before `expiresAt`.

`renewMoyasarSubscriptions` runs once a day (`onSchedule('every 24 hours')`) and, for every due
subscriber:

1. Charges the saved token for the configured cadence price (`source: { type: 'token', token }`).
2. On success: extends `entitlement.expiresAt` by one cadence period **from the current expiry**
   (not from the charge date, so an early recharge never shaves off paid-for time —
   `extendExpiry`/`cadenceDays` in `billing-core.ts`), and rolls `nextChargeAt` forward.
3. On failure: increments `failedAttempts` and retries on tomorrow's run; after
   `MAX_RENEWAL_ATTEMPTS` (3) consecutive failures, auto-renew gives up (`status: 'canceled'`) and
   the plan simply lapses to `free` at its already-set `expiresAt` — same end state as a lapsed
   Stripe subscription, just without Stripe's dunning emails (there is no dunning UX here yet).

There is no hosted billing portal to "manage" a subscription — `cancelAutoRenew` (surfaced as
**Turn off auto-renew** in the account page's Subscription panel) is the entire self-service
surface; updating a card means running the `pro`/`student` checkout again, which overwrites the
stored token.

## Configure (Moyasar dashboard + Firebase project)

**0. Create a Moyasar account** (sandbox first) at [moyasar.com](https://moyasar.com) and grab the
**Secret key** (`sk_test_…` / `sk_live_…`) and **Publishable key** (`pk_test_…` / `pk_live_…`) from
the dashboard's API keys page.

Secrets (Secret Manager — server-only, never shipped to the client):

```
firebase functions:secrets:set MOYASAR_SECRET_KEY     # sk_live_… / sk_test_…
firebase functions:secrets:set MOYASAR_WEBHOOK_SECRET  # the shared_secret you set when creating the webhook below
```

Params (set in `.env.<project>` for functions, or via the deploy prompt) — **SAR list prices**
(major units, e.g. `"79"` or `"649.00"`), the authoritative source `createCheckoutConfig` derives
the halalas amount from. Keep these in sync with the indicative figures shown on `/pricing`
(`src/pages/pricing/Pricing.tsx`) and the pack constants in `src/lib/prepCatalog.ts` — there is no
shared build-time constant across the client/server boundary, so a price change is a two-file edit:

> ⚠️ **The variable names in this section were wrong until recently.** They carried the
> Firebase-era `MOYASAR_PRICE_*_SAR` shape, which `server/src/prices.ts` does not read — so an
> operator who configured what this file said would set ten variables the server ignores, and
> **every checkout would throw `invalid-price`** with the prices apparently set. The names below
> match the code. `.env.example` and `docs/RUNBOOK-deploy.md` are the other two places these
> appear; they were already correct.

```
PRICE_PRO_MONTHLY=79
PRICE_PRO_ANNUAL=649           # list; run a lower founding value for the launch if you want
PRICE_PASS=299                 # one-time Exam Season Pass (→ 90 days pro)
PRICE_CREDITS=39               # one-time Captain Adel credit pack (→ +50 credits). MUST be set
                               # to a positive value or the credits checkout throws invalid-price
                               # (sarToHalalas) — it is shown nowhere pre-checkout
PRICE_PREP_PACK=249            # legacy flat exam-prep pack price — the fallback used only when
                               # the matching band below is unset
PRICE_PREP_PACK_ESSENTIAL=249  # a focused bank: conversion, medical, aip
PRICE_PREP_PACK_STANDARD=399   # a full topic spread: elp, atpl, ir
PRICE_PREP_PACK_COMPLETE=499   # the deepest banks, with ground school: cpl, ppl-exam
PRICE_BUNDLE=1499              # All-Access Exam Bundle — one payment grants every pack
PRICE_COHORT=12000             # B2B self-serve Cohort — 25 seats, one 90-day intake
APP_ORIGIN=https://flygaca.com # used to build Moyasar's callback_url (must be absolute)
```

There is no `student` product — that kind was removed, so the two
`MOYASAR_PRICE_STUDENT_*` variables this file used to list corresponded to nothing.

Packs price by **band**, not by certificate-vs-subject: `amountForCheckout` reads the band from
`PACK_TIERS` in `server/src/billing-core.ts` (essential · standard · complete), and an unset band
falls back to `PRICE_PREP_PACK`. Note that fallback is load-bearing in an unhelpful way — leaving a
band empty silently collapses three price points into one rather than failing. B2C prices are env
vars, so raising Pro is a revision config change, not a code deploy.

To sell a pack that is `status: 'soon'` today, flip it to `'live'` in `src/lib/prepCatalog.ts`
**and** add its id to `SELLABLE_PACK_IDS` in `functions/src/billing-core.ts` (and, if it's a
licence pack, `CERTIFICATE_PACK_IDS`), then redeploy.

**Publishable key on the client** (public, non-secret — restricted to card charges, not a
capability to read data):

```
# local dev → .env.local
VITE_MOYASAR_PUBLISHABLE_KEY=pk_test_…
```

For **production**, don't rely on the `.env.example` placeholder — the deploy workflows no longer
copy `.env.example` at all. They inject every `VITE_*` from repo **Actions variables** and hard-fail
in a `Verify build env` step if a required one is empty. (They *did* copy it, until placeholder-ising
`.env.example` turned that into a silent outage: `isFirebaseConfigured()` is a truthiness check, so
`your-firebase-web-api-key` booted Firebase and then failed every Auth call with
`auth/api-key-not-valid`.) Set
`MOYASAR_PUBLISHABLE_KEY` = `pk_live_…` under *Settings → Secrets and variables → Actions →
Variables*; `deploy.yml`'s Build step injects it as `VITE_MOYASAR_PUBLISHABLE_KEY` (fails closed to
"billing-unavailable" if the variable is unset). It's public and rotatable, so it lives as a
variable, not a Secret-Manager secret (that's only `MOYASAR_SECRET_KEY` / `MOYASAR_WEBHOOK_SECRET`).

**1. Create the webhook** — Moyasar dashboard → *Webhooks* → add
`https://<host>/api/billing/webhook/moyasar`, subscribed to `payment_paid` (and, if you want faster
renewal-failure visibility, `payment_failed`). Set a `shared_secret` and copy it into
`MOYASAR_WEBHOOK_SECRET`.

Subscribing to every event type is safe: the handler ignores `payout_*` and
`balance_transferred` deliveries, whose ids are payout ids rather than payment ids and would
otherwise 404 the payment lookup and make Moyasar retry.

> ⚠️ **The URL changed with the Cloud Run rebuild.** The Firebase build served
> `/api/moyasar-webhook` via a `firebase.json` rewrite. That rewrite is gone: the Express route is
> mounted at `/api/billing` + `/webhook/moyasar`. A webhook still pointed at the old path 404s on
> every delivery, silently, leaving `/api/billing/confirm` as the only fulfilment path.

**How deliveries authenticate:** Moyasar posts the shared secret back as a **`secret_token` field
in the JSON body**. Newer Moyasar SDKs instead send an HMAC-SHA256 hex digest over the raw body in
an **`x-moyasar-signature`** header. `verifyMoyasarWebhook` in `server/src/billing-core.ts` accepts
either, constant-time, and fails closed when `MOYASAR_WEBHOOK_SECRET` is unset — so the endpoint
works whichever scheme your account is sent.

> This was wrong until 2026-08-13. The function previously implemented HMAC‑SHA256 over the raw
> body against an `x-moyasar-signature` header — an assumption made while `docs.moyasar.com` was
> unreachable — so **every genuine delivery was rejected with a 400 and the async backstop was
> silently inert**. The HMAC check is retained as a *provisional* fallback so the endpoint does
> not depend on the corrected reading being right a second time. Each accepted delivery logs
> `moyasar_webhook_authenticated` with the mechanism that matched (`secret_token` or `signature`);
> once real traffic shows only one branch firing, delete the other. A rejected delivery logs
> `moyasar_webhook_auth_failed` with the header and body **key names only** — never values,
> because `secret_token` is the shared secret in plaintext.

This layer is defense-in-depth: `confirmPayment` (the callable, which fetches the payment
server-to-server with the secret key) is the primary, trusted fulfilment path, so a rejection here
costs the backstop rather than correctness — purchases still fulfil on the redirect back through
`/checkout`. The backstop is what covers the buyer who closes the tab or loses connectivity
mid-redirect, so leaving it broken means a slow trickle of paid-but-ungranted accounts.

**2. Apple Pay** — **off by default.** `MOYASAR_APPLE_PAY` (a `defineBoolean` in `billing.ts`,
set to `false` in `functions/.env.flygaca-app`) keeps `applepay` out of the one-time-purchase
methods list until the steps below are done. Offering the method before the merchant domain is
registered renders a button that fails validation mid-payment, which is worse for the buyer than
not showing it. Work through 1–4, then flip the param to `true` and redeploy the functions:
   1. Moyasar dashboard → *Apple Pay* → add your domain (`flygaca.com`) and download the
      **Merchant Domain Association** file.
   2. Serve it, byte-for-byte, at
      `https://flygaca.com/.well-known/apple-developer-merchantid-domain-association` — **no file
      extension**. Since `public/` ships as-is into `dist/`, drop the downloaded file at
      `public/.well-known/apple-developer-merchantid-domain-association`.
   3. Back in the dashboard, click **Validate** (checks the file is reachable) then **Register**
      (asks Apple to verify + register the domain).
   4. You'll also need an Apple Developer account + Merchant ID linked in the dashboard — see
      Moyasar's *Apple Pay → Apple Developer Account* guide.

**3. STC Pay**: enabled per-account by Moyasar; no extra web integration work — the hosted widget's
`stcpay` method just works once it's turned on for your account.

> Region note: the billing callables, `moyasarWebhook` and `renewMoyasarSubscriptions` deploy to
> **me-central1** (the source of truth is `functions/src/region.ts`; the `/api/moyasar-webhook`
> rewrite in `firebase.json` and the client's `FUNCTIONS_REGION` in
> `src/lib/services/firebase.ts` must all match it). **History — none of that exists now:** the
> service is one Cloud Run deployment in `me-central2` with no per-function regions and no
> hosting rewrites. The chat gateway (`/api/chat`) is reached by
> the same-region hosting fetch — it does not use the callable region.

> CSP note: the hosted widget is cross-origin by design (the browser talks to Moyasar directly), so
> `connect-src`/`script-src`/`style-src`/`frame-src` in `firebase.json` allowlist `cdn.moyasar.com`
> and `api.moyasar.com` — the one deliberate exception to this app's otherwise same-origin-only CSP.

## Deploy

```
cd functions && npm install        # no extra SDK — a minimal fetch-based REST client
npm run deploy:functions           # firebase deploy --only functions
npm run deploy:rules               # firebase deploy --only firestore:rules
npm run deploy                     # build + deploy hosting (picks up the rewrite)
# …or all three at once:  npm run deploy:all
```

## App Check

`createCheckoutConfig` / `confirmPayment` / `cancelAutoRenew` **already declare
`enforceAppCheck: true`** in `functions/src/billing.ts`, and the client attaches an App Check token
when `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` is set (`src/lib/services/firebase.ts`). For checkout to
work in production you must therefore have App Check configured end-to-end:

1. Create a reCAPTCHA Enterprise key (Google Cloud console) and register it under Firebase → App Check.
2. Set `VITE_RECAPTCHA_ENTERPRISE_SITE_KEY` in the production build (GitHub Actions secret) and deploy the client.
3. Watch App Check request metrics; verified requests should dominate before you enforce at the
   project level. See `docs/APP-CHECK-BACKEND.md` for the enforcement rollout.

## Verify end-to-end (test mode)

1. Sign in on the web app → **/pricing** → *Go Pro* → lands on `/checkout`, mounts the widget →
   complete a payment with a [Moyasar test card](https://moyasar.com) (sandbox mode; test-mode
   cards are documented on the dashboard).
2. Moyasar redirects to `/checkout?id=<payment_id>&kind=pro&cadence=annual`; the page calls
   `confirmPayment` and redirects to `/account?checkout=success`. The **Subscription** panel flips
   to *Pro* with the renewal date.
3. Confirm `users/{uid}.entitlement` = `{ plan: 'pro', source: 'moyasar', expiresAt }` and
   `moyasarCustomers/{uid}.token` is set (the saved card) in Firestore.
4. **Turn off auto-renew** (Subscription panel) → `subscriptions/{uid}.autoRenew` flips to `false`;
   the plan stays Pro until `expiresAt`.
5. Idempotency: re-POST the same `payment_paid` webhook event (or call `confirmPayment` again with
   the same id) — must not double-grant. `moyasarPayments/{id}` acks the replay and the merge-write
   is a no-op.

### Exam-prep pack purchase

1. Sign in → **/study/packs** → open a paid pack (e.g. *Aviation medical*) → **Buy this pack** →
   lands on `/checkout` → complete a test-mode payment.
2. Redirects to `/checkout?id=…&kind=pack&packId=medical` → confirms → lands on
   `/study/packs/medical?checkout=success`; the pack unlocks (its content + the "Owned" badge
   appear).
3. Confirm `packEntitlements/{uid}` in Firestore = `{ packs: { medical: { purchasedAt, source:
   'moyasar' } } }`.
4. As a **Pro subscriber**, the same pack shows **Included in Pro** with no Buy button (access
   comes from the plan, not ownership).

### Renewal engine (manual test)

Since `renewMoyasarSubscriptions` runs on a schedule, exercise it directly for a fast feedback
loop: `firebase functions:shell` → `renewMoyasarSubscriptions()` (or trigger it via the Cloud
Scheduler console) against a test project with a `subscriptions/{uid}` doc whose `nextChargeAt` is
in the past and a real `moyasarCustomers/{uid}.token` from a prior test-mode `save_card` checkout.
Confirm a successful charge extends `expiresAt` and rolls `nextChargeAt` forward, and that
exhausting `MAX_RENEWAL_ATTEMPTS` (simulate with an expired/invalid token) flips `subscriptions/
{uid}.status` to `'canceled'` without touching `entitlement` (it just lapses naturally).

## Tests

`cd functions && npm test` runs the pure `billing-core` unit tests (SAR→halalas pricing,
cadence/renewal math, webhook authentication, entitlement derivation) and the `moyasarWebhook`
wiring tests (auth check, idempotency, fulfilment-by-kind, the amount/currency cross-check
against the stored `checkoutIntent`). `createCheckoutConfig`/`confirmPayment`/`cancelAutoRenew`
(thin `onCall` wrappers over the same tested logic) and the live Moyasar flow can only be
exercised against a configured project (not in CI / the sandbox) — see the checklists above.
