/**
 * Promo-code client helpers: capture an inbound `?promo=` code and carry it into
 * checkout. The server validates the code and computes the discount — this module only
 * transports the string (mirrors `referral.ts`). Inert without Firebase.
 */
const PROMO_KEY = 'flygaca:promo';

/** Client mirror of functions/src/promo-core.ts `normalizePromoCode`. */
export function normalizePromo(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, 24);
}

/** Capture a `?promo=CODE` from the current URL into localStorage (call on pricing load). */
export function capturePromoFromUrl(): void {
  try {
    const code = normalizePromo(new URL(window.location.href).searchParams.get('promo'));
    if (code) localStorage.setItem(PROMO_KEY, code);
  } catch {
    /* no URL / storage — ignore */
  }
}

/** The promo code the visitor arrived with, if any. */
export function getStoredPromo(): string | undefined {
  try {
    return localStorage.getItem(PROMO_KEY) || undefined;
  } catch {
    return undefined;
  }
}
