import { describe, expect, it } from 'vitest';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

/** Recursively collects the leaf paths → values of a translation object. */
function leafEntries(obj: unknown, prefix = ''): [string, unknown][] {
  if (typeof obj !== 'object' || obj === null) return [[prefix, obj]];
  return Object.entries(obj).flatMap(([k, v]) => leafEntries(v, prefix ? `${prefix}.${k}` : k));
}

/** The set of i18next interpolation tokens in a string (whitespace-normalized, sorted). */
function placeholders(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  return (value.match(/\{\{\s*[^}]+?\s*\}\}/g) ?? []).map((tok) => tok.replace(/\s+/g, '')).sort();
}

const enEntries = leafEntries(en);
const arEntries = leafEntries(ar);
const enMap = new Map(enEntries);
const arMap = new Map(arEntries);

/**
 * Bilingual parity guard — the modern equivalent of the legacy `check:i18n`.
 * Every English key must have an Arabic counterpart and vice-versa, so no
 * user-facing string can ship half-translated. Beyond key presence it also
 * guards value quality: no empty strings, and matching interpolation
 * placeholders (a `{{count}}` dropped in one language is a broken string).
 */
describe('i18n parity (EN ⇄ AR)', () => {
  const enKeys = new Set(enMap.keys());
  const arKeys = new Set(arMap.keys());

  it('has an Arabic value for every English key', () => {
    const missing = [...enKeys].filter((k) => !arKeys.has(k));
    expect(missing, `Missing Arabic keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('has an English value for every Arabic key', () => {
    const missing = [...arKeys].filter((k) => !enKeys.has(k));
    expect(missing, `Missing English keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no empty string values in either language', () => {
    const empties = [...enEntries, ...arEntries]
      .filter(([, v]) => typeof v === 'string' && v.trim() === '')
      .map(([k]) => k);
    expect(empties, `Empty values: ${empties.join(', ')}`).toEqual([]);
  });

  it('keeps interpolation placeholders in sync across languages', () => {
    const mismatched = [...enKeys]
      .filter((k) => arKeys.has(k))
      .filter((k) => {
        const a = placeholders(enMap.get(k));
        const b = placeholders(arMap.get(k));
        return a.join('|') !== b.join('|');
      });
    expect(mismatched, `Placeholder mismatch in: ${mismatched.join(', ')}`).toEqual([]);
  });
});
