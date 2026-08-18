import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './calc.module.css';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  autoComplete?: string;
  onBlur?: () => void;
}

/**
 * Password input sharing the calculator field styling, with a show/hide
 * toggle. Kept separate from TextField so its ~30 call sites stay untouched.
 */
export function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete,
  onBlur,
}: PasswordFieldProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const fieldClass = [styles.field, error ? styles.fieldInvalid : ''].filter(Boolean).join(' ');
  return (
    <label className={fieldClass}>
      <span>{label}</span>
      <span className={styles.inputRow}>
        <input
          className={styles.input}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? 'true' : undefined}
        />
        <button
          type="button"
          className={styles.revealBtn}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? t('account.hidePassword') : t('account.showPassword')}
        </button>
      </span>
      {error && (
        <span className={styles.fieldError} role="alert">
          {error}
        </span>
      )}
    </label>
  );
}
