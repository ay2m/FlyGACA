import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { RequireSession } from './RequireSession';
import { TextField } from '@/components/calc/TextField';
import { SelectField, type SelectOption } from '@/components/calc/SelectField';
import { LangToggle } from '@/components/LangToggle';
import { Alert } from '@/components/Alert';
import {
  deleteAllData,
  exportAll,
  saveProfile,
  useAccount,
  USER_ROLES,
} from '@/lib/services/account';
import { replayOnboarding, openTour } from '@/lib/prefs/onboardingPrefs';
import { uiPlan } from '@/lib/services/entitlements';
import { useNoindexMeta } from '@/hooks/usePageMeta';
import styles from './account.module.css';
import { triggerDownload } from '@/lib/download';

/** GACAR pilot licence types, in progression order. */
const LICENCE_TYPES = ['SPL', 'PPL', 'CPL', 'ATPL'] as const;

export function Settings() {
  const { t } = useTranslation();
  // Session-gated — keep out of the index.
  useNoindexMeta(t('meta.settings'));
  return (
    <RequireSession>
      <Inner />
    </RequireSession>
  );
}

function Inner() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, entitlement, syncError } = useAccount();
  const plan = uiPlan(entitlement);
  const [saved, setSaved] = useState(false);

  // Save-on-change with a transient "Saved" confirmation.
  function save(patch: Parameters<typeof saveProfile>[0]) {
    saveProfile(patch);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1200);
  }

  // Built-in options + any legacy free-text value so an old profile isn't blanked.
  const licenceOptions: SelectOption[] = LICENCE_TYPES.map((code) => ({
    value: code,
    label: t(`account.licenceOptions.${code}`),
  }));
  if (profile.licenceType && !LICENCE_TYPES.includes(profile.licenceType as never)) {
    licenceOptions.push({ value: profile.licenceType, label: profile.licenceType });
  }

  const roleOptions: SelectOption[] = USER_ROLES.map((r) => ({
    value: r,
    label: t(`account.roles.${r}`),
  }));
  if (profile.role && !(USER_ROLES as string[]).includes(profile.role)) {
    roleOptions.push({ value: profile.role, label: profile.role });
  }

  function exportJson() {
    triggerDownload('flygaca-account.json', exportAll(), 'application/json');
  }

  return (
    <section className={`container-narrow ${styles.page}`}>
      <header className={styles.head}>
        <h1>{t('account.settings')}</h1>
        <p className={styles.sub}>
          {t('account.signedInAs', { name: profile.displayName || profile.email })}
          <span className={styles.planBadge} data-plan={plan}>
            {t(`account.plan.${plan}`)}
          </span>
        </p>
      </header>

      {syncError && (
        <Alert tone="warning" role="status" icon="⚠">
          {t('account.syncError')}
        </Alert>
      )}

      <div className={styles.sectionHead}>
        <h2>{t('account.profile')}</h2>
        {saved && (
          <span className={styles.saved} role="status">
            {t('account.saved')}
          </span>
        )}
      </div>
      <div className={styles.form}>
        <TextField
          label={t('account.name')}
          value={profile.displayName}
          onChange={(v) => save({ displayName: v })}
        />
        <TextField
          label={t('account.homeBase')}
          value={profile.homeBase}
          onChange={(v) => save({ homeBase: v })}
          placeholder="OERK"
          hint={t('account.homeBaseHint')}
        />
        <SelectField
          label={t('account.roleLabel')}
          value={profile.role}
          onChange={(v) => save({ role: v })}
          options={roleOptions}
          placeholder={t('account.roleSelect')}
          hint={t('account.roleHint')}
        />
        <SelectField
          label={t('account.licence')}
          value={profile.licenceType}
          onChange={(v) => save({ licenceType: v })}
          options={licenceOptions}
          placeholder={t('account.licenceSelect')}
          hint={t('account.licenceHint')}
        />
        <TextField
          label={t('account.medicalExpiry')}
          value={profile.medicalExpiry}
          onChange={(v) => save({ medicalExpiry: v })}
          type="date"
        />
        <TextField
          label={t('account.lastReview')}
          value={profile.lastFlightReview}
          onChange={(v) => save({ lastFlightReview: v })}
          type="date"
        />
      </div>

      <h2>{t('account.manage')}</h2>
      <div className={styles.linkRow}>
        <Link to="/logbook" className={styles.btn}>
          {t('account.logbook')}
        </Link>
        <Link to="/records" className={styles.btn}>
          {t('records.title')}
        </Link>
        <Link to="/currency" className={styles.btn}>
          {t('currency.title')}
        </Link>
      </div>

      <h2>{t('account.language')}</h2>
      <div>
        <LangToggle className={styles.btn} />
      </div>

      <h2>{t('account.help')}</h2>
      <div>
        <button
          type="button"
          className={styles.btn}
          onClick={() => {
            replayOnboarding();
            openTour();
            navigate('/');
          }}
        >
          {t('account.replayTour')}
        </button>
      </div>

      <h2>{t('account.data')}</h2>
      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={exportJson}>
          {t('account.exportData')}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.btnDanger}`}
          onClick={() => {
            if (window.confirm(t('account.deleteConfirm'))) deleteAllData();
          }}
        >
          {t('account.deleteData')}
        </button>
      </div>
      <p className={styles.note}>{t('account.localNote')}</p>

      {/* School-seat members: their study progress powers their school's readiness
          report. Shown only for a school seat (source === 'school'), not staff/consumer. */}
      {entitlement?.source === 'school' && (
        <p className={styles.note}>{t('account.seatProgressNote')}</p>
      )}
    </section>
  );
}
