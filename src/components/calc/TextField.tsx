import styles from './calc.module.css';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  type?: 'text' | 'email' | 'password' | 'date';
  autoComplete?: string;
  onBlur?: () => void;
}

/** Labelled free-text input sharing the calculator field styling. */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
  type = 'text',
  autoComplete,
  onBlur,
}: TextFieldProps) {
  const fieldClass = [styles.field, error ? styles.fieldInvalid : ''].filter(Boolean).join(' ');
  return (
    <label className={fieldClass}>
      <span>{label}</span>
      <span className={styles.inputRow}>
        <input
          className={styles.input}
          type={type}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
        />
      </span>
      {error && (
        <span className={styles.fieldError} role="alert">
          {error}
        </span>
      )}
      {hint && !error && <small className={styles.hint}>{hint}</small>}
    </label>
  );
}
