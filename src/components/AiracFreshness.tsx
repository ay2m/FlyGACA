import { useTranslation } from 'react-i18next';
import { airacCycle } from '@/calc/airac';
import styles from './AiracFreshness.module.css';

export interface AiracFreshnessProps {
  /** Instant to compute the cycle for; defaults to now. Injectable for tests. */
  date?: Date;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * A compact freshness indicator for AIP products that ride the 28-day AIRAC
 * cycle (charts, aerodromes): the current cycle id, its effective date, and the
 * countdown to the next. It's a currency signal for readers and for search / AI
 * answer engines — the page is dated against the live regulatory cadence rather
 * than looking static. Pure/deterministic given `date` (defaults to now); the
 * cycle maths live in `@/calc/airac`.
 */
export function AiracFreshness({ date }: AiracFreshnessProps) {
  const { t, i18n } = useTranslation();
  const cycle = airacCycle(date ?? new Date());
  const fmt = new Intl.DateTimeFormat(i18n.language === 'ar' ? 'ar' : 'en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return (
    <p className={styles.wrap} aria-label={t('airac.currencyLabel')}>
      <span className={styles.badge}>{t('airac.badge', { id: cycle.id })}</span>
      <span className={styles.item}>
        {t('airac.effective')}{' '}
        <time dateTime={iso(cycle.effective)}>{fmt.format(cycle.effective)}</time>
      </span>
      <span className={styles.item}>
        {t('airac.nextIn', { id: cycle.nextId, days: cycle.daysToNext })}
      </span>
    </p>
  );
}
