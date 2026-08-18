/**
 * Waitlist capture (src/lib/services/waitlist.ts): POSTs {email, topic} to the
 * write-only `/api/waitlist` route. Backend-gated — throws `'unavailable'` in the
 * local-first build so the caller can surface a friendly error.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetBackend } from './helpers/mockBackend';
import type { BackendState } from './helpers/mockBackend';

const h = vi.hoisted((): BackendState => ({
  configured: true,
  responses: {},
  error: null,
  calls: [],
  events: [],
}));

vi.mock('@/lib/services/backend', async () => {
  const { makeBackendModule } = await import('./helpers/mockBackend');
  return makeBackendModule(h);
});

import { notifyWaitlist } from '@/lib/services/waitlist';

beforeEach(() => resetBackend(h));

describe('notifyWaitlist', () => {
  it('throws "unavailable" in the local-first build (no API configured)', async () => {
    h.configured = false;
    await expect(notifyWaitlist('a@b.com')).rejects.toThrow('unavailable');
    expect(h.calls).toHaveLength(0);
  });

  it('posts { email } to /waitlist', async () => {
    await notifyWaitlist('a@b.com');
    expect(h.calls).toEqual([{ path: '/waitlist', method: 'POST', body: { email: 'a@b.com' } }]);
  });

  it('includes the topic when one is provided', async () => {
    await notifyWaitlist('a@b.com', 'pack-atpl');
    expect(h.calls[0].body).toEqual({ email: 'a@b.com', topic: 'pack-atpl' });
  });

  it('omits the topic key entirely when it is empty', async () => {
    await notifyWaitlist('a@b.com', '');
    expect(h.calls[0].body).toEqual({ email: 'a@b.com' });
    expect(h.calls[0].body).not.toHaveProperty('topic');
  });
});
