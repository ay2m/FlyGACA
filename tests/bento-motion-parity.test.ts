import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BENTO_DUR_ENTRY_S,
  BENTO_EASE_ENTRY,
  BENTO_LIFT_HOVER,
  BENTO_STAGGER_S,
} from '@/components/bento/motion';

/**
 * Framer-motion animates via inline styles, so the bento reads its motion
 * values from `src/components/bento/motion.ts` rather than the CSS custom
 * properties. This spec is the drift guard: each JS constant must equal the
 * design token it mirrors in `src/styles/tokens.css`, and each token must be
 * declared exactly once (a theme block silently overriding a motion token
 * would desynchronise CSS-driven and framer-driven motion).
 */
const tokensCss = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');

/** Extracts a token's declared value. Anchored to the declaration form so a
 *  reference like `--ease-lift: var(--ease-entry)` never matches. */
function tokenValue(name: string): string {
  const declarations = tokensCss.match(new RegExp(`^\\s*${name}:\\s*([^;]+);`, 'gm')) ?? [];
  expect(declarations, `${name} must be declared exactly once in tokens.css`).toHaveLength(1);
  return declarations[0]
    .replace(new RegExp(`^\\s*${name}:\\s*`), '')
    .replace(/;$/, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();
}

function toSeconds(duration: string): number {
  const m = duration.match(/^([\d.]+)(ms|s)$/);
  if (!m) throw new Error(`unparseable duration: ${duration}`);
  return m[2] === 'ms' ? parseFloat(m[1]) / 1000 : parseFloat(m[1]);
}

describe('bento motion constants mirror tokens.css', () => {
  it('--dur-entry ↔ BENTO_DUR_ENTRY_S', () => {
    expect(toSeconds(tokenValue('--dur-entry'))).toBeCloseTo(BENTO_DUR_ENTRY_S, 5);
  });

  it('--dur-stagger ↔ BENTO_STAGGER_S', () => {
    expect(toSeconds(tokenValue('--dur-stagger'))).toBeCloseTo(BENTO_STAGGER_S, 5);
  });

  it('--ease-entry ↔ BENTO_EASE_ENTRY', () => {
    const value = tokenValue('--ease-entry');
    const m = value.match(/^cubic-bezier\(([^)]+)\)$/);
    if (!m) throw new Error(`--ease-entry is not a cubic-bezier(): ${value}`);
    const points = m[1].split(',').map((p) => parseFloat(p.trim()));
    expect(points).toHaveLength(4);
    points.forEach((point, i) => expect(point).toBeCloseTo(BENTO_EASE_ENTRY[i], 5));
  });

  it('--lift-hover ↔ BENTO_LIFT_HOVER', () => {
    expect(parseFloat(tokenValue('--lift-hover'))).toBeCloseTo(BENTO_LIFT_HOVER, 5);
  });
});
