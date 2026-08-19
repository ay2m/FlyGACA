# Serving the `/data` corpus off Firebase Hosting

> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

The regulatory corpus under `public/data` is ~115 MB (`airports-extra/` 21 MB across 9 region
shards, `library-search.json` 19 MB, the `library/` reference HTML 40 MB, `charts/` 15 MB,
`ebooks/` 11 MB, `parts/` 7 MB, …). Firebase Hosting stores this in **every release**, so a
burst of deploys can exhaust the Hosting storage quota (`HTTP 429 … exceeded the Hosting storage
quota`). Serving the corpus from a bucket keeps each Hosting release ~12 MB.

Two notes on what is *not* here:

- **`rag-chunks.json` lives at `data/` in the repo root, not under `public/`.** It is a backend
  retriever input (`functions/src/corpus.ts`), no client code reads it, and the gateway's
  `CORPUS_URL` points at `library-search.json` — so serving it and mirroring it into the bucket
  cost 14 MB raw / 1.7 MB gz for nothing. `tests/integrity/data-shape.test.ts` pins the split.
- **The long-tail aerodrome tier is region-sharded** (`public/data/airports-extra/<REGION>.json`
  + `_manifest.json`) so a page fetches one shard instead of the whole 20.8 MB / 2.8 MB gz tier.
  Same total bytes in the bucket, far fewer per visit. See `scripts/lib/airport-shards.mjs`.

## How the app finds the corpus

Every `/data/*` fetch and asset URL funnels through **`dataUrl()`** in `src/lib/content.ts`:

```
const DATA_BASE = import.meta.env.VITE_DATA_BASE_URL ?? '/data';
export const dataUrl = (p) => (p.startsWith('/data/') ? DATA_BASE + p.slice('/data'.length) : p);
```

Applied at the four fetch/asset points — `fetchJson` (all JSON), `useFetchText` (reader HTML),
`chartSrc` (chart images), and `offlineCache.saveDoc/removeDoc` (offline cache keys). Call sites
keep their `'/data/...'` literals unchanged. When `VITE_DATA_BASE_URL` is unset the corpus is
fetched same-origin from `/data` exactly as before.

## Cutover (owner steps)

1. **Create a public bucket** in the `flygaca-app` project, e.g. `gs://flygaca-data`.
   - Grant `roles/storage.objectViewer` to `allUsers` on the bucket (public read).
   - Set **CORS** allowing the app origin:
     ```json
     [
       {
         "origin": ["https://flygaca.com"],
         "method": ["GET"],
         "responseHeader": ["*"],
         "maxAgeSeconds": 3600
       }
     ]
     ```
   - Confirm the deploy service account (`FIREBASE_SERVICE_ACCOUNT`) has
     `roles/storage.objectAdmin` on the bucket (the `Offload data corpus` step authenticates with it).
2. **Set two repo variables** (Settings → Secrets and variables → Actions → Variables):
   - `DATA_BASE_URL` = `https://storage.googleapis.com/flygaca-data/data` (public read URL; the
     build inlines it as `VITE_DATA_BASE_URL`).
   - `DATA_BUCKET` = `gs://flygaca-data` (rsync target for the `Offload data corpus` step).
3. **Deploy** (`deploy.yml`). With both vars set, CI mirrors `public/data` → the bucket, strips
   `dist/data` from the Hosting release, and the built app fetches the corpus from the bucket. The
   Hosting release drops from ~141 MB to ~12 MB.

Already in place, no action needed:

- CSP `img-src` includes `storage.googleapis.com` / `firebasestorage.googleapis.com` (chart
  images); `connect-src` already allows `*.googleapis.com` (JSON/HTML fetches).
- The service-worker `NetworkFirst` rules match `/data/` anywhere in the path, so offline caching
  works whether the corpus is same-origin or on the bucket.
- `rag-chunks.json` (RAG-backend-only, never fetched by the app) is excluded from the Hosting
  release via `firebase.json` `ignore`.

## Alternative host

Any public object store works — point `DATA_BASE_URL` at it and adjust the `Offload data corpus`
step. Add its origin to the CSP `img-src`/`connect-src` in `firebase.json` if it isn't a
`*.googleapis.com` host.
