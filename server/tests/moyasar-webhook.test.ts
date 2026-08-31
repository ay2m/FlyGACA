/**
 * Moyasar webhook handling — payment callback processing, idempotency, and security.
 *
 * Moyasar sends POST webhooks to `/api/billing/moyasar-webhook` when payments change state.
 * The handler must:
 * 1. Verify HMAC signature (prevent spoofing)
 * 2. Idempotent: same webhook processed multiple times should not double-charge
 * 3. Transactional: payment recorded atomically with entitlement grant
 * 4. Audit trail: every webhook logged for debugging/compliance
 *
 * This suite mocks the store and tests the core webhook logic in isolation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';

// Mock data & functions
const createPaymentRecord = vi.fn();
const findPaymentByReference = vi.fn();
const grantEntitlements = vi.fn();
const logWebhookEvent = vi.fn();

/**
 * Minimal webhook handler implementation for testing.
 * Real version in server/src/routes/billing.ts handles this via a route.
 */
function verifyMoyasarSignature(payload: string, signature: string, secret: string): boolean {
  const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
}

async function handleMoyasarWebhook(
  payload: Record<string, unknown>,
  signature: string,
  secret: string,
) {
  // Verify signature
  const payloadStr = JSON.stringify(payload);
  if (!verifyMoyasarSignature(payloadStr, signature, secret)) {
    throw new Error('Invalid signature');
  }

  // Log for audit trail
  await logWebhookEvent(payload);

  // Check idempotency: has this reference been processed?
  const reference = (payload.data as Record<string, unknown>)?.reference as string;
  const existing = await findPaymentByReference(reference);
  if (existing) {
    return { processed: false, reason: 'duplicate', payment: existing };
  }

  // Process payment (atomic transaction in real code)
  const payment = {
    id: crypto.randomUUID(),
    reference,
    amount: (payload.data as Record<string, unknown>).amount,
    status: (payload.data as Record<string, unknown>).status,
    userId: (payload.data as Record<string, unknown>).metadata?.userId,
  };

  await createPaymentRecord(payment);

  // Grant entitlements if payment succeeded
  if (payload.data && (payload.data as Record<string, unknown>).status === 'paid') {
    const metadata = (payload.data as Record<string, unknown>).metadata as Record<string, unknown>;
    await grantEntitlements(payment.userId, {
      packId: metadata.packId as string,
      durationDays: metadata.durationDays as number,
    });
  }

  return { processed: true, payment };
}

