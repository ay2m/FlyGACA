# Licensed Captain Adel API

> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

Sell the Captain Adel retrieve-and-cite engine as a metered HTTP API to other products
(aviation sites, school LMSs, operators). This is the platform revenue line in
`docs/PRICING-REVENUE-STRATEGY.md`.

## Surface

`POST /v1/ask` (also `/api/v1/ask`) — served by the gateway (`functions/src/gateway.ts`).
A partner sends a key + a message and gets a grounded, source-cited answer. Streaming,
history and the Pro model stay app-only; this surface is deliberately minimal.

- **Auth:** `Authorization: Bearer <key>` or `X-Api-Key: <key>`.
- **Body:** `{ "message": "…" }`.
- **Response:** `{ answer, sources, kind, refusalClass, meta:{provider} }`.
- **Quota headers on success:** `X-Quota-Limit`, `X-Quota-Used`, `X-Quota-Remaining`
  (omitted for the uncapped enterprise tier).
- **429** `{ error: "rate_limited" }` (per-minute burst) or
  `{ error: "monthly_quota_exceeded", tier, quota }` (tier's monthly allowance spent).

## Tiers

Policy is the pure `functions/src/api-tier-core.ts` (`API_TIERS`); the gateway enforces
the monthly quota, and `/developers` + `docs/PRICING-REVENUE-STRATEGY.md` show the prices.

| Tier | Monthly answers | Indicative price |
| --- | --- | --- |
| Starter | 5,000 | SAR 499 / mo |
| Growth | 25,000 | SAR 1,999 / mo |
| Enterprise | uncapped | custom |

A per-minute rate limiter (`apiKeyLimiter`, 60/min) applies to every key as a coarse
safety net, independent of the monthly tier quota.

## Keys

Only a key's **SHA-256 hash** is stored (`apiKeys/{hash}`) — the raw key is shown once at
mint time. The doc carries `{ tenant, tier, active, preview, createdAt }`. A key with no
`tier` defaults to **enterprise** (uncapped), so a key minted before tiers existed is never
throttled.

### Mint a key

Run from `functions/` (where `firebase-admin` is installed), with a service account or
`gcloud` application-default credentials:

```
GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
  node scripts/mint-api-key.mjs --tenant "Acme Aviation" --tier growth
# add --dry-run to mint + hash + print without writing the doc
```

Copy the printed `flygaca_live_…` key to the partner immediately — it is not stored and
cannot be shown again. Revoke by setting `apiKeys/{hash}.active = false`.

## Metering

Usage is metered per key in `apiUsage/{hash}` as `{ count, lastUsedAt, months:{ "YYYY-MM": n } }`.
The month bucket is what the tier quota gate reads and what billing reconciles offline. Both
`apiKeys` and `apiUsage` are server-only (deny-all in `firestore.rules`).

## Next slices (not built yet)

- Self-serve key purchase + a tenant dashboard (usage, rotate key).
- OpenAPI spec + an embeddable widget/SDK (see `Captain-Adel/ROADMAP.md`).
- Automated monthly invoicing off the `apiUsage` month buckets.
