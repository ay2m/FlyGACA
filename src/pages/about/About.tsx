import type { CSSProperties } from 'react';
import { useRef } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { motion, useInView } from 'framer-motion';
import { Disclaimer } from '@/components/Disclaimer';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { PageHero } from '@/components/PageHero';
import { StatStrip } from '@/components/StatStrip';
import { SectionHeader } from '@/components/SectionHeader';
import { Stepper } from '@/components/Stepper';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoCard, type BentoTone } from '@/components/bento/BentoCard';
import { usePageMeta } from '@/hooks/usePageMeta';
import { aboutPageLd, breadcrumbLd, faqLd, organizationLd } from '@/lib/seo/jsonld';
import styles from './About.module.css';

interface Section {
  h: string;
  p: string;
}
interface Contact {
  label: string;
  email: string;
}
interface Stat {
  value: string;
  label: string;
}
interface Faq {
  q: string;
  a: string;
}

const FEATURE_TONES: BentoTone[] = ['default', 'cyan', 'green'];

/** Animated gallery with scroll-triggered stagger and image reveals. */
function LogGallery({ scenes, t }: { scenes: typeof LOG_SCENES; t: (key: string) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section className={styles.block} aria-labelledby="about-log" ref={ref}>
      <SectionHeader id="about-log" title={t('about.log.head')} tone="var(--cat-3)" />
      <motion.div
        className={styles.log}
        initial="hidden"
        animate={isInView ? 'visible' : 'hidden'}
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.08, delayChildren: 0 },
          },
        }}
      >
        {scenes.map((s) => (
          <motion.figure
            key={s.id}
            className={styles.logFigure}
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
            }}
          >
            <motion.img
              className={styles.logImg}
              src={s.src}
              alt=""
              width={s.w}
              height={s.h}
              loading="lazy"
              decoding="async"
              initial={{ opacity: 0.8 }}
              animate={isInView ? { opacity: 1 } : { opacity: 0.8 }}
              transition={{ duration: 0.6 }}
            />
            <figcaption className={styles.logCaption}>{t(`about.log.${s.id}`)}</figcaption>
          </motion.figure>
        ))}
      </motion.div>
    </section>
  );
}

/** The captadel.com "field notes" scene renders — the same official art family as the avatar. */
const LOG_SCENES = [
  { id: 'walkaround', src: '/img/captain/scenes/walkaround.webp', w: 720, h: 986 },
  { id: 'briefingRoom', src: '/img/captain/scenes/briefing-room.webp', w: 720, h: 982 },
  { id: 'holdingPoint', src: '/img/captain/scenes/holding-point.webp', w: 720, h: 979 },
  { id: 'debrief', src: '/img/captain/scenes/debrief.webp', w: 720, h: 979 },
  { id: 'leftSeat', src: '/img/captain/scenes/left-seat.webp', w: 1024, h: 672 },
] as const;

/** Category accents cycled across the "what it is / isn't" cards. */
const CARD_TONES = ['var(--cat-1)', 'var(--cat-2)', 'var(--cat-3)', 'var(--cat-4)', 'var(--cat-5)'];

