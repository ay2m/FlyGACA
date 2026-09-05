import { lazy, Suspense, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Disclaimer } from '@/components/Disclaimer';
import { CountUp } from '@/components/CountUp';
import { SyncedStamp } from './SyncedStamp';
import { FlightDivider } from './FlightDivider';
import { Marquee } from './Marquee';
import { HeroAmbient } from './HeroAmbient';
import { AdelHeroWidget } from './AdelHeroWidget';
import { OnboardingHint } from '@/components/onboarding/OnboardingHint';
import { SectionHeader } from '@/components/SectionHeader';
import { Stepper } from '@/components/Stepper';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAccount } from '@/lib/services/account';
import { uiIsPro } from '@/lib/services/entitlements';
import { usePageMeta } from '@/hooks/usePageMeta';
import { faqLd } from '@/lib/seo/jsonld';
import { GUIDE_SLUGS } from '@/pages/guides/guides';
import { liveTools } from '@/lib/tools';
import styles from './Home.module.css';

// Everything bento — the dashboard AND the "why trust it" grid — is lazy-loaded
// so the framer-motion runtime the bento components import stays off the home
// hero's critical path; both stream in under Suspense boundaries below.
// (check:bundle enforces this: an eager bento import here puts framer-motion
// back into the initial chunk and blows the budget.)
const HomeDashboard = lazy(() => import('@/components/bento/HomeDashboard'));
const WhyBento = lazy(() => import('./WhyBento'));

// The single "at a glance" proof strip. Numbers stay truthful: Parts mirrors the
// gacar-index, tools matches the migration catalogue, and guides is the live
// `GUIDE_SLUGS` count the Learn hub surfaces.
const TRUST_STATS = [
  { value: 74, key: 'parts' },
  // Derived from the registry (single source of truth) so the count can't drift.
  { value: liveTools().length, key: 'tools' },
  { value: GUIDE_SLUGS.length, key: 'guides' },
] as const;

interface Step {
  h: string;
  p: string;
}
interface Demo {
  q: string;
  a: string;
}

export function Home() {
  const { t } = useTranslation();
  const { entitlement } = useAccount();
  const isPro = uiIsPro(entitlement);

  const steps = t('home.how.steps', { returnObjects: true }) as unknown as Step[];
  const demos = t('home.adel.demos', { returnObjects: true }) as unknown as Demo[];

  const heroRef = useRef<HTMLDivElement>(null);
  const [cursorOffset, setCursorOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!heroRef.current) return;
    const rect = heroRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setCursorOffset({ x: x * 0.04, y: y * 0.04 });
  };

  // Organization + WebSite already ship statically in index.html; only the FAQ
  // (built from Captain Adel's demo Q&A) is new, non-duplicative structured data.
  usePageMeta(t('meta.home'), t('metaDesc.home'), faqLd(demos.map((d) => ({ q: d.q, a: d.a }))));

  return (
    <>
      {/* Hero — an asymmetric split: the value prop + primary actions on the
          start side, the live Captain Adel demo as the real product visual. */}
      <section className={styles.hero} onMouseMove={handleMouseMove}>
        <HeroAmbient />
        <div
          ref={heroRef}
          style={{
            transform: `translate3d(${cursorOffset.x}px, ${cursorOffset.y}px, 0)`,
            transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)',
          }}
          className={`container ${styles.heroGrid}`}
        >
          <div className={`${styles.heroCopy} page-enter`}>
            <p className={styles.eyebrow}>{t('home.eyebrow')}</p>
            <h1 className={styles.title}>{t('home.title')}</h1>
            <p className={styles.subtitle}>{t('home.subtitle')}</p>
            <div className={styles.heroCta}>
              <ButtonLink to="/library" variant="clayPrimary" data-magnetic>
                {t('home.ctaLibrary')}
              </ButtonLink>
              <ButtonLink to="/chat" variant="clay" data-magnetic>
                {t('home.ctaChat')}
              </ButtonLink>
            </div>
          </div>
          <div className={styles.heroAside}>
            <AdelHeroWidget />
          </div>
        </div>
      </section>

      <div className="container">
        <OnboardingHint />
      </div>

      <Marquee />

      {/* Single proof strip — the corpus and product facts, once. */}
      <section className="container" aria-label={t('home.trust.label')}>
        <div className={styles.proof}>
          <ul className={styles.stats}>
            {TRUST_STATS.map((s) => (
              <li key={s.key} className={styles.stat}>
                <span className={styles.statValue}>
                  <CountUp to={s.value} />
                </span>
                <span className={styles.statLabel}>{t(`home.trust.${s.key}`)}</span>
              </li>
            ))}
            <li className={styles.stat}>
              <span className={styles.statValue}>
                <bdi dir="ltr">EN · AR</bdi>
              </span>
              <span className={styles.statLabel}>{t('home.trust.languages')}</span>
            </li>
            <li className={styles.stat}>
              <span className={styles.statValue}>{t('home.trust.priceValue')}</span>
              <span className={styles.statLabel}>{t('home.trust.price')}</span>
            </li>
          </ul>
          <SyncedStamp />
        </div>
      </section>

      <FlightDivider />

      <section className={`container ${styles.dashboardSection}`}>
        <Suspense fallback={<div className={styles.dashboardFallback} aria-hidden="true" />}>
          <HomeDashboard />
        </Suspense>
        <p className={styles.notice}>{t('home.notAffiliated')}</p>
      </section>

      {/* How it works — question → cited answer → study. */}
      <section className={`container ${styles.block}`} aria-labelledby="home-how">
        <SectionHeader id="home-how" title={t('home.how.title')} />
        <Stepper steps={steps.map((s) => ({ title: s.h, body: s.p }))} />
      </section>

      {/* Why trust it — independent · cites the section · offline · bilingual. */}
      <section className={`container ${styles.block}`} aria-labelledby="home-why">
        <SectionHeader id="home-why" title={t('home.why.title')} tone="var(--cat-2)" />
        <Suspense fallback={<div className={styles.whyFallback} aria-hidden="true" />}>
          <WhyBento />
        </Suspense>
      </section>

      {/* Conversion band — plan-aware. The gold heritage accent is used exactly
          once on the page, here. */}
      <section className="container">
        <Card variant="accent" accent="var(--gold)" className={styles.cta}>
          {isPro ? (
            <>
              <div>
                <h2 className={styles.ctaTitle}>{t('home.convert.proTitle')}</h2>
                <p className={styles.ctaLead}>{t('home.convert.proLead')}</p>
              </div>
              <div className={styles.ctaActions}>
                <ButtonLink variant="clayPrimary" to="/dashboard">
                  {t('home.convert.proCta')}
                </ButtonLink>
              </div>
            </>
          ) : (
            <>
              <div>
                <h2 className={styles.ctaTitle}>{t('home.convert.title')}</h2>
                <p className={styles.ctaLead}>{t('home.convert.lead')}</p>
              </div>
              <div className={styles.ctaActions}>
                <ButtonLink variant="clayPrimary" to="/pricing">
                  {t('home.convert.cta')}
                </ButtonLink>
              </div>
            </>
          )}
        </Card>
      </section>

      <section className="container">
        <Disclaimer />
      </section>
    </>
  );
}
