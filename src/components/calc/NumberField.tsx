import styles from './calc.module.css';

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
}

/** Labelled numeric input with an optional unit affix. Used by every calculator. */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  placeholder,
  hint,
  error,
}: NumberFieldProps) {
  const fieldClass = [styles.field, error ? styles.fieldInvalid : ''].filter(Boolean).join(' ');
  return (
    <label className={fieldClass}>
      <span>{label}</span>
      <span className={styles.inputRow}>
        <input
          className={styles.input}
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
        />
        {unit && <span className={styles.unit}>{unit}</span>}
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
