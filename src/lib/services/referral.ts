/**
 * Referral client helpers: capture an inbound `?ref=` code, carry it into checkout,
 * and fetch the signed-in user's own shareable code from the gateway. The server
 * validates the code and grants the rewards — this module only transports the token.
 * Inert without a backend.
 */
import { isBackendConfigured, apiTry } from '@/lib/services/backend';

const REF_KEY = 'flygaca:ref';

/** Client mirror of server/src/referral-core.ts `normalizeCode`. */
export function normalizeRef(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .slice(0, 8);
}

/** Capture a `?ref=CODE` from the current URL into localStorage (call on pricing load). */
export function captureRefFromUrl(): void {
  try {
    const ref = normalizeRef(new URL(window.location.href).searchParams.get('ref'));
    if (ref) localStorage.setItem(REF_KEY, ref);
  } catch {
    /* no URL / storage — ignore */
  }
}

/** The referral code the visitor arrived with, if any. */
export function getStoredRef(): string | undefined {
  try {
    return localStorage.getItem(REF_KEY) || undefined;
  } catch {
    return undefined;
  }
}

/** Fetch (and lazily register) the signed-in user's own referral code. */
export async function fetchReferralCode(): Promise<string | null> {
  if (!isBackendConfigured()) return null;
  const res = await apiTry<{ code?: string }>('/billing/referral-code', {}, {});
  return res.code ?? null;
}

/** Build a shareable pricing link that carries the referral code. */
export function referralLink(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://flygaca.com';
  return `${origin}/pricing?ref=${code}`;
}
