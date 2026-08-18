import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { passwordRuleResults, passwordScore, type PasswordRuleId } from '@/calc/app/passwordPolicy';
import styles from './passwordStrength.module.css';

interface PasswordStrengthProps {
  password?: string;
}

const RULE_LABEL_KEY: Record<PasswordRuleId, string> = {
  length: 'account.ruleLength',
  mixed: 'account.ruleMixed',
  number: 'account.ruleNumber',
  special: 'account.ruleSpecial',
};

export function PasswordStrength({ password = '' }: PasswordStrengthProps) {
  const { t } = useTranslation();

  // Rule tests + score come from the shared policy (src/calc/app/passwordPolicy),
  // the same source the sign-up form validates against; only labels live here.
  const results = useMemo(
    () => passwordRuleResults(password).map((r) => ({ ...r, label: t(RULE_LABEL_KEY[r.id]) })),
    [password, t],
  );

  const score = useMemo(() => passwordScore(password), [password]);

  const strengthLabel = useMemo(() => {
    if (score === -1) return '';
    switch (score) {
      case 0:
        return t('account.passwordWeak');
      case 1:
        return t('account.passwordFair');
      case 2:
        return t('account.passwordGood');
      case 3:
        return t('account.passwordStrong');
      default:
        return '';
    }
  }, [score, t]);

  if (!password) return null;

  return (
    <div className={styles.container} aria-live="polite">
      <div className={`${styles.barWrapper} ${styles[`score-${score}`]}`}>
        <div className={styles.segment} />
        <div className={styles.segment} />
        <div className={styles.segment} />
        <div className={styles.segment} />
      </div>

      <div className={styles.textRow}>
        <span>{t('account.passwordStrength')}</span>
        <span className={styles.label}>{strengthLabel}</span>
      </div>

      <ul className={styles.rulesList}>
        {results.map((res) => (
          <li key={res.id} className={res.met ? styles.ruleMet : styles.ruleUnmet}>
            <span className={styles.bullet} aria-hidden="true">
              {res.met ? '✓' : '○'}
            </span>
            <span>{res.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
export default PasswordStrength;
