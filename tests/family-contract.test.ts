import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * This repo's half of the cross-repo family contract.
 *
 * `contracts/flygaca-family.json` is committed byte-identically to `ay2m/Office`,
 * this repo and `ay2m/Captain-Adel`. It exists because the family's cross-repo
 * claims used to live only in prose: Office's `01-governance/company-facts.md`
 * called itself the source of truth for the legal-entity facts and listed the
 * five places each value is restated here and in Captain-Adel, and nothing ever
 * checked that they still agreed.
 *
 * Two blocks concern this repo:
 *
 *   `chat`   — WE own it. `server/src/contract.ts` is the definition; the tests
 *              below pin the manifest to it, so a rename here that Captain-Adel
 *              has not followed cannot ship silently. Captain-Adel's `/v1/chat`
 *              is a superset of this shape (see docs/DESIGN-brain-consolidation.md).
 *   `entity` — Office owns it. We are a CONSUMER: every value must still appear
 *              verbatim in the SEO structured data and in both i18n bundles.
 *
 * This follows `tests/client-server-mirrors.test.ts`: import the real modules,
 * assert against the shared source, and make the mismatch a failing test rather
 * than a bug report.
 */
import {
  MODEL_UNCONFIGURED,
  STREAM_FAILED,
  QUOTA_EXCEEDED,
  RATE_LIMITED,
} from '../server/src/contract';
import { organizationLd } from '@/lib/seo/jsonld';
import en from '@/i18n/en.json';
import ar from '@/i18n/ar.json';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'contracts', 'flygaca-family.json'), 'utf8'),
);

/** The source text of a repo file, for the "does this string still appear" checks. */
const source = (rel: string) => readFileSync(path.join(REPO_ROOT, rel), 'utf8');

describe('the family manifest itself', () => {
  it('carries a self-hash matching its own content', () => {
    // Kept identical to Office's tools/contracts/stamp-manifest.mjs and to
    // Captain-Adel's test/family-contract.test.js. A hand-edit that skips the
    // re-stamp fails here, in every repo, immediately.
    const want = createHash('sha256')
      .update(JSON.stringify({ ...manifest, sha: '' }))
      .digest('hex');
    expect(
      manifest.sha,
      'the manifest was edited without re-stamping — run Office\'s ' +
        'tools/contracts/stamp-manifest.mjs, then copy the file to all three repos',
    ).toBe(want);
  });

  it('names this repo as the owner of the chat block', () => {
    expect(manifest.chat.owner).toBe('ay2m/FlyGACA');
  });

  it('names Office as the owner of the entity block we only consume', () => {
    expect(manifest.entity.owner).toBe('ay2m/Office');
  });

  it('lists this repo in the roster', () => {
    const names = manifest.repos.members.map((m: { name: string }) => m.name);
    expect(names).toContain('ay2m/FlyGACA');
    expect(names).toContain('ay2m/Office');
    expect(names).toContain('ay2m/Captain-Adel');
  });
});

