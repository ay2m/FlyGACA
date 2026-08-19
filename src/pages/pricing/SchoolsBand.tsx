import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { formatSar } from '@/lib/services/pricing';
import styles from './Pricing.module.css';

/** B2B band — routes the highest-value buyer to the schools sales path. */
export function SchoolsBand({
  tiers,
  seatFrom,
}: {
  /** Published indicative B2B tier anchors (SAR). */
  tiers: { cohort: number; academy: number; institution: number };
  /** The per-seat "from" price (SAR). */
  seatFrom: number;
}) {
  const { t } = useTranslation();
  const schoolPoints = t('pricing.schoolsPoints', { returnObjects: true }) as unknown as string[];
  return (
    <section className={styles.schoolsBand} aria-labelledby="schools-head">
      <div className={styles.schoolsText}>
        <p className={styles.eyebrow}>{t('pricing.schoolsEyebrow')}</p>
        <h2 id="schools-head" className={styles.schoolsHead}>
          {t('pricing.schoolsHead')}
        </h2>
        <ul className={styles.schoolsPoints}>
          {schoolPoints.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <p className={styles.eyebrow}>{t('pricing.tiersLabel')}</p>
        <ul className={styles.schoolsPoints}>
          <li>{t('pricing.tierCohort', { n: formatSar(tiers.cohort) })}</li>
          <li>{t('pricing.tierAcademy', { n: formatSar(tiers.academy) })}</li>
          <li>{t('pricing.tierInstitution', { n: formatSar(tiers.institution) })}</li>
        </ul>
        <p className={styles.schoolsPrice}>
          <bdi dir="ltr">{t('pricing.perSeat', { n: seatFrom })}</bdi> · {t('pricing.schoolsMin')}
        </p>
      </div>
      <Link to="/schools" className={styles.schoolsCta}>
        {t('pricing.schoolsCta')}
      </Link>
    </section>
  );
}
