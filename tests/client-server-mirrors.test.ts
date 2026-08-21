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
import {
  MODEL_UNCONFIGURED as SERVER_MODEL_UNCONFIGURED,
  QUOTA_EXCEEDED as SERVER_QUOTA_EXCEEDED,
} from '../server/src/contract';

import { meetsPasswordPolicy as serverMeetsPasswordPolicy } from '../server/src/auth-core';

import { FREE_DAILY_LIMIT, ANON_DAILY_LIMIT } from '@/calc/chat/chatQuota';
import { meetsPasswordPolicy } from '@/calc/app/passwordPolicy';
import { CREDIT_PACK_SIZE } from '@/lib/services/billing';
import { PACKS } from '@/lib/prepCatalog';
import { MODEL_UNCONFIGURED, QUOTA_EXCEEDED, FAILURE_I18N_KEY } from '@/calc/chat/chatStream';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

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

describe('chat stream error codes', () => {
  it('the unconfigured-model code matches the gateway that emits it', () => {
    // The client compares the SSE frame's `code` against this literal to decide
    // between "Captain Adel is being connected" and a generic failure. If the two
    // drift, every unconfigured turn silently falls back to the wrong message —
    // visible only to users, never to a test that mocks one side.
    expect(MODEL_UNCONFIGURED).toBe(SERVER_MODEL_UNCONFIGURED);
  });

  it('the quota code matches, so the upsell fires on the right 429', () => {
    // The gateway returns 429 for the free-allowance wall AND for the burst
    // limiter. Only the code separates them, so a drift here shows the upgrade
    // nag to someone who just typed too fast.
    expect(QUOTA_EXCEEDED).toBe(SERVER_QUOTA_EXCEEDED);
  });
});

describe('chat failure copy', () => {
  /** Resolve a dotted i18n key against a bundle. */
  function lookup(bundle: unknown, key: string): unknown {
    return key
      .split('.')
      .reduce<unknown>((acc, part) => (acc as Record<string, unknown> | undefined)?.[part], bundle);
  }

  it('every failure maps to a key that exists in BOTH bundles', () => {
    // A missing key does not throw — i18next renders the raw key, so the user
    // would read "chat.unavailable" in the chat window. i18n-parity.test.ts only
    // proves en/ar agree with each other, not that these keys exist at all.
    for (const [failure, key] of Object.entries(FAILURE_I18N_KEY)) {
      expect(typeof lookup(en, key), `en.json is missing ${key} (for ${failure})`).toBe('string');
      expect(typeof lookup(ar, key), `ar.json is missing ${key} (for ${failure})`).toBe('string');
    }
  });

  it('no longer claims the backend is missing "in this build"', () => {
    // That wording is true of a local no-API build and wrong in production, where
    // the API is up and only the model endpoint is absent.
    expect(String(lookup(en, 'chat.notReady'))).not.toMatch(/in this build/i);
  });
});

describe('password policy', () => {
  // Regexes cannot be compared structurally across the packages, so pin the
  // BEHAVIOR: both sides must return the same verdict for every vector. A
  // drift means the sign-up form promises rules the API does not enforce (or
  // rejects a password the server would take).
  const vectors = [
    'A-good-password1', // all four rules met
    'Aa1!Aa1!', // exactly 8 chars, all rules met
    'Aa1!Aa1', // too short
    'aa1!aa1!', // no upper case
    'AA1!AA1!', // no lower case
    'Aa!!Aa!!', // no digit
    'Aa11Aa11', // no special character
    'كلمةسر1234', // unicode: no ASCII case → mixed fails, special passes
    ' spaced Aa1! ', // whitespace counts as a special character
    '',
  ];

  it.each(vectors.map((v) => [v]))('agrees with the server on %j', (password) => {
    expect(meetsPasswordPolicy(password)).toBe(serverMeetsPasswordPolicy(password));
  });

  it('the strong vector passes and the weak ones fail on both sides', () => {
    expect(meetsPasswordPolicy('A-good-password1')).toBe(true);
    expect(meetsPasswordPolicy('aa1!aa1!')).toBe(false);
  });
});
