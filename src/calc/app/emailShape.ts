/**
 * Cheap client-side email-shape check — a fail-fast guard so obvious typos are
 * caught before an auth round-trip. Not a validator (the server is authoritative);
 * just "looks like an address". Pure (no DOM/i18n), so it's the shared source for
 * every sign-in form. Lifted out of src/pages/account/SignInForms.tsx.
 */
export function looksLikeEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}
