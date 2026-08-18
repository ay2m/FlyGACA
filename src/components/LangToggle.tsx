import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { type Lang } from '@/i18n';
import { localePath } from '@/lib/seo/seo';

/**
 * Bilingual toggle. A real `<a href>` to the *other* language's URL of the current
 * page (crawlers follow it as the cross-cluster link that ties the hreflang set
 * together). Clicking it is a full navigation, so the router remounts under the
 * matching `basename` and the whole document flips LTR↔RTL. `useLocation().pathname`
 * is the logical (basename-stripped) path, so `localePath` rebuilds the alternate.
 */
export function LangToggle({ className }: { className?: string }) {
  const { i18n, t } = useTranslation();
  const { pathname, search, hash } = useLocation();
  const next: Lang = i18n.language === 'ar' ? 'en' : 'ar';
  const href = `${localePath(pathname, next)}${search}${hash}`;

  return (
    <a className={className} href={href} hrefLang={next} aria-label={t('common.switchLanguage')}>
      {t('common.langToggleLabel')}
    </a>
  );
}