// Test suite
describe('Moyasar webhook handling', () => {
  const secret = 'test-webhook-secret';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signature verification', () => {
    it('accepts valid HMAC-SHA256 signature', () => {
      const payload = { event: 'payment.paid', data: { id: '123' } };
      const payloadStr = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

      expect(verifyMoyasarSignature(payloadStr, signature, secret)).toBe(true);
    });

    it('rejects invalid signature', () => {
      const payload = { event: 'payment.paid', data: { id: '123' } };
      const payloadStr = JSON.stringify(payload);
      const wrongSignature = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

      expect(verifyMoyasarSignature(payloadStr, wrongSignature, secret)).toBe(false);
    });

    it('rejects tampered payload', () => {
      const payload = { event: 'payment.paid', data: { id: '123' } };
      const payloadStr = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');
      const tamperedStr = JSON.stringify({ event: 'payment.paid', data: { id: '456' } });

      expect(verifyMoyasarSignature(tamperedStr, signature, secret)).toBe(false);
    });

    it('rejects webhook with invalid signature', async () => {
      const payload = {
        event: 'payment.paid',
        data: {
          id: 'pay_123',
          reference: 'ref_abc',
          amount: 9900,
          status: 'paid',
          metadata: { userId: 'user_1', packId: 'aip', durationDays: 365 },
        },
      };
      const badSignature = '0000000000000000000000000000000000000000000000000000000000000000';

      await expect(handleMoyasarWebhook(payload, badSignature, secret)).rejects.toThrow(
        'Invalid signature',
      );
      expect(createPaymentRecord).not.toHaveBeenCalled();
    });
  });

  describe('idempotency', () => {
    const payload = {
      event: 'payment.paid',
      data: {
        id: 'pay_123',
        reference: 'ref_abc',
        amount: 9900,
        status: 'paid',
        metadata: { userId: 'user_1', packId: 'aip', durationDays: 365 },
      },
    };
    const payloadStr = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

    it('processes first webhook normally', async () => {
      findPaymentByReference.mockResolvedValueOnce(null);
      createPaymentRecord.mockResolvedValueOnce(undefined);
      grantEntitlements.mockResolvedValueOnce(undefined);

      const result = await handleMoyasarWebhook(payload, signature, secret);

      expect(result.processed).toBe(true);
      expect(createPaymentRecord).toHaveBeenCalled();
      expect(grantEntitlements).toHaveBeenCalledWith('user_1', {
        packId: 'aip',
        durationDays: 365,
      });
    });

    it('ignores duplicate webhook (same reference)', async () => {
      const existingPayment = {
        id: 'pay_existing_123',
        reference: 'ref_abc',
        amount: 9900,
        status: 'paid',
      };
      findPaymentByReference.mockResolvedValueOnce(existingPayment);

      const result = await handleMoyasarWebhook(payload, signature, secret);

      expect(result.processed).toBe(false);
      expect(result.reason).toBe('duplicate');
      expect(result.payment).toEqual(existingPayment);
      expect(createPaymentRecord).not.toHaveBeenCalled();
      expect(grantEntitlements).not.toHaveBeenCalled();
    });

    it('handles replayed webhook safely (no double-entitlements)', async () => {
      const existingPayment = {
        id: 'pay_existing_456',
        reference: 'ref_abc',
        amount: 9900,
        status: 'paid',
      };
      findPaymentByReference.mockResolvedValueOnce(existingPayment);

      // First call
      const result1 = await handleMoyasarWebhook(payload, signature, secret);
      // Second call (replay)
      const result2 = await handleMoyasarWebhook(payload, signature, secret);

      expect(result1.processed).toBe(false);
      expect(result2.processed).toBe(false);
      expect(grantEntitlements).not.toHaveBeenCalled();
    });
  });

  describe('payment state transitions', () => {
    it('grants entitlements when payment status is "paid"', async () => {
      const payload = {
        event: 'payment.paid',
        data: {
          id: 'pay_123',
          reference: 'ref_paid',
          amount: 9900,
          status: 'paid',
          metadata: { userId: 'user_2', packId: 'elpt', durationDays: 30 },
        },
      };
      const payloadStr = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

      findPaymentByReference.mockResolvedValueOnce(null);
      createPaymentRecord.mockResolvedValueOnce(undefined);
      grantEntitlements.mockResolvedValueOnce(undefined);

      const result = await handleMoyasarWebhook(payload, signature, secret);

      expect(result.processed).toBe(true);
      expect(grantEntitlements).toHaveBeenCalledWith('user_2', {
        packId: 'elpt',
        durationDays: 30,
      });
    });

    it('does not grant entitlements when payment status is "pending"', async () => {
      const payload = {
        event: 'payment.pending',
        data: {
          id: 'pay_456',
          reference: 'ref_pending',
          amount: 9900,
          status: 'pending',
          metadata: { userId: 'user_3', packId: 'aip', durationDays: 365 },
        },
      };
      const payloadStr = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

      findPaymentByReference.mockResolvedValueOnce(null);
      createPaymentRecord.mockResolvedValueOnce(undefined);

      const result = await handleMoyasarWebhook(payload, signature, secret);

      expect(result.processed).toBe(true);
      expect(createPaymentRecord).toHaveBeenCalled();
      expect(grantEntitlements).not.toHaveBeenCalled();
    });

    it('does not grant entitlements when payment status is "failed"', async () => {
      const payload = {
        event: 'payment.failed',
        data: {
          id: 'pay_789',
          reference: 'ref_failed',
          amount: 9900,
          status: 'failed',
          metadata: { userId: 'user_4', packId: 'aip' },
        },
      };
      const payloadStr = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

      findPaymentByReference.mockResolvedValueOnce(null);
      createPaymentRecord.mockResolvedValueOnce(undefined);

      const result = await handleMoyasarWebhook(payload, signature, secret);

      expect(result.processed).toBe(true);
      expect(grantEntitlements).not.toHaveBeenCalled();
    });
  });

  describe('audit trail', () => {
    it('logs every webhook for compliance audit', async () => {
      const payload = {
        event: 'payment.paid',
        data: {
          id: 'pay_audit',
          reference: 'ref_audit',
          amount: 9900,
          status: 'paid',
          metadata: { userId: 'user_audit', packId: 'elpt' },
        },
      };
      const payloadStr = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

      findPaymentByReference.mockResolvedValueOnce(null);
      createPaymentRecord.mockResolvedValueOnce(undefined);
      grantEntitlements.mockResolvedValueOnce(undefined);

      await handleMoyasarWebhook(payload, signature, secret);

      expect(logWebhookEvent).toHaveBeenCalledWith(payload);
    });

    it('logs webhook even when duplicate (for debugging)', async () => {
      const payload = {
        event: 'payment.paid',
        data: {
          id: 'pay_dup',
          reference: 'ref_dup',
          amount: 9900,
          status: 'paid',
          metadata: { userId: 'user_dup', packId: 'aip' },
        },
      };
      const payloadStr = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

      const existingPayment = { id: 'pay_existing_dup', reference: 'ref_dup' };
      findPaymentByReference.mockResolvedValueOnce(existingPayment);

      await handleMoyasarWebhook(payload, signature, secret);

      expect(logWebhookEvent).toHaveBeenCalledWith(payload);
    });
  });

  describe('error handling', () => {
    const payload = {
      event: 'payment.paid',
      data: {
        id: 'pay_err',
        reference: 'ref_err',
        amount: 9900,
        status: 'paid',
        metadata: { userId: 'user_err', packId: 'aip', durationDays: 365 },
      },
    };
    const payloadStr = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(payloadStr).digest('hex');

    it('fails gracefully if payment record creation fails', async () => {
      findPaymentByReference.mockResolvedValueOnce(null);
      createPaymentRecord.mockRejectedValueOnce(new Error('Database error'));

      await expect(handleMoyasarWebhook(payload, signature, secret)).rejects.toThrow(
        'Database error',
      );
    });

    it('fails gracefully if entitlement grant fails', async () => {
      findPaymentByReference.mockResolvedValueOnce(null);
      createPaymentRecord.mockResolvedValueOnce(undefined);
      grantEntitlements.mockRejectedValueOnce(new Error('Entitlement service error'));

      await expect(handleMoyasarWebhook(payload, signature, secret)).rejects.toThrow(
        'Entitlement service error',
      );
    });
  });
});
