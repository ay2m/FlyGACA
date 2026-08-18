import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '@/components/Disclaimer';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { usePageMeta } from '@/hooks/usePageMeta';
import { breadcrumbLd, definedTermSetLd, type Crumb, type DefinedTerm } from '@/lib/seo/jsonld';
import styles from './Glossary.module.css';

/**
 * A stable per-entry anchor id. Latin terms (acronyms like METAR) slugify to a
 * readable `#metar`; Arabic terms have no ASCII to slug, so they fall back to a
 * positional `term-<n>` id — always non-empty and unique within the list.
 */
function anchorFor(term: string, index: number): string {
  const slug = term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `term-${index}`;
}

/**
 * The bilingual aviation glossary (`/library/glossary`). Terms are authored in
 * both i18n bundles (EN + AR, element-parallel) so the page is fully bilingual
 * and prerendered; the visible list backs a schema.org `DefinedTermSet`, letting
 * search and AI answer engines read it as a structured Saudi-aviation vocabulary.
 * Plain-language definitions only — Fly GACA is independent and defers to GACA.
 */
export function Glossary() {
  const { t, i18n } = useTranslation();

  const raw = t('glossary.terms', { returnObjects: true });
  const terms = useMemo<DefinedTerm[]>(
    () => (Array.isArray(raw) ? (raw as unknown as DefinedTerm[]) : []),
    [raw],
  );
  // Assign each term its stable anchor once, from its position in the full list,
  // so filtering never shifts an entry's id.
  const withIds = useMemo(
    () => terms.map((tm, i) => ({ ...tm, id: anchorFor(tm.term, i) })),
    [terms],
  );

  const crumbs: Crumb[] = [
    { name: t('nav.breadcrumbHome'), path: '/' },
    { name: t('nav.library'), path: '/library' },
    { name: t('glossary.title'), path: '/library/glossary' },
  ];

  usePageMeta(t('meta.glossary'), t('metaDesc.glossary'), [
    definedTermSetLd({
      name: t('glossary.title'),
      description: t('metaDesc.glossary'),
      path: '/library/glossary',
      terms,
      lang: i18n.language,
    }),
    breadcrumbLd(crumbs),
  ]);

  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      q
        ? withIds.filter(
            (tm) => tm.term.toLowerCase().includes(q) || tm.def.toLowerCase().includes(q),
          )
        : withIds,
    [withIds, q],
  );

  return (
    <section className={`container-narrow ${styles.page}`}>
      <Breadcrumbs items={crumbs} />
      <header className={styles.head}>
        <p className={styles.eyebrow}>{t('glossary.eyebrow')}</p>
        <h1>{t('glossary.title')}</h1>
        <p className={styles.subtitle}>{t('glossary.subtitle')}</p>
        <p className={styles.count}>{t('glossary.count', { count: terms.length })}</p>
      </header>

      <div className={styles.search}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('glossary.searchPlaceholder')}
          className={styles.searchInput}
          aria-label={t('glossary.searchLabel')}
        />
      </div>

      {shown.length === 0 ? (
        <p className={styles.empty}>{t('glossary.empty')}</p>
      ) : (
        <dl className={styles.list}>
          {shown.map((tm) => (
            <div key={tm.id} id={tm.id} className={styles.entry}>
              <dt className={styles.term}>{tm.term}</dt>
              <dd className={styles.def}>{tm.def}</dd>
            </div>
          ))}
        </dl>
      )}

      <p className={styles.back}>
        <Link to="/library">← {t('nav.library')}</Link>
      </p>

      <div className={styles.footnote}>
        <Disclaimer compact />
      </div>
    </section>
  );
}
