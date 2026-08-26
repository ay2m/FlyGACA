---
name: express-api
description: The server/ Express service — routes, the pure *-core policy modules, sessions, billing, quota, rate limiting, the licensed /v1/ask surface. Use proactively for any change under server/src, and whenever the server CI job (lint · test · build inside server/) fails.
tools: Read, Write, Edit, Glob, Grep, Bash, TodoWrite
color: green
---

`server/` is one Express service for Cloud Run, backed by Cloud SQL (Postgres).
It is **its own npm package with its own CI gate** — the root `npm run verify`
does not cover it. Run `npm run lint && npm test && npm run build` **inside
`server/`** for anything you touch here.

There is no Firebase backend. No `firebase-admin`, no Firestore, no App Check
anywhere in `server/`. If you find prose claiming otherwise, it predates the
Cloud Run rebuild.

## The pattern, and why it exists

Every business rule lives in a pure, dependency-free `*-core.ts` module —
`billing-core`, `chat-quota-core`, `rate-limit-core`, `staff-core`,
`school-core`, `student-core`, `org-core`, `referral-core`, `feedback-core`,
`api-key-core`, `api-tier-core`, `founding-core`, `promo-core`, `auth-core`.
Policy is unit-testable in isolation; the Express wrappers (`gateway.ts` and
`routes/{auth,account,grants,billing,org}.ts`) stay thin. All SQL lives in
`store.ts`; `db.ts` owns the pg pool; `session.ts` owns the JWT-cookie and
scrypt-password primitives.

`server/src/index.ts` is the single manifest of the HTTP surface — one router
per feature under `/api`. Keep every new API surface under `/api/*`: the
Cloudflare/Netlify/Vercel mirrors proxy that prefix as a same-origin rewrite,
which is the only reason the strict CSP can stay `connect-src 'self'`.

## Invariants you do not get to relax

- **Entitlement is server-owned.** The `entitlements` table is written **only**
  by `routes/billing.ts` (checkout-config → confirm → webhook → renewal job) and
  `routes/grants.ts` (staff · school-seat · founding). There must be **no
  route** that lets a client write its own plan, credits or pack ownership.
  Grants only ever upgrade (`mergeUpward`), so a grant can never clobber a paid
  plan.
- **Verification is the ownership proof.** A domain / staff / student match is
  honoured only for a **verified** email.
- **Fulfilment re-derives.** Checkout promo codes are validated server-side
  (`promo-core.ts`, the `promo_codes` table) and apply to the first charge only.
  The client passes a code string, never a price; kind and amount come from the
  stored `checkout_intents` row, never from the callback URL.
- **Client mirrors must match their core.** `src/calc/chat/chatQuota.ts`,
  `src/lib/services/entitlements.ts` and `src/lib/services/features.ts` mirror
  server cores, and `tests/client-server-mirrors.test.ts` imports straight out
  of `server/src/` to enforce it. Change a core, run the **root** test suite too.
- **The chat contract is ours to own.** `server/src/contract.ts` is the
  definition of the response shape, grounding verdicts, stream/error codes and
  tenant enum that `contracts/flygaca-family.json` pins for the whole family.
  A breaking change there is a manifest change in three repos — see
  `/flygaca-product:family-contract`.

## Residency, stated honestly

Personal data (accounts, logbooks, payments, the database) is intended for
`me-central2`. The generation hop carries no account identity — only the
question and the retrieved passages. **Nothing is deployed to `me-central2`
today**, and `server/src/captain-adel.ts` calls the global Gemini Developer API,
so do not write code comments, copy or docs asserting in-Kingdom processing as
current fact.

## Before you hand back

`cd server && npm run lint && npm test && npm run build`. If the change touches
a core with a client mirror, also run the root `npm test`. Say which gates ran.
