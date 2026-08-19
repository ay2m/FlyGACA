import { describe, expect, it, afterEach, vi } from 'vitest';
import { screen, cleanup, within } from '@testing-library/react';
import i18n from '@/i18n';
import { renderWithRouter } from './helpers/render';
import { Packs } from '@/pages/study/Packs';

// The storefront renders purely from the prepCatalog + the account store (default
// signed-out: no plan, no owned packs), so no network stub is needed. It exercises
// the card states: free / paid-locked. (No pack is `status: 'soon'` today — CPL/IR/ATPL
// went live; the coming-soon / notify-me path returns when a future pack is announced.)

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  void i18n.changeLanguage('en');
});

describe('<Packs /> storefront', () => {
  it('groups packs into Certificates and Subject sections', () => {
    renderWithRouter(<Packs />);
    expect(screen.getByRole('heading', { name: 'Certificates & ratings' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Subject packs' })).toBeInTheDocument();
  });

  it('shows a paid, unowned pack as locked with the one-time price and a link to its page', () => {
    renderWithRouter(<Packs />);
    const link = screen.getByRole('link', { name: /Aviation medical/ });
    expect(link).toHaveAttribute('href', '/study/packs/medical');
    // Medical carries a focused bank (80 questions) → the entry price band.
    expect(within(link).getByText(/SAR 249 · one-time/)).toBeInTheDocument();
  });

  it('marks the free sampler pack as Free', () => {
    renderWithRouter(<Packs />);
    const link = screen.getByRole('link', { name: /Airspace & VFR/ });
    expect(within(link).getByText('Free')).toBeInTheDocument();
  });

  it('renders a newly-live certificate pack (CPL) as a locked link to its detail page', () => {
    renderWithRouter(<Packs />);
    // CPL/IR/ATPL are now live: linked cards with the one-time price, not coming-soon.
    const link = screen.getByRole('link', { name: /CPL exam prep/ });
    expect(link).toHaveAttribute('href', '/study/packs/cpl');
    // CPL carries one of the deepest banks (470 questions) → the top price band.
    expect(within(link).getByText(/SAR 499 · one-time/)).toBeInTheDocument();
    // No coming-soon cards remain, so no notify-me capture is rendered.
    expect(screen.queryAllByPlaceholderText('you@example.com')).toHaveLength(0);
  });
});
