import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('A11y Screen Reader & Semantic ARIA Audit', () => {
  it('verifies BentoCard uses accessible labelling', () => {
    const bentoCardSrc = readFileSync(
      join(process.cwd(), 'src/components/bento/BentoCard.tsx'),
      'utf8',
    );
    expect(bentoCardSrc).toContain('aria-labelledby');
    expect(bentoCardSrc).toContain('aria-label');
  });

  it('verifies BentoGrid uses region landmark with accessible label', () => {
    const bentoGridSrc = readFileSync(
      join(process.cwd(), 'src/components/bento/BentoGrid.tsx'),
      'utf8',
    );
    expect(bentoGridSrc).toContain('aria-label={label}');
  });

  it('verifies RegulatoryOmnibar provides dialog role and aria-modal', () => {
    const omnibarSrc = readFileSync(
      join(process.cwd(), 'src/components/bento/RegulatoryOmnibar.tsx'),
      'utf8',
    );
    expect(omnibarSrc).toContain('role="dialog"');
    expect(omnibarSrc).toContain('aria-modal="true"');
  });

  it('verifies decorative icons use aria-hidden="true" or accessible name', () => {
    const bentoCardSrc = readFileSync(
      join(process.cwd(), 'src/components/bento/BentoCard.tsx'),
      'utf8',
    );
    expect(bentoCardSrc).toContain('aria-hidden="true"');
  });
});

