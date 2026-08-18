import { useTranslation } from 'react-i18next';
import { saveProfile, USER_ROLES, type UserRole } from '@/lib/services/account';
import { dismissRolePrompt } from '@/lib/prefs/dashboardPrefs';
import styles from './dashboard-widgets.module.css';

/**
 * One-shot "I'm a…" card shown on the dashboard until a role is chosen or the
 * prompt is dismissed. Choosing a role persists it to the profile (and syncs
 * when signed in through the API) and re-orders the dashboard immediately.
 */
export function RolePickerCard() {
  const { t } = useTranslation();

  function choose(role: UserRole) {
    saveProfile({ role });
  }

  return (
    <div className={styles.roleCard}>
      <div className={styles.roleHead}>
        <div>
          <h2 className={styles.roleTitle}>{t('dashboard.rolePicker.title')}</h2>
          <p className={styles.roleIntro}>{t('dashboard.rolePicker.intro')}</p>
        </div>
        <button
          type="button"
          className={styles.roleDismiss}
          onClick={dismissRolePrompt}
          aria-label={t('dashboard.rolePicker.dismiss')}
        >
          ✕
        </button>
      </div>
      <div className={styles.roleOptions}>
        {USER_ROLES.map((role) => (
          <button
            key={role}
            type="button"
            className={styles.roleOption}
            onClick={() => choose(role)}
          >
            <strong>{t(`account.roles.${role}`)}</strong>
            <span>{t(`dashboard.rolePicker.${role}Desc`)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
