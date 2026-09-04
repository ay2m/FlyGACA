import { describe, expect, it, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  useI18n,
  useTranslationFunction,
  useLang,
  useTextDirection,
  useSwitchLanguage,
} from '@/hooks/useI18n';
import * as i18n from 'react-i18next';

vi.mock('react-i18next');

describe('useI18n hooks', () => {
  const mockT = vi.fn((key: string) => `translated-${key}`);
  const mockChangeLanguage = vi.fn();

  const mockUseTranslation = (namespace?: string) => ({
    t: mockT,
    i18n: {
      language: 'en',
      changeLanguage: mockChangeLanguage,
      ns: namespace || 'translation',
    },
  });

  beforeEach(() => {
    vi.mocked(i18n.useTranslation).mockImplementation(
      (ns?: string) => mockUseTranslation(ns) as ReturnType<typeof i18n.useTranslation>,
    );
    vi.clearAllMocks();
  });

  describe('useI18n', () => {
    it('returns translation function and i18n instance with default namespace', () => {
      const { result } = renderHook(() => useI18n());

      expect(result.current.t).toBeDefined();
      expect(result.current.i18n).toBeDefined();
      expect(vi.mocked(i18n.useTranslation)).toHaveBeenCalledWith('translation');
    });

    it('accepts custom namespace', () => {
      const { result } = renderHook(() => useI18n('custom'));

      expect(result.current.t).toBeDefined();
      expect(vi.mocked(i18n.useTranslation)).toHaveBeenCalledWith('custom');
    });

    it('uses default translation namespace when undefined', () => {
      renderHook(() => useI18n(undefined));

      expect(vi.mocked(i18n.useTranslation)).toHaveBeenCalledWith('translation');
    });
  });

  describe('useTranslationFunction', () => {
    it('returns translation function with default namespace', () => {
      const { result } = renderHook(() => useTranslationFunction());

      expect(result.current).toBe(mockT);
      expect(vi.mocked(i18n.useTranslation)).toHaveBeenCalledWith('translation');
    });

    it('returns translation function with custom namespace', () => {
      const { result } = renderHook(() => useTranslationFunction('custom'));

      expect(result.current).toBe(mockT);
      expect(vi.mocked(i18n.useTranslation)).toHaveBeenCalledWith('custom');
    });

    it('can translate keys with returned function', () => {
      const { result } = renderHook(() => useTranslationFunction());

      const translated = result.current('home.title');
      expect(translated).toBe('translated-home.title');
      expect(mockT).toHaveBeenCalledWith('home.title');
    });
  });

  describe('useLang', () => {
    it('returns current language as "en" when language is "en"', () => {
      vi.mocked(i18n.useTranslation).mockImplementation(() => ({
        t: mockT,
        i18n: { language: 'en', changeLanguage: mockChangeLanguage },
      }) as ReturnType<typeof i18n.useTranslation>);

      const { result } = renderHook(() => useLang());

      expect(result.current).toBe('en');
    });

    it('returns current language as "ar" when language is "ar"', () => {
      vi.mocked(i18n.useTranslation).mockImplementation(() => ({
        t: mockT,
        i18n: { language: 'ar', changeLanguage: mockChangeLanguage },
      }) as ReturnType<typeof i18n.useTranslation>);

      const { result } = renderHook(() => useLang());

      expect(result.current).toBe('ar');
    });

    it('defaults to "en" when language is undefined', () => {
      vi.mocked(i18n.useTranslation).mockImplementation(() => ({
        t: mockT,
        i18n: { language: undefined, changeLanguage: mockChangeLanguage },
      }) as ReturnType<typeof i18n.useTranslation>);

      const { result } = renderHook(() => useLang());

      expect(result.current).toBe('en');
    });

    it('defaults to "en" when language is empty string', () => {
      vi.mocked(i18n.useTranslation).mockImplementation(() => ({
        t: mockT,
        i18n: { language: '', changeLanguage: mockChangeLanguage },
      }) as ReturnType<typeof i18n.useTranslation>);

      const { result } = renderHook(() => useLang());

      expect(result.current).toBe('en');
    });
  });

  describe('useTextDirection', () => {
    it('returns "rtl" when language is "ar"', () => {
      vi.mocked(i18n.useTranslation).mockImplementation(() => ({
        t: mockT,
        i18n: { language: 'ar', changeLanguage: mockChangeLanguage },
      }) as ReturnType<typeof i18n.useTranslation>);

      const { result } = renderHook(() => useTextDirection());

      expect(result.current).toBe('rtl');
    });

    it('returns "ltr" when language is "en"', () => {
      vi.mocked(i18n.useTranslation).mockImplementation(() => ({
        t: mockT,
        i18n: { language: 'en', changeLanguage: mockChangeLanguage },
      }) as ReturnType<typeof i18n.useTranslation>);

      const { result } = renderHook(() => useTextDirection());

      expect(result.current).toBe('ltr');
    });

    it('returns "ltr" when language is not "ar"', () => {
      vi.mocked(i18n.useTranslation).mockImplementation(() => ({
        t: mockT,
        i18n: { language: 'fr', changeLanguage: mockChangeLanguage },
      }) as ReturnType<typeof i18n.useTranslation>);

      const { result } = renderHook(() => useTextDirection());

      expect(result.current).toBe('ltr');
    });
  });

  describe('useSwitchLanguage', () => {
    it('returns changeLanguage function from i18n', () => {
      const { result } = renderHook(() => useSwitchLanguage());

      expect(typeof result.current).toBe('function');
      result.current('ar');
      expect(mockChangeLanguage).toHaveBeenCalledWith('ar');
    });

    it('can switch language with returned function', () => {
      const { result } = renderHook(() => useSwitchLanguage());

      result.current('ar');

      expect(mockChangeLanguage).toHaveBeenCalledWith('ar');
    });

    it('preserves i18n context when switching language', () => {
      const { result } = renderHook(() => useSwitchLanguage());

      result.current('en');

      expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    });
  });
});
