import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen, within, act } from '@testing-library/react';
import i18n from '@/i18n';
import { CurrencyBoard } from '@/components/CurrencyBoard';
import type { CurrencyItem } from '@/calc/pilot/currency';
import { renderWithRouter } from './helpers/render';

const landingItem = (have: number): CurrencyItem => ({
  id: 'passenger90',
  labelKey: 'currency.items.passenger90.label',
  status: have >= 3 ? 'current' : 'expired',
  expiry: null,
  daysLeft: null,
  detailKey: 'currency.landingsDetail',
  detailVars: { have, need: 3, days: 90 },
  count: { have, need: 3 },
  fixTo: '/tools/part61-currency',
});

const medicalItem: CurrencyItem = {
  id: 'medical',
  labelKey: 'currency.items.medical.label',
  status: 'current',
  expiry: new Date('2026-01-01T12:00:00Z'),
  daysLeft: 200,
  detailKey: 'currency.medicalDetail',
  fixTo: '/tools/medical-validity',
};

afterEach(() => {
  cleanup();
  act(() => void i18n.changeLanguage('en'));
});

describe('<CurrencyBoard /> recency counter', () => {
  it('shows a partial meter and a "more needed" cue when short of the minimum', () => {
    renderWithRouter(<CurrencyBoard items={[landingItem(2)]} />);
    const meter = screen.getByRole('progressbar');
    expect(meter).toHaveAttribute('aria-valuenow', '67'); // 2 of 3
    expect(screen.getByText('1 more needed')).toBeInTheDocument();
  });

  it('shows a full meter and no cue once the minimum is met', () => {
    renderWithRouter(<CurrencyBoard items={[landingItem(3)]} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.queryByText(/more needed/)).toBeNull();
  });

  it('renders no meter for a time-based item', () => {
    renderWithRouter(<CurrencyBoard items={[medicalItem]} />);
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('localizes the cue in Arabic', async () => {
    await act(async () => {
      await i18n.changeLanguage('ar');
    });
    renderWithRouter(<CurrencyBoard items={[landingItem(1)]} />);
    const row = screen.getByRole('listitem');
    expect(within(row).getByText(/يلزم 2/)).toBeInTheDocument();
  });
});
