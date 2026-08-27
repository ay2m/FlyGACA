---
name: express-security-patterns
description: The security procedure for server/ — where a rule may live, how entitlement stays server-owned, session cookie and rate-limit shape, and what must never reach a client. Use when adding or changing an API route, an auth or billing path, or anything that decides what a user is allowed to do.
---

# Adding a route to server/ without opening a hole

Role context — what `server/` is and how it is wired — belongs to the
`express-api` agent. This is the procedure.

`server/` is **its own npm package with its own CI gate**. The root
`npm run verify` does not cover it. Run `npm run lint && npm test &&
npm run build` **inside `server/`** for anything you touch here.

## Where a rule is allowed to live

Business rules go in a pure, dependency-free `*-core.ts` module —
`billing-core`, `chat-quota-core`, `rate-limit-core`, `staff-core`,
`school-core`, `student-core`, `org-core`, `referral-core`, `feedback-core`,
`api-key-core`, `api-tier-core`, `founding-core`, `promo-core`, `auth-core`,
`csrf-core`, `gateway-core`, `grounding-core`, `model-core`,
`remote-brain-core`, `analytics-core`.

Everything else is plumbing: Express wrappers (`gateway.ts`,
`routes/{auth,account,grants,billing,org}.ts`) stay thin, **all SQL lives in
`store.ts`**, `db.ts` owns the pool, `session.ts` owns the JWT-cookie and
scrypt-password primitives. A rule written inline in a route handler is not
unit-testable and will not be reviewed as correct.

`server/src/index.ts` is the single manifest of the HTTP surface. Keep every new
API surface under `/api/*` — the CDN mirrors proxy that prefix as a same-origin
rewrite, which is the only reason the strict CSP can stay `connect-src 'self'`.
A new surface on another prefix silently forces a CSP relaxation.

## Invariants

- **Entitlement is server-owned.** The `entitlements` table is written **only**
  by `routes/billing.ts` (checkout-config → confirm → webhook → renewal job) and
  `routes/grants.ts` (staff · school-seat · founding). There must be no route
  that lets a client write its own plan, credits or pack ownership. Grants only
  ever upgrade (`mergeUpward`), so a grant can never clobber a paid plan.
- **A verified email is the ownership proof.** A domain / staff / student match
  is honoured only for a verified email.
- **Fulfilment re-derives.** The client passes a promo *code string*, never a
  price. Kind and amount come from the stored `checkout_intents` row, never from
  the callback URL; codes are validated server-side against `promo_codes` and
  apply to the first charge only.
- **Client mirrors must match their core.** `src/calc/chat/chatQuota.ts`,
  `src/lib/services/entitlements.ts` and `src/lib/services/features.ts` mirror
  server cores, and `tests/client-server-mirrors.test.ts` imports straight out
  of `server/src/`. Change a core → run the **root** test suite as well.

## The primitives already in place — use them, don't re-roll them

- `helmet()` is applied in `index.ts`. Do not hand-set headers it already owns.
- `express-rate-limit` is configured in `gateway.ts`. New auth-adjacent or
  spend-adjacent endpoints belong behind it, with the policy itself in
  `rate-limit-core.ts`.
- Session cookies from `session.ts` are `httpOnly: true`, and `sameSite` is
  `"none"` only when the request is cross-site **and** `config.isProduction`;
  otherwise `"lax"`. Never move a token into `localStorage` or a URL.

## What must never reach a client

Generic errors only — no stack traces, SQL text, schema details or file paths.
Never echo learner or account PII into a log line that accompanies a model call.

## Residency, stated honestly

Personal data (accounts, logbooks, payments, the database) is *intended* for
`me-central2`. The generation hop carries no account identity — only the
question and the retrieved passages. **Nothing is deployed to `me-central2`
today**, and `captain-adel.ts` calls the global Gemini Developer API. Do not
write code, comments, copy or docs asserting in-Kingdom processing as current
fact.

## Before you hand back

`cd server && npm run lint && npm test && npm run build`, plus the root
`npm test` if you touched a core with a client mirror. Say which gates ran.
