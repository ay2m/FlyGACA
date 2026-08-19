import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { startCohortCheckout } from '@/lib/services/billing';
import { COHORT_PRICE_SAR, formatSar } from '@/lib/services/pricing';
import styles from './admin.module.css';

/**
 * Self-serve purchase form for the B2B Starter ("Cohort") tier — shown in the
 * `/business/admin` no-org state so a buyer with no org yet can pay online and land
 * back here able to invite seats immediately (see docs/b2b/PLAN.md §5). Academy /
 * Institution stay invoice-only (the /schools contact form).
 */
export function BuyCohortPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [orgName, setOrgName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = orgName.trim();
    if (!name) return;
    setBusy(true);
    setError('');
    try {
      await startCohortCheckout(name);
      // On success this navigates away (window.location.assign) — busy stays true
      // until the browser leaves the page.
    } catch (err) {
      const code = err instanceof Error ? err.message : '';
      if (code === 'sign-in-required') {
        navigate('/account');
        return;
      }
      setError(t('business.admin.buyCohort.error'));
      setBusy(false);
    }
  }

  return (
    <div className={styles.buyCohort}>
      <h2>{t('business.admin.buyCohort.title')}</h2>
      <p className={styles.muted}>
        {t('business.admin.buyCohort.lead', { price: formatSar(COHORT_PRICE_SAR) })}
      </p>
      <form onSubmit={submit} className={styles.formGroup}>
        <label htmlFor="cohort-org-name">{t('business.admin.buyCohort.orgNameLabel')}</label>
        <input
          id="cohort-org-name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          placeholder={t('business.admin.buyCohort.orgNamePlaceholder')}
          required
          disabled={busy}
        />
        {error && <p className={styles.csvErrorMsg}>{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy || !orgName.trim()}>
          {busy
            ? t('business.admin.buyCohort.busy')
            : t('business.admin.buyCohort.cta', { price: formatSar(COHORT_PRICE_SAR) })}
        </button>
      </form>
    </div>
  );
}
