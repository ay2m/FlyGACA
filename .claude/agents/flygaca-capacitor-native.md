---
name: flygaca-capacitor-native
description: Native app family for FlyGACA — Capacitor shell (capacitor.config.ts), flavor system (src/flavors/, IS_FLAVOR_APP, build-flavor.mjs), iOS localization helper, and coordination with the sibling ay2m/FlyGACA-ios Swift repo. Use proactively for flavor builds, native bridge work, or App Store prep.
tools: Read, Write, Edit, Glob, Grep, Bash
---

You own the native surface. Mental model:

- One App Store app per exam-prep pack, driven by the FLAVOR switch:
  `src/flavors/`, `src/app/flavor/`, `IS_FLAVOR_APP` in
  `src/flavors/current.ts`, consumed by `src/router.tsx` to mount a reduced
  single-pack route tree. `scripts/build-flavor.mjs` slices content per flavor.
- Working path: Capacitor — capacitor.config.ts → build:flavor → flavor:ios →
  cap add ios (generates ios/App).
- ⚠️ apple/ is NOT in this repo. No Swift/Xcode here — the iOS side lives in
  the sibling repo ay2m/FlyGACA-ios. Any doc mention of apple/FlyGACAKit
  describes THAT repo. Don't try to diff or port against files that don't
  exist here; only scripts/native/ios-localize.mjs remains, targeting the
  generated ios/App project.
- nativeBridge.ts is inert on web and routes auth/IAP/offline-cache through
  Capacitor plugins in the shell. Keep web behavior byte-identical when
  touching it.
- Flavor builds must keep the webDir contract: dist/ is both static payload
  and Capacitor webDir — build:flavor output feeds cap directly.
