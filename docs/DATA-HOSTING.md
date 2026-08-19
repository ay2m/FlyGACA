# Serving the `/data` corpus from a Cloud Storage bucket

The regulatory corpus under `public/data` is ~64 MB (`airports-extra.json` 21 MB,
`library-search.json` 19 MB, `rag-chunks.json` 14 MB, plus `parts/`, the indexes and, once the
full library ships, the reference HTML, charts and ebooks). Shipping it inside `dist/` makes every
web deploy carry the whole corpus even when not a byte of it changed. Serving it from its own
bucket keeps a deploy around 12 MB.

Two notes on what is *not* in the client's copy:

- **`rag-chunks.json` is a backend input, not client data.** The Cloud Run image bakes it in
  (`server/Dockerfile` sets `CORPUS_URL=/app/data/rag-chunks.json`) so the BM25 index needs no
  cold-start fetch. No client code reads it. It still lives under `public/data/` in the repo, so
  the corpus bucket does carry a copy — 14 MB of dead weight there, and worth excluding if the
  bucket's egress ever matters.
- **The long-tail aerodrome tier is region-sharded** (`public/data/airports-extra/<REGION>.json` +
  `_manifest.json`) so a page fetches one shard instead of the whole tier. Same total bytes in the
  bucket, far fewer per visit. See `scripts/lib/airport-shards.mjs`.

## How the app finds the corpus

Every `/data/*` fetch and asset URL funnels through **`dataUrl()`** in `src/lib/content.ts`:

```ts
const DATA_BASE = import.meta.env.VITE_DATA_BASE_URL ?? '/data';
export const dataUrl = (p) => (p.startsWith('/data/') ? DATA_BASE + p.slice('/data'.length) : p);
```

Applied at the four fetch/asset points — `fetchJson` (all JSON), `useFetchText` (reader HTML),
`chartSrc` (chart images), and `offlineCache.saveDoc/removeDoc` (offline cache keys). Call sites
keep their `'/data/...'` literals unchanged. With `VITE_DATA_BASE_URL` unset the corpus is fetched
same-origin from `/data` exactly as before, which is what local development and CI use.

## Cutover

**1. Create a public bucket** in the same project and region as everything else:

```bash
gcloud storage buckets create gs://flygaca-data --location=me-central2
gcloud storage buckets add-iam-policy-binding gs://flygaca-data \
  --member=allUsers --role=roles/storage.objectViewer
```

CORS is only needed if you serve the corpus from a different origin than the SPA. Reading it
cross-origin from `storage.googleapis.com` does need it:

```bash
echo '[{"origin":["https://flygaca.com"],"method":["GET"],"responseHeader":["*"],"maxAgeSeconds":3600}]' > /tmp/cors.json
gcloud storage buckets update gs://flygaca-data --cors-file=/tmp/cors.json
```

**2. Build with the base URL.** In CI this is the `DATA_BASE_URL` repository variable, written into
`.env.local` by `.github/workflows/deploy.yml`:

```
VITE_DATA_BASE_URL=https://storage.googleapis.com/flygaca-data/data
```

The trailing `/data` is load-bearing. `dataUrl()` replaces the `/data` prefix of each path with this
base, and `scripts/deploy-web.mjs` uploads under a matching `data/` prefix in the bucket. Point it
at the bucket root instead and every corpus fetch 404s — in production only, since local builds
leave it unset.

**3. Deploy.** With `DATA_BUCKET` set, `npm run deploy:web`:

- excludes `dist/data` from the web bucket (`--exclude=^data/`), so the corpus is not uploaded twice
- rsyncs `public/data` → `gs://flygaca-data/data`
- stamps `Cache-Control: public, max-age=3600` on the corpus from `config/headers.json`

Already in place, no action needed:

- The CSP allows `https://storage.googleapis.com` in both `connect-src` (JSON and HTML fetches) and
  `img-src` (chart images). It lives in `config/headers.json`; `tests/headers-parity.test.ts`
  asserts both directives so a future CSP edit cannot quietly break the corpus.
- The service-worker `NetworkFirst` rules match `/data/` anywhere in the path, so offline caching
  works whether the corpus is same-origin or on the bucket.

## Alternative host

Any public object store works — point `VITE_DATA_BASE_URL` at it and change the rsync target in
`scripts/deploy-web.mjs`. Add its origin to `connect-src` and `img-src` in `config/headers.json`
if it is not `storage.googleapis.com`, then re-apply the headers to the load balancer
(`docs/RUNBOOK-golive.md` §2). Note that moving the corpus off Google is a residency decision as
well as a hosting one — the corpus itself is public regulatory text, so it is a much softer call
than moving the database, but it is still a call.
