/**
 * Exam-prep catalog — the ASA/Gleim-style product line. Each pack is an organized,
 * per-certificate (or per-subject) bundle of existing study material (quiz banks,
 * ground-school modules, reading paths, study sheets). Structure lives here; the
 * user-facing name/desc are localized in i18n under `study.packCatalog.<id>`
 * (mirrors the Guides structure-in-TS pattern and `src/lib/tools.ts`).
 *
 * Monetization (see docs/BILLING.md):
 *  - `access: 'free'` packs are open to everyone.
 *  - `access: 'paid'` packs are a one-time SAR-{@link PREP_PACK_PRICE} purchase AND
 *    are included with any active Pro/School plan (and the Exam Season Pass, which
 *    grants plan `pro`). Access is decided by `hasPackAccess` in
 *    src/lib/packEntitlements.ts (owned OR active plan) — never by `useFeature`, so
 *    the FREE_FOR_EVERYONE promo can't silently open a paid pack.
 *  - `status: 'soon'` packs are announced but not yet shipped (no content, no detail
 *    route) — the tools-registry `status` pattern. Flip to `'live'` when content lands
 *    AND add the id to SELLABLE_PACK_IDS in functions/src/billing-core.ts to sell it.
 *
 * NOTE: the paid + live ids here MUST mirror `SELLABLE_PACK_IDS` in
 * functions/src/billing-core.ts (the server validates every purchase against it).
 * scripts/build-sitemap.mjs reads this file textually — keep the `id:`/`status:`
 * object literals on their own lines.
 */

/** A certificate/rating product (PPL, CPL…) or a focused subject pack. */
export type PackKind = 'certificate' | 'subject';

/** `live` packs ship today; `soon` packs are announced (waitlist only). */
export type PackStatus = 'live' | 'soon';

/** `free` packs are open; `paid` packs cost PREP_PACK_PRICE once (or come with Pro). */
export type PackAccess = 'free' | 'paid';

export interface Pack {
  id: string;
  kind: PackKind;
  status: PackStatus;
  access: PackAccess;
  /** quiz.json bank ids — also the pool for the pack's combined quiz + timed exam. */
  bankIds: string[];
  /** groundschool.json module ids. */
  moduleIds?: string[];
  /** paths-index.json path ids. */
  pathIds?: string[];
  /** pdfs-index.json slugs. */
  sheetSlugs?: string[];
  /** reference-index.json slugs — deeper corpus reading surfaced on the pack. */
  librarySlugs?: string[];
  /** Per-pack timed-exam overrides; unset falls back to quiz.json's `exam` block. */
  exam?: { questions?: number; minutes?: number; passMark?: number };
}

/**
 * One-time pack prices, in SAR. Certificate packs bundle a full licence's material
 * (topic banks + ground-school modules + a reading path + study sheet + its own timed
 * mock exam), so they price above single-subject packs. Mirror of the server price env
 * (`MOYASAR_PRICE_PREP_PACK_CERT_SAR` / `_SUBJECT_SAR`) and `amountForCheckout` in
 * functions/src/billing-core.ts.
 */
export const PREP_PACK_PRICE_CERT = 79;
export const PREP_PACK_PRICE_SUBJECT = 49;

/** Back-compat alias: the base (single-subject) one-time price. Some copy shows a
 * single "from" figure. Prefer {@link packPrice} for a specific pack. */
export const PREP_PACK_PRICE = PREP_PACK_PRICE_SUBJECT;

/**
 * All-Access Exam Bundle — every paid pack, permanent, one payment. Sold as its own
 * checkout kind (`bundle`) that grants ownership of all sellable packs. Mirror of the
 * server `MOYASAR_PRICE_BUNDLE_SAR`.
 */
export const EXAM_BUNDLE_PRICE = 199;

/** The one-time SAR price for a specific pack, by its kind. */
export function packPrice(pack: Pack): number {
  return pack.kind === 'certificate' ? PREP_PACK_PRICE_CERT : PREP_PACK_PRICE_SUBJECT;
}

