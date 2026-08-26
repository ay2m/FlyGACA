# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

The **Fly GACA app** — a modern TypeScript/React/Vite rebuild of the legacy no-build vanilla PWA
(the original Fly GACA site, whose source is not in this GitHub org — the regulatory corpus was
ported from it). Fly GACA is an independent, educational platform and open regulatory library for
Saudi civil aviation. It is **not affiliated with GACA**; treat that as load-bearing whenever you
touch user-facing copy — the product helps you find/study regulation, it never replaces it, and the
assistant cites the exact Part/section.

The app is more than calculators. Live surfaces (see `src/router.tsx`) include the **regulatory
library** (`/library`, documents + charts, plus `/library/map` — a Leaflet aerodrome map — and the
`/updates` corpus change feed), **Captain Adel** chat (`/chat`), the **flight-tools catalog**
(`/tools/*`), a **learn/guides** hub (`/learn`, `/guides/:slug`), **study**
tools (`/study/*` — quiz, flashcards, ground school, mock exam, paths, exam-prep **packs**, study
sheets), an authenticated **account** area (`/account`, `/dashboard`, `/currency`, `/logbook`,
`/records`, `/settings`), **pricing/schools/checkout** (`/pricing`, `/schools`, `/checkout`,
`/checkout/return`), a **licensed Captain Adel API** marketing page (`/developers` — see
`docs/LICENSED-API.md`), a **B2B org-admin** cohort dashboard (`/business/admin`), and `/about` +
legal pages (incl. `/refund`). Home itself is a **bento dashboard** (`src/components/bento/` —
grid, card glow, and a widgets/ family — lazy-loaded off the hero's critical path), and the global
**command palette** (`src/components/CommandPalette/`) jumps between all of these. `/learn` is the
canonical hub — `/study` and `/guides` redirect into it (`/study` → `/learn?tab=practice`); don't
relink them to the old paths.
Beyond the web app there is a native iOS app family (one App Store app per exam-prep pack),
driven from a **flavor** switch that lives here: `src/flavors/`, `src/app/flavor/`,
`IS_FLAVOR_APP` in `src/flavors/current.ts` consumed by `src/router.tsx` to swap in a
reduced, single-pack route tree, with `scripts/build-flavor.mjs` slicing content per flavor.
The route that actually works from this repo is **Capacitor** (`capacitor.config.ts` →
`build:flavor` → `flavor:ios` → `cap add ios`).

> ⚠️ **`apple/` is NOT in this repo** — no Swift package, no Xcode project, in any commit.
> The Swift side lives in the sibling repo `ay2m/FlyGACA-ios`; the npm scripts and helpers
> that used to target `apple/…` paths have been deleted (only `scripts/native/ios-localize.mjs`
> remains, and it targets the Capacitor-generated `ios/App` project). Treat any claim in this
> file about `apple/FlyGACAKit` — including the SRS "cross-platform contract" — as describing
> that repo, not this one: there is nothing here to diff a port against.

The repo also contains the **backend**: `server/` is a single Express service for **Cloud Run**,
backed by **Cloud SQL (Postgres)**. The Firebase **backend** is gone — no `firebase-admin`, no
Firestore, no App Check anywhere in `server/`; auth, the datastore and the API are all
first-party or plain GCP. What Firebase remains is a deliberately thin **client/hosting** layer,
not a backend: the `firebase` JS SDK is a dependency for optional Analytics-based crash
telemetry (`src/lib/firebase-monitoring.ts` — dynamic-imported off the boot path, inert unless
`VITE_FIREBASE_APP_ID` is set at build time), and Firebase **Hosting** is an auto-deployed
static front (see Hosting & deploy). `server/src/index.ts` is the single
manifest of the HTTP surface, mounting one router per feature under `/api`:
`auth` (sessions, Google OAuth, verification, reset), `account` (profile, logbook, records, study
progress), `grants` (staff / school-seat / founding), `billing` (Moyasar checkout, confirm, webhook,
renewal job), `org` (the B2B cohort dashboard), `waitlist`, plus the Captain Adel gateway
(`/api/chat`, `/api/feedback`) and the licensed `/v1/ask` surface (tiered, API-key-authenticated,
see `docs/LICENSED-API.md`). The RAG flow retrieves with BM25 in-process and generates over an
**OpenAI-compatible endpoint** — `server/src/model-core.ts` (pure wire format) + `model.ts`
(fetch/SSE), configured by `MODEL_BASE_URL`, **no model SDK**. The default provider is **Google
Gemini** (via its OpenAI-compatible endpoint); the provider is config, not code, so an in-Kingdom
**ALLaM** endpoint (HUMAIN's, once its developer platform opens, or a self-hosted ALLaM behind
vLLM) is a drop-in swap. Residency is scoped deliberately: all **personal** data (accounts,
logbooks, payments, the database) stays in-Kingdom in `me-central2`, but the generation hop carries
no account identity — only the user's question and the retrieved passages — so it runs on Gemini
(processed globally) and is disclosed as a sub-processor rather than kept in-Kingdom (see
`docs/RUNBOOK-golive.md` §5). Genkit remains only as the flow/streaming harness.
`docs/DESIGN-genkit-rag-backend.md` describes the retrieval design but predates the model-client
rewrite — read it for retrieval intent, not the provider. `server/` is its own npm package with its own CI gate — run
`npm run lint && npm test && npm run build` inside `server/` when you touch it (root
`npm run verify` does not cover it). The *intended* deploy region is `me-central2` (Dammam, in-Kingdom /
PDPL), but see the caution in "Hosting & deploy" below — that region is not yet available to
this account and nothing is deployed there. There is no region constant to keep in sync — the
Cloud Run service and its Cloud SQL instance are both regional resources set at deploy time
(see `docs/RUNBOOK-deploy.md`).

## Architecture

- **Build:** Vite + TypeScript (strict). `npm run build` runs
  `build:sitemap → tsc -b → vite build → prerender-head → check:prerender → check:jsonld` →
  `dist/`, which is both
  the static-host payload and the Capacitor `webDir`. `prerender-head.mjs` stamps per-route
  `<head>` meta (titles, descriptions, canonical, OG, JSON-LD) into the shipped HTML for SEO/AI
  search. A fuller static-HTML prerender (`npm run prerender`) runs in the deploy pipeline.
  Note `check:prerender` is weaker than it reads: it only inspects routes that
  already have an `hreflang="ar"` alternate — i.e. exactly the ones `prerender-head` wrote — so
  a route with no snapshot is invisible to it. `check:prerender:coverage` is the honest gate and
  runs in `prerender.yml`, `deploy.yml`, `deploy-firebase.yml` and the `build:deploy` npm chain.
  `check:jsonld` (`scripts/validate-jsonld.mjs`) fails a content route (guides, library, tools,
  study packs) that carries no managed JSON-LD node (`data-managed-ld`) at all, in addition to
  validating the nodes that are present.
- **Routing:** `src/router.tsx` is the single route table (routes are lazy-loaded per page). Pages
  live one-per-folder under `src/pages/`. The shared chrome (`src/app/Layout|Header|Footer`, plus
  `MobileDock`, `AccountMenu`, and the `src/app/nav.ts` nav registry)
  replaces the legacy `build-chrome.js` stamper — chrome is now a component, never copied.
  **Arabic lives at its own URLs.** The same route tree is re-mounted under
  `basename: '/ar'` (`src/router.tsx:212-217, 381-387`), so every page has an `/ar/…` twin and
  the site has roughly twice the URLs the route table appears to list. Anything touching
  canonicals, hreflang, sitemaps, prerendering or link-building must account for both trees.
- **i18n / RTL:** `src/i18n/index.ts` boots i18next from `en.json` / `ar.json` and mirrors the
  choice onto `<html lang/dir>` so RTL flips document-wide. `LangToggle` switches languages.
- **Styling:** `src/styles/tokens.css` is the design-token source of truth (the Falcon palette);
  components use CSS Modules with **logical properties** so RTL mirrors automatically. See
  `FIGMA_DESIGN_SYSTEM.md` for the design system. Motion is tokenized too: `framer-motion` mirrors
  the CSS motion tokens in `src/components/bento/motion.ts`, and
  `tests/bento-motion-parity.test.ts` **fails the build if the two drift**; respect
  `usePrefersReducedMotion`.
- **Data:** the regulatory JSON corpus + indexes ship under `public/data/` and are fetched at
  runtime via `src/lib/content.ts` (`fetchJson`; corpus shapes in `src/lib/content.types.ts`,
  corpus-link routing in `src/lib/contentLinks.ts`) + the `useFetchJson` hook — the heavy corpus never
  enters the JS bundle. (The ~19 MB `library-search.json` and ebooks remain lazy/streamed, as in the
  legacy app.) In production the corpus is offloaded to a bucket and served network-first.
- **Calculators:** pure, DOM-free logic in `src/calc/*` (no DOM/i18n) so it is unit-testable.
  Aviation tool math stays **flat** at the `src/calc/` root (`isa`, `tas`, `crosswind`, `holding`,
  `runway*`, … — one module per catalog tool, plus the shared date math `recency` and the shared
  numeric guards `guards` (`fin` · `ok` · `norm360` — use these, never a local copy)); the non-tool
  helpers live in subfolders by domain — `calc/chat/` (Captain Adel answer/thread/voice:
  `chat*`, `conversations`, `transcript`, `markdown`, `speech`, `textToSpeech`, `voiceSelection`),
  `calc/pilot/` (`currency`, `logbook`, `achievements`, `onboarding`, `ics`, plus the shared
  `flightFields` readers for the free-text `Flight` columns), `calc/library/`
  (`anchor`, `corpusNav`, `changeTracking`, `offlineManifest`, `libraryFilter`, `constellation`),
  `calc/study/` (`srs` — the contract the iOS Swift port mirrors, though that port is in the
  sibling repo, so nothing here can detect drift — `shuffle`, and
  `glidePath`), `calc/hud/` (the airspace-sim engine behind the per-aerodrome radar scope —
  the `/hud` page it was built for is retired, see `docs/DESIGN-airspace-hud-v2.md`:
  `scenario`, `kinematics`, `projection`,
  `sectors`, `geoKsa`, `callsigns`, `simMetar`, seeded `rng`), and `calc/app/`
  (`authError`, `dashboardLayout`, `emailShape`, `passwordPolicy`, `pricingView`, `toolPresets`).
  Subfolders may import the flat core
  (`@/calc/recency`), never each other sideways. The
  `CalcShell` component provides the shared frame (copy-link · try-an-example · ask-Captain-Adel ·
  disclaimer). Input state lives in the URL: a page that consumes **any numeric input** uses
  `useNumericInputs` (reads floats from `nums.<key>`, everything else from `inputs.<key>`);
  string-only pages (decoders, directories) use raw `useUrlState`. Because `CalcShell` renders a
  copy-link button unconditionally, a page that keeps inputs in `useState` silently hands out blank
  links — that is what the hook prevents, not a style preference. Shared field/output layout comes
  from `FieldGrid`/`OutputGrid` + `ResultStat` (`src/components/calc/` — which also holds the
  `NumberField`/`SelectField`/`TextField` field primitives and the `GaugeDial` instrument readout),
  and whole-number output
  goes through `fmtInt` (`src/components/calc/format.ts`). This replaces the legacy `FGCalc` helper
  (`calc-tools.js`). **Crosswind is the reference implementation** every
  other tool follows (its bespoke diagram-beside-inputs layout is the one sanctioned exception to
  `FieldGrid`).
- **Services:** `src/lib/` holds the typed frontend services, grouped by concern:
  `src/lib/services/` (backend/account: `backend`, `auth`, `account`, `sync`, `org`, `staff`,
  `school`, `founding`, `entitlements`, `packEntitlements`, `features`, `billing`, `promo`,
  `pricing`, `referral`, `waitlist`, `studyProgressSync`), `src/lib/prefs/` (localStorage preference
  stores — all built on the `createPrefStore` factory, which owns the listener/snapshot plumbing and
  the best-effort storage helpers; never hand-roll another `useSyncExternalStore` store here),
  `src/lib/seo/` (`seo`, `jsonld`), `src/lib/native/` (`nativeBridge`, `pwa`, `offlineCache`),
  with cross-cutting modules (`api`, `content`, `analytics`, `theme`, …) at the `src/lib/` root.
  `tools.ts` and `prepCatalog.ts` stay pinned at the `src/lib/` root — pipeline scripts under
  `scripts/` parse them by that literal path. The shared React hooks live in `src/hooks/`
  (`useNumericInputs`, `useUrlState`, `useFetchJson`, `usePageMeta` — which also exports
  `useNoindexMeta` — `useCopyToClipboard`, `useOfflineSync`, `useViewMode`, `useForm`,
  `usePrefersReducedMotion`, …). `entitlements.isActive` is a pure
  predicate mirroring `server/src/billing-core.ts`, and `features.ts` (`FEATURE_PLAN` /
  `useFeature`) is the single source of truth for which plan unlocks which premium feature — but the
  `entitlement` record is **server-only**; the app reads it only to gate UI, never to grant, and true
  enforcement stays in the gateway. Exam-prep packs are gated by `packEntitlements.ts` (a
  promo-immune gate: a pack unlocks on permanent one-time ownership in the `pack_entitlements` table OR an
  active paid plan); their structure lives in `prepCatalog.ts` (names/blurbs localized under
  `study.packCatalog.<id>`, same structure-in-TS pattern as `tools.ts`).
- **Local-first by default:** when no API is configured (`VITE_API_BASE_URL` unset — the default
  local/dev build) `isBackendConfigured()` is false and every backend-gated service (`org`,
  `waitlist`, `studyProgressSync`, sync, auth, billing) degrades to a best-effort no-op — the app
  stays fully usable offline. Study progress lives client-side (`src/lib/studyProgress.ts` is the source of truth);
  `studyProgressSync.ts` is an upload-only backup that feeds the B2B cohort readiness report.
- **PWA / native:** `vite-plugin-pwa` generates the service worker (app shell precached,
  `/data/*` network-first). `src/lib/native/nativeBridge.ts` is inert on web and routes auth/IAP/offline-cache
  through Capacitor plugins inside the native shell (`capacitor.config.ts`; iOS + Android).

## Backend (`server/`)

- **Pattern:** every business rule lives in a pure, Firebase-free `*-core.ts` module (e.g.
  `billing-core`, `chat-quota-core`, `rate-limit-core`, `staff-core`, `school-core`, `student-core`,
  `org-core`, `referral-core`, `feedback-core`, `api-key-core`, `api-tier-core`, `founding-core`,
  `promo-core`, `auth-core`) so policy is unit-testable in isolation; the Express route wrappers
  (`gateway.ts` and `routes/{auth,account,grants,billing,org}.ts`) stay thin. All SQL lives in
  `store.ts`; `db.ts` owns the pg pool and `session.ts` the JWT-cookie + scrypt-password primitives.
  Client-side mirrors (`src/calc/chat/chatQuota.ts`, `src/lib/services/entitlements.ts`,
  `src/lib/services/features.ts`) must match their server core —
  `tests/client-server-mirrors.test.ts` imports straight out of `server/src/` and enforces this; it
  is not just convention.
- **Entitlement is server-owned.** The `entitlements` table is written **only** by
  `routes/billing.ts` (checkout-config → confirm → webhook → the renewal job) and `routes/grants.ts`
  (staff · school-seat · founding). What `firestore.rules` used to forbid is now structural: there
  is simply **no route** that lets a client write its own plan, credits or pack ownership —
  `routes/account.ts` exposes reads and profile/logbook writes and nothing else. Grants only ever
  upgrade (`mergeUpward`), so one can't clobber a paid plan. A domain/staff/student match is
  honoured **only for a verified email** — email verification is the ownership proof. The app never
  grants; it only reads `entitlement` to gate UI. Checkout supports server-validated promo codes
  (`promo-core.ts`, the `promo_codes` table) applied only to the first charge — the client passes
  the code string, never a price, and fulfilment re-derives kind + amount from the stored
  `checkout_intents` row rather than from the callback URL.
- Docs: `docs/RUNBOOK-deploy.md` (provisioning a fresh GCP project + the deploy sequence),
  `docs/DESIGN-genkit-rag-backend.md`, `docs/BILLING.md`,
  `docs/LICENSED-API.md` (the `/v1/ask` metered API, `api-tier-core.ts` tiers),
  `docs/PRICING-REVENUE-STRATEGY.md`, `docs/b2b/` (org-admin dashboard + study-progress-sync
  design).

## Hosting & deploy

> [!CAUTION]
> **`flygaca.com` is DOWN, and everything in this section is the TARGET architecture.**
> Re-verified against `gcloud`, the Firebase Hosting API and `dig`/`curl` on 2026-08-20:
>
> - **The domain serves a Firebase "Site Not Found" 404 on every path.** `flygaca.com` and
>   `www.flygaca.com` are bound to Hosting site `flygaca-sa`, but the apex TXT record still
>   reads `hosting-site=flygaca-app`, so both sit at `DOMAIN_VERIFICATION_LOST`. The build is
>   healthy and current — `flygaca-sa.web.app` returns 200. The Hosting API names the fix:
>   REMOVE `hosting-site=flygaca-app`, ADD `hosting-site=flygaca-sa`. DNS is at **Hostinger**
>   (`ns1/ns2.dns-parking.com`), not Google. The cert auto-renewed on Aug 1, so the padlock is
>   green over a 404.
> - **`api.flygaca.com` is NXDOMAIN.** `worker/index.ts:17`, `vercel.json:27` and
>   `netlify.toml:18` all hard-code it as the API origin, so every mirror's `/api/*` is dead.
>   None of the three mirrors is actually deployed.
> - **The frontend is Firebase Hosting too**, not just the Functions — served from
>   199.36.158.100 with the Firebase-era CSP (`identitytoolkit`, `securetoken`) still live.
>   It deploys from the **sibling repo** `ay2m/FlyGACA-app`, which still holds the
>   `.firebaserc` + `firebase.json`. This repo has no Firebase config at all.
> - The Express service in `server/` has **never been deployed**. No `flygaca-api` Cloud Run
>   service exists in any project. (There is a service *named* `flygaca-app` in
>   `flygaca-sa`/`me-central1`, but its image is `gcr.io/cloudrun/placeholder`.)
> - **There are TWO parallel legacy stacks**, each with all 13 functions. The one configured for
>   the real domain (`APP_ORIGIN=https://flygaca.com`) is in **`flygaca-app`, whose billing is
>   DISABLED** and whose `MOYASAR_SECRET_KEY` is in `DESTROYED` state — three services abort at
>   startup. The billed, healthy stack in `flygaca-sa` points at the **staging** host
>   (`APP_ORIGIN=https://flygaca-sa.web.app`), so fixing DNS alone leaves checkout returning
>   users to staging. Both stacks expose ~24 `allUsers` endpoints with `ENFORCE_APP_CHECK=false`.
> - **Subscription renewal has been failing nightly** since at least 2026-08-16: HTTP 500,
>   `FAILED_PRECONDITION: The query requires an index` on `subscriptions`
>   (`autoRenew`+`status`+`nextChargeAt`). The composite Firestore index was never created.
> - **A Cloud Build trigger on `main` was auto-deploying broken images** to `flygaca-dev`:
>   it buildpacks the **repo root** (`--path=.`), found no `Dockerfile` there, and built the
>   Vite SPA, so every revision died with `failed to start and listen on PORT=8080`. The
>   Dockerfile has since been moved `server/Dockerfile` → `./Dockerfile` so both that trigger
>   and `gcloud run deploy --source .` resolve it. Existing crashed revisions still need
>   clearing, and traffic is still pinned to `gcr.io/cloudrun/placeholder`.
> - Persistence: Cloud SQL `flygaca-sa-instance` (Postgres 18) in **`us-east4` — Northern
>   Virginia**; `flygaca-fdc` in `me-west1` (Tel Aviv). Both are **Firebase Data Connect
>   scaffolding**, not the app's DB — `server/migrations/0001_init.sql` has never been applied
>   anywhere, and no `schema_migrations` table exists. Both have **backups disabled, no PITR,
>   no HA, and deletion protection OFF**. Firestore likewise has zero backups and PITR disabled.
> - **There is no user data anywhere.** The billed `flygaca-sa` Firestore (`us-central1`, Iowa,
>   created 2026-08-15) is **empty**: `listCollectionIds` returns `{}`, and a `runQuery` on
>   `users` returns zero documents with a valid `readTime` — genuinely empty, not
>   permission-denied. The older `flygaca-app` Firestore in `me-central2` is deleted. Nothing was
>   ever migrated into the new stack.
> - **`me-central2` is not available to this account**, re-confirmed 2026-08-20 with identical
>   `LOCATION_POLICY_VIOLATED` across three project numbers. It is **not a support ticket**:
>   Dammam is sold **only through CNTXT** (Google's exclusive KSA reseller) to **organizations**
>   on **Invoiced Billing**. Individuals go on an open-ended waiting list. Unblocking needs a KSA
>   legal entity (CR + VAT) and a billing migration — a corporate blocker, not an engineering one.
>   Note it is **Cloud Run specifically** that is denied — Scheduler, Artifact Registry, Cloud
>   Build, Compute and Secret Manager all answer *reads* in `me-central2` (creates are untested
>   and per Google's docs would also be refused). The account's only Dammam resource is a
>   **deleted** Firestore in the unbilled `flygaca-app` project: the metadata still lists
>   `locationId: me-central2` (created 2026-06-01), but every request returns
>   `FAILED_PRECONDITION: Cannot serve requests because the database was deleted.` There is no
>   usable `me-central2` resource anywhere.
> - **Doha is the slowest realistic region.** Measured from Riyadh/STC: `me-central1` 158 ms vs
>   Milan 83 ms, Netherlands 91 ms, Dammam 17 ms. Confirmed against the live `chat` service
>   (TTFB floor 169 ms). `me-central1` is a poor default even as a stopgap.
> - The live price table is the old one, under the old `MOYASAR_PRICE_*_SAR` names — Pro 59/349,
>   **Student 39/299 (tier still active)**, Pass 149, packs 49/79, bundle 199. The `flygaca-app`
>   stack disagrees (`PRO_ANNUAL=449`), so the two stacks are not price-consistent.
>
> **So: data is not in-Kingdom today.** Any PDPL or data-residency claim that says otherwise —
> in this repo, in `ay2m/Office`, or in the investor decks — is aspirational. Do not repeat the
> in-Kingdom claim as fact. **And the region grant alone would not make it true:**
> `server/src/captain-adel.ts:13,25` calls `googleAI()` — the **global** Gemini Developer API
> (`generativelanguage.googleapis.com`), not regional Vertex AI — so every user-typed chat
> question leaves the region regardless of where Cloud Run sits. Supabase pgvector is likewise
> unpinned. End-to-end in-Kingdom processing needs Genkit moved to regional Vertex AI *and*
> Supabase pinned, on top of the CNTXT grant.

The single Vite build (`dist/`) is served from several fronts; `/api/*` always belongs to the
**same** Cloud Run service:

- **Google Cloud is the canonical origin**: the SPA is published to a Cloud Storage bucket behind an
  HTTPS load balancer, which routes `/api/*` to the **Cloud Run** service built from `server/`
  (region `me-central2`, Dammam — in-Kingdom / PDPL), backed by a **Cloud SQL** Postgres instance in
  the same region. Secrets (session key, Moyasar keys, model key, mail key) come from Secret
  Manager; the renewal job is a Cloud Scheduler POST to `/api/billing/renew` carrying `CRON_SECRET`.
- **Firebase Hosting is a live, auto-deployed front**: `deploy-firebase.yml` builds, prerenders
  and runs `firebase deploy --only hosting` on every push to `main`. `firebase.json` serves
  `dist/` and carries its own copy of the security headers, held to `config/headers.json` by
  `tests/headers-parity.test.ts`. It **proxies `/api/*`** to the `flygaca-api` Cloud Run service
  directly via a `run` rewrite in `firebase.json` (same region, `me-central2`), and the workflow
  sets `VITE_API_SAME_ORIGIN=1` alongside `VITE_GA_MEASUREMENT_ID` so the build knows the API is
  same-origin — sign-in, chat and account all work from this front, not just the local-first
  build. Residency is unchanged either way: everything personal — accounts, chat, billing, the
  database — stays on the Cloud Run + Cloud SQL pair in `me-central2`, whichever front serves the
  static shell.
- **Cloudflare Worker** (`worker/index.ts` + `wrangler.toml`) and the **Netlify** / **Vercel**
  mirrors each serve `dist/` and **proxy `/api/*` back to the Cloud Run origin** as a same-origin
  rewrite — so chat/account keep working and the strict CSP (`connect-src 'self'`) never changes.
  Keep any new API surface under `/api/*` for this to hold. **All three are dormant — nothing is
  deployed to them**; the live fronts are Google Cloud (canonical) and Firebase Hosting.
  The Worker reads its API origin from `[vars] API_ORIGIN` in `wrangler.toml`; Netlify and Vercel
  still hard-code `https://api.flygaca.com`. The mirrors `X-Robots-Tag: noindex` any host that
  isn't `flygaca.com`.
- Redirects consolidate the marketing domains onto `flygaca.com` (e.g. `captadel.com` → `flygaca.com`
  in `vercel.json` — that rule only fires for traffic still hitting Vercel).

**Security headers live in `config/headers.json` and nowhere else.** GCP applies custom response
headers per backend, so the load balancer's backend bucket and backend service must both be updated
with `npm run -s headers:gcloud` — until you do, the canonical front serves no CSP and no HSTS.
`tests/headers-parity.test.ts` holds the dormant Vercel/Netlify mirrors **and** the live
`firebase.json` front to the same file, but cannot see the live load balancer.

See `docs/RUNBOOK-deploy.md` for provisioning a fresh GCP project (APIs to enable, the Cloud SQL
instance, the OAuth client, Secret Manager entries, the scheduler job), `docs/RUNBOOK-golive.md` for
the go-live sequence (headers, corpus offload, CI/CD, launch checklist, rollback), and
`docs/DATA-HOSTING.md` for how the corpus bucket is served. `supabase/migrations/` holds the pgvector
schema for RAG embeddings; the app's own schema lives in `server/migrations/`.

## The family contract (`contracts/flygaca-family.json`)

One versioned artifact committed **byte-identically** to this repo, `ay2m/Office` and
`ay2m/Captain-Adel`. It exists because the family's cross-repo claims used to live only in prose
and drifted without anything failing. Two blocks concern this repo:

- **`chat` — we own it.** `server/src/contract.ts` is the definition: the response shape, the
  grounding verdicts, the stream/error codes, the tenant enum. Captain Adel's `/v1/chat` is a
  superset of it.
- **`entity` — `ay2m/Office` owns it**, in `01-governance/company-facts.md`. We are a consumer:
  the legal name, CR and VAT number must keep appearing verbatim in `src/lib/seo/jsonld.ts` and in
  `footer.legalEntity` + `legal.*` in **both** i18n bundles.

`tests/family-contract.test.ts` asserts both directions and verifies the manifest's self-hash; it
runs in `npm test`, so it is already inside `npm run verify` and `ci.yml`. To change the manifest:
edit the owning repo's copy, bump `version`, re-stamp with Office's
`tools/contracts/stamp-manifest.mjs`, copy it verbatim to the other two repos, and open all three
PRs together.

> **There are two Captain Adel brains.** This repo's (`server/src/captain-adel.ts` + `corpus.ts` +
> `grounding-core.ts`) and the standalone one in `ay2m/Captain-Adel`. Older prose in both repos
> claimed they were one brain called server-to-server with `X-Adel-Api-Key`; that was never true.
> `server/src/brain.ts` is the seam where consolidating them would happen — it resolves to the
> local flow unless `ADEL_REMOTE_BASE_URL` is set, which it is on no revision, so `/api/chat`
> behaves exactly as before. The trade-offs, above all that the two decide grounding at different
> points in the request, are in `docs/DESIGN-brain-consolidation.md`. Do not describe the two as
> one brain.

## Conventions (enforced)

- **Bilingual + RTL is first-class.** New copy → a key in **both** `src/i18n/en.json` and
  `ar.json`. `npm run test` fails on any key present in one language but not the other
  (`tests/i18n-parity.test.ts`).
- **The disclaimer never drifts.** Use `<Disclaimer />`; do not inline or reword the
  not-affiliated / verify-against-GACA text.
- **Tokens only / logical properties only.** No hard-coded colours; no physical `left`/`right`.
- **Never commit build output.** `public/sitemap.xml` / `public/robots.txt` are regenerated by
  `build:sitemap` and git-ignored. Keep branches synced with `main`; see `docs/MERGE-CONFLICTS.md`
  for prevention + how to resolve lockfile / i18n conflicts.
- Run `npm run verify` before committing. It chains the frontend gate —
  `typecheck → lint → format:check → test → build → check:bundle → check:perf` (`check:bundle` fails
  if the initial gzipped JS exceeds its budget — 189 kB today; route chunks excluded by design.
  `check:perf` is the companion gate over **every** emitted chunk — a per-chunk gz ceiling plus a
  total-footprint ceiling — catching a lazy route chunk that balloons, which `check:bundle` ignores). CI
  CI should mirror the same steps individually but swap `test` for `test:coverage` — a coverage
  **ratchet** with thresholds in `vitest.config.ts` — plus a **server** job
  (`lint · test:coverage · build` inside `server/`) and an **e2e · a11y** job (`npm run test:e2e`,
  Playwright). That is what `.github/workflows/ci.yml` runs. `deploy.yml` deploys `main` to Google
  Cloud via Workload Identity Federation; both need the repo variables listed in
  `docs/RUNBOOK-golive.md` §4 before they will work against your own project.

## Adding a new tool

The legacy→React migration is **complete** (all 55 catalog tools are live, so the registry's
`status` union is now just `'live'` — a future staged tool would re-widen it to
`'soon' | 'live'`). To add a tool: register it in `src/lib/tools.ts` — the typed catalog
registry and single source of truth — lift its math into `src/calc/<tool>.ts` (pure,
add a Vitest spec), build a page under `src/pages/tools/<category>/` (the folder matching the
registry's `category`; `ToolsIndex` alone stays at the `tools/` root) using `CalcShell` + `useNumericInputs`
(or `useUrlState` for string-only tools), add its strings to both i18n bundles, and register the
route in `router.tsx`. Names/blurbs/category labels resolve from i18n by id, so the registry holds
only structure (route, category, status, keywords).

## Content & data pipelines (`scripts/`)

Node ESM scripts under `scripts/` (many wired to npm scripts) maintain the corpus and generated
assets — e.g. `sync:gaca` + `data:normalize` (pull/normalise the regulatory corpus; `sync:gaca:apply`
is the apply-and-normalise variant), `parse:regulations` (compile the cross-ref lookup from
`content/regulations/*.md`), `build:airports` / `build:chunks` / `embeddings:upsert` (Supabase
pgvector), `build:sitemap`, `gen:og`, `gen:aip-sheet` (build the AIP study sheet), `gen:captain`
(Captain Adel imagery), `audit:ai` (the AI-search visibility audit behind `SEO-PLAN.md`),
`optimize:img`, and `new:guide` (scaffold a guide — see `GUIDE_AUTHORING.md`). Shared script
helpers live in `scripts/lib/` (flavor slicing, markdown splitting, regulations parsing, sync
merge) and `scripts/native/` (just `ios-localize.mjs`, which localizes the Capacitor-generated
`ios/App` project). Deploying is two commands, not one, so
`npm run deploy` still fails with a pointer: `deploy:api` (`scripts/deploy-api.mjs` → `cloudbuild.yaml`
→ a Cloud Run revision) and `deploy:web` (`scripts/deploy-web.mjs` → bucket rsync + per-path
`Cache-Control` from `config/headers.json` + CDN invalidation). Both take `--dry-run`. Note
`gcloud run deploy --source` **cannot** build the API — Cloud Run only honours a Dockerfile at the
source root and ours is `server/Dockerfile`, which copies the corpus in; `cloudbuild.yaml` exists
for that.

## Where to look

`.claude/` holds this repo's Claude Code tooling (not shipped): `skills/run-flygaca/` (build, run
and drive the app), `settings.json` (registers the `flygaca-family` marketplace — registering
installs nothing), and `plugins/flygaca-product/`, this repo's distributable plugin: five agents
(`react-surface`, `express-api`, `corpus-pipeline`, `sql-schema`, `rag-grounding`) and four
commands (`/verify`, `/server-gate`, `/new-tool`, `/family-contract`). `ay2m/Office` hosts the
marketplace and points here with a `git-subdir` source; install with
`/plugin install flygaca-product@flygaca-family`.

Root: `MIGRATION.md` (rebuild log), `ROADMAP.md`, `README.md` (getting started),
`GUIDE_AUTHORING.md` (learn content), `FIGMA_DESIGN_SYSTEM.md` (design system),
`SEO-PLAN.md`, `CONTRIBUTING.md`, `SECURITY.md`.

`docs/` holds the engineering documentation: `RUNBOOK-deploy.md` (provisioning + the deploy
sequence — written for THIS stack, keep it current), `RUNBOOK-golive.md` (go-live: load-balancer
headers, corpus offload, CI/CD, launch checklist, rollback), `ARCHITECTURE-BLUEPRINT.md`,
`DATA-HOSTING.md`, `BILLING.md`, `DESIGN-genkit-rag-backend.md`, `LICENSED-API.md`,
`PRICING-REVENUE-STRATEGY.md`, `MERGE-CONFLICTS.md`, `corpus-link-shape.md`,
`STORE-SUITE.md`, `RUNBOOK-native.md`, `RUNBOOK-openseo.md`, `APPS-FAMILY-ROADMAP.md`,
`STUDY-CONTENT-REVIEW.md`, `TESTING-ROADMAP.md`, plus `docs/b2b/` (8 files — the cohort
dashboard, study-progress-sync design, curriculum and sales material) and `docs/seo/`.
`docs/screenshots/review-2026-07/` holds the images the README embeds.

> ⚠️ **Any `docs/` file carrying the "Restored from `ay2m/FlyGACA-app` history" banner
> predates the Cloud Run rebuild.** The banner itself is the marker — grep for it rather than
> trusting a list here (16 files carried it at last count; docs without it are current or
> post-rebuild, and `PRICING-REVENUE-STRATEGY.md` carries its own superseded-prices banner
> instead). Read bannered files for intent and design rationale, not for current
> architecture — `CLAUDE.md` is the authority on how the system works today. Two docs were
> deliberately NOT restored (`RUNBOOK-firebase.md`, `APP-CHECK-BACKEND.md`): they document a
> stack that no longer exists.

Still genuinely absent: `archive/` (parked material — vendored references, finished-work docs,
investor material — it lives only in `ay2m/FlyGACA-app`), the `RUNBOOK-ios-*` set, and
`THE-BOOK-OF-FLY-GACA.md`. The last of those *was* still cited: `ay2m/Office` and
`ay2m/Captain-Adel` both opened their `CLAUDE.md` with a "Family context" link to
`FlyGACA/blob/main/THE-BOOK-OF-FLY-GACA.md`, which has never existed here and 404s. Those links
now point at `ay2m/Office`'s `00-strategy/the-book-of-fly-gaca.html`, which is where the canon
actually lives — do not restore a copy here. Sibling repos
(`ay2m/FlyGACA-app` — the 1,005-commit predecessor, and `ay2m/FlyGACA-ios`) are separate
checkouts, not subtrees of this one.

The legacy source (the original vanilla Fly GACA site) remains the reference for anything
still ported from the old site.
