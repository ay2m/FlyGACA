import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
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

/** Every `.ts`/`.tsx` file under `src/`. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(path) ? [path] : [];
  });
}

/**
 * Keys referenced from the app but present in NEITHER bundle.
 *
 * Parity alone cannot see these: a key missing from both languages is perfectly
 * symmetric, so the checks above pass while i18next falls back to rendering the
 * key itself — `nav.logbook` and `study.prev` both shipped as visible literal
 * text that way.
 *
 * Only files that pull `t` from react-i18next are scanned. `src/lib/tools.ts`
 * defines its own local `t()` catalog-entry factory whose first argument is a
 * tool id, not a translation key.
 */
describe('i18n coverage (referenced keys exist)', () => {
  it("resolves every t('literal') key used in src/", () => {
    const resolves = (key: string): boolean =>
      key
        .split('.')
        .reduce<unknown>(
          (node, part) =>
            typeof node === 'object' && node !== null
              ? (node as Record<string, unknown>)[part]
              : undefined,
          en,
        ) !== undefined;

    const missing = sourceFiles('src')
      .map((file) => ({ file, source: readFileSync(file, 'utf8') }))
      .filter(({ source }) => source.includes('react-i18next'))
      .flatMap(({ file, source }) =>
        [...source.matchAll(/\bt\(\s*'([a-zA-Z0-9_.]+)'/g)]
          .map((m) => m[1])
          .filter((key) => !resolves(key))
          .map((key) => `${key} (${file})`),
      );

    expect(missing, `Keys referenced but never defined: ${missing.join(', ')}`).toEqual([]);
  });
});
