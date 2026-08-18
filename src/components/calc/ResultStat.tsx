import type { ReactNode } from 'react';
import styles from './calc.module.css';

interface ResultStatProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'headline' | 'good' | 'bad';
}

/** A single dt/dd result stat with optional sub-text and tone. */
export function ResultStat({ label, value, sub, tone }: ResultStatProps) {
  return (
    <div className={`${styles.stat} ${tone ? styles[tone] : ''}`}>
      <dt>{label}</dt>
      {/* dir="ltr" + bdi isolation keep LTR measurements ("13.8 kt", "340°")
          in order under RTL instead of rendering as "kt 13.8". The sub-text
          stays inside <dd> so the <dl> contains only dt/dd groups (WCAG 1.3.1). */}
      <dd>
        <bdi dir="ltr">{value}</bdi>
        {sub != null && <span className={styles.sub}>{sub}</span>}
      </dd>
    </div>
  );
}