describe('the chat contract we own', () => {
  it('pins the stream error codes the gateway emits', () => {
    expect(manifest.chat.streamErrorCodes.modelUnconfigured).toBe(MODEL_UNCONFIGURED);
    expect(manifest.chat.streamErrorCodes.streamFailed).toBe(STREAM_FAILED);
  });

  it('pins the JSON error codes the client classifies on', () => {
    expect(manifest.chat.errorCodes.quotaExceeded).toBe(QUOTA_EXCEEDED);
    expect(manifest.chat.errorCodes.rateLimited).toBe(RATE_LIMITED);
  });

  it('lists exactly the grounding kinds contract.ts declares', () => {
    // GroundingKind is a type, so it has no runtime value to import — read the
    // union out of the source instead. That keeps this honest: widening the type
    // without telling the other repo fails here.
    const declared = /export type GroundingKind =([^;]+);/.exec(source('server/src/contract.ts'));
    expect(declared, 'GroundingKind union not found in server/src/contract.ts').toBeTruthy();
    const kinds = [...declared![1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]);
    expect(kinds.sort()).toEqual([...manifest.chat.groundingKinds].sort());
  });

  it('lists exactly the stream event types contract.ts declares', () => {
    const src = source('server/src/contract.ts');
    const union = src.slice(src.indexOf('export type StreamEvent'), src.indexOf('export const MODEL_UNCONFIGURED'));
    const types = [...union.matchAll(/type: "([a-z]+)"/g)].map((m) => m[1]);
    expect([...new Set(types)].sort()).toEqual([...manifest.chat.streamEventTypes].sort());
  });

  it('declares every ChatResponse field the manifest promises', () => {
    const src = source('server/src/contract.ts');
    const body = src.slice(src.indexOf('export interface ChatResponse'));
    for (const field of manifest.chat.responseFields) {
      const declared = body.includes(`${field}:`) || body.includes(`${field}?:`);
      expect(declared, `ChatResponse is missing "${field}"`).toBe(true);
    }
  });

  it('declares every ChatRequest field the manifest promises', () => {
    const src = source('server/src/contract.ts');
    const body = src.slice(src.indexOf('export interface ChatRequest'), src.indexOf('export interface ChatResponse'));
    for (const field of manifest.chat.requestFields) {
      expect(body.includes(field), `ChatRequest is missing "${field}"`).toBe(true);
    }
  });

  it('declares every ChatSource field the manifest promises', () => {
    const src = source('server/src/contract.ts');
    const body = src.slice(src.indexOf('export interface ChatSource'), src.indexOf('/** Grounding verdict'));
    for (const field of manifest.chat.sourceFields) {
      const declared = body.includes(`${field}:`) || body.includes(`${field}?:`);
      expect(declared, `ChatSource is missing "${field}"`).toBe(true);
    }
  });

  it('defaults this product to the flygaca tenant, which Captain-Adel also accepts', () => {
    expect(manifest.chat.tenants).toContain(manifest.chat.defaultTenantFlyGaca);
    expect(manifest.chat.defaultTenantFlyGaca).toBe('flygaca');
    // The ChatRequest doc-comment is where that default is stated for the client.
    expect(source('server/src/contract.ts')).toContain('Defaults to "flygaca"');
  });
});

describe('the entity facts Office owns', () => {
  const e = manifest.entity;

  it('matches the SEO structured data', () => {
    const ld = organizationLd() as Record<string, never> & {
      legalName: string;
      alternateName: string;
      vatID: string;
      taxID: string;
      address: { addressLocality: string; postalCode: string; addressCountry: string };
      identifier: { propertyID: string; value: string };
    };
    expect(ld.legalName).toBe(e.legalNameEn);
    expect(ld.alternateName).toBe(e.legalNameAr);
    expect(ld.vatID).toBe(e.vatNumber);
    expect(ld.taxID).toBe(e.vatNumber);
    expect(ld.identifier.propertyID).toBe('SA-CR');
    expect(ld.identifier.value).toBe(e.commercialRegistration);
    expect(ld.address.addressLocality).toBe(e.addressLocality);
    expect(ld.address.postalCode).toBe(e.postalCode);
    expect(ld.address.addressCountry).toBe(e.addressCountry);
  });

  it('appears in the English footer operator line', () => {
    const line = (en as { footer: { legalEntity: string } }).footer.legalEntity;
    for (const value of [e.legalNameEn, e.legalNameAr, e.commercialRegistration, e.vatNumber, e.addressLocality]) {
      expect(line, `footer.legalEntity (en) no longer contains "${value}"`).toContain(value);
    }
  });

  it('appears in the Arabic footer operator line', () => {
    const line = (ar as { footer: { legalEntity: string } }).footer.legalEntity;
    for (const value of [e.legalNameEn, e.legalNameAr, e.commercialRegistration, e.vatNumber, e.addressLocalityAr]) {
      expect(line, `footer.legalEntity (ar) no longer contains "${value}"`).toContain(value);
    }
  });

  it('appears in the legal pages in both bundles', () => {
    // Terms and privacy restate the entity block; a CR or VAT change that misses
    // one language is exactly the drift this catches.
    for (const [lang, bundle] of [['en', en], ['ar', ar]] as const) {
      const text = JSON.stringify((bundle as { legal: unknown }).legal);
      for (const value of [e.legalNameEn, e.legalNameAr, e.commercialRegistration]) {
        expect(text, `legal.* (${lang}) no longer contains "${value}"`).toContain(value);
      }
    }
  });

  it('never carries the banking details, which stay in ay2m/Office', () => {
    // company-facts.md's hard rule. The manifest travels to this repo and to
    // Captain-Adel, so assert the shape of what must never arrive with it.
    const text = JSON.stringify(manifest);
    expect(/\bSA\d{22}\b/.test(text), 'the manifest contains an IBAN').toBe(false);
    expect(Object.keys(e)).not.toContain('iban');
    expect(Object.keys(e)).not.toContain('accountNumber');
  });
});
