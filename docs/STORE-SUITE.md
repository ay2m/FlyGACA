# Store strategy — the Fly GACA exam-prep app suite

> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

How the standalone prep apps (built by the per-flavor pipeline in
`docs/RUNBOOK-native.md`) go to the App Store as a family, the ASA
Prepware / Gleim way: one focused, paid-upfront app per certificate or
subject, plus an App Store Connect **App Bundle** for the buy-the-suite
discount.

## The lineup

| Flavor id    | Pack         | Bundle id                     | Device name        | Suggested App Store name (≤30 chars) |
| ------------ | ------------ | ----------------------------- | ------------------ | ------------------------------------ |
| `elp`        | `elp`        | `com.flygaca.prep.elp`        | ELPT Prep          | ELPT Prep — Saudi Aviation           |
| `conversion` | `conversion` | `com.flygaca.prep.conversion` | Licence Conversion | Saudi Licence Conversion Prep        |
| `medical`    | `medical`    | `com.flygaca.prep.medical`    | Aviation Medical   | Saudi Aviation Medical Prep          |
| `aip`        | `aip`        | `com.flygaca.prep.aip`        | Saudi AIP Prep     | Saudi AIP Study Guide                |

First wave: **ELPT + AIP** (prove the pipeline end-to-end, through review),
then stamp out Conversion / Medical.

> **⏸ The licence-exam flavors are paused.** `ppl-exam` was removed from
> `src/flavors/registry.ts` on 2026-08-10, alongside the native PPL/CPL/IR/ATPL
> apps (`docs/APPS-FAMILY-ROADMAP.md`). `cpl` / `ir` / `atpl` never had flavor
> entries. All four **packs remain live and selling on the web** — only the
> standalone apps stopped. Restoring one means re-adding its registry entry + art.

Note this flavor line (`com.flygaca.prep.*`, Capacitor, built by
`scripts/build-flavor.mjs`) is a **different product line** from the native
SwiftUI family in the `ay2m/FlyGACA` repo (`com.flygaca.*`, `FlyGACAKit`). Don't conflate them.

## Pricing

One-time paid-upfront, matching the web pack price (`PREP_PACK_PRICE_CERT` = 79 SAR,
`PREP_PACK_PRICE_SUBJECT` = 49 SAR — see `src/lib/prepCatalog.ts`) at the nearest
Saudi-storefront price tier. Keep web and App Store prices in
lockstep when either moves — divergence invites support pain and review
questions. Paid-upfront is also what makes the App Bundle possible (bundles
require paid apps) and keeps the apps IAP-free, offline, and account-free.

## Surviving App Review 4.3(b) (spam / app farms)

Apple pushes back on fleets of near-identical apps. The suite's defense is
that each app is **genuinely distinct content for a distinct audience** — the
same posture ASA, Gleim and Sporty's per-test apps hold on the store:

- Distinct name, subtitle, and keyword set per app (table above). Never
  keyword-stuff another certificate's terms into the wrong listing.
- Distinct icon accent + screenshots showing that pack's actual banks, mock
  exam and study sheets (`native/assets/README.md`).
- Distinct description leading with the specific exam it prepares you for.
- Review notes on every submission: independent educational tool, **not
  affiliated with GACA** (mirrors the in-app disclaimer), fully offline, no
  account required.
- If a 4.3 rejection sticks anyway: the fallback is consolidating into one
  "Fly GACA Prep" app selling packs as one-time IAP — the flavor architecture
  already supports it (see the appendix), so the fleet is an experiment we can
  reverse without rework.

## App Store Connect setup (per app)

1. New app: the bundle id from the table (create it in the developer portal
   first), primary language English, category Education (secondary Reference).
2. Localizations: English + Arabic (names/blurbs already exist in the i18n
   bundles under `study.packCatalog.*`).
3. **App Privacy: "Data Not Collected."** True only while the flavor apps ship
   without Firebase/analytics/IAP — revisit the answers if any SDK lands.
4. Pricing: the 39-SAR-equivalent tier, available in Saudi Arabia + worldwide.
5. After 2+ apps are live: create the **App Bundle** ("Fly GACA Prep Suite"),
   add each new app as it ships (max 10), price the bundle at a real discount.

## Cross-promo rules

The in-app "Get the full Fly GACA app" link (`crossPromoUrl` in the registry)
must point at the **main app's App Store product page** once it ships;
until then it points at `flygaca.com`. Never point it at a page that sells
digital content (pricing/packs) — that walks into 3.1.1 anti-steering
territory. Same rule for links between suite apps.

## Appendix — the free + IAP evolution (not built, deliberately)

If the fleet model underperforms or 4.3 forces consolidation:

1. Ship one app (or flip a flavor) with `FLAVOR_GRANTED_PACK_IDS` empty, so
   packs render their locked storefront state.
2. Add `@revenuecat/purchases-capacitor`; one non-consumable product per pack
   (`billingChannel()` in `src/lib/native/nativeBridge.ts` already answers
   `'revenuecat'` on iOS and the web checkout already refuses native).
3. Fulfil into the existing seam: RevenueCat webhook → Cloud Function →
   `packEntitlements/{uid}.packs.<id>` (exactly how the Stripe webhook grants
   web purchases in `functions/src/billing.ts`), or purely client-side
   ownership for account-free apps.
4. Update the App Privacy answers — "Data Not Collected" stops being true the
   moment RevenueCat ships.
