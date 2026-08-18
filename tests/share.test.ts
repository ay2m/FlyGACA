import { describe, it, expect, beforeEach, vi } from 'vitest';

// Keep the lib hermetic: stub the native share sheet and the analytics sink so
// these tests exercise only the referral/URL logic.
vi.mock('@/lib/native/nativeBridge', () => ({
  share: vi.fn().mockResolvedValue('shared'),
}));
vi.mock('@/lib/services/backend', () => ({
  logAnalyticsEvent: vi.fn().mockResolvedValue(undefined),
}));

import { share } from '@/lib/native/nativeBridge';
import { logAnalyticsEvent } from '@/lib/services/backend';
import { withRef, shareCurrent, captureReferral, getReferralSource } from '@/lib/share';

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
});

describe('withRef', () => {
  it('appends ?ref=<source>, preserving existing query and hash', () => {
    expect(withRef('https://flygaca.com/tools/crosswind?rwy=33#out', 'tool')).toBe(
      'https://flygaca.com/tools/crosswind?rwy=33&ref=tool#out',
    );
  });

  it('adds the query string when there is none', () => {
    expect(withRef('https://flygaca.com/library/gacar-91', 'library')).toBe(
      'https://flygaca.com/library/gacar-91?ref=library',
    );
  });
});

describe('shareCurrent', () => {
  it('shares the current URL tagged with the source and returns the result', async () => {
    window.history.replaceState({}, '', '/tools/crosswind?rwy=33');
    const result = await shareCurrent('tool', { title: 'Crosswind' });
    expect(result).toBe('shared');
    expect(share).toHaveBeenCalledTimes(1);
    const arg = (share as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(arg.title).toBe('Crosswind');
    expect(arg.url).toContain('ref=tool');
    expect(arg.url).toContain('rwy=33');
  });
});

describe('captureReferral', () => {
  it('stashes ref, strips only ref from the URL, and emits an event', async () => {
    window.history.replaceState({}, '', '/tools/crosswind?ref=newsletter&lang=ar#sec');
    captureReferral();
    // Synchronous effects: stash + URL cleanup happen before the next render.
    expect(getReferralSource()).toBe('newsletter');
    expect(window.location.search).toBe('?lang=ar');
    expect(window.location.hash).toBe('#sec');
    // The analytics emission is fire-and-forget via a lazy import — await it.
    await vi.waitFor(() =>
      expect(logAnalyticsEvent).toHaveBeenCalledWith('referral_landing', { ref: 'newsletter' }),
    );
  });

  it('does nothing when there is no ref param', () => {
    window.history.replaceState({}, '', '/tools/crosswind?lang=ar');
    captureReferral();
    expect(getReferralSource()).toBeNull();
    expect(window.location.search).toBe('?lang=ar');
    expect(logAnalyticsEvent).not.toHaveBeenCalled();
  });
});
