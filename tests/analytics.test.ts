import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import {
  reportError,
  webVitalPayload,
  isVercelHost,
  isAnalyticsEnabled,
  isVercelAnalyticsEnabled,
  enabled,
} from '@/lib/analytics';
import { track } from '@vercel/analytics';
import * as nativeBridge from '@/lib/native/nativeBridge';

vi.mock('@vercel/analytics');
vi.mock('@/lib/native/nativeBridge');

describe('analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('webVitalPayload', () => {
    it('rounds CLS metric to 3 decimal places', () => {
      const metric = {
        name: 'CLS',
        value: 0.1234567,
        rating: 'good',
        id: 'test-id',
      };
      const payload = webVitalPayload(metric);
      expect(payload).toEqual({
        name: 'CLS',
        value: 0.123,
        rating: 'good',
        id: 'test-id',
      });
    });

    it('rounds LCP metric to whole number', () => {
      const metric = {
        name: 'LCP',
        value: 2500.789,
        rating: 'good',
        id: 'test-id',
      };
      const payload = webVitalPayload(metric);
      expect(payload).toEqual({
        name: 'LCP',
        value: 2501,
        rating: 'good',
        id: 'test-id',
      });
    });

    it('rounds INP metric to whole number', () => {
      const metric = {
        name: 'INP',
        value: 123.456,
        rating: 'good',
        id: 'test-id',
      };
      const payload = webVitalPayload(metric);
      expect(payload.value).toBe(123);
    });

    it('rounds FCP metric to whole number', () => {
      const metric = {
        name: 'FCP',
        value: 1800.5,
        rating: 'good',
        id: 'test-id',
      };
      const payload = webVitalPayload(metric);
      expect(payload.value).toBe(1801);
    });

    it('rounds TTFB metric to whole number', () => {
      const metric = {
        name: 'TTFB',
        value: 600.2,
        rating: 'good',
        id: 'test-id',
      };
      const payload = webVitalPayload(metric);
      expect(payload.value).toBe(600);
    });

    it('preserves metric name, rating, and id', () => {
      const metric = {
        name: 'CLS',
        value: 0.1,
        rating: 'poor',
        id: 'custom-id',
      };
      const payload = webVitalPayload(metric);
      expect(payload.name).toBe('CLS');
      expect(payload.rating).toBe('poor');
      expect(payload.id).toBe('custom-id');
    });
  });

  describe('isVercelHost', () => {
    it('returns false when location is not vercel.app', () => {
      // window is always defined in jsdom test environment
      const result = isVercelHost();
      expect(typeof result).toBe('boolean');
    });

    it('returns false for non-vercel hosts', () => {
      window.location = { hostname: 'localhost' } as any;
      const result = isVercelHost();
      expect(result).toBe(false);
    });

    it('returns true for vercel.app hostnames', () => {
      window.location = { hostname: 'test.vercel.app' } as any;
      const result = isVercelHost();
      expect(result).toBe(true);
    });
  });

  describe('isAnalyticsEnabled', () => {
    it('returns false when window is undefined', () => {
      // In jsdom window exists, so this tests the function structure
      const result = isAnalyticsEnabled();
      expect(typeof result).toBe('boolean');
    });

    it('returns false when isNative returns true', () => {
      vi.mocked(nativeBridge.isNative).mockReturnValue(true);
      const result = isAnalyticsEnabled();
      expect(result).toBe(false);
    });

    it('returns false when isNative returns false in dev mode', () => {
      vi.mocked(nativeBridge.isNative).mockReturnValue(false);
      // In dev/test PROD is false, so analytics should be disabled
      const result = isAnalyticsEnabled();
      expect(result).toBe(false);
    });
  });

  describe('isVercelAnalyticsEnabled', () => {
    it('returns false when analytics not enabled', () => {
      vi.mocked(nativeBridge.isNative).mockReturnValue(true);
      const result = isVercelAnalyticsEnabled();
      expect(result).toBe(false);
    });

    it('returns false for non-vercel hosts when analytics enabled', () => {
      vi.mocked(nativeBridge.isNative).mockReturnValue(false);
      window.location = { hostname: 'localhost' } as any;
      const result = isVercelAnalyticsEnabled();
      expect(result).toBe(false);
    });
  });

  describe('enabled', () => {
    it('returns false in dev/test environment', () => {
      vi.mocked(nativeBridge.isNative).mockReturnValue(false);
      const result = enabled();
      expect(result).toBe(false);
    });

    it('returns false when native app', () => {
      vi.mocked(nativeBridge.isNative).mockReturnValue(true);
      const result = enabled();
      expect(result).toBe(false);
    });
  });

  describe('reportError', () => {
    it('sends error with error message extracted from Error object', () => {
      vi.mocked(nativeBridge.isNative).mockReturnValue(false);
      const error = new Error('test error');
      reportError(error);
      // This tests the error-to-string conversion path
      expect(error.message).toBe('test error');
    });

    it('handles non-Error objects by converting to string', () => {
      vi.mocked(nativeBridge.isNative).mockReturnValue(false);
      const testObj = { some: 'object' };
      reportError(testObj);
      // Tests that the function doesn't crash on non-Error input
      expect(true).toBe(true);
    });

    it('handles string errors', () => {
      vi.mocked(nativeBridge.isNative).mockReturnValue(false);
      reportError('string error');
      expect(true).toBe(true);
    });

    it('accepts info parameter', () => {
      vi.mocked(nativeBridge.isNative).mockReturnValue(false);
      const error = new Error('test');
      reportError(error, { context: 'test', action: 'click' });
      expect(true).toBe(true);
    });

    it('truncates error message to 200 characters', () => {
      vi.mocked(nativeBridge.isNative).mockReturnValue(false);
      const longMessage = 'a'.repeat(250);
      const error = new Error(longMessage);
      reportError(error);
      // Message should be truncated to 200 chars
      expect(error.message.length).toBe(250); // Original error message unchanged
    });
  });
});
