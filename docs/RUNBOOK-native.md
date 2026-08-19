# RUNBOOK — native (Capacitor) shell

> ⚠️ **Restored from `ay2m/FlyGACA-app` history, predating the Cloud Run rebuild.**
> Parts of this document still describe the retired Firebase / Firestore / App Check /
> Stripe stack. The live architecture is an Express service on **Cloud Run** backed by
> **Cloud SQL**, billed through **Moyasar** — see `CLAUDE.md`. Anything Firebase- or
> Stripe-specific below is history, not the system. The `apple/` tree it may reference
> was retired; the iOS family lives in `ay2m/FlyGACA-ios`.

Fly GACA ships the same Vite build as a native app via Capacitor. **iOS is the primary target**;
Android is a supported scaffold. The web payload in `dist/` is the WebView content — there is no
separate native codebase, only the platform projects Capacitor generates plus the thin
`src/lib/native/nativeBridge.ts` adapter.

## What lives where

- `capacitor.config.ts` — appId `com.flygaca.app`, `webDir: dist`, dark background, manual splash
  hide, keyboard resize. **Edit this, not the generated platform files.**
- `src/lib/native/nativeBridge.ts` — the runtime adapter. `isNative()`/`platform()`/`billingChannel()`
  are safe on the web; `initNative()` (called from `main.tsx`) configures the status bar, hides the
  splash, marks `<html class="is-native platform-…">`, and wires the Android back button + deep
  links. `nativeStore`, `share()`, `openExternal()` fall back to web APIs in a browser. Plugins are
  `import()`-ed lazily so the web bundle ships only `@capacitor/core`.
- `src/styles/native.css` — safe-area insets (notch / home indicator), applied only under
  `html.is-native`; the web is unaffected (`--safe-*` stay `0px`).

## Generating the iOS project for Xcode

The `ios/` and `android/` folders are **generated on the build machine, never committed** —
`.gitignore` excludes both. `scripts/flavor-ios.mjs` regenerates `ios/` from scratch for **one
flavor at a time**, so a committed project would always be the wrong app. Capacitor 8 resolves
native dependencies through **Swift Package Manager** (`ios/App/CapApp-SPM/Package.swift`), so
**CocoaPods is not required** for iOS; Android's `add` step needs Android Studio + JDK.

First time on a Mac, from the repo root:

```bash
npm install                   # SPM references node_modules/@capacitor/* by relative path — install first
npm run build                 # produce dist/ — cap copies it into the shell
npx cap add ios               # generate ios/ (once per machine, or per flavor via npm run flavor:ios)
npx cap sync ios              # copy web assets + regenerate Package.swift / config
npm run cap:localize          # re-apply the Arabic app name to the fresh project
npm run cap:open              # open ios/App/App.xcodeproj in Xcode
```

In Xcode, let SPM finish resolving packages, set your signing team on the **App** target, then
build/run. The day-to-day loop after any web change is just **`npm run cap:sync`** (or
`npx cap sync ios`) then build/run from Xcode.

> Android is **not** committed — it remains a generated scaffold. Create it on the build machine
> with `npx cap add android` (needs Android Studio + JDK) when you need it.

## Arabic app-name localization

The WebView content is already fully bilingual + RTL (`src/i18n`), but the **native app name** shown
under the home-screen icon comes from the iOS bundle, not the web layer. To localize it, the shell
carries per-language `InfoPlist.strings` that override `CFBundleDisplayName` / `CFBundleName`:

- `ios/App/App/en.lproj/InfoPlist.strings` → `Fly GACA`
- `ios/App/App/ar.lproj/InfoPlist.strings` → `فلاي جاكا`

Both mirror `common.appName` in the matching `src/i18n/*.json` bundle, so the native name matches the
brand everywhere. Neither file is tracked in git — like the rest of `ios/`, they are generated.
`scripts/native/ios-localize.mjs` holds the localized names (`LOCALES` at the top of the file) and
writes both `.strings` files, so `npm run cap:localize` recreates them after every `cap add ios`.
**That script is the localization source of truth** — change the app name there, not in the
generated bundle.