export function About() {
  const { t, i18n } = useTranslation();
  const sections = t('about.sections', { returnObjects: true }) as unknown as Section[];
  const contacts = t('about.contacts', { returnObjects: true }) as unknown as Contact[];
  const stats = t('about.stats', { returnObjects: true }) as unknown as Stat[];
  const steps = t('about.howItWorks.steps', { returnObjects: true }) as unknown as Section[];
  const features = t('about.features.items', { returnObjects: true }) as unknown as Section[];
  const faqs = t('about.faq', { returnObjects: true }) as unknown as Faq[];

  const corrections = t('about.corrections.body', { returnObjects: true }) as unknown as string[];

  usePageMeta(t('meta.about'), t('metaDesc.about'), [
    organizationLd(),
    aboutPageLd({
      title: t('about.title'),
      description: t('metaDesc.about'),
      path: '/about',
      lang: i18n.language,
    }),
    faqLd(faqs),
    breadcrumbLd(
      [
        { name: t('nav.breadcrumbHome'), path: '/' },
        { name: t('nav.about'), path: '/about' },
      ],
      i18n.language,
    ),
  ]);

  return (
    <div className={`container ${styles.page}`}>
      <PageHero
        eyebrow={t('about.eyebrow')}
        title={t('about.title')}
        subtitle={t('about.lead')}
        media={<CaptainAvatar size="xl" glow pose="smile" decorative />}
      />

      {/* Credibility strip — neon stat tiles. */}
      <StatStrip stats={stats} />

      {/* What it is / isn't / how / who / source — tone-coded claymorphic cards. */}
      <section className={styles.block} aria-labelledby="about-sections">
        <SectionHeader id="about-sections" title={t('about.sectionsHead')} tone="var(--cat-1)" />
        <div className={styles.cards}>
          {sections.map((s, i) => (
            <article
              key={i}
              className={styles.card}
              style={{ '--cat-color': CARD_TONES[i % CARD_TONES.length] } as CSSProperties}
            >
              <h3 className={styles.cardTitle}>{s.h}</h3>
              <p className={styles.cardBody}>{s.p}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works — Find → Ask → Verify. */}
      <section className={styles.block} aria-labelledby="about-how">
        <SectionHeader id="about-how" title={t('about.howItWorks.head')} tone="var(--cat-4)" />
        <Stepper steps={steps.map((s) => ({ title: s.h, body: s.p }))} />
      </section>

      {/* Capability grid. */}
      <section className={styles.block} aria-labelledby="about-features">
        <SectionHeader id="about-features" title={t('about.features.head')} tone="var(--cat-2)" />
        <BentoGrid label={t('about.features.head')}>
          {/* Six features × md tile the 12-col desktop grid as two complete 3-up rows. */}
          {features.map((f, i) => (
            <BentoCard key={i} span="md" tone={FEATURE_TONES[i % FEATURE_TONES.length]}>
              <h3 className={styles.featTitle}>{f.h}</h3>
              <p className={styles.featBody}>{f.p}</p>
            </BentoCard>
          ))}
        </BentoGrid>
      </section>

      {/* Captain's log — the field-note scene gallery ported from captadel.com. The
          captions carry the copy, so the images stay decorative for AT. */}
      <LogGallery scenes={LOG_SCENES} t={t} />

      {/* Conversion band into the core product. */}
      <section className={styles.cta}>
        <div>
          <h2 className={styles.ctaTitle}>{t('about.cta.title')}</h2>
          <p className={styles.ctaLead}>{t('about.cta.lead')}</p>
        </div>
        <div className={styles.ctaActions}>
          <Link className="btn btn-primary" to="/library">
            {t('about.cta.browse')}
          </Link>
          <Link className="btn" to="/chat">
            {t('about.cta.ask')}
          </Link>
        </div>
      </section>

      {/* FAQ. */}
      <section className={styles.faqWrap} aria-labelledby="about-faq">
        <SectionHeader id="about-faq" title={t('about.faqHead')} tone="var(--cat-5)" />
        <div className={styles.faqList}>
          {faqs.map((item) => (
            <details key={item.q} className={styles.faq}>
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className={styles.contactSection} aria-labelledby="about-contact">
        <SectionHeader id="about-contact" title={t('about.contactTitle')} tone="var(--cat-3)" />
        <ul className={styles.contacts}>
          {contacts.map((c) => (
            <li key={c.email} className={styles.contact}>
              <span className={styles.contactLabel}>{c.label}</span>
              <a className={styles.contactEmail} href={`mailto:${c.email}`}>
                <bdi dir="ltr">{c.email}</bdi>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Corrections & sourcing — the editorial-process / E-E-A-T signal. The
          not-affiliated / verify-against-GACA line stays in <Disclaimer/> below;
          this section covers how we source the corpus and how to report an error. */}
      <section className={styles.block} aria-labelledby="about-corrections">
        <SectionHeader
          id="about-corrections"
          title={t('about.corrections.head')}
          tone="var(--cat-1)"
        />
        <div className={styles.corrections}>
          {corrections.map((p, i) => (
            <p key={i} className={styles.correctionsBody}>
              {p}
            </p>
          ))}
          <a
            className={`btn ${styles.correctionsCta}`}
            href="mailto:i@flygaca.com?subject=Fly%20GACA%20correction"
          >
            {t('about.corrections.reportCta')}
          </a>
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
