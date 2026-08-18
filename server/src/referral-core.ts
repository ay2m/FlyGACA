/**
 * Referral code helpers — pure and testable. A code is a short, human-shareable
 * token derived deterministically from a uid, so it's stable without extra storage;
 * the uid the code belongs to is persisted separately (referralCodes/{code}) so the
 * webhook can resolve a code back to the referrer. This module only shapes,
 * generates and validates the token.
 *
 * Reward model: on a referred user's first paid conversion, BOTH the referrer and
 * the referee receive Captain Adel credits (reuses the chatCredits balance). Credits
 * are a universal, robust reward — unlike a "free month", they don't fight the
 * Moyasar-driven entitlement and they still reward a free-tier referrer.
 */
import { createHash } from "node:crypto";

/** Credits granted to the referrer AND the referee on a successful referral. */
export const REFERRAL_REWARD_CREDITS = 30;

// Crockford-style base32, minus visually ambiguous characters (no I L O U 0 1).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const CODE_LEN = 8;

/** A stable, shareable referral code for `uid` (deterministic; safe to display). */
export function referralCode(uid: string): string {
  const digest = createHash("sha256").update(`flygaca-ref:${uid}`).digest();
  let out = "";
  for (let i = 0; i < CODE_LEN; i += 1) out += ALPHABET[digest[i] % ALPHABET.length];
  return out;
}

/** Normalize a code from user input / a URL: uppercase, drop non-code characters. */
export function normalizeCode(input: string | null | undefined): string {
  if (!input) return "";
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, CODE_LEN);
}

/** Whether a normalized code has the right shape (CODE_LEN chars from the alphabet). */
export function isValidCode(code: string): boolean {
  return code.length === CODE_LEN && [...code].every((c) => ALPHABET.includes(c));
}
