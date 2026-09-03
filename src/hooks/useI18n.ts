import { useTranslation as useI18nBase } from 'react-i18next';
import type { TFunction } from 'i18next';

/**
 * Custom i18n hook for FlyGACA components.
 * Wraps react-i18next's useTranslation to provide typed translation function.
 *
 * Usage:
 * ```tsx
 * const { t, i18n } = useI18n();
 * return <div>{t('home.dashboard.progress.title')}</div>;
 * ```
 *
 * For namespaced translations, override the namespace argument:
 * ```tsx
 * const { t } = useI18n('custom');
 * ```
 */
export function useI18n(ns?: string) {
  return useI18nBase(ns || 'translation');
}

/**
 * Typed translation key access. Use this for components that need a specific namespace.
 * Returns the base translation function from i18next.
 */
export function useTranslationFunction(namespace: string = 'translation'): TFunction {
  const { t } = useI18nBase(namespace);
  return t;
}

/**
 * Get the current language code ('en' or 'ar').
 * Re-renders on language change.
 */
export function useLang(): 'en' | 'ar' {
  const { i18n } = useI18nBase();
  return (i18n.language as 'en' | 'ar') || 'en';
}

/**
 * Get the current text direction ('ltr' for English, 'rtl' for Arabic).
 * Useful for components that need conditional directional styling.
 */
export function useTextDirection(): 'ltr' | 'rtl' {
  const lang = useLang();
  return lang === 'ar' ? 'rtl' : 'ltr';
}

/**
 * Hook to switch language programmatically (returns the switchLanguage function).
 * Usage: `const switchLang = useSwitchLanguage(); switchLang('ar');`
 */
export function useSwitchLanguage() {
  const { i18n } = useI18nBase();
  return i18n.changeLanguage.bind(i18n);
}
