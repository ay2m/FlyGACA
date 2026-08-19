import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  PACK_TIERS,
  PACK_TIER_PRICE,
  EXAM_BUNDLE_PRICE,
  PREP_PACK_PRICE_FROM,
  packPrice,
  PACKS,
} from '@/lib/prepCatalog';
import { COHORT_PRICE_SAR } from '@/lib/services/pricing';
import {
  PACK_TIERS as SERVER_PACK_TIERS,
  SELLABLE_PACK_IDS,
  amountForCheckout,
  packTier as serverPackTier,
  type PriceEnv,
} from '../server/src/billing-core';

/**
 * The display/charge parity gate.
 *
 * Prices live in two disconnected places by design: the pages render TypeScript
 * constants, and the server derives the amount it actually charges from `PRICE_*`
 * environment variables (server/src/prices.ts has no code defaults). Nothing forced
 * those to agree, and they had drifted on every SKU — the page advertised SAR 6,000
 * for a cohort while the documented deploy charged SAR 2,499, and packs were displayed
 * BELOW what they charged while subscriptions were displayed ABOVE it.
 *
 * `.env.example` is treated here as the declared price table: it is what the runbook
 * tells an operator to deploy, so it is the closest thing in the repo to the truth.
 *
 * IMPORTANT: this cannot see the live Cloud Run revision. A green run means the repo
 * is self-consistent, not that production charges these amounts — changing a price
 * still means updating the deployed revision by hand.
 */

const envText = readFileSync(join(process.cwd(), '.env.example'), 'utf8');

/** The declared SAR price for a `PRICE_*` key, from .env.example. */
function declared(key: string): string {
  const line = envText.split('\n').find((l) => l.startsWith(`${key}=`));
  if (!line) throw new Error(`${key} is not declared in .env.example`);
  return line.slice(key.length + 1).trim();
}

const priceEnv: PriceEnv = {
  proMonthly: declared('PRICE_PRO_MONTHLY'),
  proAnnual: declared('PRICE_PRO_ANNUAL'),
  pass: declared('PRICE_PASS'),
  credits: declared('PRICE_CREDITS'),
  prepPack: declared('PRICE_PREP_PACK'),
  prepPackEssential: declared('PRICE_PREP_PACK_ESSENTIAL'),
  prepPackStandard: declared('PRICE_PREP_PACK_STANDARD'),
  prepPackComplete: declared('PRICE_PREP_PACK_COMPLETE'),
  bundle: declared('PRICE_BUNDLE'),
  cohort: declared('PRICE_COHORT'),
};

/** What the display constants in `src/` say a SKU costs, in SAR. */
function displayed(source: string, symbol: string): number {
  const src = readFileSync(join(process.cwd(), source), 'utf8');
  const m = new RegExp(`${symbol}\\s*=\\s*\\{?[^;]*?(\\d[\\d_]*)`).exec(src);
  if (!m) throw new Error(`could not read ${symbol} from ${source}`);
  return Number(m[1].replace(/_/g, ''));
}

const PRICING_PAGE = 'src/pages/pricing/Pricing.tsx';

describe('display prices match the charged price table', () => {
  it('Pro monthly and annual', () => {
    const src = readFileSync(join(process.cwd(), PRICING_PAGE), 'utf8');
    const m = /const PRO_PRICE = \{ monthly: (\d+), annual: (\d+) \}/.exec(src);
    expect(m, 'PRO_PRICE not found in Pricing.tsx').toBeTruthy();
    expect(Number(m![1])).toBe(Number(priceEnv.proMonthly));
    expect(Number(m![2])).toBe(Number(priceEnv.proAnnual));
  });

  it('the Exam Season Pass', () => {
    expect(displayed(PRICING_PAGE, 'PASS_PRICE')).toBe(Number(priceEnv.pass));
  });

  it('the All-Access bundle', () => {
    expect(EXAM_BUNDLE_PRICE).toBe(Number(priceEnv.bundle));
  });

  it('the B2B cohort', () => {
    expect(COHORT_PRICE_SAR).toBe(Number(priceEnv.cohort));
  });

  it('every pack price band', () => {
    expect(PACK_TIER_PRICE.essential).toBe(Number(priceEnv.prepPackEssential));
    expect(PACK_TIER_PRICE.standard).toBe(Number(priceEnv.prepPackStandard));
    expect(PACK_TIER_PRICE.complete).toBe(Number(priceEnv.prepPackComplete));
    // The legacy flat key is the server's fallback when a band is unset, so it must
    // not undercut the entry band.
    expect(Number(priceEnv.prepPack)).toBe(PREP_PACK_PRICE_FROM);
  });

  it('every sellable pack charges exactly what its page shows', () => {
    expect(SELLABLE_PACK_IDS.length).toBeGreaterThan(0);
    for (const id of SELLABLE_PACK_IDS) {
      const pack = PACKS.find((p) => p.id === id);
      expect(pack, `${id} is sellable but missing from PACKS`).toBeTruthy();
      const charged = amountForCheckout('pack', undefined, priceEnv, id);
      expect(charged, `${id}: charged halalas vs displayed SAR`).toBe(packPrice(pack!) * 100);
    }
  });
});

describe('the client and server agree on which band a pack is in', () => {
  it('assigns the same band to every sellable pack', () => {
    for (const id of SELLABLE_PACK_IDS) {
      expect(PACK_TIERS[id], `${id} has no client band`).toBeTruthy();
      expect(PACK_TIERS[id], `${id} band drifted`).toBe(serverPackTier(id));
    }
  });

  it('has no band entry for a pack that is not sellable', () => {
    const sellable = new Set<string>(SELLABLE_PACK_IDS);
    for (const id of Object.keys(PACK_TIERS)) expect(sellable.has(id)).toBe(true);
    for (const id of Object.keys(SERVER_PACK_TIERS)) expect(sellable.has(id)).toBe(true);
  });
});
