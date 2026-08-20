import { useCallback } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '@/components/Disclaimer';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useCopyToClipboardKeyed } from '@/hooks/useCopyToClipboard';
import { articleLd, breadcrumbLd } from '@/lib/seo/jsonld';
import { sectionId } from '@/calc/library/anchor';
import { useScrollToHash } from '@/hooks/useScrollToHash';
import styles from './Prose.module.css';

interface Section {
  h: string;
  p: string;
}

type LegalBase =
  'legal.disclaimer' | 'legal.terms' | 'legal.privacy' | 'legal.refund' | 'legal.safety';

/** The five legal docs, in footer order — drives the cross-doc nav + path map. */
const DOCS: { base: LegalBase; path: string; label: string }[] = [
  { base: 'legal.disclaimer', path: '/disclaimer', label: 'footer.disclaimerLink' },
  { base: 'legal.terms', path: '/terms', label: 'footer.terms' },
  { base: 'legal.privacy', path: '/privacy', label: 'footer.privacy' },
  { base: 'legal.refund', path: '/refund', label: 'footer.refund' },
  { base: 'legal.safety', path: '/safety', label: 'footer.safety' },
];

/** Last revision of the legal copy (ISO) — shown to readers and fed to the Article schema. */
const LAST_UPDATED = '2026-07-27';

/** Renders a legal/reference page from structured i18n content. */
export function LegalPage({ base }: { base: LegalBase }) {
  const { t, i18n } = useTranslation();
  const doc = DOCS.find((d) => d.base === base) ?? DOCS[0];
  const title = t(`${base}.title`);
  const description = t(`${base}.intro`);

  usePageMeta(title, description, [
    articleLd({
      title,
      description,
      path: doc.path,
      lang: i18n.language,
      dateModified: LAST_UPDATED,
    }),
    breadcrumbLd(
      [
        { name: t('nav.breadcrumbHome'), path: '/' },
        { name: title, path: doc.path },
      ],
      i18n.language,
    ),
  ]);

  // Deep links to a section (#anchor) — jump once the page has rendered.
  useScrollToHash();

  const sections = t(`${base}.sections`, { returnObjects: true }) as unknown as Section[];
  const { copiedKey: copied, copy } = useCopyToClipboardKeyed<number>();

  const copyLink = useCallback(
    (i: number, anchor: string) =>
      void copy(i, `${window.location.origin}${window.location.pathname}#${anchor}`),
    [copy],
  );

  const updatedLabel = t('legal.lastUpdated', {
    date: new Date(LAST_UPDATED).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  });

  return (
    <article className={`container-narrow ${styles.prose}`}>
      <header>
        <p className={styles.eyebrow}>{t('legal.eyebrow')}</p>
        <h1>{title}</h1>
        <p className={styles.updated}>
          <span>{updatedLabel}</span>
          <span aria-hidden="true"> · </span>
          <span>{t('legal.updated')}</span>
        </p>
      </header>

      <nav className={styles.docsNav} aria-label={t('legal.docsNav')}>
        {DOCS.map((d) => (
          <Link
            key={d.base}
            to={d.path}
            className={`${styles.docLink} ${d.base === base ? styles.docLinkActive : ''}`}
            aria-current={d.base === base ? 'page' : undefined}
          >
            {t(d.label)}
          </Link>
        ))}
      </nav>

      <p className={styles.lead}>{description}</p>

      {sections.length > 1 && (
        <nav className={styles.onThisPage} aria-label={t('legal.onThisPage')}>
          <span className={styles.onThisPageLabel}>{t('legal.onThisPage')}</span>
          <ol>
            {sections.map((s, i) => (
              <li key={i}>
                <a href={`#${sectionId(i, s.h)}`}>{s.h}</a>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {sections.map((s, i) => {
        const anchor = sectionId(i, s.h);
        return (
          <section key={i}>
            <h2 id={anchor} className={styles.sectionH}>
              {s.h}
              <button
                type="button"
                className={styles.copyLink}
                aria-label={t('legal.copyLink')}
                title={copied === i ? t('legal.copied') : t('legal.copyLink')}
                onClick={() => copyLink(i, anchor)}
              >
                {copied === i ? '✓' : '🔗'}
              </button>
            </h2>
            <p>{s.p}</p>
          </section>
        );
      })}

      <Disclaimer />
    </article>
  );
}

export const DisclaimerPage = () => <LegalPage base="legal.disclaimer" />;
export const TermsPage = () => <LegalPage base="legal.terms" />;
export const PrivacyPage = () => <LegalPage base="legal.privacy" />;
export const RefundPage = () => <LegalPage base="legal.refund" />;
export const SafetyPage = () => <LegalPage base="legal.safety" />;
