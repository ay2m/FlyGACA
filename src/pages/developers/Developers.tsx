import { useTranslation } from 'react-i18next';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { Disclaimer } from '@/components/Disclaimer';
import { PageHero } from '@/components/PageHero';
import { SectionHeader } from '@/components/SectionHeader';
import { usePageMeta } from '@/hooks/usePageMeta';
import { breadcrumbLd } from '@/lib/seo/jsonld';
import styles from './Developers.module.css';

interface Tier {
  name: string;
  price: string;
  quota: string;
  blurb: string;
}

// The canonical origin for the licensed API. All fronts proxy /api/* to the same
// Cloud Run gateway, so this URL is stable across hosts.
const API_BASE = 'https://flygaca.com/api/v1';
const SALES_EMAIL = 'sales@flygaca.com';

const EXAMPLE_REQUEST = `curl -X POST ${API_BASE}/ask \\
  -H "Authorization: Bearer flygaca_live_…" \\
  -H "Content-Type: application/json" \\
  -d '{"message":"What are the VFR weather minimums in Class D airspace?"}'`;

const EXAMPLE_RESPONSE = `{
  "answer": "In Class D airspace, VFR minima are … (GACAR Part 91).",
  "sources": [{ "part": "91", "section": "91.155", "title": "…" }],
  "kind": "grounded",
  "refusalClass": null,
  "meta": { "provider": "gemini-2.5-pro" }
}`;

export function Developers() {
  const { t, i18n } = useTranslation();
  const tiers = t('developers.tiers', { returnObjects: true }) as unknown as Tier[];

  usePageMeta(t('meta.developers'), t('metaDesc.developers'), [
    breadcrumbLd(
      [
        { name: t('nav.breadcrumbHome'), path: '/' },
        { name: t('developers.title'), path: '/developers' },
      ],
      i18n.language,
    ),
  ]);

  const mailto = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(t('developers.getKeySubject'))}`;

  return (
    <section className={`container ${styles.page}`}>
      <PageHero
        eyebrow={t('developers.eyebrow')}
        title={t('developers.title')}
        subtitle={t('developers.subtitle')}
        media={<CaptainAvatar size="xl" glow live decorative />}
      />

      <p className={styles.intro}>{t('developers.intro')}</p>

      {/* The left-seat scene from captadel.com — the caption carries the copy. */}
      <figure className={styles.scene}>
        <img
          className={styles.sceneImg}
          src="/img/captain/scenes/left-seat.webp"
          alt=""
          width={1024}
          height={672}
          loading="lazy"
          decoding="async"
        />
        <figcaption className={styles.sceneCaption}>{t('developers.scene')}</figcaption>
      </figure>

      {/* Tiers */}
      <section aria-labelledby="tiers-head">
        <SectionHeader id="tiers-head" title={t('developers.tiersHead')} tone="var(--cat-1)" />
        <div className={styles.tiers}>
          {tiers.map((tier) => (
            <div key={tier.name} className={styles.tier}>
              <h3 className={styles.tierName}>{tier.name}</h3>
              <p className={styles.tierPrice}>
                <bdi dir="ltr">{tier.price}</bdi>
              </p>
              <p className={styles.tierQuota}>{tier.quota}</p>
              <p className={styles.tierBlurb}>{tier.blurb}</p>
            </div>
          ))}
        </div>
        <p className={styles.note}>{t('developers.tiersNote')}</p>
      </section>

      {/* Endpoint + examples */}
      <section aria-labelledby="endpoint-head">
        <SectionHeader
          id="endpoint-head"
          title={t('developers.endpointHead')}
          tone="var(--cat-3)"
        />
        <p className={styles.lead}>{t('developers.endpointLead')}</p>
        <p className={styles.exampleLabel}>{t('developers.requestLabel')}</p>
        <pre className={styles.code}>
          <code>{EXAMPLE_REQUEST}</code>
        </pre>
        <p className={styles.exampleLabel}>{t('developers.responseLabel')}</p>
        <pre className={styles.code}>
          <code>{EXAMPLE_RESPONSE}</code>
        </pre>
      </section>

      {/* Get a key */}
      <section className={styles.ctaBand} aria-labelledby="getkey-head">
        <div>
          <h2 id="getkey-head" className={styles.ctaHead}>
            {t('developers.getKeyHead')}
          </h2>
          <p className={styles.ctaLead}>{t('developers.getKeyLead')}</p>
        </div>
        <a className={styles.ctaBtn} href={mailto}>
          {t('developers.getKeyCta')}
        </a>
      </section>

      <Disclaimer compact />
    </section>
  );
}
