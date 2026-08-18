import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Card } from '@/components/ui/Card';

afterEach(cleanup);

describe('Card', () => {
  it('renders a plain div card by default', () => {
    render(<Card data-testid="card">body</Card>);
    const card = screen.getByTestId('card');
    expect(card.tagName).toBe('DIV');
    expect(card.className).toContain('card');
    expect(card).toHaveTextContent('body');
  });

  it('adds the variant class alongside the base recipe', () => {
    render(
      <>
        <Card data-testid="raised" variant="raised" />
        <Card data-testid="interactive" variant="interactive" />
        <Card data-testid="accent" variant="accent" />
      </>,
    );
    expect(screen.getByTestId('raised').className).toMatch(/card/);
    expect(screen.getByTestId('raised').className).toMatch(/raised/);
    expect(screen.getByTestId('interactive').className).toMatch(/interactive/);
    expect(screen.getByTestId('accent').className).toMatch(/accent/);
  });

  it('sets --cat-color from the accent prop and merges style', () => {
    render(<Card data-testid="card" variant="accent" accent="var(--gold)" style={{ margin: 0 }} />);
    const card = screen.getByTestId('card');
    expect(card.style.getPropertyValue('--cat-color')).toBe('var(--gold)');
    expect(card.style.margin).toBe('0px');
  });

  it('renders the requested static tag', () => {
    render(<Card data-testid="card" as="article" />);
    expect(screen.getByTestId('card').tagName).toBe('ARTICLE');
  });
});
