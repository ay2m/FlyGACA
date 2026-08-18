import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { CaptainAvatar } from '@/components/CaptainAvatar';
import { ProgressBar } from '@/components/ProgressBar';
import type { Completeness } from '@/calc/pilot/onboarding';
import styles from './SetupChecklist.module.css';

/**
 * First-run onboarding: a "get current" checklist that walks a new pilot through
 * the data the currency board needs. Renders only while setup is incomplete.
 */
export function SetupChecklist({ completeness }: { completeness: Completeness }) {
  const { t } = useTranslation();
  const { steps, doneCount, total, percent } = completeness;

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <CaptainAvatar size="md" pose="wave" decorative className={styles.avatar} />
        <div>
          <h2 className={styles.title}>{t('setup.title')}</h2>
          <p className={styles.subtitle}>{t('setup.subtitle')}</p>
        </div>
      </div>

      <div className={styles.progress}>
        <ProgressBar percent={percent} label={t('setup.progress', { done: doneCount, total })} />
        <span className={styles.progressText}>
          {t('setup.progress', { done: doneCount, total })}
        </span>
      </div>

      <ul className={styles.steps}>
        {steps.map((s) => (
          <li key={s.id} className={styles.step} data-done={s.done}>
            <span className={styles.marker} aria-hidden="true">
              {s.done ? '✓' : ''}
            </span>
            {s.done ? (
              <span className={styles.label}>{t(`setup.steps.${s.id}`)}</span>
            ) : (
              <Link to={s.to} className={styles.labelLink}>
                {t(`setup.steps.${s.id}`)}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
