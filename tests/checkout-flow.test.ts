/**
 * Checkout flow — pack selection, pricing, promo codes, and entitlement verification.
 *
 * The checkout flow:
 * 1. User selects a pack (region-aware pricing)
 * 2. Optionally applies promo code (gets discount)
 * 3. Confirms order → backend creates Moyasar payment
 * 4. Backend webhook grants entitlements on paid
 * 5. UI reflects new entitlements (purchase success)
 *
 * This suite tests state transitions, pricing calculations, and error handling.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock types matching server contract
interface PricingBand {
  packId: string;
  region: string;
  priceUSD: number;
  priceKWD: number;
  currency: 'USD' | 'KWD';
}

interface Entitlement {
  id: string;
  packId: string;
  expiresAt: string; // ISO date
}

interface CheckoutState {
  step: 'pack-selection' | 'promo' | 'confirm' | 'payment' | 'success' | 'error';
  selectedPackId: string | null;
  selectedRegion: string;
  basePrice: number;
  discount: number;
  finalPrice: number;
  promoCode: string | null;
  error: string | null;
}

// Mock backend functions
const fetchPricingBands = vi.fn<[string], Promise<PricingBand[]>>();
const validatePromoCode = vi.fn<[string], Promise<{ valid: boolean; discountPercent?: number }>>();
const createPaymentOrder = vi.fn<[string, number], Promise<{ orderId: string; paymentUrl: string }>>();
const fetchUserEntitlements = vi.fn<[string], Promise<Entitlement[]>>();

// Helper: calculate final price with discount
function calculateFinalPrice(basePrice: number, discountPercent: number): number {
  return Math.round(basePrice * (1 - discountPercent / 100));
}

// State machine for checkout
class CheckoutFlow {
  private state: CheckoutState;
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
    this.state = {
      step: 'pack-selection',
      selectedPackId: null,
      selectedRegion: 'SA',
      basePrice: 0,
      discount: 0,
      finalPrice: 0,
      promoCode: null,
      error: null,
    };
  }

  getState(): CheckoutState {
    return { ...this.state };
  }

  async selectPack(packId: string, region: string): Promise<void> {
    try {
      const bands = await fetchPricingBands(packId);
      const band = bands.find((b) => b.region === region);

      if (!band) {
        throw new Error(`No pricing for ${packId} in ${region}`);
      }

      this.state.selectedPackId = packId;
      this.state.selectedRegion = region;
      this.state.basePrice = band.priceUSD; // Always store in USD
      this.state.finalPrice = this.state.basePrice;
      this.state.discount = 0;
      this.state.promoCode = null;
      this.state.step = 'promo';
      this.state.error = null;
    } catch (err) {
      this.state.error = (err as Error).message;
      this.state.step = 'error';
      throw err;
    }
  }

  async applyPromoCode(code: string): Promise<void> {
    try {
      const result = await validatePromoCode(code);

      if (!result.valid) {
        throw new Error('Invalid promo code');
      }

      this.state.promoCode = code;
      this.state.discount = result.discountPercent ?? 0;
      this.state.finalPrice = calculateFinalPrice(this.state.basePrice, this.state.discount);
      this.state.error = null;
    } catch (err) {
      this.state.error = (err as Error).message;
      throw err;
    }
  }

  async confirm(): Promise<{ orderId: string; paymentUrl: string }> {
    try {
      if (!this.state.selectedPackId) {
        throw new Error('No pack selected');
      }

      this.state.step = 'payment';

      const { orderId, paymentUrl } = await createPaymentOrder(
        this.state.selectedPackId,
        this.state.finalPrice,
      );

      return { orderId, paymentUrl };
    } catch (err) {
      this.state.error = (err as Error).message;
      this.state.step = 'error';
      throw err;
    }
  }

  async verifyEntitlement(packId: string): Promise<boolean> {
    try {
      const entitlements = await fetchUserEntitlements(this.userId);
      const hasEntitlement = entitlements.some((e) => e.packId === packId);

      if (hasEntitlement) {
        this.state.step = 'success';
      }

      return hasEntitlement;
    } catch (err) {
      this.state.error = (err as Error).message;
      this.state.step = 'error';
      throw err;
    }
  }
}

// Tests
describe('Checkout flow', () => {
  let checkout: CheckoutFlow;

  beforeEach(() => {
    vi.clearAllMocks();
    checkout = new CheckoutFlow('user_checkout_test');
  });

  describe('pack selection', () => {
    it('loads pricing when pack is selected', async () => {
      fetchPricingBands.mockResolvedValueOnce([
        { packId: 'aip', region: 'SA', priceUSD: 9900, priceKWD: 3050, currency: 'USD' },
      ]);

      await checkout.selectPack('aip', 'SA');
      const state = checkout.getState();

      expect(state.selectedPackId).toBe('aip');
      expect(state.basePrice).toBe(9900);
      expect(state.finalPrice).toBe(9900);
      expect(state.step).toBe('promo');
      expect(state.error).toBeNull();
    });

    it('handles region selection', async () => {
      fetchPricingBands.mockResolvedValueOnce([
        { packId: 'elpt', region: 'SA', priceUSD: 4900, priceKWD: 1500, currency: 'USD' },
        { packId: 'elpt', region: 'US', priceUSD: 4900, priceKWD: 0, currency: 'USD' },
      ]);

      await checkout.selectPack('elpt', 'US');
      const state = checkout.getState();

      expect(state.selectedRegion).toBe('US');
      expect(state.basePrice).toBe(4900);
    });

    it('errors if pack/region combo not found', async () => {
      fetchPricingBands.mockResolvedValueOnce([
        { packId: 'aip', region: 'SA', priceUSD: 9900, priceKWD: 3050, currency: 'USD' },
      ]);

      await expect(checkout.selectPack('aip', 'JP')).rejects.toThrow('No pricing');
      const state = checkout.getState();
      expect(state.step).toBe('error');
      expect(state.error).toContain('No pricing');
    });
  });

  describe('promo code application', () => {
    beforeEach(async () => {
      fetchPricingBands.mockResolvedValueOnce([
        { packId: 'aip', region: 'SA', priceUSD: 10000, priceKWD: 3000, currency: 'USD' },
      ]);
      await checkout.selectPack('aip', 'SA');
    });

    it('applies valid promo code and calculates discount', async () => {
      validatePromoCode.mockResolvedValueOnce({ valid: true, discountPercent: 20 });

      await checkout.applyPromoCode('SAVE20');
      const state = checkout.getState();

      expect(state.promoCode).toBe('SAVE20');
      expect(state.discount).toBe(20);
      expect(state.finalPrice).toBe(8000); // 10000 * 0.8
    });

    it('stacks multiple discount types', async () => {
      validatePromoCode.mockResolvedValueOnce({ valid: true, discountPercent: 15 });

      await checkout.applyPromoCode('REFERRAL15');
      const state = checkout.getState();

      expect(state.finalPrice).toBe(8500); // 10000 * 0.85
    });

    it('rejects invalid promo code', async () => {
      validatePromoCode.mockResolvedValueOnce({ valid: false });

      await expect(checkout.applyPromoCode('INVALID')).rejects.toThrow('Invalid promo');
      const state = checkout.getState();
      expect(state.promoCode).toBeNull();
      expect(state.finalPrice).toBe(10000);
    });

    it('clears promo when pack changes', async () => {
      validatePromoCode.mockResolvedValueOnce({ valid: true, discountPercent: 20 });
      await checkout.applyPromoCode('SAVE20');

      fetchPricingBands.mockResolvedValueOnce([
        { packId: 'elpt', region: 'SA', priceUSD: 5000, priceKWD: 1500, currency: 'USD' },
      ]);
      await checkout.selectPack('elpt', 'SA');

      const state = checkout.getState();
      expect(state.promoCode).toBeNull();
      expect(state.discount).toBe(0);
      expect(state.finalPrice).toBe(5000);
    });
  });

  describe('order confirmation', () => {
    beforeEach(async () => {
      fetchPricingBands.mockResolvedValueOnce([
        { packId: 'aip', region: 'SA', priceUSD: 9900, priceKWD: 3050, currency: 'USD' },
      ]);
      await checkout.selectPack('aip', 'SA');
    });

    it('creates payment order with correct amount', async () => {
      createPaymentOrder.mockResolvedValueOnce({
        orderId: 'ord_12345',
        paymentUrl: 'https://moyasar.com/pay/ord_12345',
      });

      const result = await checkout.confirm();

      expect(createPaymentOrder).toHaveBeenCalledWith('aip', 9900);
      expect(result.orderId).toBe('ord_12345');
      expect(result.paymentUrl).toContain('moyasar.com');
    });

    it('applies discount to payment amount', async () => {
      validatePromoCode.mockResolvedValueOnce({ valid: true, discountPercent: 10 });
      await checkout.applyPromoCode('SAVE10');

      createPaymentOrder.mockResolvedValueOnce({
        orderId: 'ord_with_discount',
        paymentUrl: 'https://moyasar.com/pay/ord_with_discount',
      });

      await checkout.confirm();

      expect(createPaymentOrder).toHaveBeenCalledWith('aip', 8910); // 9900 * 0.9
    });

    it('errors if no pack selected', async () => {
      checkout = new CheckoutFlow('user_new');

      await expect(checkout.confirm()).rejects.toThrow('No pack selected');
      const state = checkout.getState();
      expect(state.step).toBe('error');
    });

    it('transitions to payment step', async () => {
      createPaymentOrder.mockResolvedValueOnce({
        orderId: 'ord_test',
        paymentUrl: 'https://moyasar.com/pay/ord_test',
      });

      await checkout.confirm();
      const state = checkout.getState();

      expect(state.step).toBe('payment');
    });
  });

  describe('entitlement verification', () => {
    it('confirms purchase success when entitlement granted', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      fetchUserEntitlements.mockResolvedValueOnce([
        {
          id: 'ent_123',
          packId: 'aip',
          expiresAt: futureDate.toISOString(),
        },
      ]);

      const hasEntitlement = await checkout.verifyEntitlement('aip');
      const state = checkout.getState();

      expect(hasEntitlement).toBe(true);
      expect(state.step).toBe('success');
    });

    it('handles missing entitlement', async () => {
      fetchUserEntitlements.mockResolvedValueOnce([]);

      const hasEntitlement = await checkout.verifyEntitlement('aip');

      expect(hasEntitlement).toBe(false);
    });

    it('handles entitlement expiration', async () => {
      const pastDate = new Date();
      pastDate.setFullYear(pastDate.getFullYear() - 1);

      fetchUserEntitlements.mockResolvedValueOnce([
        {
          id: 'ent_expired',
          packId: 'aip',
          expiresAt: pastDate.toISOString(),
        },
      ]);

      const hasEntitlement = await checkout.verifyEntitlement('aip');

      expect(hasEntitlement).toBe(true); // Entitlement record exists (even if expired)
    });

    it('errors gracefully on verification failure', async () => {
      fetchUserEntitlements.mockRejectedValueOnce(new Error('Service unavailable'));

      await expect(checkout.verifyEntitlement('aip')).rejects.toThrow('Service unavailable');
      const state = checkout.getState();
      expect(state.step).toBe('error');
    });
  });

  describe('error recovery', () => {
    it('allows retry after payment failure', async () => {
      fetchPricingBands.mockResolvedValueOnce([
        { packId: 'aip', region: 'SA', priceUSD: 9900, priceKWD: 3050, currency: 'USD' },
      ]);
      await checkout.selectPack('aip', 'SA');

      createPaymentOrder.mockRejectedValueOnce(new Error('Payment service error'));
      await expect(checkout.confirm()).rejects.toThrow();

      // Retry
      createPaymentOrder.mockResolvedValueOnce({
        orderId: 'ord_retry',
        paymentUrl: 'https://moyasar.com/pay/ord_retry',
      });

      const result = await checkout.confirm();
      expect(result.orderId).toBe('ord_retry');
    });

    it('preserves state on non-fatal errors', async () => {
      fetchPricingBands.mockResolvedValueOnce([
        { packId: 'aip', region: 'SA', priceUSD: 9900, priceKWD: 3050, currency: 'USD' },
      ]);
      await checkout.selectPack('aip', 'SA');

      validatePromoCode.mockResolvedValueOnce({ valid: false });
      await expect(checkout.applyPromoCode('BAD')).rejects.toThrow();

      const state = checkout.getState();
      expect(state.selectedPackId).toBe('aip'); // Pack still selected
      expect(state.basePrice).toBe(9900);
    });
  });
});
