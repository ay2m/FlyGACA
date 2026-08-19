> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

> Working file of `docs/RUNBOOK-openseo.md` (openseo audit runs write here). The live SEO backlog is the root `SEO-PLAN.md`.

# Fly GACA — Technical SEO Audit

_Last reviewed: 2026-06-23 · Scope: the frontend app in this repo_

## Summary

Fly GACA already has a **strong, mature technical-SEO foundation** — among the most complete
you will find on a client-rendered SPA. Per-route metadata, bilingual hreflang, automated
sitemap/robots, canonicalization, duplicate/mirror-host handling, structured data, and an
optional prerender step are all in place and working.

This audit documents what exists (so it is not accidentally rebuilt or regressed), corrects
two inaccurate findings from an earlier draft audit, and lists the small set of genuine,
lower-priority opportunities that remain. **The headline takeaway: the technical foundation
is essentially complete; the growth lever for this site is content + keyword strategy, not
technical remediation** (see `strategy.md`).

## What is already implemented (do not rebuild)

| Area | Where | Notes |
| --- | --- | --- |
| Per-route `<title>` / meta description / OG / Twitter / canonical / hreflang / JSON-LD | `src/hooks/usePageMeta.ts` | Single runtime head manager; re-applies on language change so `og:locale` + hreflang stay correct. |
| Canonical + hreflang URL helpers | `src/lib/seo/seo.ts` | Clean param-free canonical; `?lang=en|ar` alternates + `x-default`. |
| Duplicate-host consolidation | `src/lib/seo/seo.ts` (`canonicalRedirect`, `DUPLICATE_HOSTS`) + `main.tsx` | Folds `captadel.com` / `www.captadel.com` onto the canonical origin at runtime. |
| Mirror-host `noindex` | `src/lib/seo/seo.ts` (`isMirrorHost`) | Only `*.web.app` (the `flygaca-app.web.app` Firebase alias) gets `noindex, follow`; the canonical host and the localhost prerender host are deliberately excluded. The Vercel / Netlify / Cloudflare mirrors were removed in 2026-08. |
| JSON-LD builders | `src/lib/seo/jsonld.ts` | `Organization`, `WebSite` (with `SearchAction`), `BreadcrumbList`, `TechArticle`, `Article`, `Course`, `FAQPage`, `SoftwareApplication`, and now `ItemList`. |
| Static Organization + WebSite graph | `index.html` | Present in initial HTML (no JS needed); per-route builders describe the current document. |
| Sitemap + robots | `scripts/build-sitemap.mjs` (runs pre-`vite build`) | ~400+ URLs from the router table + content indexes; per-URL `xhtml:link` hreflang; priority tiers; `lastmod` from content dates. Private/session-gated routes excluded. |
| Optional static prerender | `scripts/prerender.mjs` | Playwright renders public non-library routes + guide slugs to static HTML in the Firebase deploy pipeline; non-fatal so it can't break a deploy. |
| PWA manifest (EN + AR) + service worker | `vite.config.ts` (`vite-plugin-pwa`) | App-shell precache, `/data/*` network-first; per-language manifest swapped at runtime. |
| Search Console / Bing verification | `vite.config.ts` (`verificationMeta`) | Injected from `VITE_GSC_TOKEN` / `VITE_BING_TOKEN` env vars. |
| Per-route structured data wired in | Home (`FAQPage`), Library/Document (`TechArticle` + breadcrumb), Guides (`Article`), Study (`Course`), Tools (`SoftwareApplication` via `CalcShell`) | See `usePageMeta(...)` calls across `src/pages/**`. |

### Coverage check (verified 2026-06-23)
- **Every public, indexable route sets its own title/description.** The only page without
  `usePageMeta` is `src/pages/account/RequireSession.tsx` — a session-gated wrapper that is
  private and excluded from the sitemap, so this is correct, not a gap.
- **All 55 tool pages** are built on `CalcShell` (`src/components/CalcShell.tsx`), which calls
  `usePageMeta(title, intro, [softwareAppLd(...), breadcrumbLd(...)])`. They all have unique
  titles, descriptions, breadcrumbs and `SoftwareApplication` JSON-LD.
- **Sitemap includes all 55 tool routes and 18 guide routes** (verified against the generated
  `public/sitemap.xml`).

### Corrections to an earlier draft audit
Two findings circulated earlier that are **false** and should be disregarded:
1. _"49 tool pages lack `usePageMeta`."_ Incorrect — `CalcShell` provides it for every tool
   (the draft searched for direct calls in tool files and missed the shared shell).