The `.strings` files only take effect once the Xcode project knows about Arabic and links the
localized group. That wiring lives in `ios/App/App.xcodeproj/project.pbxproj` (generated on the Mac).

### Automated (recommended)

Run the setup script **once, on macOS, right after `cap add ios`**:

```bash
npm run cap:localize          # node scripts/native/ios-localize.mjs
```

It parses `project.pbxproj` with Apple's `plutil` (no fragile text munging) and idempotently:

- adds `ar` / `en` / `Base` to the project's `knownRegions`;
- links `InfoPlist.strings` as a localized variant group in the App target's resources — or, if the
  generated project uses Xcode-16 synchronized folder groups, leaves the auto-included `.lproj`
  files alone;
- ensures `Info.plist` carries `CFBundleDisplayName` / `CFBundleName` and declares
  `CFBundleLocalizations = ["en", "ar"]`.

Re-running is safe (it no-ops when already wired). Open the project in Xcode once afterwards so it
normalizes the `pbxproj` formatting before you commit `ios/`.

### Manual (Xcode GUI equivalent)

If you'd rather click through it, the script mirrors these steps:

1. **Register the region** — select the **App** project (blue icon) → **Info** tab →
   **Localizations** → **+** → choose **Arabic (ar)**, accept the default file selection. This adds
   `ar` to the project's `knownRegions`.
2. **Add the base strings file** — in the Project navigator, right-click the **App** group →
   **Add Files to "App"…** → select `ios/App/App/en.lproj/InfoPlist.strings` → **Add**. Xcode
   recognizes the `.lproj` and creates the localized (variant) group.
3. **Link Arabic** — select the added `InfoPlist.strings` → **File inspector** → under
   **Localization**, tick **Arabic**. Because `ar.lproj/InfoPlist.strings` already exists, Xcode
   links it automatically into the same variant group.

Verify by launching on a simulator set to Arabic (**Settings → General → Language & Region →
العربية**): the home-screen label should read **فلاي جاكا**. `npm run cap:sync` does not touch these
files, so the localization survives day-to-day syncs.

## iOS best practices — apply to every generated project

Because `ios/` is regenerated rather than committed, these settings must be re-applied after
every `npx cap add ios`. The per-flavor pipeline scripts them (see "Per-flavor app pipeline"
below); this section is the reference for what they do and why.

