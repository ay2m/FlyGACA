import { describe, expect, it, beforeEach } from 'vitest';
import {
  isNative,
  platform,
  billingChannel,
  toAppPath,
  nativeStore,
} from '@/lib/native/nativeBridge';

describe('native-bridge on the web', () => {
  it('reports web platform and is not native', () => {
    expect(isNative()).toBe(false);
    expect(platform()).toBe('web');
  });

  it('uses Moyasar billing on the web', () => {
    expect(billingChannel()).toBe('moyasar');
  });
});

describe('toAppPath', () => {
  it('keeps the path of an https universal link', () => {
    expect(toAppPath('https://flygaca.com/library/part-61#sec-x')).toBe('/library/part-61#sec-x');
  });

  it('recovers the path from a custom-scheme deep link', () => {
    expect(toAppPath('com.flygaca.app://library/reference/ac-68-1')).toBe(
      '/library/reference/ac-68-1',
    );
  });

  it('returns null for an unparseable url', () => {
    expect(toAppPath('not a url')).toBeNull();
  });
});

describe('nativeStore (web → localStorage)', () => {
  beforeEach(() => localStorage.clear());

  it('round-trips and removes a value', async () => {
    await nativeStore.set('k', 'v');
    expect(await nativeStore.get('k')).toBe('v');
    await nativeStore.remove('k');
    expect(await nativeStore.get('k')).toBeNull();
  });
});
