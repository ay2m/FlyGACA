import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@/components/SectionHeader';
import styles from './Pricing.module.css';

interface Faq {
  q: string;
  a: string;
}

/** The pricing FAQ accordion. Mirrors the `pricing.faq` set fed to `faqLd`. */
export function PricingFaq() {
  const { t } = useTranslation();
  const faqs = t('pricing.faq', { returnObjects: true }) as unknown as Faq[];
  return (
    <section className={styles.faqSection} aria-labelledby="faq-head">
      <SectionHeader id="faq-head" title={t('pricing.faqHead')} tone="var(--cat-5)" />
      <div className={styles.faqList}>
        {faqs.map((item) => (
          <details key={item.q} className={styles.faq}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
