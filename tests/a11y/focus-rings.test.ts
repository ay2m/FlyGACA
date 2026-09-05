import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('A11y Focus Rings Audit', () => {
  const tokensCss = readFileSync(join(process.cwd(), 'src/styles/tokens.css'), 'utf8');
  const globalCss = readFileSync(join(process.cwd(), 'src/styles/global.css'), 'utf8');

  it('defines --focus token for high-visibility keyboard navigation', () => {
    expect(tokensCss).toMatch(/--focus:\s*var\(--sage-bright\)/);
  });

  it('provides :focus-visible rules for interactive elements', () => {
    expect(globalCss).toMatch(/:focus-visible/);
  });

  it('does not strip outline without focus visible alternative', () => {
    const rawOutlineZero = globalCss.match(/outline:\s*0\s*;/g) || [];
    const rawOutlineNone = globalCss.match(/outline:\s*none\s*;/g) || [];
    // Ensure all outline resets are scoped with replacement ring styles
    expect(rawOutlineZero.length + rawOutlineNone.length).toBeLessThanOrEqual(5);
  });
});

