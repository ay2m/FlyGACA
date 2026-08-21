/**
 * Hand-written declarations for the plain-ESM IndexNow script, typing only the
 * pure helpers the Vitest suite imports. Keep in sync with indexnow.mjs.
 */
export function extractLocs(xml: string): string[];
export function buildPayload(opts: { site: string; key: string; urls: string[] }): {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
};
