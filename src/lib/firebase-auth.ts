/**
 * Firebase Authentication module.
 * Provides methods for email/password, Google Sign-in, and phone authentication.
 */

import { initializeApp, FirebaseApp, FirebaseOptions } from 'firebase/app';
import {
  Auth,
  initializeAuth,
  connectAuthEmulator,
  signOut,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  confirmPasswordReset,
  updateProfile,
  User as FirebaseUser,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
} from 'firebase/auth';
import { getFirebaseConfig } from './firebase-config';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

/** Initialize Firebase app and auth. */
export function initializeFirebase(): Auth {
  if (auth) return auth;

  const config = getFirebaseConfig();
  app = initializeApp(config as FirebaseOptions);

  // Use initializeAuth with local persistence for better control
  auth = initializeAuth(app, {
    persistence: [browserLocalPersistence],
  });

  // Connect to emulator in development if configured
  if (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_EMULATOR_HOST) {
    try {
      connectAuthEmulator(auth, `http://${import.meta.env.VITE_FIREBASE_EMULATOR_HOST}`, {
        disableWarnings: true,
      });
    } catch {
      // Emulator already connected
    }
  }

  return auth;
}

/** Get the Firebase Auth instance. */
export function getFirebaseAuth(): Auth {
  if (!auth) {
    initializeFirebase();
  }
  return auth!;
}

// ============================================================================
// Email / Password Authentication
// ============================================================================

export interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
}

export interface SignInData {
  email: string;
  password: string;
}

/** Sign up with email and password. */
export async function signUpWithEmail(data: SignUpData): Promise<FirebaseUser> {
  const auth = getFirebaseAuth();
  const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);

  // Set display name if provided
  if (data.displayName) {
    await updateProfile(userCredential.user, { displayName: data.displayName });
  }

  return userCredential.user;
}

/** Sign in with email and password. */
export async function signInWithEmail(data: SignInData): Promise<FirebaseUser> {
  const auth = getFirebaseAuth();
  const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
  return userCredential.user;
}

/** Send password reset email. */
export async function sendPasswordReset(email: string): Promise<void> {
  const auth = getFirebaseAuth();
  await sendPasswordResetEmail(auth, email);
}

/** Confirm password reset with code. */
export async function resetPassword(code: string, newPassword: string): Promise<void> {
  const auth = getFirebaseAuth();
  await confirmPasswordReset(auth, code, newPassword);
}

// ============================================================================
// Google Sign-in
// ============================================================================

/** Sign in with Google using popup (preferred for single-page apps). */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();

  // Add scopes if needed (e.g., for Google Calendar)
  // provider.addScope('https://www.googleapis.com/auth/calendar');

  // Set custom parameters if needed
  // provider.setCustomParameters({ prompt: 'consent' });

  const result = await signInWithPopup(auth, provider);
  return result.user;
}

/** Sign in with Google using redirect (for mobile or popup-blocked scenarios). */
export async function signInWithGoogleRedirect(): Promise<void> {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  await signInWithRedirect(auth, provider);
}

/** Get Google redirect result (call after redirect returns). */
export async function getGoogleRedirectResult(): Promise<FirebaseUser | null> {
  const auth = getFirebaseAuth();
  try {
    const result = await getRedirectResult(auth);
    return result?.user ?? null;
  } catch (error) {
    console.error('Error getting redirect result:', error);
    return null;
  }
}

// ============================================================================
// Phone Authentication
// ============================================================================

/** Set up reCAPTCHA verifier for phone auth. */
export function setupRecaptchaVerifier(
  containerId: string,
  options?: { size?: 'normal' | 'compact' | 'invisible' },
): RecaptchaVerifier {
  const auth = getFirebaseAuth();
  return new RecaptchaVerifier(auth, containerId, {
    size: options?.size || 'normal',
  });
}

/** Send phone verification code. Returns a ConfirmationResult to use with verifyPhoneCode. */
export async function sendPhoneVerificationCode(
  phoneNumber: string,
  recaptchaVerifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  const auth = getFirebaseAuth();
  return signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
}

/** Verify phone code and sign in. */
export async function verifyPhoneCode(
  confirmationResult: ConfirmationResult,
  code: string,
): Promise<FirebaseUser> {
  const result = await confirmationResult.confirm(code);
  return result.user;
}

// ============================================================================
// Session Management
// ============================================================================

/** Sign out the current user. */
export async function signOutUser(): Promise<void> {
  const auth = getFirebaseAuth();
  await signOut(auth);
}

/** Get the current user. */
export function getCurrentUser(): FirebaseUser | null {
  const auth = getFirebaseAuth();
  return auth.currentUser;
}

/** Subscribe to auth state changes. Returns unsubscribe function. */
export function onAuthStateChange(callback: (user: FirebaseUser | null) => void): () => void {
  const auth = getFirebaseAuth();
  return auth.onAuthStateChanged(callback);
}

/** Get the current user's ID token. */
export async function getIdToken(forceRefresh = false): Promise<string> {
  const user = getCurrentUser();
  if (!user) throw new Error('No user logged in');
  return user.getIdToken(forceRefresh);
}
