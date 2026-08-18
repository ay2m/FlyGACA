/**
 * Flavor (white-label) registry — the structure behind the standalone exam-prep
 * app suite (the ASA/Gleim model: one focused native app per certificate or
 * subject pack, built from this same codebase).
 *
 * PURE DATA ONLY. This module is imported from three worlds — the app bundle
 * (via `src/flavors/current.ts`), `vite.config.ts` and `capacitor.config.ts`
 * (both Node) — so it must stay free of `import.meta`, React, DOM and i18n.
 * User-facing pack names/blurbs stay in i18n (`study.packCatalog.<id>`); this
 * registry holds only structure, mirroring `src/lib/tools.ts` / `prepCatalog.ts`.
 *
 * `main` is the full Fly GACA app (the default when `VITE_APP_FLAVOR` is unset)
 * and its `manifest` MUST mirror the PWA manifest literals in `vite.config.ts`
 * verbatim — `tests/flavors.test.ts` guards that. Every other flavor is a
 * paid-upfront App Store product whose pack unlocks by construction (owning the
 * app IS owning the pack — see `FLAVOR_GRANTED_PACK_IDS` in `current.ts`).
 * Store-listing strategy (names, pricing, App Bundle) lives in
 * `docs/STORE-SUITE.md`.
 */

export type FlavorId = 'main' | 'elp' | 'ppl-exam' | 'conversion' | 'medical' | 'aip';

export interface FlavorManifest {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
}

export interface Flavor {
  id: FlavorId;
  /** The pack this app IS. Unset only for `main`. Must be a live+paid pack id. */
  packId?: string;
  /** iOS bundle id / Android application id. */
  appId: string;
  /** Native display name (Capacitor `appName` / CFBundleDisplayName — keep short). */
  appName: string;
  /** Header wordmark halves (the two-tone split: Fly|GACA, ELPT|Prep, …). */
  wordmark: { primary: string; secondary: string };
  /** PWA webmanifest fields; `main` mirrors vite.config.ts's literals exactly. */
  manifest: FlavorManifest;
  /**
   * Where the "Get the full Fly GACA app" cross-promo points. Swap to the main
   * app's App Store product page once it ships (see docs/STORE-SUITE.md — never
   * point this at a page that sells digital content).
   */
  crossPromoUrl: string;
}

const FALCON_DARK = '#0A0E12';
const CROSS_PROMO = 'https://flygaca.com';

export const FLAVORS: Record<FlavorId, Flavor> = {
  main: {
    id: 'main',
    appId: 'com.flygaca.app',
    appName: 'FlyGACA',
    wordmark: { primary: 'Fly', secondary: 'GACA' },
    manifest: {
      name: 'Fly GACA — Saudi Aviation Library',
      shortName: 'Fly GACA',
      description:
        "A fast, free reference library of Saudi civil-aviation regulations (GACAR) for the Kingdom's pilots, instructors and cadets.",
      themeColor: FALCON_DARK,
    },
    crossPromoUrl: CROSS_PROMO,
  },
  elp: {
    id: 'elp',
    packId: 'elp',
    appId: 'com.flygaca.prep.elp',
    appName: 'ELPT Prep',
    wordmark: { primary: 'ELPT', secondary: 'Prep' },
    manifest: {
      name: 'ELPT Prep by Fly GACA',
      shortName: 'ELPT Prep',
      description:
        'Prepare for the Saudi aviation English Language Proficiency Test: radio-phraseology question bank, flashcards, timed mock exam and the SAELPT study sheet — fully offline.',
      themeColor: FALCON_DARK,
    },
    crossPromoUrl: CROSS_PROMO,
  },
  'ppl-exam': {
    id: 'ppl-exam',
    packId: 'ppl-exam',
    appId: 'com.flygaca.prep.ppl',
    appName: 'Saudi PPL Prep',
    wordmark: { primary: 'PPL', secondary: 'Prep' },
    manifest: {
      name: 'Saudi PPL Exam Prep by Fly GACA',
      shortName: 'PPL Prep',
      description:
        'The complete Saudi PPL written-exam prep: every topic question bank, the full ground school, reading path, study sheet and a timed mock exam — fully offline.',
      themeColor: FALCON_DARK,
    },
    crossPromoUrl: CROSS_PROMO,
  },
  conversion: {
    id: 'conversion',
    packId: 'conversion',
    appId: 'com.flygaca.prep.conversion',
    appName: 'Licence Conversion',
    wordmark: { primary: 'Conversion', secondary: 'Prep' },
    manifest: {
      name: 'Saudi Licence Conversion Prep by Fly GACA',
      shortName: 'Conversion',
      description:
        'Convert a foreign pilot licence in Saudi Arabia: air-law and licensing question banks, the conversion reading path and study sheet — fully offline.',
      themeColor: FALCON_DARK,
    },
    crossPromoUrl: CROSS_PROMO,
  },
  medical: {
    id: 'medical',
    packId: 'medical',
    appId: 'com.flygaca.prep.medical',
    appName: 'Aviation Medical',
    wordmark: { primary: 'Medical', secondary: 'Prep' },
    manifest: {
      name: 'Saudi Aviation Medical Prep by Fly GACA',
      shortName: 'Medical Prep',
      description:
        'Prepare for the GACA Class 1 medical: medical and human-factors question banks, the aviation-medical reading path and study sheet — fully offline.',
      themeColor: FALCON_DARK,
    },
    crossPromoUrl: CROSS_PROMO,
  },
  aip: {
    id: 'aip',
    packId: 'aip',
    appId: 'com.flygaca.prep.aip',
    appName: 'Saudi AIP Prep',
    wordmark: { primary: 'AIP', secondary: 'Prep' },
    manifest: {
      name: 'Saudi AIP Prep by Fly GACA',
      shortName: 'AIP Prep',
      description:
        'Master the Saudi AIP: AIS and airspace question banks, key GEN/ENR sections for offline reading, and bilingual study sheets — fully offline.',
      themeColor: FALCON_DARK,
    },
    crossPromoUrl: CROSS_PROMO,
  },
};

export const FLAVOR_IDS = Object.keys(FLAVORS) as FlavorId[];

/** Narrow an env-provided string to a known flavor id (unknown → undefined). */
export function toFlavorId(raw: string | undefined | null): FlavorId | undefined {
  return raw && Object.prototype.hasOwnProperty.call(FLAVORS, raw) ? (raw as FlavorId) : undefined;
}
