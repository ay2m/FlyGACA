# Fly GACA App — Roadmap

What's coming next for the Fly GACA frontend app. The legacy→TypeScript/React/Vite **rebuild is
complete and live** — all 55 tools, the full regulatory library + search, Captain Adel chat, the
study hub, account/commerce, and guides are shipped and deploying to production on every merge to
`main`. This file looks **forward** and is the **single source of truth for open work**; the
stage-by-stage rebuild history lives in [`MIGRATION.md`](./MIGRATION.md) (history only — no open
items are tracked there).

Scope note: this repo now carries the **backend too** — the Firebase Functions gateway and the
Captain Adel RAG brain live in `functions/` (deployed to `me-central1`; Firestore in
`me-central2`). The app calls them via the same `/api/chat` / `/api/feedback` endpoints on the
`flygaca-app` Firebase project.

## How to read this

- **Now / Next / Later** are horizon buckets, not date commitments — priorities shift as we learn.
- Each item is tagged **[product]** (something users see), **[platform]** (under-the-hood,
  launch, or infra) or **[docs]** (contributor/reader-facing writing) so every audience can scan
  to what they care about.
- Every item links to the runbook/doc that already describes the work where one exists.

## Recently shipped (post-rebuild)

- **Interactive features round 7 — chat motion**
  ([#444](https://github.com/FlyGACA/FlyGACA-app/pull/444)): Captain Adel's source citations
  stagger in as an answer lands (`SourceList`, shared `--dur-stagger` cadence), and a small shared
  `Waveform` equalizer plays on the voice controls — while the mic is listening (`VoiceButton`) and
  while an answer is read aloud (`SpeakButton`). Decorative, reduced-motion safe.
- **Interactive features round 6 — ambient & time**
  ([#441](https://github.com/FlyGACA/FlyGACA-app/pull/441)): a sun-path arc on `sun-times`, a live
  analog Zulu dial on `zulu-clock`, an AIRAC cycle progress ring on `airac`, and a today's-daylight
  band on the aerodrome detail page. Backed by additive pure helpers — `daylight()` (`src/calc/sun.ts`),
  `clockAngles()` (`src/calc/zulu.ts`), `cycleProgress()` (`src/calc/airac.ts`).
- **Interactive features round 5 — account pack**
  ([#438](https://github.com/FlyGACA/FlyGACA-app/pull/438)): radial currency rings on `CurrencyBoard`
  (status by shape + hue, shared across `/currency` · `/records` · dashboard), a reusable
  `ProgressRing` on the library offline-download button, and count-ups on the logbook summary tiles
  (`CountUp` gained a `decimals` prop). Pure `currencyRingFraction` on the currency engine.
- **Interactive features round 4 — instrument pack**
  ([#437](https://github.com/FlyGACA/FlyGACA-app/pull/437)): a CG-envelope plot on `weight-balance`
  (`cgEnvelopeStatus`), a shared climb/descent `ProfileRamp` across the four TOD/VDP/climb-gradient/
  top-of-climb tools, `GaugeDial` on `mach` + `pivotal-altitude` (with a fractional-readout fix),
  `E6b` reusing `WindTriangleDiagram`, an ISA thermometer, an altimeter dial, and an ETP/PNR route
  diagram on `route-critical-points`.
- **Interactive features round 3 — study motion**
  ([#435](https://github.com/FlyGACA/FlyGACA-app/pull/435)): graded flashcards fly out with the next
  card entering, an SRS "glide path" strip shows the deck's spread across Leitner boxes (pure
  `src/calc/study/glidePath.ts` + `GlidePathStrip`), the mock exam gains a depleting fuel-gauge timer
  and an animated PASS/FAIL stamp, and the dashboard gains achievement stamps. Visual layer only —
  the `srs` engine and exam scoring stay untouched as cross-platform contracts.
- **Interactive features round 2**
  ([#433](https://github.com/FlyGACA/FlyGACA-app/pull/433)): the holding tool's animated
  entry-procedure racetrack (CSS `offset-path`), a shared `GaugeDial` needle on the TAS and
  density-altitude outputs, staggered wind-triangle vector construction, the GACAR constellation
  map at `/library/map` (`src/calc/library/constellation.ts` — Parts as stars sized by real
  inbound cross-references), and a per-aerodrome radar scope
  (`src/components/aerodrome/AerodromeScope.tsx`) sharing the `src/calc/hud/` training scenario.
- **Kingdom Airspace HUD (`/hud`) — since REMOVED**
  ([#432](https://github.com/FlyGACA/FlyGACA-app/pull/432)): a deterministic, SIM-labelled
  Kingdom airspace simulation — pure engine under `src/calc/hud/` (seeded scenario, closed-form
  kinematics, day/night terminator via `src/calc/sun.ts`), canvas globe, vector list + flight
  detail card, and a home bento teaser. **The page was retired**: it showed invented traffic and
  answered no question a pilot or student actually had, while costing ~80 bilingual i18n keys and
  a prerendered route to maintain. `/hud` now redirects to `/tools`; the sim engine stays, since
  the per-aerodrome radar scope uses it. See `docs/DESIGN-airspace-hud-v2.md` for the reasoning
  and the bar a v2 would have to clear.
- **Role-aware dashboard + sign-in redesign**
  ([#254](https://github.com/FlyGACA/FlyGACA-app/pull/254)): an operational role
  (pilot / student / instructor) on the profile — synced via `PROFILE_FIELDS` and accepted by the
  deployed Firestore rules unchanged — drives per-role widget ordering through the pure layout
  engine `src/calc/app/dashboardLayout.ts`. Five new widgets surface existing local-first data (study
  progress, tool favourites, library/guide bookmarks, Captain Adel threads, regulatory watch), and
  show/hide widget customization persists via `src/lib/dashboardPrefs.ts`. Signed-out `/account`
  became a split-panel sign-in with per-audience value props and a password show/hide toggle.
- **Backend hardening** ([#253](https://github.com/FlyGACA/FlyGACA-app/pull/253)): `/api/feedback`
  routing fix, region drift resolved to `me-central1`, per-uid + per-IP rate limiting, input size
  caps, JSON error handling, and a new `functions` CI job.
- **Captain Adel archive search.** The saved-conversation archive now searches titles and message
  bodies: the pure `filterConversations` helper (`src/calc/chat/conversations.ts`) is wired into the
  history menu in `src/components/chat/ConversationMenu.tsx`, alongside the existing pin/rename,
  with empty- and no-match states.
- **Global ⌘K search / command palette.** The header ⌘K pill opens a real app-wide palette
  (`src/components/CommandPalette/CommandPalette.tsx`) that jumps to any live tool, guide,
  regulatory Part, or aerodrome, driven off the `tools`/guides registries so it can't drift.
- **Dashboard follow-ups** (on the role-aware redesign): per-role widget reordering persisted via
  the `order` list in `src/lib/dashboardPrefs.ts`, an offline / cache-status widget, and an
  ask-Captain-Adel entry point — all wired through `src/pages/account/Dashboard.tsx`.
- **Offline page.** A graceful PWA offline fallback route (`src/pages/Offline.tsx`), backing the
  app-shell precache + network-first `/data/*` caching already configured in `vite.config.ts`.
- **`usePageMeta` positional filler removed.** Added `useNoindexMeta(title)`
  (`src/hooks/usePageMeta.ts`) and switched the ten noindex-only call sites (`FlavorSettings`,
  `Checkout`, `Logbook`, `Settings`, `Account`, `Currency`, `Dashboard`, `Records`, business
  `Admin`, `NotFound`) off the `undefined, undefined, { noindex: true }` filler.
- **`content.ts` split.** The ~370 lines of corpus/content JSON type declarations moved to
  `src/lib/content.types.ts`; `content.ts` now holds only the runtime loader (`fetchJson`,
  `loadJson`, `CORPUS`, `loadRegulationsLookup`, …) and re-exports the types so existing
  `@/lib/content` imports are unaffected.
- **Oversized file splits.** The five largest pages/modules were split along house seams with no
  behavior change (Aug 2026): `Chat.tsx` (573→341), `Document.tsx` (553→405),
  `functions/src/billing.ts` (777→721), `Pricing.tsx` (526→260), and `SignInForms.tsx` (416→146).
  Each lifted pure logic into tested `calc/*` / `*-core` modules first (`calc/chat/chatStream`,
  `lib/readerMarks`, `calc/app/{pricingView,passwordPolicy,emailShape}`, `billing-core` /
  `promo-core`) before moving hooks and presentational page-folder components, so both the frontend
  and `functions/` coverage ratchets rose across the run.

## Now — production hardening & go-live confidence

The app already auto-deploys to **Firebase Hosting** (canonical) and the Vercel/Cloudflare/Netlify
mirrors on every merge to `main`. "Now" is about making that production footprint fully trustworthy.

- **[platform]** Flip and verify the production secrets — Firebase config · App Check key · Stripe
  price IDs — and deploy `firestore.rules`. See `archive/docs/RUNBOOK-cutover.md` and `docs/BILLING.md`.
- **[platform]** ~~Close the backend money-path test gap.~~ **Done.** The entitlement-granting
  `claimFoundingAccess` callable, the Moyasar billing callables (`confirmPayment` /
  `cancelAutoRenew` / `createCheckoutConfig` / `getReferralCode`), the scheduled auto-renewal charge
  loop, and the gateway route/streaming/App-Check paths are now under test; `functions/` coverage is
  98% lines / 90% branches with the ratchet raised to match. See `docs/TESTING-ROADMAP.md`
  **Phase 5** (complete).
- **[platform]** **Scope CI credentials least-privilege as they're provisioned.** An OAuth/token
  scope-minimization review (Aug 2026) found the current surface already minimal — every workflow's
  `GITHUB_TOKEN` is default-deny (`contents: read`, repo default confirmed `read`) with write escalated
  only per-job, and Google sign-in requests only default `openid/email/profile` (no `addScope`). It
  also found **no third-party CI credentials exist yet** — Cloudflare/Supabase/OpenAI/App-Store-Connect
  secrets are all unset and their jobs no-op. When each is added, scope it minimally and keep it
  confined to its one job: `CLOUDFLARE_API_TOKEN` → `Workers Scripts: Edit` only; `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY` → the `docs-parser` embeddings job only; App Store Connect key → App Manager, not
    Admin; the Firebase deploy SA stays **without** `datastore.indexAdmin` (see the note in `deploy.yml`).
    Separately, periodically review the operator-account **claude.ai MCP connector** consent grants
    (Airtable, Gmail, Drive, etc.) — third-party delegated grants that live outside this repo.
- **[platform]** Enable **App Check enforcement** on the backend Functions once real traffic is
  sending valid tokens. See `docs/APP-CHECK-BACKEND.md`.
- **[product]** Regenerate the **social/OG card** PNG in the new typeface. The share-card template
  now renders in **Readex Pro** (the Cairo→Readex swap shipped); only the PNG re-render remains — it
  needs Google Fonts (`fonts.gstatic.com`) network access:
  `node archive/scripts/scripts/build-og-card.mjs`.
- **[platform]** **Re-enable and enforce CI.** The GitHub Actions **CI workflow is currently
  disabled** (`disabled_manually`), so no build/e2e/functions job runs on pushes or PRs — re-enable
  it under **Actions → CI → Enable workflow**. Then make the `build` (the `verify` chain), `e2e`,
  and `functions` jobs required checks on `main`, and use descriptive squash-merge titles — recent
  history (`sd (#215)`, `j (#209)`, `,m (#208)`) doesn't self-describe, which matters for an open
  educational repo.
- **[platform]** **Fix the Cloudflare Workers git integration.** The `Workers Builds: flygaca`
  check fails on every commit: the Cloudflare dashboard integration targets a Worker named
  `flygaca`, while the repo deploys `flygaca-app` (`wrangler.toml`, `deploy-cloudflare.yml`). This
  is a **dashboard-side** fix — repoint the integration at `flygaca-app` or disconnect it (the
  repo's deploy path is the `deploy-cloudflare.yml` Action, unaffected). Diagnosed in
  [#253](https://github.com/FlyGACA/FlyGACA-app/pull/253).
- **[platform]** **Dependency hygiene.** Clear the open Dependabot alerts on `main` (2 high, 4
  moderate at last check) and adopt a recurring update cadence (Dependabot config or a scheduled
  bump) so security debt doesn't accrue between feature work.

## Next — this quarter-ish

- **[platform]** **Native iOS/Android.** Generate the Capacitor platform projects (needs a Mac),
  then wire native Apple/Google sign-in, RevenueCat IAP (the `native-billing` branch), deep links,
  and app icons/splash. See `docs/RUNBOOK-native.md`. Includes **passkeys / biometric unlock** for
  the persistent "active flight line" session — deferred from the sign-in redesign because it needs
  the native shell.
- **[platform]** **Performance budget.** Add a Lighthouse/perf gate in CI to sit alongside the
  initial-JS bundle budget already enforced by `scripts/check-bundle.mjs` (188 kB gzip today —
  the script is the source of truth).
- **[platform]** **Shard the heavy data payloads.** `airports-extra.json` (21 MB) and
  `library-search.json` (19 MB) are each fetched as a single blob today; shard them (by
  region/ICAO prefix and by corpus/Part or term-prefix buckets) so the first search on a mobile
  connection doesn't wait on the whole index. Confirm `rag-chunks.json` (14 MB) is only consumed
  server-side and stop shipping it under `public/data/` if so. Keep `src/lib/content.ts`
  (`loadJson` promise cache) as the single fetch path and preserve the two-tier NetworkFirst
  cache split in `vite.config.ts` when shard names change.
- **[platform]** **Emit semantic corpus links upstream.** The offline pipeline that builds
  `library-search.json` / `definitions-index.json` / the curated `paths`·`groundschool`·`quiz`
  files still emits legacy `document.html?…` URLs; `npm run data:normalize` heals them on each sync
  meanwhile. Patch the builder to emit the semantic shape natively, then retire the normalize step
  — exact diff and cleanup steps in [`docs/corpus-link-shape.md`](docs/corpus-link-shape.md).
- **[platform]** **App Check on `/api/content`.** When the content endpoint goes live, attach the
  same `X-Firebase-AppCheck` header `sendChat` already sends (noted in `src/lib/api.ts`).
- **[platform]** **E2E coverage.** Extend the Playwright suite (`e2e/`) beyond today's smoke +
  axe a11y checks to cover more critical flows — signed-in surfaces, mocked checkout, study flows,
  the flavor route tree. Concrete flow list: `docs/TESTING-ROADMAP.md` **Phase 8**.
- **[product]** **SEO phases 2–4.** Clause-level anchors, surfacing the highest-demand clauses in
  the sitemap, and tool↔library cross-links. See `SEO-PLAN.md`.

## Tech debt — found during the July 2026 cleanup, deliberately deferred

Verified during the repo cleanup and left outside its low-risk scope. None is a bug; recorded so
the findings are not re-derived.

- **[platform]** **`loadRegulationsLookup` has no callers.** `src/lib/content.ts` exposes it, but
  nothing calls it. The JSON itself is no longer orphaned — `/library/map` (motions round 2) reads
  `public/data/regulations-lookup.json` directly via `useFetchJson` for the constellation edges,
  so the `parse-regulations` pipeline output has a reader again. Remaining decision: point
  `LibraryMap` at the shared loader/type (or retire the loader), and optionally wire the
  cross-reference lookup into the library reader too.
- **[platform]** **~64 dead i18n keys.** Verified unreferenced across all source files. Cleanest
  cluster is the entire `command.*` namespace (superseded by `cmdk.*`, which is what
  `CommandPalette.tsx` reads) plus `home.*` leftovers from the bento redesign. **A future sweep must
  not be automated naively:** ~400+ further keys resolve only through template literals
  (`guides.items.**`, `wx.code.*`, `notam.abbr.*` via `returnObjects`, `tools.items.*`, the bare
  `account.${key}` in `LogbookTable.tsx`) and a literal-match pass will call all of them dead.
  Re-run against current `main` first — the Moyasar work added a live `checkout.*` namespace.
- **[platform]** ~~**`functions/src/gateway.ts` (578 lines) holds pure logic that belongs in a `*-core`.**
  `parseCookies`, `parseRequest` + the message/history caps, and the security-sensitive
  `isAllowedOrigin` CORS policy have no Firebase deps; `functions/tests/gateway.test.ts` has to mock
  `firebase-admin` + genkit just to unit-test `parseRequest`. A `gateway-core.ts` would let those be
  tested with a bare import, like every other core.~~ **Done.** `functions/src/gateway-core.ts` now
  holds `parseCookies`, `parseRequest` + the caps, and the `isAllowedOrigin` CORS allowlist — all
  tested with a bare import in `functions/tests/gateway-core.test.ts` (no `firebase-admin`/genkit
  mocks). The one pure helper still inline in `gateway.ts` is the ~7-line `anonQuotaKey` (a PDPL-safe
  truncated SHA-256 IP hash), deliberately left: it's already covered via the `/chat` route and a
  standalone lift buys little. See `docs/TESTING-ROADMAP.md` (records it as "now optional").
- **[platform]** ~~**Files worth splitting:** `functions/src/billing.ts` (669, after the Moyasar
  rewrite), `Chat.tsx` (572), `Document.tsx` (513).~~ **Done.** All five oversized pages/modules were
  split along house seams with zero behavior change (Aug 2026) — see **Recently shipped**
  ("Oversized file splits").

## Later — exploratory / post-launch

- **[product]** Content & tools expansion — more guides, quiz banks, and reading paths, deeper
  ground school, and new calculators as the corpus grows.
- **[product]** **Interactive features — further motion packs.** What's left in the catalog after
  rounds 3–7 shipped: turn-circle diagrams (`standard-rate-turn` / `turn-performance`), a
  `takeoff-landing` runway-margin bar, a wind-table compass rose, motion for the crosswind
  `WindDiagram` (the reference diagram is still the static one), and a `/updates` change pulse —
  each preserving the one-focal-loop rule.
- **[product]** Captain Adel enhancements — richer grounding and exam-mode ties. (Saved-chat UX,
  including archive search, is shipped — see **Recently shipped**.)
- **[product]** **Study analytics — deeper insights.** `StudyDashboard` already surfaces
  weakest-topic focus areas, an exam-history trend, and streak milestones (7/30/100/365) off
  `src/lib/studyProgress.ts`. The increment: per-topic mastery _trend over time_, an
  exam-readiness signal, and instructor-facing progress views.
- **[product]** **Instructor multi-student roster & endorsement tracking** — a roster of a CFI's
  students with flight-status and pending-endorsement signals. **Backend-dependent**: needs
  server-side student↔instructor relationships that don't exist yet, so it was deliberately left
  out of the frontend-only dashboard redesign (whose instructor view centres on the CFI's own
  records/references instead).
- **[product]** **Airspace HUD v2 — parked, needs a better idea.** v1 shipped and was removed
  (see **Recently shipped**): a simulated-traffic globe that looked impressive and taught nothing.
  The surviving half is the per-aerodrome radar scope, which works precisely because it is
  anchored to a real aerodrome and its real control zones. Any v2 must be anchored in real
  airspace data, answer a question somebody actually has, cite the governing GACAR reference,
  and be worth its bilingual maintenance cost — the two candidate directions (an airspace
  explorer along a route, or a published-procedure visualiser) are written up in
  `docs/DESIGN-airspace-hud-v2.md`. Doing nothing is an acceptable outcome.
- **[platform]** Push notifications and native polish once the mobile shells ship.
- **[platform]** **Observability.** Client error monitoring (e.g. Sentry) and privacy-respecting
  usage analytics (page + tool usage only, no PII) to learn which of the 55 tools earn their
  maintenance. Both dynamic-`import()`ed like the Firebase SDK so the initial-JS budget
  (`scripts/check-bundle.mjs`) holds, and
  any new origin added to the CSP deliberately — never wildcards.
- **[docs]** **Contributor onboarding.** `CONTRIBUTING.md` (the `verify` gate, i18n-parity rule,
  tokens/logical-properties rule, and the add-a-tool recipe from `CLAUDE.md`) plus issue/PR
  templates in `.github/`, including a "regulation drift" template for content corrections.
- **[docs]** README screenshots (`docs/screenshots/`) and marketing assets.

## How we ship (Definition of Done)

Carried over from the rebuild — these gates still apply to everything above.

- Local gate before every commit: `npm run typecheck && npm run lint && npm run test && npm run build`.
- Every surface is **routed + bilingual + disclaimered**: a key in **both** `src/i18n/{en,ar}.json`
  (`tests/i18n-parity.test.ts` is the gate), and the not-affiliated **`<Disclaimer />`** is used,
  never inlined or reworded.
- **Tokens + CSS Modules + logical properties only** — no hard-coded colours, no physical
  `left`/`right`.
- Respect the bundle budget; keep heavy assets (the ~19 MB `library-search.json`, ebooks, charts)
  lazy/streamed.
- Push; CI runs; address review/CI events. Preview smoke (routes 200) before merge.

## Conventions (reuse — do not reinvent)

- **Tools** = pure math in `src/calc/<tool>.ts` (+ Vitest spec) rendered via `CalcShell` +
  `useUrlState`. Reference: `src/calc/crosswind.ts` + `src/pages/tools/Crosswind.tsx`.
- **Data pages** fetch JSON via `useFetchJson` → typed shapes in `src/lib/content.ts`; heavy assets
  stay lazy.
- **Routing** is the single table in `src/router.tsx`; pages live one-per-folder under `src/pages/`.
- **i18n / RTL**: `src/i18n/index.ts` mirrors the language choice onto `<html lang/dir>` so RTL
  flips document-wide.

## Legacy sources of truth

The original no-build PWA (the vanilla Fly GACA site, whose source is not in this GitHub org)
remains the reference when porting anything new:
`flygaca/assets/js/{auth,store,entitlements,billing,native-bridge,firebase-*}.js`,
`flygaca/config/routes.js` (CSP), `flygaca/firestore.rules`, the `tools-*.js` family and `*-core.js`
math, and `flygaca/assets/data/*`.
