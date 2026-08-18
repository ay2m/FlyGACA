import { Link, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '@/components/Disclaimer';
import { usePageMeta } from '@/hooks/usePageMeta';
import { articleLd, breadcrumbLd, faqLd } from '@/lib/seo/jsonld';
import prose from '../legal/Prose.module.css';
import styles from './Support.module.css';

interface Contact {
  label: string;
  email: string;
}
interface Faq {
  q: string;
  a: string;
}

/**
 * The App Store `support_url` for every Fly GACA exam-prep app points here,
 * deep-linked with `?app=<pack-id>` so the page can greet the exact app the
 * reader arrived from. The pack ids mirror the monorepo's prepCatalog / the six
 * metadata repos' `marketing_url` (mind `ppl-exam` and `elp`).
 */
const APP_PACK_IDS = new Set(['ppl-exam', 'elp', 'aip', 'cpl', 'ir', 'atpl']);

/** The three legal docs a support reader most often needs next. */
const RELATED = [
  { path: '/refund', label: 'footer.refund' },
  { path: '/privacy', label: 'footer.privacy' },
  { path: '/terms', label: 'footer.terms' },
] as const;

/** Help & contact page — the destination of every app's App Store support link. */
export function SupportPage() {
  const { t, i18n } = useTranslation();
  const [params] = useSearchParams();

  // App-aware greeting when arriving from a specific app's store listing.
  const appParam = params.get('app') ?? '';
  const app = APP_PACK_IDS.has(appParam) ? appParam : null;
  const appName = app ? t(`study.packCatalog.${app}.name`) : null;

  const title = t('support.title');
  const description = t('support.intro');
  const contacts = t('support.contacts', { returnObjects: true }) as unknown as Contact[];
  const faqs = t('support.faq', { returnObjects: true }) as unknown as Faq[];

  usePageMeta(title, description, [
    articleLd({ title, description, path: '/support', lang: i18n.language }),
    faqLd(faqs),
    breadcrumbLd([
      { name: t('nav.breadcrumbHome'), path: '/' },
      { name: title, path: '/support' },
    ]),
  ]);

  return (
    <article className={`container-narrow ${prose.prose}`}>
      <header>
        <p className={prose.eyebrow}>{t('support.eyebrow')}</p>
        <h1>{title}</h1>
        {app && appName && (
          <p className={styles.appContext}>
            {t('support.appContext', { name: appName })}{' '}
            <Link to={`/study/packs/${app}`}>{t('support.appPackLink', { name: appName })}</Link>
          </p>
        )}
      </header>

      <p className={prose.lead}>{description}</p>

      <section aria-labelledby="support-contact">
        <h2 id="support-contact" className={prose.sectionH}>
          {t('support.contactHead')}
        </h2>
        <p>{t('support.responseNote')}</p>
        <ul className={prose.contacts}>
          {contacts.map((c) => (
            <li key={c.email}>
              <span>{c.label}</span>
              <a href={`mailto:${c.email}`}>
                <bdi dir="ltr">{c.email}</bdi>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="support-faq">
        <h2 id="support-faq" className={prose.sectionH}>
          {t('support.faqHead')}
        </h2>
        <div className={styles.faqList}>
          {faqs.map((item) => (
            <details key={item.q} className={styles.faq}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="support-related">
        <h2 id="support-related" className={prose.sectionH}>
          {t('support.relatedHead')}
        </h2>
        <nav className={styles.related} aria-label={t('support.relatedHead')}>
          {RELATED.map((r) => (
            <Link key={r.path} to={r.path}>
              {t(r.label)}
            </Link>
          ))}
        </nav>
      </section>

      <Disclaimer />
    </article>
  );
}