2. _"FAQ JSON-LD only on Home."_ Incorrect — `About.tsx` and `Pricing.tsx` already emit
   `faqLd(...)` from their visible Q&A copy.

## Changes made

- **`ItemList` structured data on the catalog hubs.** New `itemListLd()` builder in
  `src/lib/seo/jsonld.ts` (unit-tested in `tests/lib/jsonld.test.ts`), wired into the Tools, Guides
  and Study indexes. The catalog pages previously exposed no list schema, so crawlers could
  not read them as ordered lists of their leaf pages.
- **Visible breadcrumb nav** (`src/components/Breadcrumbs.tsx`) on guide and library-document
  pages, fed by the same crumb array as the breadcrumb JSON-LD so the on-page nav and the
  structured data never drift.
- **Per-section Open Graph cards** for `/tools`, `/guides`, `/library`, `/study`, `/pricing`,
  generated from a branded SVG with `sharp` (`scripts/build-og-images.mjs`, `npm run gen:og`);
  `ogImageFor()` in `src/lib/seo/seo.ts` selects the card per path and `usePageMeta` applies it.
- **Two new content guides** (`how-to-become-a-pilot-in-saudi-arabia`, `gacar-explained`),
  bilingual, interlinking the licensing cluster, library Parts and tools — executing the
  highest-priority gaps from `strategy.md`.

All additive and low-risk; `typecheck`/`lint`/`test`/`build` stay green and i18n parity holds.

## Genuine remaining opportunities (prioritized, mostly optional)

| # | Opportunity | Why it matters | Effort | Status |
| --- | --- | --- | --- | --- |
| 1 | `ItemList` on the Tools and Guides hubs | Lets catalog pages surface as rich lists; helps crawlers map hub → leaf | S | **Done** |
| 2 | `ItemList` on the Study hub (`/study`) | Same benefit for the third catalog surface. (Library section hubs are in-page tabs, not routes, so not applicable.) | S | **Done** |
| 3 | Per-section Open Graph images (tools / guides / library / study / pricing) | Pages previously shared `/img/og-card.png`; differentiated cards lift social/share CTR | M | **Done** — generated from SVG via `sharp` (`scripts/build-og-images.mjs`) |
| 4 | Visible HTML breadcrumb nav (not only JSON-LD) on Library/Guides leaf pages | Reinforces IA for users and crawlers; reuses the existing crumb data | S–M | **Done** — `src/components/Breadcrumbs.tsx` |
| 5 | Preload the primary web font in `index.html` | Minor LCP/CLS improvement (Core Web Vitals) | S | Skipped — fonts already load non-blocking (preconnect + `media=print` flip + `display=swap`); a font-file preload risks Google Fonts URL churn for little gain |
| 6 | Ensure prerender runs (or an equivalent SSR/snapshot path) on the production host | The SPA depends on JS rendering for most routes; prerender is Vercel-only and non-fatal, so non-prerendered hosts serve a thinner initial HTML to crawlers | M–L | Monitor — verify on the live host |
| 7 | `HowTo` schema on calculators | Could match "how to calculate X" intent — but Google has largely deprecated HowTo rich results, so low ROI | S | Not recommended (low value) |

### Notes on rendering (item 6)
Modern Googlebot renders JavaScript, and the app paints a critical-CSS hero shell in
`index.html` before JS, so the SPA is crawlable. Still, server-rendered or prerendered HTML
is more robust for non-Google crawlers, social unfurlers, and consistency. The existing
`scripts/prerender.mjs` covers this on Vercel; if the production host changes, confirm an
equivalent snapshot/SSR path is in place. This is the only "structural" technical item and
is best validated against the live deployment rather than the repo.

## How to verify (regression checks)
- `npm run typecheck && npm run lint && npm run test && npm run build` — must stay green
  (the test suite includes i18n parity and the JSON-LD builder tests).
- After build, confirm `dist/sitemap.xml` exists and contains the tool/guide routes.
- Spot-check structured data on the running app: open `/tools`, `/guides`, `/about`,
  `/pricing` and confirm the injected `<script type="application/ld+json" data-managed-ld>`
  contains the expected `ItemList` / `FAQPage`. Validate shapes with Google's Rich Results
  Test against the deployed URLs.
- In Search Console: confirm the sitemap is submitted, coverage is clean, and the hreflang
  pairs (`?lang=en` / `?lang=ar` / `x-default`) report no errors.
