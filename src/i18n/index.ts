import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { isArabicPath } from '@/lib/seo/seo';

export const LANGS = ['en', 'ar'] as const;
export type Lang = (typeof LANGS)[number];

const STORAGE_KEY = 'flygaca:lang';

/**
 * Per-language string bundles, code-split. Only the active language's JSON is
 * fetched at boot — the other (~70–92 KB raw) is loaded on demand the first time
 * the user switches, so an English session never ships the Arabic strings and
 * vice versa. Vite emits each JSON as its own chunk from these dynamic imports.
 */
const LOADERS: Record<Lang, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import('./en.json'),
  ar: () => import('./ar.json'),
};

/**
 * Picks the initial language. The `/ar` path prefix is the authoritative signal
 * (a crawlable Arabic document must always boot Arabic), then a legacy `?lang=`,
 * then the stored choice, then the browser hint. `main.tsx` reconciles URL↔lang
 * via `localeRedirect`, so e.g. a stored Arabic choice on a clean URL ends up on
 * `/ar` rather than mismatching.
 */
export function resolveInitialLang(): Lang {
  const { pathname, search } = window.location;
  if (isArabicPath(pathname)) return 'ar';
  const param = new URLSearchParams(search).get('lang');
  if (param === 'en' || param === 'ar') return param;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'en' || stored === 'ar') return stored;
  return navigator.language?.startsWith('ar') ? 'ar' : 'en';
}

/** Mirrors <html lang/dir> so RTL flips for the whole document, and points the
 *  install manifest at the matching language so an Arabic install shows Arabic. */
export function applyDocumentLang(lang: Lang): void {
  const el = document.documentElement;
  el.lang = lang;
  el.dir = lang === 'ar' ? 'rtl' : 'ltr';
  const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifest)
    manifest.href = lang === 'ar' ? '/manifest-ar.webmanifest' : '/manifest.webmanifest';
}

/** Fetch + register a language's strings exactly once (idempotent). */
async function ensureLanguage(lang: Lang): Promise<void> {
  if (i18n.hasResourceBundle(lang, 'translation')) return;
  const mod = await LOADERS[lang]();
  i18n.addResourceBundle(lang, 'translation', mod.default, true, true);
}

/**
 * Boot i18next with only the initial language loaded. `main.tsx` awaits this
 * before the first render so there is no flash of untranslated keys.
 */
export async function bootI18n(): Promise<typeof i18n> {
  const lng = resolveInitialLang();
  const mod = await LOADERS[lng]();

  await i18n.use(initReactI18next).init({
    resources: { [lng]: { translation: mod.default } },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  applyDocumentLang(lng);

  i18n.on('languageChanged', (next) => {
    localStorage.setItem(STORAGE_KEY, next);
    applyDocumentLang(next as Lang);
  });

  return i18n;
}

/**
 * Switch language, fetching the target bundle first when it isn't loaded yet.
 * Use this instead of `i18n.changeLanguage` so the strings are present before
 * React re-renders into the new language.
 */
export async function switchLanguage(lang: Lang): Promise<void> {
  await ensureLanguage(lang);
  await i18n.changeLanguage(lang);
}

export default i18n;
