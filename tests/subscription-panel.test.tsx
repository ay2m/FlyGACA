import { describe, expect, it, afterEach, beforeEach } from 'vitest';
import { cleanup, screen, act } from '@testing-library/react';
import i18n from '@/i18n';
import { SubscriptionPanel } from '@/components/account/SubscriptionPanel';
import { FREE_FOR_EVERYONE } from '@/lib/services/entitlements';
import { renderWithRouter } from './helpers/render';

// With no Firebase configured the account store starts on the default (free)
// entitlement. The genuine paid (Moyasar) branch is server-written (no client
// setter), so it is covered by e2e/manual, not here.
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  act(() => void i18n.changeLanguage('en'));
});

describe('<SubscriptionPanel />', () => {
  it('presents the default account per the FREE_FOR_EVERYONE promo', () => {
    renderWithRouter(<SubscriptionPanel />);
    if (FREE_FOR_EVERYONE) {
      // Promo on: the default visitor is shown as Pro, with no upsell prompt.
      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.queryByText("You're on the free plan.")).toBeNull();
      expect(screen.queryByRole('link', { name: 'Go Pro' })).toBeNull();
    } else {
      // Promo off: the free-plan prompt and a Go Pro link to /pricing.
      expect(screen.getByText("You're on the free plan.")).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Go Pro' })).toHaveAttribute('href', '/pricing');
    }
  });

  it('offers no auto-renew toggle without a real Moyasar subscription', () => {
    // Neither a free visitor nor a promo-Pro visitor has a card on file to stop.
    renderWithRouter(<SubscriptionPanel />);
    expect(screen.queryByRole('button', { name: 'Turn off auto-renew' })).toBeNull();
  });
});
