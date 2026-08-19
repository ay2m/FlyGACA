/**
 * Maps an `auth/*` error code to the form field it belongs to and the i18n key
 * for its message. The API deliberately emits the same codes the Firebase Auth
 * SDK used, so this table and its i18n keys carried over unchanged. Pure (no DOM,
 * no SDK) so the sign-in form can
 * show inline, field-level errors instead of one generic line — and so the
 * mapping is unit-testable. Unknown codes fall back to a general message.
 */

export type AuthField = 'email' | 'password' | 'general';

/**
 * Synthetic code for "the auth call never settled" — the Firebase SDK can hang
 * forever when the App Check / reCAPTCHA Enterprise token can't be minted, so the
 * sign-in form wraps every auth call in a timeout and rejects with this code.
 * Not a Firebase code, but shaped like one so it flows through the same mapping.
 */
export const AUTH_TIMEOUT_CODE = 'auth/timeout';

export interface AuthErrorInfo {
  field: AuthField;
  key: string;
}

/**
 * Codes that mean "the user dismissed the sign-in popup themselves" — closing the
 * Google window or opening a second one. They are not failures, so the form should
 * clear its busy state silently rather than flash a scary error.
 */
const DISMISS_CODES = new Set([
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/user-cancelled',
]);

/** Whether `code` is a user-dismissed popup rather than a real error to surface. */
export function isAuthDismiss(code: string | undefined | null): boolean {
  return !!code && DISMISS_CODES.has(code);
}

const MAP: Record<string, AuthErrorInfo> = {
  'auth/invalid-email': { field: 'email', key: 'account.errors.invalidEmail' },
  'auth/user-not-found': { field: 'email', key: 'account.errors.userNotFound' },
  'auth/email-already-in-use': { field: 'email', key: 'account.errors.emailInUse' },
  'auth/wrong-password': { field: 'password', key: 'account.errors.wrongPassword' },
  // Newer Firebase returns a single opaque code for a bad email/password pair.
  'auth/invalid-credential': { field: 'password', key: 'account.errors.wrongPassword' },
  'auth/invalid-login-credentials': { field: 'password', key: 'account.errors.wrongPassword' },
  'auth/missing-password': { field: 'password', key: 'account.errors.missingPassword' },
  'auth/weak-password': { field: 'password', key: 'account.errors.weakPassword' },
  'auth/user-disabled': { field: 'email', key: 'account.errors.userDisabled' },
  'auth/too-many-requests': { field: 'general', key: 'account.errors.tooManyRequests' },
  'auth/network-request-failed': { field: 'general', key: 'account.errors.network' },
  // Client-side watchdog fired — the SDK promise (usually stuck waiting on an
  // App Check / reCAPTCHA token) never settled. See AUTH_TIMEOUT_CODE above.
  // Maps to the existing network message: from the user's seat a hung security
  // check is a connectivity problem, and reusing the key keeps the 4,500-line
  // locale files untouched.
  [AUTH_TIMEOUT_CODE]: { field: 'general', key: 'account.errors.network' },
  // Deployment/config failures — these have nothing to do with the user's
  // credentials, so they must NOT read as "check your details". They typically
  // surface on an unauthorized origin (e.g. a preview domain the API's CORS
  // allowlist doesn't cover).
  'auth/operation-not-allowed': { field: 'general', key: 'account.errors.providerDisabled' },
  'auth/unauthorized-domain': { field: 'general', key: 'account.errors.unauthorizedDomain' },
  'auth/requests-from-referer-are-blocked': {
    field: 'general',
    key: 'account.errors.unauthorizedDomain',
  },
  'auth/api-key-not-valid': { field: 'general', key: 'account.errors.config' },
  'auth/invalid-api-key': { field: 'general', key: 'account.errors.config' },
  'auth/firebase-app-check-token-is-invalid': { field: 'general', key: 'account.errors.config' },
  // App Check codes, retained so a native shell still on the old SDK maps them.
  // The first-party API never emits them; same class as the config errors above.
  'auth/firebase-app-check-token-is-invalid.': { field: 'general', key: 'account.errors.config' },
  'auth/missing-app-check-token': { field: 'general', key: 'account.errors.config' },
  // A popup the user (or the browser) blocked/closed. Not a credential problem —
  // the Google flow falls back to a full-page redirect, so this is a soft nudge.
  'auth/popup-blocked': { field: 'general', key: 'account.errors.popupBlocked' },
  'auth/popup-closed-by-user': { field: 'general', key: 'account.errors.popupBlocked' },
  'auth/cancelled-popup-request': { field: 'general', key: 'account.errors.popupBlocked' },
  // Popups aren't supported here (some in-app / native webviews). The redirect
  // fallback handles it; if it still surfaces, it's environmental, not credentials.
  'auth/operation-not-supported-in-this-environment': {
    field: 'general',
    key: 'account.errors.config',
  },
  'auth/internal-error': { field: 'general', key: 'account.errors.config' },
};

export function authErrorInfo(code: string | undefined | null): AuthErrorInfo {
  if (!code) return { field: 'general', key: 'account.authError' };
  if (MAP[code]) return MAP[code];
  // The referrer-blocked code embeds the offending URL, e.g.
  // `auth/requests-from-referer-https://…-are-blocked`, so it never matches the
  // exact key above — fold every variant onto the unauthorized-domain message.
  if (code.startsWith('auth/requests-from-referer')) {
    return { field: 'general', key: 'account.errors.unauthorizedDomain' };
  }
  return { field: 'general', key: 'account.authError' };
}

/**
 * The failure classes whose remedy is "sign in on the authorized main site"
 * rather than fixing credentials: the domain isn't on the Firebase authorized
 * list / API-key referrer allowlist (`unauthorizedDomain`), or the origin can't
 * mint an App Check / API-key token (`config`). These are exactly the errors a
 * preview/mirror deploy hits, so the Account page offers a click-through to the
 * canonical origin when it sees one. Credential, provider-disabled (turned off
 * everywhere), and popup errors deliberately don't qualify — the main site
 * wouldn't help.
 */
export function isDomainAuthError(code: string | undefined | null): boolean {
  const { key } = authErrorInfo(code);
  return key === 'account.errors.unauthorizedDomain' || key === 'account.errors.config';
}