- **`WKAppBoundDomains` (required).** `capacitor.config.ts` sets
  `limitsNavigationsToAppBoundDomains: true`, which only takes effect — and, if left unpaired,
  can break in-app navigation — when Info.plist carries a matching `WKAppBoundDomains` array.
  Entries: `localhost` (the Capacitor server origin) and `flygaca.com` (universal-link
  continuity). Keep the list ≤ 10 (WebKit's hard cap).
- **Privacy manifest (required for submission).** Apple requires a `PrivacyInfo.xcprivacy`
  declaring data collection and required-reason API usage. The checked-in template lives at
  `native/ios/PrivacyInfo.xcprivacy`: no tracking, no collected data, UserDefaults reason
  `CA92.1` (from `@capacitor/preferences`). If the Capacitor template already ships a manifest,
  merge declarations rather than duplicating the file. Revisit the declarations before adding
  any data-collecting SDK (Firebase, RevenueCat, analytics).
- **App Transport Security.** Leave ATS at its secure defaults — every endpoint the app talks
  to is HTTPS. Do **not** add `NSAllowsArbitraryLoads` or per-domain exceptions; App Review
  asks for justification and nothing here needs one.
- **Signing.** Use automatic signing with the team account; no manual provisioning profiles.
  Set `ITSAppUsesNonExemptEncryption` to `NO` in Info.plist (the app uses only standard HTTPS)
  so every TestFlight upload skips the export-compliance questionnaire.
- **Deployment target.** Keep the Capacitor default for the installed major (verify with
  `npx cap doctor` after `cap add ios`); do not lower it — plugins are only tested against the
  default floor.
- **Versioning.** `MARKETING_VERSION` tracks `package.json` `version`; bump
  `CURRENT_PROJECT_VERSION` on every TestFlight upload (the pipeline stamps both).

## App icons & splash

Source art lives outside the generated project so it survives regeneration:

- Put a 1024×1024 `icon.png` (no alpha for the App Store icon) plus `splash.png` /
  `splash-dark.png` (2732×2732, artwork centred) under `native/assets/<flavor>/`.
- Generate the sets with `npx @capacitor/assets generate --ios --assetPath native/assets/<flavor>`
  after `cap add ios`. Never hand-edit `Assets.xcassets`.

## TestFlight / App Store checklist

1. `npm run cap:sync` (or the per-flavor pipeline) → open Xcode → select *Any iOS Device* →
   Product ▸ Archive → Distribute App ▸ App Store Connect.
2. App Store Connect → App Privacy: the prep-pack flavor apps truthfully declare
   **"Data Not Collected"** (no accounts, no analytics, no third-party SDKs). The main app's
   answers must instead reflect Firebase Auth/Firestore usage.
3. Screenshots: 6.9" and 6.5" iPhone sets minimum; show the app's actual study content
   (each flavor's own pack — this is also the 4.3 spam-review defense, see
   `docs/STORE-SUITE.md`).
4. Review notes: state that the app is an independent educational tool **not affiliated with
   GACA** (mirroring the in-app disclaimer) and that all content works offline with no login.
5. After approval: keep phased release on; verify the installed app cold-launches offline
   (airplane mode) before releasing to 100%.

## Per-flavor app pipeline (the standalone prep-app suite)

Each live paid prep pack ships as its own **paid-upfront** App Store app (the
ASA/Gleim model — see `docs/STORE-SUITE.md` for the store strategy). The flavor
registry (`src/flavors/registry.ts`) is the source of truth: pack ↔ bundle id ↔
names ↔ manifest. Owning the app IS owning the pack (`FLAVOR_GRANTED_PACK_IDS`
→ `hasPackAccess`), so the apps have no sign-in, no IAP SDK, no Firebase, and
work fully offline from first launch.

```bash
npm run build:flavor -- elp    # sliced, branded web bundle in dist/ (any OS)
npm run preview                # click through it at localhost, incl. offline
npm run flavor:ios -- elp      # macOS: fresh ios/ + best-practice config + art + Xcode
```

- `build:flavor` stages the pack's data slice under `.flavor/<id>/public/`
  (only that pack's quiz banks, ground-school modules, paths, sheets, and every
  corpus doc its content cites — `scripts/lib/flavor-slice.mjs`), then builds
  with `VITE_APP_FLAVOR` set. The service worker precaches the whole slice.
  Needs Node ≥ 22.18 (imports the TS registry directly).
- `flavor:ios` regenerates `ios/` from scratch for the chosen flavor (so
  `ios/`/`android/` stay generated-never-committed — they are fully gitignored),
  then applies the best-practice plist config above via PlistBuddy and runs
  `@capacitor/assets` with `native/assets/<id>/` art.
- **One flavor at a time**: `dist/` and `ios/` always hold the last flavor
  built. Rebuild when switching; nothing is shared between flavor archives.
- The main web app is untouched: with `VITE_APP_FLAVOR` unset every build is
  the full Fly GACA app, byte-for-byte (`npm run verify` + the flavor tests pin
  this).

Known gaps, acceptable for v1: reading-path steps that deep-link into surfaces
a flavor app doesn't mount (e.g. `/tools/*`) land on the in-app NotFound page,
and the flavor bundle still carries the main app's never-fetched lazy route
chunks (~2 MB of dead weight in the shipped binary). Both are follow-ups, not
blockers.

## Things the native shell still needs (later stages)

- **Auth / IAP:** native Apple/Google sign-in and RevenueCat IAP are part of Stage 3 (real
  Firebase + billing). `billingChannel()` already returns `revenuecat` on iOS; the plugins
  (`@capacitor-firebase/authentication`, `@revenuecat/purchases-capacitor`) are added in the shell.
- **Deep links:** universal links (`https://flygaca.com/…`) and the `com.flygaca.app://` scheme
  both resolve through `toAppPath()` → the SPA router. Configure the Associated Domains entitlement
  (iOS) / intent filters (Android) when wiring real domains.
- **App icons / splash:** drop source art and run `@capacitor/assets` to generate the sets.
