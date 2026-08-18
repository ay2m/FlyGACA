import { describe, expect, it } from 'vitest';

/**
 * The client/server mirrored constants, pinned.
 *
 * CLAUDE.md says the client-side mirrors "must match their server core", but
 * nothing asserted it — the two sides live in separate npm packages with
 * separate CI jobs, so a change to one could ship without the other for a whole
 * release. Every value below is user-visible on the client and enforced on the
 * server; a drift means the app promises one thing and the gateway does another
 * (a quota counter that never matches, or a credit pack that charges for 50 and
 * grants 30).
 *
 * These imports reach into `server/src/` on purpose. Those modules are the
 * pure, dependency-free `*-core` layer, so importing them here costs nothing and
 * makes the mismatch a failing test in the frontend suite rather than a bug
 * report.
 */
import {
  FREE_DAILY_LIMIT as SERVER_FREE_DAILY_LIMIT,
  ANON_DAILY_LIMIT as SERVER_ANON_DAILY_LIMIT,
  CREDIT_PACK_SIZE as SERVER_CREDIT_PACK_SIZE,
} from '../server/src/chat-quota-core';
import { SELLABLE_PACK_IDS } from '../server/src/billing-core';

import { FREE_DAILY_LIMIT, ANON_DAILY_LIMIT } from '@/calc/chat/chatQuota';
import { CREDIT_PACK_SIZE } from '@/lib/services/billing';
import { PACKS } from '@/lib/prepCatalog';

describe('chat quota', () => {
  it('the free daily limit matches server/src/chat-quota-core.ts', () => {
    expect(FREE_DAILY_LIMIT).toBe(SERVER_FREE_DAILY_LIMIT);
  });

  it('the anonymous daily limit matches server/src/chat-quota-core.ts', () => {
    expect(ANON_DAILY_LIMIT).toBe(SERVER_ANON_DAILY_LIMIT);
  });

  /**
   * Note the limit the gateway actually enforces is `config.chat.freeDailyLimit`
   * (server/src/config.ts) — setting CHAT_FREE_DAILY_LIMIT overrides the constant
   * at runtime without touching either file, and the client would keep showing
   * the old number. This test pins the default; the env var is a deliberate,
   * deploy-time escape hatch that no test can see.
   */
  it('the credit pack size matches server/src/chat-quota-core.ts', () => {
    expect(CREDIT_PACK_SIZE).toBe(SERVER_CREDIT_PACK_SIZE);
  });
});

describe('sellable exam-prep packs', () => {
  it('SELLABLE_PACK_IDS is exactly the paid + live packs in prepCatalog.ts', () => {
    const paidAndLive = PACKS.filter((p) => p.access === 'paid' && p.status === 'live')
      .map((p) => p.id)
      .sort();

    expect([...SELLABLE_PACK_IDS].sort()).toEqual(paidAndLive);
  });

  it('never lists a free or unreleased pack as sellable', () => {
    const byId = new Map(PACKS.map((p) => [p.id, p]));
    for (const id of SELLABLE_PACK_IDS) {
      const pack = byId.get(id);
      expect(
        pack,
        `SELLABLE_PACK_IDS has "${id}", which prepCatalog.ts does not define`,
      ).toBeDefined();
      expect(pack?.access).toBe('paid');
      expect(pack?.status).toBe('live');
    }
  });
});
