import styles from './KeyFacts.module.css';

/**
 * A "Key facts" block — self-contained, answer-first factual rows (label →
 * value) each tagged with the governing GACAR Part/section. Placed high on a
 * guide (under the intro) so a no-JS crawler and an AI answer engine can lift a
 * complete, cited fact without parsing prose. Content is i18n-fed; a guide opts
 * in by declaring `guides.items.<slug>.keyFacts`. Rendered as a description list
 * (`dl`/`dt`/`dd`) for clean semantics.
 */
export interface KeyFact {
  /** Short fact label, e.g. "Minimum age". */
  label: string;
  /** The fact itself, self-contained, e.g. "17 years old to hold a PPL". */
  value: string;
  /** Governing citation shown as a tag, e.g. "GACAR Part 61". */
  ref: string;
}

interface KeyFactsProps {
  /** Localized block title (e.g. "Key facts"). */
  title: string;
  facts: KeyFact[];
}

export function KeyFacts({ title, facts }: KeyFactsProps) {
  return (
    <aside className={styles.wrap} aria-label={title}>
      <p className={styles.title}>{title}</p>
      <dl className={styles.list}>
        {facts.map((f) => (
          <div key={f.label} className={styles.row}>
            <dt className={styles.label}>{f.label}</dt>
            <dd className={styles.value}>
              {f.value}
              <span className={styles.ref}>{f.ref}</span>
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
