/**
 * API-key helpers for the licensed Captain Adel / corpus API — pure and testable.
 * Keys are shown to a partner exactly once at mint time; only their SHA-256 hash is
 * stored (apiKeys/{hash}), so a leaked datastore never yields usable keys. This
 * module generates, hashes and extracts keys; the gateway looks the hash up and
 * meters usage.
 */
import { createHash, randomBytes } from "node:crypto";

/** Human-recognisable prefix (also signals a live vs test key if that split is added). */
export const API_KEY_PREFIX = "flygaca_live_";

/** Mint a new opaque API key. Shown once; store only `hashApiKey(key)`. */
export function newApiKey(): string {
  return API_KEY_PREFIX + randomBytes(24).toString("hex");
}

/** The SHA-256 hex hash of a key — the id stored in Firestore and looked up per call. */
export function hashApiKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex");
}

/**
 * Pull the API key from request headers: an `X-Api-Key` value wins, else a
 * `Authorization: Bearer <key>`. Returns null when neither is present.
 */
export function extractApiKey(
  authorization?: string | null,
  apiKeyHeader?: string | null,
): string | null {
  if (apiKeyHeader && apiKeyHeader.trim()) return apiKeyHeader.trim();
  if (authorization) {
    const m = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (m) return m[1].trim();
  }
  return null;
}

/** A safe display fragment (prefix + first 6 secret chars) for listing keys. */
export function keyPreview(key: string): string {
  return key.slice(0, API_KEY_PREFIX.length + 6);
}
