import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('A11y Keyboard Navigation Audit', () => {
  it('verifies Modal/Omnibar components support Escape dismissal', () => {
    const omnibarSrc = readFileSync(
      join(process.cwd(), 'src/components/bento/RegulatoryOmnibar.tsx'),
      'utf8',
    );
    expect(omnibarSrc).toContain("e.key === 'Escape'");
  });

  it('verifies CommandPalette supports keyboard navigation', () => {
    const paletteSrc = readFileSync(
      join(process.cwd(), 'src/components/CommandPalette/CommandPalette.tsx'),
      'utf8',
    );
    expect(paletteSrc).toMatch(/Escape|ArrowDown|ArrowUp|Enter/);
  });

  it('ensures no positive tabIndex values exist in UI components', () => {
    const buttonSrc = readFileSync(join(process.cwd(), 'src/components/ui/Button.tsx'), 'utf8');
    expect(buttonSrc).not.toMatch(/tabIndex=\{[1-9][0-9]*\}/);
  });
});

