import { describe, expect, it } from 'vitest';
import { canCheckout, startProCheckout } from '@/lib/services/billing';

// No VITE_API_BASE_URL in tests → billing is unavailable and never reaches a
// network call; the web build keeps the CTA disabled via canCheckout().
describe('billing without a backend configured', () => {
  it('cannot check out', () => {
    expect(canCheckout()).toBe(false);
  });

  it('throws billing-unavailable instead of calling a missing API', async () => {
    await expect(startProCheckout('annual')).rejects.toThrow('billing-unavailable');
  });
});
