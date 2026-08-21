/**
 * Hand-written declarations for the plain-ESM headers loader, typing only what
 * the Vitest parity suite imports. Keep in sync with headers.mjs (which reads
 * config/headers.json — the single source of truth for security headers).
 */
export interface CacheRule {
  match: string;
  cacheControl: string;
}
export const HEADERS: {
  security: Record<string, string>;
  cache: CacheRule[];
  defaultCacheControl: string;
};
export const SECURITY_HEADERS: Record<string, string>;
export const CACHE_RULES: CacheRule[];
export const DEFAULT_CACHE_CONTROL: string;
export function cacheControlFor(path: string): string;
export function gcloudCustomResponseHeaders(delimiter?: string): string;