export const PACKS: Pack[] = [
  // ── Certificates & ratings ─────────────────────────────────────────────────
  {
    // Flagship: the complete PPL written prep — every topic bank, the full ground
    // school, the PPL reading path and study sheet, plus its own timed mock exam.
    id: 'ppl-exam',
    kind: 'certificate',
    status: 'live',
    access: 'paid',
    bankIds: [
      'vfr-flight-rules',
      'airspace',
      'aip-ais',
      'radio-elpt',
      'air-law',
      'pilot-licensing',
      'medical',
      'aircraft-equipment',
      'weather',
      'aerodynamics',
      'human-factors',
      'navigation',
      'flight-planning',
    ],
    moduleIds: [
      'air-law',
      'meteorology',
      'navigation',
      'aircraft',
      'principles',
      'performance',
      'human',
      'operations',
      'communications',
    ],
    pathIds: ['private-pilot'],
    sheetSlugs: ['saudi-ppl-study-sheet'],
  },
  {
    id: 'elp',
    kind: 'certificate',
    status: 'live',
    access: 'paid',
    bankIds: ['radio-elpt', 'elpt-phraseology', 'elpt-comprehension', 'elpt-rating-scale'],
    sheetSlugs: ['saelpt-study-sheet'],
  },
  {
    id: 'conversion',
    kind: 'certificate',
    status: 'live',
    access: 'paid',
    bankIds: ['air-law', 'pilot-licensing'],
    pathIds: ['foreign-licence'],
    sheetSlugs: ['conversion-study-sheet'],
  },
  {
    // CPL: GACAR Part 61 commercial licensing + commercial ops + performance, plus the
    // shared subject banks. New banks are GACAR-cited; universal-knowledge banks reuse
    // the shared corpus (see docs/APPS-FAMILY-ROADMAP.md). DRAFT content pending review.
    id: 'cpl',
    kind: 'certificate',
    status: 'live',
    access: 'paid',
    bankIds: [
      'cpl-licensing',
      'commercial-ops',
      'commercial-performance',
      'air-law',
      'pilot-licensing',
      'medical',
      'aircraft-equipment',
      'weather',
      'aerodynamics',
      'human-factors',
      'navigation',
      'flight-planning',
    ],
    sheetSlugs: ['saudi-cpl-study-sheet'],
  },
  {
    // IR: instrument rating requirements, IFR flight rules and instrument procedures
    // (GACAR Part 61/91/97 + Saudi AIP ENR), plus the instrument-relevant subject banks.
    id: 'ir',
    kind: 'certificate',
    status: 'live',
    access: 'paid',
    bankIds: [
      'ir-rating',
      'ifr-rules',
      'instrument-procedures',
      'airspace',
      'aip-ais',
      'aircraft-equipment',
      'navigation',
      'weather',
      'flight-planning',
      'radio-elpt',
    ],
    sheetSlugs: ['saudi-ir-study-sheet'],
  },
  {
    // ATPL: airline transport pilot licensing + GACAR Part 121 air transport operations
    // and transport performance/dispatch, plus the shared advanced-knowledge banks.
    id: 'atpl',
    kind: 'certificate',
    status: 'live',
    access: 'paid',
    bankIds: [
      'atpl-licensing',
      'air-transport-ops',
      'advanced-weather-performance',
      'air-law',
      'aircraft-equipment',
      'weather',
      'navigation',
      'flight-planning',
      'human-factors',
    ],
  },

  // ── Subject packs ──────────────────────────────────────────────────────────
  {
    // The free sampler — a real pack (mastery meter, combined quiz) that upsells the
    // paid certificate packs. Keeps the storefront from being 100% paywalled.
    id: 'airspace-vfr',
    kind: 'subject',
    status: 'live',
    access: 'free',
    bankIds: ['airspace', 'vfr-flight-rules'],
    moduleIds: ['air-law'],
    pathIds: ['airspace-vfr'],
  },
  {
    id: 'medical',
    kind: 'subject',
    status: 'live',
    access: 'paid',
    bankIds: ['medical', 'human-factors'],
    pathIds: ['aviation-medical'],
    sheetSlugs: ['gaca-class1-study-sheet'],
  },
  {
    id: 'aip',
    kind: 'subject',
    status: 'live',
    access: 'paid',
    bankIds: ['aip-ais', 'aip-charts', 'airspace'],
    sheetSlugs: [
      'saudi-aip-study-sheet-en',
      'saudi-aip-study-sheet-ar',
      'aeronautical-information-manual-aim',
    ],
    librarySlugs: [
      'saudi-aip-gen-2-1',
      'saudi-aip-gen-2-2',
      'saudi-aip-gen-3-3',
      'saudi-aip-gen-3-4',
      'saudi-aip-enr-1-1',
      'saudi-aip-enr-1-2',
      'saudi-aip-enr-1-4',
      'saudi-aip-enr-1-6',
    ],
  },
];

/**
 * Gating kill-switch. When `false`, `hasPackAccess` opens every pack (a launch/promo
 * escape hatch) — flip to keep the exam-prep paywall live. This gates ONLY pack
 * access; it is independent of the app-wide FREE_FOR_EVERYONE promo.
 */
export const PACKS_GATED = true;

/** Live packs only — everything with a detail page / that appears in the sitemap. */
export const LIVE_PACKS = PACKS.filter((p) => p.status === 'live');

/** Look up a pack by id (any status). */
export function findPack(id: string | undefined): Pack | undefined {
  return id ? PACKS.find((p) => p.id === id) : undefined;
}

/** Total pieces of material a pack bundles, for the "what's inside" count. */
export function packItemCount(p: Pack): number {
  return (
    p.bankIds.length +
    (p.moduleIds?.length ?? 0) +
    (p.pathIds?.length ?? 0) +
    (p.sheetSlugs?.length ?? 0) +
    (p.librarySlugs?.length ?? 0)
  );
}
