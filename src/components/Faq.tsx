import type { QA } from '@/lib/seo/jsonld';
import styles from './Faq.module.css';

/**
 * A visible FAQ accordion whose on-page text is emitted verbatim as FAQPage
 * JSON-LD (`faqLd`) by the host page — the two must match for the rich result to
 * be valid. Content is i18n-fed; a guide opts in by declaring
 * `guides.items.<slug>.faqs` (array of `{ q, a }`). Each answer is written
 * self-contained and defers to GACA (see the guide content).
 */
interface FaqProps {
  /** Localized section heading (e.g. "Frequently asked questions"). */
  title: string;
  items: QA[];
}

export function Faq({ title, items }: FaqProps) {
  return (
    <section className={styles.wrap} aria-label={title}>
      <h2 className={styles.head}>{title}</h2>
      <div className={styles.list}>
        {items.map((it) => (
          <details key={it.q} className={styles.item}>
            <summary className={styles.q}>{it.q}</summary>
            <p className={styles.a}>{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
