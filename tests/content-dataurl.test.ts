import { describe, expect, it } from 'vitest';
import { resolveDataBase } from '@/lib/content';

// Regression guard (fixed 2026-08): the deploy workflow injects
// VITE_DATA_BASE_URL='' when the `DATA_BASE_URL` repo var is unset, so an empty
// base MUST resolve to same-origin `/data` rather than stripping the prefix — the
// prod-only failure that surfaced as the Library's "Could not load this content".
describe('resolveDataBase', () => {
  it('falls back to /data when unset (undefined)', () => {
    expect(resolveDataBase(undefined)).toBe('/data');
  });

  it('falls back to /data when the value is an empty string (CI default)', () => {
    expect(resolveDataBase('')).toBe('/data');
  });

  it('uses a configured bucket origin as-is', () => {
    expect(resolveDataBase('https://storage.googleapis.com/flygaca-data/data')).toBe(
      'https://storage.googleapis.com/flygaca-data/data',
    );
  });

  it('trims trailing slashes so paths never double up', () => {
    expect(resolveDataBase('https://storage.googleapis.com/flygaca-data/data/')).toBe(
      'https://storage.googleapis.com/flygaca-data/data',
    );
  });
});
