# Airspace HUD v2 — parked, pending a better idea

**Status:** v1 removed (`/hud` now redirects to `/tools`). Nothing is scheduled.
**Engine:** kept. `src/calc/hud/` still ships — see [What survived](#what-survived).

## Why v1 was removed

The Kingdom Airspace HUD was a simulated-traffic globe over Saudi airspace: a seeded
scenario, closed-form kinematics, a canvas globe, a vector list and a flight-detail card,
plus a home bento teaser. It was well-built and honest about being a simulation. It was
still the wrong feature, for two reasons.

**It didn't help anybody fly or study.** Fly GACA's job is helping you find, understand
and study Saudi civil-aviation regulation. Every other surface ties back to that: a tool
computes something you need, the library cites a Part, Captain Adel answers with a section
reference. The HUD showed invented aircraft flying invented routes. A pilot learned
nothing from it, and a student couldn't revise from it. It read as a tech demo on a
product whose credibility rests on not being one — and the harder it worked to look like
real radar, the more it traded on an authority it had no data to back.

**It carried real cost.** A canvas globe, an attitude indicator, a ticker, ~80 i18n keys
in two languages, and a route in the prerender/sitemap surface — all needing maintenance,
translation and review forever, for a page nobody came back to.

There was also a concrete bug that made the cost obvious: five files under `src/pages/hud/`
imported `./hud.module.css` while the file on disk was `Hud.module.css`. That resolves on
macOS and fails on Linux, so it broke `tests/static-pages-smoke.test.tsx` — and would have
broken any Linux CI build — while nobody noticed, because nobody was working on the page.
Deleting it fixed the suite.

## What survived

`src/calc/hud/` — the pure sim engine (`scenario`, `kinematics`, `projection`, `sectors`,
`geoKsa`, `callsigns`, `simMetar`, seeded `rng`) — is **still in the tree and still tested**
(`tests/hud/`). It is not dead code: `src/components/aerodrome/AerodromeScope.tsx` uses
`flightStateAt`, `projectRadar`, `buildScenario` and `simTimeAt` to draw the per-aerodrome
radar scope on `/tools/procedures/aerodromes/:icao`.

That scope is the part of the idea that *works*, and it is worth understanding why, because
it's the whole brief for v2: it is **anchored to something real**. You are looking at a
specific aerodrome, its actual nearby CTR/TMA rings, and traffic shown only to make the
airspace structure legible. The simulation is set dressing around real regulatory geography,
not the point of the screen.

v1 inverted that. The simulation *was* the screen.

## What a better v2 would need

Not a prettier globe. A reason to be on the page. Any v2 proposal should answer yes to all
four:

1. **Anchored in real data.** Real airspace geometry, real aerodromes, real published
   procedures — from the corpus already under `public/data/`. Simulated *traffic* is fine
   as illustration; simulated *airspace* is not.
2. **Answers a question somebody actually has.** "What airspace am I about to enter, and
   what does GACAR require of me there?" is a question. "What might traffic look like right
   now?" is not.
3. **Cites the regulation.** Like every other surface: clicking a zone should reach the Part
   and section that governs it. If it can't cite, it doesn't belong in this product.
4. **Earns its maintenance.** Bilingual copy, canvas rendering and a prerendered route are a
   standing tax. The feature must be worth paying it every quarter.

Two directions that plausibly clear that bar, both reusing the surviving engine:

- **Airspace explorer.** Pick a point or a route, see which CTR/TMA/restricted areas it
  crosses, and get the governing GACAR references for each. Real geography, real citations,
  a genuine planning question. Closest to the product's core.
- **Procedure visualiser.** Draw a published departure/arrival/hold against the aerodrome's
  real airspace, as a study aid for the procedures already in the library — the aerodrome
  scope grown up, rather than a separate destination.

A third option is honest and cheap: **do nothing.** The aerodrome scope already delivers the
defensible half of the idea. There is no obligation to rebuild the rest.

## If v2 is ever built

- Route `/hud` currently redirects to `/tools` (`src/router.tsx`). Reuse the path or retire
  the redirect deliberately — don't leave both.
- v1's full implementation is in git history (removed on branch
  `claude/moyasr-testing-secrets-pwckag`); recover the canvas globe, attitude indicator and
  ticker from there rather than rewriting them, if they still fit.
- The i18n keys were deleted from both bundles. `hud.ticker.sim` was the one key an external
  component used; it now lives at `aerodromesTool.simTag`.
- Keep the honesty posture v1 got right: training-only callsigns, explicit SIM labelling,
  and never implying live traffic. That part was never the problem.
