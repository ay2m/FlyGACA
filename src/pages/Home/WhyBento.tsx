import { useTranslation } from 'react-i18next';
import { BentoGrid } from '@/components/bento/BentoGrid';
import { BentoCard, type BentoSpan, type BentoTone } from '@/components/bento/BentoCard';
import styles from './Home.module.css';

// "Why trust it" reads as an asymmetric bento, not four equal cards: a tall lead
// pillar (the independence claim, carrying the mark) + one wide + two small.
const WHY_LAYOUT: { span: BentoSpan; tone: BentoTone }[] = [
  { span: 'lg', tone: 'default' },
  { span: 'wide', tone: 'cyan' },
  { span: 'sm', tone: 'green' },
  { span: 'sm', tone: 'default' },
];

interface Reason {
  h: string;
  p: string;
}

/**
 * The "Why trust it" bento grid. Lazy-loaded from Home (like HomeDashboard) so
 * the framer-motion runtime the bento components pull in stays off the home
 * hero's critical path.
 */
export default function WhyBento() {
  const { t } = useTranslation();
  const reasons = t('home.why.items', { returnObjects: true }) as unknown as Reason[];

  return (
    <BentoGrid label={t('home.why.title')}>
      {reasons.map((r, i) => {
        const cfg = WHY_LAYOUT[i] ?? { span: 'sm', tone: 'default' };
        const lead = i === 0;
        return (
          <BentoCard key={i} span={cfg.span} tone={cfg.tone}>
            {lead && (
              <img
                className={styles.whyMark}
                src="/img/flygaca-mark.png"
                alt=""
                width={40}
                height={40}
                decoding="async"
              />
            )}
            <h3 className={lead ? styles.featLead : styles.featTitle}>{r.h}</h3>
            <p className={styles.featBody}>{r.p}</p>
          </BentoCard>
        );
      })}
    </BentoGrid>
  );
}
