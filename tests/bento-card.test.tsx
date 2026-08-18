/**
 * BentoCard contract:
 *  - link branch (`to`) vs static branch render an anchor vs a div
 *  - `labelledBy` names the link from the tile heading and beats `label`
 *  - span/tone map to their module classes; `className` merges onto the root
 *  - the cursor glow only tracks hover-capable pointers (mouse/pen, not touch)
 * Class assertions compare against the imported CSS-module object — never
 * literal strings — because vitest stubs CSS modules (`css: false`).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { screen, cleanup, fireEvent } from '@testing-library/react';
import { renderWithRouter } from './helpers/render';
import { BentoCard } from '@/components/bento/BentoCard';
import styles from '@/components/bento/BentoCard.module.css';

afterEach(cleanup);

describe('BentoCard', () => {
  it('renders a router link when `to` is set, a plain card otherwise', () => {
    renderWithRouter(<BentoCard to="/library">Corpus</BentoCard>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/library');
    cleanup();

    renderWithRouter(<BentoCard>Static tile</BentoCard>);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByText('Static tile')).toBeInTheDocument();
  });

  it('names the link from `labelledBy`, beating the `label` fallback', () => {
    renderWithRouter(
      <BentoCard to="/library" label="Open the library" labelledBy="tile-heading">
        <h3 id="tile-heading">GACAR regulations</h3>
      </BentoCard>,
    );
    const link = screen.getByRole('link', { name: 'GACAR regulations' });
    expect(link).not.toHaveAttribute('aria-label');
  });

  it('falls back to `label` when no `labelledBy` is given', () => {
    renderWithRouter(
      <BentoCard to="/tools" label="All tools">
        content
      </BentoCard>,
    );
    expect(screen.getByRole('link', { name: 'All tools' })).toBeInTheDocument();
  });

  it('maps spans (incl. full) to module classes and merges className', () => {
    renderWithRouter(
      <BentoCard span="full" tone="cyan" className="extra">
        Full row
      </BentoCard>,
    );
    const card = screen.getByText('Full row').closest(`.${styles.card}`);
    expect(card).not.toBeNull();
    expect(card).toHaveClass(styles.spanFull, styles.toneCyan, 'extra');
  });

  it('tracks the glow for mouse pointers but ignores touch', () => {
    renderWithRouter(<BentoCard>glow</BentoCard>);
    const card = screen.getByText('glow').closest(`.${styles.card}`) as HTMLElement;

    fireEvent.pointerMove(card, { pointerType: 'touch', clientX: 40, clientY: 24 });
    expect(card.style.getPropertyValue('--glow-x')).toBe('');

    fireEvent.pointerMove(card, { pointerType: 'mouse', clientX: 40, clientY: 24 });
    expect(card.style.getPropertyValue('--glow-x')).toBe('40px');
    expect(card.style.getPropertyValue('--glow-y')).toBe('24px');

    fireEvent.pointerLeave(card);
    expect(card.style.getPropertyValue('--glow-x')).toBe('50%');
    expect(card.style.getPropertyValue('--glow-y')).toBe('-40%');
  });
});
