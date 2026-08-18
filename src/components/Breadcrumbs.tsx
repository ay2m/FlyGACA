import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { Crumb } from '@/lib/seo/jsonld';
import styles from './Breadcrumbs.module.css';

/**
 * Visible breadcrumb trail for leaf pages (library documents, guides). Mirrors
 * the same `Crumb[]` the page feeds to `breadcrumbLd`, so the on-page nav and
 * the JSON-LD never drift. The last crumb is the current page (not a link) and
 * is marked `aria-current="page"`.
 */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useTranslation();
  if (items.length === 0) return null;
  return (
    <nav className={styles.crumbs} aria-label={t('nav.breadcrumb')}>
      <ol className={styles.list}>
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={c.path} className={styles.item}>
              {last ? (
                <span aria-current="page">{c.name}</span>
              ) : (
                <>
                  <Link to={c.path}>{c.name}</Link>
                  <span className={styles.sep} aria-hidden="true">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
