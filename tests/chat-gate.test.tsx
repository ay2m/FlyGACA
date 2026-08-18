import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';

const startProCheckout = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const canCheckout = vi.hoisted(() => vi.fn(() => true));
vi.mock('@/lib/services/billing', () => ({
  startProCheckout,
  canCheckout,
  CREDIT_PACK_SIZE: 20,
}));
vi.mock('@/components/UpsellCard', () => ({
  UpsellCard: () => <div data-testid="upsell" />,
}));

import { ChatGate } from '@/components/chat/ChatGate';

const gate = (signedIn: boolean) =>
  render(
    <MemoryRouter>
      <ChatGate signedIn={signedIn} />
    </MemoryRouter>,
  );

afterEach(cleanup);

describe('ChatGate', () => {
  it('signed-in: shows the upsell and starts a credits checkout', () => {
    gate(true);
    expect(screen.getByTestId('upsell')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button'));
    expect(startProCheckout).toHaveBeenCalledWith('credits');
  });

  it('signed-in: hides buy-credits when checkout is not configured', () => {
    canCheckout.mockReturnValueOnce(false);
    gate(true);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('anonymous: nudges to sign in instead of billing', () => {
    gate(false);
    expect(screen.queryByTestId('upsell')).toBeNull();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/account');
  });
});
