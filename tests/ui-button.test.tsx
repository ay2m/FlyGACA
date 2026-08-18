import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { renderWithRouter } from './helpers/render';

afterEach(cleanup);

describe('Button', () => {
  it('defaults to the primary variant on a real <button>', () => {
    render(<Button>Go</Button>);
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn.tagName).toBe('BUTTON');
    expect(btn).toHaveClass('btn', 'btn-primary');
  });

  it('maps every variant to its global class', () => {
    render(
      <>
        <Button variant="secondary">a</Button>
        <Button variant="gold">b</Button>
        <Button variant="ghost">c</Button>
        <Button variant="clay">d</Button>
        <Button variant="clayPrimary">e</Button>
      </>,
    );
    expect(screen.getByRole('button', { name: 'a' })).toHaveClass('btn-secondary');
    expect(screen.getByRole('button', { name: 'b' })).toHaveClass('btn-gold');
    expect(screen.getByRole('button', { name: 'c' })).toHaveClass('btn-ghost');
    expect(screen.getByRole('button', { name: 'd' })).toHaveClass('btn-clay');
    expect(screen.getByRole('button', { name: 'e' })).toHaveClass('btn-clay-primary');
  });

  it('appends className and renders a leading icon', () => {
    render(
      <Button className="extra" icon={<svg data-testid="glyph" />}>
        Go
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn).toHaveClass('btn', 'btn-primary', 'extra');
    expect(screen.getByTestId('glyph')).toBeInTheDocument();
  });

  it('forwards native button props', () => {
    const onClick = vi.fn();
    render(
      <Button type="submit" onClick={onClick}>
        Go
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Go' });
    expect(btn).toHaveAttribute('type', 'submit');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('ButtonLink', () => {
  it('renders a router link styled as a button', () => {
    renderWithRouter(
      <ButtonLink to="/pricing" variant="clayPrimary">
        Go Pro
      </ButtonLink>,
    );
    const link = screen.getByRole('link', { name: 'Go Pro' });
    expect(link).toHaveAttribute('href', '/pricing');
    expect(link).toHaveClass('btn', 'btn-clay-primary');
  });

  it('navigates on click', () => {
    renderWithRouter(<ButtonLink to="/tools">Tools</ButtonLink>);
    fireEvent.click(screen.getByRole('link', { name: 'Tools' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/tools');
  });
});
